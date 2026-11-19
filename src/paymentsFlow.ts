/**
 * Stanford CSP Migration – Payments Import flow.
 *
 * Source: the 4D Payments table ("Payments" tab of the mapping workbook) —
 * the real transaction ledger. Every row is EITHER a payment
 * (Sales_Amount > 0, Refund_Amount = 0) OR a refund (Sales_Amount = 0,
 * Refund_Amount > 0); checked against the full file (2026-11-18): no row has
 * both, and the few rows with neither are skipped. Creates:
 *
 *   1. Payment — one per payment row.
 *   2. Refund  — one per refund row (2026-11-19: before this, refund rows
 *                were dropped because their Sales_Amount is 0, so no refund
 *                was ever loaded).
 *
 * Upsert key: External_ID_4D__c = "PAY-" + Payments.ID, on Payment and on
 * Refund (separate objects, so the same key never collides).
 *
 * TWO ROUNDS (decided 2026-11-19, same idea as "Activate Registration Orders"):
 *   Round 1  "Process Payments" = false → reads the file and loads Payments
 *            and Refunds with Status = Draft. Draft records can be deleted,
 *            so the load can be checked and redone. Records that are already
 *            Processed / Canceled are never re-sent (Salesforce allows no
 *            change back to Draft).
 *   Round 2  "Process Payments" = true → does NOT read the file: every PAY-
 *            Payment and Refund still in Draft is changed to Processed.
 *   Tested in STANFORD-QA (2026-11-19): Draft Payment / Refund can be deleted;
 *   Draft → Processed is allowed on both; Processed / Canceled records can be
 *   neither deleted nor set back to Draft.
 *
 * NO RefundLinePayment (decided 2026-11-19): the CSP app links a refund to its
 *   payment only through Refund.Payment__c (RefundLedgerService sums
 *   processed refunds by Payment__c; QA has no RefundLinePayment records), and
 *   Salesforce only accepts a RefundLinePayment between two Processed records.
 *   It can be added to round 2 later if wanted.
 *
 * MUST RUN AFTER: Student, Registration Import (Orders + PaymentGroups, with
 * Order.Prior_Registration__c), Purchase Import and Transcript Request Import.
 *
 * HOW 4D RECORDS A REFUND (checked against the Registration and Payments
 * files, 2026-11-18): a drop / change is a NEW Registration whose
 * Prior_Registration_ID points to the original one. The refund row in the
 * Payments table carries the NEW (drop) registration's id — its
 * Transaction_No equals that registration's CC_Transaction_ID — while the
 * money it returns was paid on the prior registration. Example:
 *     Registration 592384472                        → Payments 251853: paid 152
 *     Registration 592386482 (Prior = 592384472)    → Payments 253439: refund 152
 * Registration Import already stores that link as Order.Prior_Registration__c.
 *
 * LINKS
 *   Account      Account.Student_ID_4D__c = Student_ID (required).
 *   PaymentGroup The row's own Registration_ID → "REG-{id}" PaymentGroup
 *                (Payment has no OrderId; the Order is reached through its
 *                PaymentGroup.SourceObjectId). Else Purchase_ID → "PUR-{id}".
 *                A refund therefore sits on the DROP registration's Order.
 *   Transcript   Payment.Transcript_Request__c (lookup) via
 *                CSP_Transcript_Request__c.External_ID_4D__c.
 *   Each link is set only when its record is in Salesforce (link if it
 *   exists, decided 2026-11-09); otherwise the row loads without it and is
 *   counted.
 *
 * REFUND → PAYMENT (2026-11-19): after the Payment phase the flow reads, for
 *   each refund's registration, the Order's Prior_Registration__c, and then
 *   the PAY- Payments on that prior registration's PaymentGroup.
 *     exactly one Payment  → Type "Referenced", Payment__c = that Payment
 *     none / two or more /
 *     no prior registration → Type "NonReferenced", no payment link (counted)
 *   Source-file check (Aug Registration file, refunds in scope): 6,034 of
 *   6,422 refunds find exactly one payment this way.
 *
 * SCOPE (2026-11-19): a row loads when Date_Time_New is on or after
 *   TWO_YEAR_CUTOFF (2024-09-23), OR when its Registration / Purchase
 *   PaymentGroup is already in Salesforce. The second rule matches
 *   Registration Import, which also loads earlier registrations that have a
 *   Fall 2024+ enrollment — without it ~4,560 of their Orders had no payment,
 *   and refunds had no original payment to point to.
 *
 * SINGLE SOURCE OF PAYMENTS — DECIDED 2026-11-08 (architect): Registration
 *   and Purchase Import create no Payment / Refund (ORDER_FLOWS_CREATE_PAYMENTS
 *   = false), so every row here loads, including registration ones.
 *
 * Field mapping (workbook, with the org's real API names, UAT 2026-11-19):
 *   ID              → External_ID_4D__c ("PAY-" + ID)
 *   Payment_Type    → Payment.Payment_Type__c      (CC / Other / Check)
 *   Payment_Sub_Type→ Payment.Payment_Sub_Type__c  ("AMEX" → "AmEx")
 *   Freeze          → Payment.Freeze__c            (True/False)
 *   Payment_Source  → Payment.Payment_Source__c
 *   Transaction_No  → GatewayRefNumber   (Payment and Refund)
 *   Sales_Amount    → Payment.Amount; also STAP_Amount__c when Sub Type = STAP
 *   Refund_Amount   → Refund.Amount
 *   Date_Time_New   → Date (Payment and Refund), YYYYMMDDHHMMSS, stored as-is
 *   Reason          → Comments (Payment and Refund)
 *   Net_Amount      → Do Not Map
 *   Defaults: Payment Type "Capture"; Status Draft (round 1) → Processed
 *   (round 2, the workbook's value); ProcessingMode "External" on both
 *   (required, create-only — not re-sent for records that already exist).
 *   The workbook's "Referenced" refund type is used when the refund's payment
 *   is found; the org's other value is "NonReferenced". Picklist values not in
 *   the org's list are left blank and counted, so one bad value never rejects
 *   the whole record.
 */

