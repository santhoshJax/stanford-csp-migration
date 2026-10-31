/**
 * Stanford CSP Migration – Payments Import flow.
 *
 * Source: "Payments" tab of the mapping workbook (the 4D Payments table — the
 * real transaction ledger, one row per payment attempt/refund, linked to a
 * Registration, a Transcript Request, or a Purchase). Creates:
 *
 *   1. Payment — one per source row with a non-zero Sales_Amount.
 *   2. Refund  — one per source row with a non-zero Refund_Amount, as a
 *                "Referenced" refund on the same Account / PaymentGroup as
 *                the Payment from phase 1.
 *   3. RefundLinePayment — links each Refund to its Payment (Refund has no
 *                PaymentId field; the standard junction carries RefundId +
 *                PaymentId + Amount, Type = "Applied"). Ids come from the
 *                Bulk successfulResults of phases 1 and 2. The junction has
 *                no external id, so it is INSERT-only and refunds that
 *                already have a line are skipped (re-run safe).
 *                (2026-10-14 Build-session fix: the General-session draft
 *                set Refund.PaymentId, which is not a Refund field and would
 *                have failed the whole Refund Bulk job.)
 *
 * Upsert key: External_ID_4D__c = "PAY-" + Payments.ID, on Payment and Refund.
 * Prefixed because Registration already writes the raw Registration.ID into
 * Payment.External_ID_4D__c; the two id ranges overlap, so an unprefixed
 * Payments load would overwrite Registration's payments.
 *
 * MUST RUN AFTER: Registration Import (and Purchase Import / Transcript
 * Request Import, if their payments are in scope) — Payment links to the
 * PaymentGroup / CSP_Transcript_Request__c those create. Also after Student.
 *
 * LINKING (deviation from the workbook, flagged):
 *   The workbook maps Registration_ID → "Payment.OrderId, Lookup(Order)". The
 *   Payment object has no OrderId; an Order is reached THROUGH its
 *   PaymentGroup (PaymentGroup.SourceObjectId). Registration Import already
 *   creates one PaymentGroup per Order with External_ID_4D__c =
 *   Registration.ID, so this flow sets PaymentGroupId through the
 *   external-ID relationship `PaymentGroup.External_ID_4D__c`. A Registration
 *   whose PaymentGroup does not exist (outside the 2-year scope, or failed) is
 *   SKIPPED and counted rather than failing one Bulk row per payment.
 *   Purchase_ID is "Do Not Map" in the workbook, so purchase-linked payments
 *   are NOT attached to their PUR- PaymentGroup.
 *
 * ⚠️  DOUBLE-COUNTING RISK (architect decision needed):
 *   Registration Import already creates a Capture/Processed Payment from each
 *   registration's CC_Amt. A Payments row with a Registration_ID very likely
 *   describes that same money, so loading both would record it twice.
 *   REGISTRATION_LINKED_PAYMENTS controls this: "load" (default — follows the
 *   workbook literally) or "skip" (load only payments NOT tied to a
 *   Registration). TEST_MODE is on, so nothing is committed at scale until this
 *   is decided.
 *
 * Field mapping — fields the review could NOT take at face value:
 *   - "4D_Payment_Sub_Type__c" and "4D_Freeze__c": a Salesforce custom field
 *     API name cannot start with a digit, so these names cannot exist.
 *     Likewise "Payment_Type" has no __c suffix. All three are left unmapped
 *     (UNCONFIRMED_FIELDS below, all undefined) until the real API names are
 *     confirmed — set the constant and the mapping turns on.
 *   - Refund.External_ID_4D__c: the workbook gives Refund no external id, but
 *     an upsert needs one — must be created and flagged External ID.
 *   - Refund ProcessingMode = "External" (required on Refund, not in the
 *     workbook — same value Payment uses). Refund Date = the Payment's Date.
 *     Not yet verified against the UAT org (no describe run).
 *   - Date_Time_New is YYYYMMDDHHMMSS (stored as-is, no UTC offset — same as
 *     the Waiver flow). Rows with no parseable value are out of scope.
 *   - 2-year scope: no cutoff column on this tab; Date_Time_New >=
 *     COMMERCE_TWO_YEAR_CUTOFF is assumed.
 *   - Type="Capture", Status="Processed", ProcessingMode="External": workbook
 *     defaults + the required ProcessingMode learned from Registration's real
 *     runs (that field also needs FLS on the migration permission set).
 *   - STAP: when Payment_Sub_Type = STAP, Sales_Amount is ALSO written to
 *     STAP_Amount__c (Amount still carries it).
 *   - Net_Amount, Purchase_ID: Do Not Map.
 */