import { flow, type Connection } from "@prismatic-io/spectral";
import { str, getAccessToken, getSfInstanceUrl } from "./utils";
import { createPerObjectResultsSheet } from "./reportResults";
import {
  EXT_ID_FIELD,
  type SfRecord,
  invokeNextWindow,
  parseCurrency,
  parseDateTime4D,
  parseSuccessfulSfIds,
  readWindowCursor,
  registrationExtId,
  ORDER_FLOWS_CREATE_PAYMENTS,
  sfQueryAll,
  streamTsvWindow,
  stripDotZero,
  upsertInBatches,
  type UpsertResult,
} from "./commerceShared";
import { PURCHASE_EXT_PREFIX } from "./purchaseFlow";

// 2-year scope — UPDATED 2026-11-16 (Santhosh): non-quarter tables load
// records from 9/23/2024 onward, no end date. A fixed date kept in this file
// (same convention as the other flows), applied to Date_Time_New. Rows whose
// Registration / Purchase is in Salesforce load whatever their date (header).
export const TWO_YEAR_CUTOFF = "2024-09-23";

const SF_PAYMENT = "Payment";
const SF_REFUND = "Refund";
const FLOW_NAME = "Payments Import";
export const PAYMENT_EXT_PREFIX = "PAY-";

const MAX_ROWS = 25_000;
const TEST_MODE = false;
const TEST_LIMIT = 50;
const TEST_SKIP = 0;

/** Boolean config var: false = round 1 (load Draft), true = round 2 (→ Processed). */
export const PROCESS_PAYMENTS_CONFIG_VAR = "Process Payments";
/** Status Payment and Refund are loaded with in round 1. */
export const LOAD_STATUS = "Draft";
/** Status round 2 sets (the workbook's default). */
export const FINAL_STATUS = "Processed";
/** Createable but not updateable on Payment and Refund (UAT describe). */
export const CREATE_ONLY_FIELDS = ["ProcessingMode"];

/** See header — "load": this flow is the only payment source (2026-11-08). */
export const REGISTRATION_LINKED_PAYMENTS: "load" | "skip" = "load";

// Custom Payment fields for the 4D type columns (created 2026-11-19, UAT).
export const PAYMENT_TYPE_FIELD = "Payment_Type__c";
export const PAYMENT_SUB_TYPE_FIELD = "Payment_Sub_Type__c";
export const FREEZE_FIELD = "Freeze__c";
/** Refund.Payment__c (lookup to Payment), set through the Payment's PAY- key. */
export const REFUND_PAYMENT_REL = "Payment__r.External_ID_4D__c";

/** Active values of the restricted picklists in the org (UAT, 2026-11-19). */
export const PAYMENT_TYPE_VALUES = ["CC", "Other", "Check"];
export const PAYMENT_SUB_TYPE_VALUES = [
  "Visa",
  "MC",
  "AmEx",
  "STAP",
  "CANET",
  "Payable",
  "Wire",
  "Internal Funding",
  "CSP Gift Fund",
  "SHC-SOM",
];

export const REFUND_TYPE_REFERENCED = "Referenced";
export const REFUND_TYPE_NON_REFERENCED = "NonReferenced";

/**
 * The org's picklist value matching `raw`, ignoring case ("AMEX" → "AmEx").
 * Undefined for blank or unknown values.
 */
export function toPicklistValue(
  raw: string | undefined,
  allowed: string[],
): string | undefined {
  const v = str(raw).trim().toLowerCase();
  if (!v) return undefined;
  return allowed.find((a) => a.toLowerCase() === v);
}

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
  /** Before TWO_YEAR_CUTOFF and no Registration / Purchase in Salesforce. */
  outOfScope: number;
  /** Sales_Amount and Refund_Amount both 0 / blank. */
  zeroAmount: number;
  /** Before TWO_YEAR_CUTOFF but loaded because its Order is in Salesforce. */
  loadedBeforeCutoff: number;
  /** Registration_ID given, but no REG- PaymentGroup — loaded without the link. */
  registrationPaymentGroupMissing: number;
  /** Purchase_ID given, but no PUR- PaymentGroup — loaded without the link. */
  purchasePaymentGroupMissing: number;
  /** Transcript_Request_ID given, but not in Salesforce — loaded without the link. */
  transcriptRequestMissing: number;
  bothRegistrationAndPurchase: number;
  skippedRegistrationLinked: number;
  /** Payment_Type / Payment_Sub_Type value not in the org's picklist — left blank. */
  unknownPicklistValue: number;
}

export function newPaymentSkips(): PaymentSkips {
  return {
    outOfScope: 0,
    zeroAmount: 0,
    loadedBeforeCutoff: 0,
    registrationPaymentGroupMissing: 0,
    purchasePaymentGroupMissing: 0,
    transcriptRequestMissing: 0,
    bothRegistrationAndPurchase: 0,
    skippedRegistrationLinked: 0,
    unknownPicklistValue: 0,
  };
}

export interface MappedPaymentRow {
  /** Set for a payment row (Sales_Amount ≠ 0). */
  payment?: SfRecord;
  /**
   * Set for a refund row (Refund_Amount ≠ 0). Type and Payment__c are filled
   * in by applyRefundLink once the refund's payment is known.
   */
  refund?: SfRecord;
  /** Raw Registration_ID of the row ("" when none) — finds the prior registration. */
  registrationId: string;
}