import { flow, type Connection } from "@prismatic-io/spectral";
import { str, getAccessToken, getSfInstanceUrl } from "./utils";
import { createPerObjectResultsSheet } from "./reportResults";
import {
  COMMERCE_TWO_YEAR_CUTOFF,
  EXT_ID_FIELD,
  type SfRecord,
  invokeNextWindow,
  parseCurrency,
  parseDateTime4D,
  parseSuccessfulSfIds,
  readWindowCursor,
  insertViaComposite,
  sfQueryAll,
  streamTsvWindow,
  stripDotZero,
  upsertInBatches,
} from "./commerceShared";

const SF_PAYMENT = "Payment";
const SF_REFUND = "Refund";
const SF_REFUND_LINE_PAYMENT = "RefundLinePayment";
const FLOW_NAME = "Payments Import";
export const PAYMENT_EXT_PREFIX = "PAY-";

const MAX_ROWS = 25_000;
const TEST_MODE = true;
const TEST_LIMIT = 50;
const TEST_SKIP = 0;

/** See header — "load" follows the workbook, "skip" avoids double-counting Registration payments. */
export const REGISTRATION_LINKED_PAYMENTS: "load" | "skip" = "load";

/** Real API names pending confirmation (see header). undefined = not mapped. */
export const UNCONFIRMED_FIELDS: {
  paymentType: string | undefined;
  paymentSubType: string | undefined;
  freeze: string | undefined;
} = {
  paymentType: undefined, // workbook: "Payment_Type"
  paymentSubType: undefined, // workbook: "4D_Payment_Sub_Type__c" (invalid name)
  freeze: undefined, // workbook: "4D_Freeze__c" (invalid name)
};

export interface RawPaymentRow {
  ID?: string;
  Student_ID?: string;
  Registration_ID?: string;
  Transcript_Request_ID?: string;
  Payment_Type?: string;
  Payment_Sub_Type?: string;
  Payment_Source?: string;
  Transaction_No?: string;
  Sales_Amount?: string;
  Net_Amount?: string;
  Date_Time_New?: string;
  Freeze?: string;
  Reason?: string;
  Purchase_ID?: string;
  Refund_Amount?: string;
  [key: string]: string | undefined;
}

export interface PaymentSkips {
  outOfScope: number;
  zeroAmount: number;
  registrationPaymentGroupMissing: number;
  skippedRegistrationLinked: number;
  refundWithoutPayment: number;
}

export function newPaymentSkips(): PaymentSkips {
  return {
    outOfScope: 0,
    zeroAmount: 0,
    registrationPaymentGroupMissing: 0,
    skippedRegistrationLinked: 0,
    refundWithoutPayment: 0,
  };
}

export interface MappedPaymentRow {
  payment: SfRecord;
  /** Refund amount (>0) to create once the Payment exists, if any. */
  refundAmount?: number;
}