export function mapToPayment(
  raw: RawPaymentRow,
  existingPaymentGroupExtIds: Set<string>,
  skips: PaymentSkips,
  logger: { warn: (m: string) => void },
  registrationMode: "load" | "skip" = REGISTRATION_LINKED_PAYMENTS,
  /**
   * External_ID_4D__c of the CSP_Transcript_Request__c records in the org.
   * When given, a Transcript_Request_ID not in the set is dropped (payment
   * still loads). When omitted, the link is sent unchecked.
   */
  existingTranscriptRequestExtIds?: Set<string>,
): MappedPaymentRow | null {
  const id = str(raw.ID).trim();
  if (!id) return null;

  const dateTime = parseDateTime4D(raw.Date_Time_New);
  if (!dateTime) {
    skips.outOfScope++;
    return null;
  }

  const registrationId = stripDotZero(raw.Registration_ID);
  const hasRegistration = !!registrationId && registrationId !== "0";
  if (hasRegistration && registrationMode === "skip") {
    skips.skippedRegistrationLinked++;
    return null;
  }
  const linkRegistration =
    hasRegistration &&
    existingPaymentGroupExtIds.has(registrationExtId(registrationId));

  const purchaseId = stripDotZero(raw.Purchase_ID);
  const hasPurchase = !!purchaseId && purchaseId !== "0";
  const purchaseGroupExists =
    hasPurchase &&
    existingPaymentGroupExtIds.has(`${PURCHASE_EXT_PREFIX}${purchaseId}`);
  // Registration wins when a row carries both ids; if the Registration's
  // group is missing, fall back to the Purchase's.
  const linkPurchase = !linkRegistration && purchaseGroupExists;

  // Scope: on/after the cutoff, or its Order is already in Salesforce.
  const beforeCutoff = dateTime.slice(0, 10) < TWO_YEAR_CUTOFF;
  if (beforeCutoff && !linkRegistration && !linkPurchase) {
    skips.outOfScope++;
    return null;
  }

  const amount = parseCurrency(raw.Sales_Amount);
  const refundRaw = parseCurrency(raw.Refund_Amount);
  const isPayment = amount !== undefined && amount !== 0;
  const isRefund = refundRaw !== undefined && refundRaw !== 0;
  if (!isPayment && !isRefund) {
    skips.zeroAmount++;
    return null;
  }

  if (beforeCutoff) skips.loadedBeforeCutoff++;
  if (hasRegistration && !linkRegistration) {
    skips.registrationPaymentGroupMissing++;
  }
  if (hasPurchase && hasRegistration) skips.bothRegistrationAndPurchase++;
  if (hasPurchase && !hasRegistration && !purchaseGroupExists) {
    skips.purchasePaymentGroupMissing++;
  }

  // Fields both objects share.
  const common: SfRecord = {
    [EXT_ID_FIELD]: `${PAYMENT_EXT_PREFIX}${id}`,
    Status: LOAD_STATUS,
    ProcessingMode: "External",
    Date: dateTime,
  };
  const studentId = stripDotZero(raw.Student_ID);
  if (studentId && studentId !== "0") {
    common["Account.Student_ID_4D__c"] = studentId;
  }
  if (linkRegistration) {
    common["PaymentGroup.External_ID_4D__c"] =
      registrationExtId(registrationId);
  } else if (linkPurchase) {
    common["PaymentGroup.External_ID_4D__c"] =
      `${PURCHASE_EXT_PREFIX}${purchaseId}`;
  }
  const txn = str(raw.Transaction_No).trim();
  if (txn) common.GatewayRefNumber = txn.slice(0, 255);
  const reason = str(raw.Reason)
    .replace(/_4DNL_/g, "\n")
    .trim();
  if (reason) common.Comments = reason.slice(0, 1000);

  const result: MappedPaymentRow = {
    registrationId: hasRegistration ? registrationId : "",
  };

  if (isPayment) {
    const payment: SfRecord = { ...common, Type: "Capture", Amount: amount };

    const transcriptRequestId = stripDotZero(raw.Transcript_Request_ID);
    if (transcriptRequestId && transcriptRequestId !== "0") {
      if (
        existingTranscriptRequestExtIds &&
        !existingTranscriptRequestExtIds.has(transcriptRequestId)
      ) {
        skips.transcriptRequestMissing++;
      } else {
        payment["Transcript_Request__r.External_ID_4D__c"] =
          transcriptRequestId;
      }
    }

    const source = str(raw.Payment_Source).trim();
    if (source) payment.Payment_Source__c = source;

    const rawType = str(raw.Payment_Type).trim();
    const paymentType = toPicklistValue(rawType, PAYMENT_TYPE_VALUES);
    if (paymentType) payment[PAYMENT_TYPE_FIELD] = paymentType;
    else if (rawType) {
      skips.unknownPicklistValue++;
      logger.warn(
        `[Payments Import] Payments ${id}: Payment_Type "${rawType}" is not a ${PAYMENT_TYPE_FIELD} value — left blank`,
      );
    }

    const rawSubType = str(raw.Payment_Sub_Type).trim();
    const subType = toPicklistValue(rawSubType, PAYMENT_SUB_TYPE_VALUES);
    if (subType) payment[PAYMENT_SUB_TYPE_FIELD] = subType;
    else if (rawSubType) {
      skips.unknownPicklistValue++;
      logger.warn(
        `[Payments Import] Payments ${id}: Payment_Sub_Type "${rawSubType}" is not a ${PAYMENT_SUB_TYPE_FIELD} value — left blank`,
      );
    }
    if (subType === "STAP") payment.STAP_Amount__c = amount;

    const freeze = str(raw.Freeze).trim();
    if (freeze) payment[FREEZE_FIELD] = /^(true|1|y|yes)$/i.test(freeze);

    result.payment = payment;
  }

  if (isRefund) {
    if (refundRaw < 0) {
      logger.warn(
        `[Payments Import] Payments ${id} has a negative Refund_Amount (${refundRaw}) — using the absolute value`,
      );
    }
    result.refund = {
      ...common,
      Amount: Math.abs(refundRaw),
      Type: REFUND_TYPE_NON_REFERENCED,
    };
  }

  return result;
}

/** Why a refund could not be linked to one payment. */
export type RefundLinkMiss =
  | "noRegistration"
  | "noPriorRegistration"
  | "priorHasNoPayment"
  | "priorHasSeveralPayments";

/**
 * The payment a refund returns money from: the row's own payment when the
 * row is both (not seen in the data), else the ONLY PAY- Payment on the
 * prior registration's PaymentGroup. Pure — tested directly.
 *
 * @param priorByRegistrationKey  "REG-{drop}" → "REG-{prior}" (Order.Prior_Registration__c)
 * @param paymentsByGroupKey      PaymentGroup key → PAY- external ids on it
 */