export function mapToPayment(
  raw: RawPaymentRow,
  existingPaymentGroupExtIds: Set<string>,
  skips: PaymentSkips,
  logger: { warn: (m: string) => void },
  registrationMode: "load" | "skip" = REGISTRATION_LINKED_PAYMENTS,
): MappedPaymentRow | null {
  const id = str(raw.ID).trim();
  if (!id) return null;

  const dateTime = parseDateTime4D(raw.Date_Time_New);
  if (!dateTime || dateTime.slice(0, 10) < COMMERCE_TWO_YEAR_CUTOFF) {
    skips.outOfScope++;
    return null;
  }

  const registrationId = stripDotZero(raw.Registration_ID);
  const hasRegistration = !!registrationId && registrationId !== "0";
  if (hasRegistration) {
    if (registrationMode === "skip") {
      skips.skippedRegistrationLinked++;
      return null;
    }
    if (!existingPaymentGroupExtIds.has(registrationId)) {
      skips.registrationPaymentGroupMissing++;
      return null;
    }
  }

  const amount = parseCurrency(raw.Sales_Amount);
  const refund = parseCurrency(raw.Refund_Amount);
  if (amount === undefined || amount === 0) {
    skips.zeroAmount++;
    if (refund) skips.refundWithoutPayment++;
    return null;
  }

  const record: SfRecord = {
    [EXT_ID_FIELD]: `${PAYMENT_EXT_PREFIX}${id}`,
    Type: "Capture",
    Status: "Processed",
    ProcessingMode: "External",
    Amount: amount,
    Date: dateTime,
  };

  const studentId = stripDotZero(raw.Student_ID);
  if (studentId && studentId !== "0") {
    record["Account.Student_ID_4D__c"] = studentId;
  }
  if (hasRegistration) {
    record["PaymentGroup.External_ID_4D__c"] = registrationId;
  }
  const transcriptRequestId = stripDotZero(raw.Transcript_Request_ID);
  if (transcriptRequestId && transcriptRequestId !== "0") {
    record["Transcript_Request__r.External_ID_4D__c"] = transcriptRequestId;
  }

  const source = str(raw.Payment_Source).trim();
  if (source) record.Payment_Source__c = source;

  const txn = str(raw.Transaction_No).trim();
  if (txn) record.GatewayRefNumber = txn.slice(0, 255);

  const reason = str(raw.Reason)
    .replace(/_4DNL_/g, "\n")
    .trim();
  if (reason) record.Comments = reason.slice(0, 1000);

  const subType = str(raw.Payment_Sub_Type).trim();
  if (subType.toUpperCase() === "STAP") record.STAP_Amount__c = amount;

  if (UNCONFIRMED_FIELDS.paymentType && str(raw.Payment_Type).trim()) {
    record[UNCONFIRMED_FIELDS.paymentType] = str(raw.Payment_Type).trim();
  }
  if (UNCONFIRMED_FIELDS.paymentSubType && subType) {
    record[UNCONFIRMED_FIELDS.paymentSubType] = subType;
  }
  if (UNCONFIRMED_FIELDS.freeze && str(raw.Freeze).trim()) {
    record[UNCONFIRMED_FIELDS.freeze] = /^(true|1|y|yes)$/i.test(
      str(raw.Freeze).trim(),
    );
  }

  let refundAmount: number | undefined;
  if (refund !== undefined && refund !== 0) {
    refundAmount = Math.abs(refund);
    if (refund < 0) {
      logger.warn(
        `[Payments Import] Payments ${id} has a negative Refund_Amount (${refund}) — using the absolute value`,
      );
    }
  }

  return { payment: record, refundAmount };
}

/**
 * Refund for a Payments row. Inherits Account and PaymentGroup from the
 * mapped Payment (same external-id relationship keys) so the refund sits on
 * the same Account / Order as the money it returns. The Payment link itself
 * is a RefundLinePayment (see mapToRefundLinePayment).
 */
export function mapToRefund(payment: SfRecord, amount: number): SfRecord {
  const record: SfRecord = {
    [EXT_ID_FIELD]: payment[EXT_ID_FIELD],
    Amount: amount,
    Type: "Referenced",
    Status: "Processed",
    ProcessingMode: "External",
  };
  for (const key of [
    "Date",
    "Account.Student_ID_4D__c",
    "PaymentGroup.External_ID_4D__c",
  ]) {
    if (payment[key] !== undefined) record[key] = payment[key];
  }
  return record;
}

/** RefundLinePayment junction row: applies a Refund against its Payment. */
export function mapToRefundLinePayment(
  refundSfId: string,
  paymentSfId: string,
  amount: number,
): SfRecord {
  return {
    attributes: { type: SF_REFUND_LINE_PAYMENT },
    RefundId: refundSfId,
    PaymentId: paymentSfId,
    Amount: amount,
    Type: "Applied",
  };
}

export const paymentsImport = flow({
  name: FLOW_NAME,
  stableKey: "pays2026-1014-4a04-9b10-0a1b2c3d4e04",
  description:
    "Streams the Payments TSV from Google Drive one window at a time and " +
    "bulk-upserts Payment and Refund records (External IDs prefixed PAY-). " +
    "Must run after Student, Registration (and Purchase / Transcript Request " +
    "if those payments are in scope).",

  onTrigger: async (_context, payload) => {
    await Promise.resolve();
    return { payload };
  },

  onExecution: async (context, params) => {
    const { logger, configVars } = context;
    const { byteOffset, knownHeaders, windowNumber } = readWindowCursor(params);

    logger.info(
      `[Payments Import] Starting window ${windowNumber} at byte ${byteOffset}…`,
    );

    const gdConn = configVars[
      "Google Drive Connection"
    ] as unknown as Connection;
    const sfConn = configVars["Salesforce Connection"] as unknown as Connection;
    const fileId = configVars["Payments File ID"] as unknown as string;
    const failedFolderId = configVars["Failed Records Folder ID"] as
      string | undefined;
    if (!fileId) throw new Error("Payments File ID config var is empty.");

    const gdToken = getAccessToken(gdConn);
    const sfToken = getAccessToken(sfConn);
    const sfBase = getSfInstanceUrl(sfConn);

    // PaymentGroups that exist (Registration ids are raw, Purchase ids "PUR-…").
    const groups = await sfQueryAll<{ External_ID_4D__c: string }>(
      sfBase,
      sfToken,
      "SELECT External_ID_4D__c FROM PaymentGroup WHERE External_ID_4D__c != null",
      logger,
    );
    const existingGroups = new Set(groups.map((g) => g.External_ID_4D__c));
    logger.info(
      `[Payments Import] PaymentGroups in org: ${existingGroups.size}`,
    );

    let mapped: MappedPaymentRow[] = [];
    const skips = newPaymentSkips();
    const window = await streamTsvWindow(
      fileId,
      gdToken,
      byteOffset,
      MAX_ROWS,
      knownHeaders,
      (row: RawPaymentRow) => {
        const m = mapToPayment(row, existingGroups, skips, logger);
        if (m) mapped.push(m);
      },
    );
    const { rowsInWindow, hasMore, nextByteOffset, parsedHeaders } = window;

    logger.info(
      `[Payments Import] Window ${windowNumber} stream complete — rows=${rowsInWindow}, payments=${mapped.length}, ` +
        `skipped: outOfScope=${skips.outOfScope}, zeroAmount=${skips.zeroAmount}, ` +
        `registrationPaymentGroupMissing=${skips.registrationPaymentGroupMissing}, ` +
        `registrationLinkedSkippedByMode=${skips.skippedRegistrationLinked}, ` +
        `refundWithoutPayment=${skips.refundWithoutPayment}`,
    );
    if (REGISTRATION_LINKED_PAYMENTS === "load") {
      logger.warn(
        '[Payments Import] REGISTRATION_LINKED_PAYMENTS="load": payments tied to a Registration may duplicate the ' +
          "Payment Registration Import already created from CC_Amt. Confirm with the architect before a full run.",
      );
    }

    if (TEST_MODE) {
      mapped = mapped.slice(TEST_SKIP, TEST_SKIP + TEST_LIMIT);
      logger.info(
        `[Payments Import] TEST MODE: limited to ${TEST_LIMIT} Payment(s) and won't invoke the next window.`,
      );
    }

    // ── Phase 1: Payment ─────────────────────────────────────────────────────
    const payments = mapped.map((m) => m.payment);
    const paymentResult =
      payments.length > 0
        ? await upsertInBatches(
            payments,
            SF_PAYMENT,
            sfBase,
            sfToken,
            logger,
            "[Payments Import][Payment]",
          )
        : { processed: 0, failed: 0, successfulCsv: "", failedCsv: "" };

    // ── Phase 2: Refund (Referenced, same Account / PaymentGroup) ────────────
    const paymentSfIds = parseSuccessfulSfIds(paymentResult.successfulCsv);
    const refunds: SfRecord[] = [];
    const refundAmountByExtId = new Map<string, number>();
    let refundsSkippedNoPayment = 0;
    for (const m of mapped) {
      if (m.refundAmount === undefined) continue;
      const extId = m.payment[EXT_ID_FIELD] as string;
      if (!paymentSfIds.has(extId)) {
        refundsSkippedNoPayment++;
        continue;
      }
      refunds.push(mapToRefund(m.payment, m.refundAmount));
      refundAmountByExtId.set(extId, m.refundAmount);
    }
    if (refundsSkippedNoPayment > 0) {
      logger.warn(
        `[Payments Import][Refund] ${refundsSkippedNoPayment} refund(s) skipped — their Payment did not succeed`,
      );
    }
    const refundResult =
      refunds.length > 0
        ? await upsertInBatches(
            refunds,
            SF_REFUND,
            sfBase,
            sfToken,
            logger,
            "[Payments Import][Refund]",
          )
        : { processed: 0, failed: 0, successfulCsv: "", failedCsv: "" };

    // ── Phase 3: RefundLinePayment (Refund → Payment), insert-only ───────────
    const refundSfIds = parseSuccessfulSfIds(refundResult.successfulCsv);
    const alreadyLinked = new Set<string>();
    const refundIdList = [...refundSfIds.values()];
    for (let i = 0; i < refundIdList.length; i += 200) {
      const idList = refundIdList
        .slice(i, i + 200)
        .map((id) => `'${id}'`)
        .join(",");
      const existingLines = await sfQueryAll<{ RefundId: string }>(
        sfBase,
        sfToken,
        `SELECT RefundId FROM ${SF_REFUND_LINE_PAYMENT} WHERE RefundId IN (${idList})`,
      );
      existingLines.forEach((l) => alreadyLinked.add(l.RefundId));
    }
    const refundLines: SfRecord[] = [];
    for (const [extId, refundSfId] of refundSfIds) {
      if (alreadyLinked.has(refundSfId)) continue;
      const paymentSfId = paymentSfIds.get(extId);
      const amount = refundAmountByExtId.get(extId);
      if (!paymentSfId || amount === undefined) continue;
      refundLines.push(mapToRefundLinePayment(refundSfId, paymentSfId, amount));
    }
    if (alreadyLinked.size > 0) {
      logger.info(
        `[Payments Import][RefundLinePayment] ${alreadyLinked.size} refund(s) already linked — skipped`,
      );
    }
    const refundLineResult =
      refundLines.length > 0
        ? await insertViaComposite(
            refundLines,
            sfBase,
            sfToken,
            logger,
            "[Payments Import][RefundLinePayment]",
          )
        : { created: 0, failed: 0 };

    try {
      const sheet = await createPerObjectResultsSheet({
        flowName: FLOW_NAME,
        objects: [
          {
            objectName: SF_PAYMENT,
            successfulCsv: paymentResult.successfulCsv,
            failedCsv: paymentResult.failedCsv,
          },
          {
            objectName: SF_REFUND,
            successfulCsv: refundResult.successfulCsv,
            failedCsv: refundResult.failedCsv,
          },
        ],
        accessToken: gdToken,
        folderId: failedFolderId,
      });
      logger.info(`[Payments Import] Results sheet: ${sheet.url}`);
    } catch (err) {
      logger.warn(
        `[Payments Import] Could not write results sheet: ${String(err)}`,
      );
    }

    logger.info(
      `[Payments Import] Window ${windowNumber} complete —` +
        `\n  Payment submitted: ${payments.length}, processed: ${paymentResult.processed}, failed: ${paymentResult.failed}` +
        `\n  Refund submitted:  ${refunds.length}, processed: ${refundResult.processed}, failed: ${refundResult.failed}` +
        `\n  RefundLinePayment submitted: ${refundLines.length}, created: ${refundLineResult.created}, failed: ${refundLineResult.failed}`,
    );

    if (TEST_MODE && hasMore) {
      logger.info(
        "[Payments Import] TEST MODE: more rows remain, but stopping here — set TEST_MODE = false to process the full file.",
      );
    } else if (hasMore) {
      await invokeNextWindow(context, FLOW_NAME, {
        byteOffset: nextByteOffset,
        headers: parsedHeaders,
        windowNumber: windowNumber + 1,
      });
    } else {
      logger.info(
        `[Payments Import] All rows processed — import complete after ${windowNumber} window(s).`,
      );
    }

    return {
      data: {
        windowNumber,
        byteOffset,
        nextByteOffset,
        hasMore,
        rowsInWindow,
        payments: payments.length,
        paymentsProcessed: paymentResult.processed,
        paymentsFailed: paymentResult.failed,
        refunds: refunds.length,
        refundsProcessed: refundResult.processed,
        refundsFailed: refundResult.failed,
        refundLinesCreated: refundLineResult.created,
        refundLinesFailed: refundLineResult.failed,
      },
    };
  },
});

export default [paymentsImport];