export function findRefundPayment(
  row: MappedPaymentRow,
  priorByRegistrationKey: Map<string, string>,
  paymentsByGroupKey: Map<string, string[]>,
): { paymentExtId: string } | { miss: RefundLinkMiss } {
  if (row.payment) {
    return { paymentExtId: row.payment[EXT_ID_FIELD] as string };
  }
  if (!row.registrationId) return { miss: "noRegistration" };
  const prior = priorByRegistrationKey.get(
    registrationExtId(row.registrationId),
  );
  if (!prior) return { miss: "noPriorRegistration" };
  const payments = paymentsByGroupKey.get(prior) ?? [];
  if (payments.length === 0) return { miss: "priorHasNoPayment" };
  if (payments.length > 1) return { miss: "priorHasSeveralPayments" };
  return { paymentExtId: payments[0] };
}

/**
 * Returns the refund with its payment link: Referenced + Payment__c when
 * `paymentExtId` is given, otherwise NonReferenced with no link.
 */
export function applyRefundLink(
  refund: SfRecord,
  paymentExtId: string | undefined,
): SfRecord {
  const linked: SfRecord = { ...refund };
  delete linked[REFUND_PAYMENT_REL];
  if (paymentExtId) {
    linked.Type = REFUND_TYPE_REFERENCED;
    linked[REFUND_PAYMENT_REL] = paymentExtId;
  } else {
    linked.Type = REFUND_TYPE_NON_REFERENCED;
  }
  return linked;
}

const EMPTY_RESULT: UpsertResult = {
  processed: 0,
  failed: 0,
  successfulCsv: "",
  failedCsv: "",
};

/** Escapes a value for a SOQL string literal. */
function soqlQuote(v: string): string {
  return `'${v.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

/** Runs `run(inList)` per 200 values (quoted SOQL IN list) and concatenates the results. */
async function queryInChunks<T>(
  values: string[],
  run: (inList: string) => Promise<T[]>,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < values.length; i += 200) {
    const inList = values
      .slice(i, i + 200)
      .map(soqlQuote)
      .join(",");
    out.push(...(await run(inList)));
  }
  return out;
}

/** Status of the `objectName` records already in Salesforce, by External_ID_4D__c. */
async function loadStatuses(
  base: string,
  token: string,
  objectName: string,
  records: SfRecord[],
): Promise<Map<string, string>> {
  const extIds = [...new Set(records.map((r) => r[EXT_ID_FIELD] as string))];
  const rows = await queryInChunks(extIds, (inList) =>
    sfQueryAll<{ External_ID_4D__c: string; Status: string }>(
      base,
      token,
      `SELECT ${EXT_ID_FIELD}, Status FROM ${objectName} WHERE ${EXT_ID_FIELD} IN (${inList})`,
    ),
  );
  return new Map(rows.map((r) => [r.External_ID_4D__c, r.Status]));
}

/**
 * Round 1 upload plan for Payment or Refund records. Pure — tested directly.
 *   new record           → sent as mapped (Draft, with ProcessingMode)
 *   existing Draft       → sent without the create-only fields
 *   existing, not Draft  → not sent (Processed / Canceled cannot go back)
 */
export function planDraftLoad(
  records: SfRecord[],
  statusByExtId: Map<string, string>,
): { send: SfRecord[]; existingDraft: number; alreadyFinal: number } {
  const send: SfRecord[] = [];
  let existingDraft = 0;
  let alreadyFinal = 0;
  for (const record of records) {
    const status = statusByExtId.get(record[EXT_ID_FIELD] as string);
    if (status === undefined) {
      send.push(record);
    } else if (status === LOAD_STATUS) {
      const copy: SfRecord = { ...record };
      for (const field of CREATE_ONLY_FIELDS) delete copy[field];
      send.push(copy);
      existingDraft++;
    } else {
      alreadyFinal++;
    }
  }
  return { send, existingDraft, alreadyFinal };
}

/** Round 2 record: only the key and the final Status. */
export function toProcessedUpdate(extId: string): SfRecord {
  return { [EXT_ID_FIELD]: extId, Status: FINAL_STATUS };
}

export const paymentsImport = flow({
  name: FLOW_NAME,
  stableKey: "pays2026-1014-4a04-9b10-0a1b2c3d4e04",
  description:
    "Round 1 (Process Payments = false): streams the Payments TSV from Google " +
    "Drive one window at a time and bulk-upserts Draft Payment and Refund " +
    "records (External IDs prefixed PAY-), each refund linked to the payment " +
    "of its prior registration. Round 2 (Process Payments = true): changes " +
    "every Draft PAY- Payment and Refund to Processed. Must run after " +
    "Student, Registration, Purchase and Transcript Request.",

  onTrigger: async (_context, payload) => {
    await Promise.resolve();
    return { payload };
  },

  onExecution: async (context, params) => {
    const { logger, configVars } = context;

    const gdConn = configVars[
      "Google Drive Connection"
    ] as unknown as Connection;
    const sfConn = configVars["Salesforce Connection"] as unknown as Connection;
    const failedFolderId = configVars["Failed Records Folder ID"] as
      string | undefined;
    const gdToken = getAccessToken(gdConn);
    const sfToken = getAccessToken(sfConn);
    const sfBase = getSfInstanceUrl(sfConn);

    const processPayments =
      String(configVars[PROCESS_PAYMENTS_CONFIG_VAR]) === "true";

    // ── Round 2: Draft → Processed (no file) ─────────────────────────────────
    if (processPayments) {
      logger.info(
        `[Payments Import] ${PROCESS_PAYMENTS_CONFIG_VAR} = true — round 2: Draft PAY- Payments and Refunds → ${FINAL_STATUS}`,
      );
      const results: Record<string, UpsertResult> = {};
      const counts: Record<string, number> = {};
      for (const objectName of [SF_PAYMENT, SF_REFUND]) {
        const drafts = await sfQueryAll<{ External_ID_4D__c: string }>(
          sfBase,
          sfToken,
          `SELECT ${EXT_ID_FIELD} FROM ${objectName} ` +
            `WHERE ${EXT_ID_FIELD} LIKE '${PAYMENT_EXT_PREFIX}%' AND Status = '${LOAD_STATUS}'`,
          logger,
        );
        counts[objectName] = drafts.length;
        logger.info(
          `[Payments Import][${objectName}] ${drafts.length} Draft record(s) to process`,
        );
        results[objectName] =
          drafts.length > 0
            ? await upsertInBatches(
                drafts.map((d) => toProcessedUpdate(d.External_ID_4D__c)),
                objectName,
                sfBase,
                sfToken,
                logger,
                `[Payments Import][${objectName}]`,
              )
            : EMPTY_RESULT;
      }

      try {
        const sheet = await createPerObjectResultsSheet({
          flowName: `${FLOW_NAME} - Process`,
          objects: [SF_PAYMENT, SF_REFUND].map((objectName) => ({
            objectName,
            successfulCsv: results[objectName].successfulCsv,
            failedCsv: results[objectName].failedCsv,
          })),
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
        `[Payments Import] Round 2 complete —` +
          `\n  Payment Draft: ${counts[SF_PAYMENT]}, processed: ${results[SF_PAYMENT].processed}, failed: ${results[SF_PAYMENT].failed}` +
          `\n  Refund Draft:  ${counts[SF_REFUND]}, processed: ${results[SF_REFUND].processed}, failed: ${results[SF_REFUND].failed}`,
      );
      return {
        data: {
          round: 2,
          paymentsDraft: counts[SF_PAYMENT],
          paymentsProcessed: results[SF_PAYMENT].processed,
          paymentsFailed: results[SF_PAYMENT].failed,
          refundsDraft: counts[SF_REFUND],
          refundsProcessed: results[SF_REFUND].processed,
          refundsFailed: results[SF_REFUND].failed,
        },
      };
    }

    // ── Round 1: load Draft records from the file ────────────────────────────
    const { byteOffset, knownHeaders, windowNumber } = readWindowCursor(params);
    logger.info(
      `[Payments Import] ${PROCESS_PAYMENTS_CONFIG_VAR} = false — round 1 (load as ${LOAD_STATUS}). ` +
        `Starting window ${windowNumber} at byte ${byteOffset}…`,
    );
    const fileId = configVars["Payments File ID"] as unknown as string;
    if (!fileId) throw new Error("Payments File ID config var is empty.");

    // PaymentGroups that exist (Registration ids "REG-…", Purchase ids "PUR-…").
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
    // Transcript Requests that exist (External_ID_4D__c = raw 4D ID).
    const transcripts = await sfQueryAll<{ External_ID_4D__c: string }>(
      sfBase,
      sfToken,
      "SELECT External_ID_4D__c FROM CSP_Transcript_Request__c WHERE External_ID_4D__c != null",
      logger,
    );
    const existingTranscripts = new Set(
      transcripts.map((t) => t.External_ID_4D__c),
    );
    logger.info(
      `[Payments Import] Transcript Requests in org: ${existingTranscripts.size}`,
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
        const m = mapToPayment(
          row,
          existingGroups,
          skips,
          logger,
          REGISTRATION_LINKED_PAYMENTS,
          existingTranscripts,
        );
        if (m) mapped.push(m);
      },
    );
    const { rowsInWindow, hasMore, nextByteOffset, parsedHeaders } = window;

    logger.info(
      `[Payments Import] Window ${windowNumber} stream complete — rows=${rowsInWindow}, ` +
        `payments=${mapped.filter((m) => m.payment).length}, refunds=${mapped.filter((m) => m.refund).length}, ` +
        `skipped: outOfScope=${skips.outOfScope}, zeroAmount=${skips.zeroAmount}, ` +
        `registrationLinkedSkippedByMode=${skips.skippedRegistrationLinked}; ` +
        `loaded before cutoff (Order in org)=${skips.loadedBeforeCutoff}; ` +
        `loaded without link: registrationNotInOrg=${skips.registrationPaymentGroupMissing}, ` +
        `purchaseNotInOrg=${skips.purchasePaymentGroupMissing}, ` +
        `transcriptRequestNotInOrg=${skips.transcriptRequestMissing}; ` +
        `bothRegistrationAndPurchase(linked to Registration)=${skips.bothRegistrationAndPurchase}, ` +
        `unknownPicklistValue(left blank)=${skips.unknownPicklistValue}`,
    );
    if (
      REGISTRATION_LINKED_PAYMENTS === "load" &&
      ORDER_FLOWS_CREATE_PAYMENTS
    ) {
      logger.warn(
        '[Payments Import] REGISTRATION_LINKED_PAYMENTS="load" while the order flows also create payments — ' +
          "registration payments will be counted twice. Set one of them off before a full run.",
      );
    }

    if (TEST_MODE) {
      mapped = mapped.slice(TEST_SKIP, TEST_SKIP + TEST_LIMIT);
      logger.info(
        `[Payments Import] TEST MODE: limited to ${TEST_LIMIT} row(s) and won't invoke the next window.`,
      );
    }

    // ── Phase 1: Payment (Draft) ─────────────────────────────────────────────
    const paymentPlan = planDraftLoad(
      mapped.flatMap((m) => (m.payment ? [m.payment] : [])),
      await loadStatuses(
        sfBase,
        sfToken,
        SF_PAYMENT,
        mapped.flatMap((m) => (m.payment ? [m.payment] : [])),
      ),
    );
    logger.info(
      `[Payments Import][Payment] to send: ${paymentPlan.send.length} ` +
        `(already Draft, updated: ${paymentPlan.existingDraft}); ` +
        `already Processed/Canceled, not sent: ${paymentPlan.alreadyFinal}`,
    );
    const paymentResult =
      paymentPlan.send.length > 0
        ? await upsertInBatches(
            paymentPlan.send,
            SF_PAYMENT,
            sfBase,
            sfToken,
            logger,
            "[Payments Import][Payment]",
          )
        : EMPTY_RESULT;

    // ── Phase 2: Refund (Draft), linked to its payment when there is exactly one
    const refundRows = mapped.filter((m) => m.refund);

    // Drop registration → prior registration (Order.Prior_Registration__c).
    const refundRegKeys = [
      ...new Set(
        refundRows
          .filter((m) => m.registrationId && !m.payment)
          .map((m) => registrationExtId(m.registrationId)),
      ),
    ];
    const priorRows = await queryInChunks(refundRegKeys, (inList) =>
      sfQueryAll<{
        External_ID_4D__c: string;
        Prior_Registration__r: { External_ID_4D__c: string | null } | null;
      }>(
        sfBase,
        sfToken,
        `SELECT External_ID_4D__c, Prior_Registration__r.External_ID_4D__c FROM Order ` +
          `WHERE Prior_Registration__c != null AND External_ID_4D__c IN (${inList})`,
      ),
    );
    const priorByRegKey = new Map<string, string>();
    for (const o of priorRows) {
      const prior = o.Prior_Registration__r?.External_ID_4D__c;
      if (prior) priorByRegKey.set(o.External_ID_4D__c, prior);
    }

    // PAY- Payments on those prior registrations' PaymentGroups (includes the
    // ones phase 1 just loaded, and ones from earlier windows / runs).
    const priorKeys = [...new Set(priorByRegKey.values())];
    const priorPayments = await queryInChunks(priorKeys, (inList) =>
      sfQueryAll<{
        External_ID_4D__c: string;
        PaymentGroup: { External_ID_4D__c: string | null } | null;
      }>(
        sfBase,
        sfToken,
        `SELECT External_ID_4D__c, PaymentGroup.External_ID_4D__c FROM Payment ` +
          `WHERE External_ID_4D__c LIKE '${PAYMENT_EXT_PREFIX}%' AND PaymentGroup.External_ID_4D__c IN (${inList})`,
      ),
    );
    const paymentsByGroupKey = new Map<string, string[]>();
    // Payments known to be in Salesforce — only these can be Payment__c.
    const paymentsInOrg = new Set(
      parseSuccessfulSfIds(paymentResult.successfulCsv).keys(),
    );
    for (const p of priorPayments) {
      paymentsInOrg.add(p.External_ID_4D__c);
      const g = p.PaymentGroup?.External_ID_4D__c;
      if (!g) continue;
      paymentsByGroupKey.set(g, [
        ...(paymentsByGroupKey.get(g) ?? []),
        p.External_ID_4D__c,
      ]);
    }

    const linkStats: Record<
      RefundLinkMiss | "linked" | "paymentNotInOrg",
      number
    > = {
      linked: 0,
      paymentNotInOrg: 0,
      noRegistration: 0,
      noPriorRegistration: 0,
      priorHasNoPayment: 0,
      priorHasSeveralPayments: 0,
    };
    const refunds: SfRecord[] = [];
    for (const m of refundRows) {
      const found = findRefundPayment(m, priorByRegKey, paymentsByGroupKey);
      // A payment that is not in Salesforce (e.g. failed in phase 1) cannot
      // be Payment__c — sending it would reject the refund.
      const paymentExtId =
        "paymentExtId" in found && paymentsInOrg.has(found.paymentExtId)
          ? found.paymentExtId
          : undefined;
      if ("miss" in found) linkStats[found.miss]++;
      else if (paymentExtId) linkStats.linked++;
      else linkStats.paymentNotInOrg++;
      refunds.push(applyRefundLink(m.refund!, paymentExtId));
    }
    logger.info(
      `[Payments Import][Refund] ${refunds.length} refund(s): linked to their payment=${linkStats.linked}; ` +
        `NonReferenced — its payment is not in Salesforce=${linkStats.paymentNotInOrg}, ` +
        `no registration=${linkStats.noRegistration}, ` +
        `no prior registration in org=${linkStats.noPriorRegistration}, ` +
        `prior registration has no payment=${linkStats.priorHasNoPayment}, ` +
        `prior registration has 2+ payments=${linkStats.priorHasSeveralPayments}`,
    );

    const refundPlan = planDraftLoad(
      refunds,
      await loadStatuses(sfBase, sfToken, SF_REFUND, refunds),
    );
    logger.info(
      `[Payments Import][Refund] to send: ${refundPlan.send.length} ` +
        `(already Draft, updated: ${refundPlan.existingDraft}); ` +
        `already Processed/Canceled, not sent: ${refundPlan.alreadyFinal}`,
    );
    const refundResult =
      refundPlan.send.length > 0
        ? await upsertInBatches(
            refundPlan.send,
            SF_REFUND,
            sfBase,
            sfToken,
            logger,
            "[Payments Import][Refund]",
          )
        : EMPTY_RESULT;

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
        `\n  Payment submitted: ${paymentPlan.send.length}, processed: ${paymentResult.processed}, failed: ${paymentResult.failed}, already final: ${paymentPlan.alreadyFinal}` +
        `\n  Refund submitted:  ${refundPlan.send.length}, processed: ${refundResult.processed}, failed: ${refundResult.failed}, already final: ${refundPlan.alreadyFinal}`,
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
        `[Payments Import] All rows processed — round 1 complete after ${windowNumber} window(s). ` +
          `Check the Draft records, then set ${PROCESS_PAYMENTS_CONFIG_VAR} = true and run again.`,
      );
    }

    return {
      data: {
        round: 1,
        windowNumber,
        byteOffset,
        nextByteOffset,
        hasMore,
        rowsInWindow,
        payments: paymentPlan.send.length,
        paymentsProcessed: paymentResult.processed,
        paymentsFailed: paymentResult.failed,
        paymentsAlreadyFinal: paymentPlan.alreadyFinal,
        refunds: refundPlan.send.length,
        refundsProcessed: refundResult.processed,
        refundsFailed: refundResult.failed,
        refundsAlreadyFinal: refundPlan.alreadyFinal,
        refundsLinkedToPayment: linkStats.linked,
      },
    };
  },
});

export default [paymentsImport];
