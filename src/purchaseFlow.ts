/**
 * Stanford CSP Migration – Purchase Import flow.
 *
 * Source: "Purchase" tab of the mapping workbook. A 4D Purchase is a
 * non-course sale (transcript fee, manuscript surcharge, …) paid by card. It
 * lands in Education Cloud the same way a Registration does, so this flow is
 * the Registration flow's twin and uses the identical 4-phase chain:
 *
 *   1. CardPaymentMethod — card details (skipped when the row carries no card data)
 *   2. Order             — the purchase header (Draft, Standard Price Book)
 *   3. PaymentGroup      — one per Order (SourceObjectId = the Order's Id)
 *   4. Payment           — one Capture/Processed payment (PaymentGroupId)
 *
 * Purchase Item (OrderItem) rows are loaded by the separate Purchase Item
 * Import flow, which must run AFTER this one.
 *
 * EXTERNAL IDs ARE PREFIXED "PUR-". Registration writes the raw Registration.ID
 * into External_ID_4D__c on these same four objects, and Purchase.ID values
 * overlap (both start at 1). Without a prefix, a Purchase upsert would silently
 * OVERWRITE the Registration record with the same number. Registration keeps
 * its raw ids (already loaded in UAT); everything new gets a prefix.
 *
 * PREREQUISITES: Student flow (AccountId resolved via the external-ID
 * relationship `Account.Student_ID_4D__c`, as in Registration).
 * Purchase Inventory is NOT required by this flow, but Order.Pricebook2Id is
 * set to the Standard Price Book so Purchase Item can attach OrderItems later.
 *
 * Windowed execution / TEST_MODE: identical model to registrationFlow.ts
 * (byte-offset cursor, MAX_ROWS per window, self-invoke). TEST_MODE is ON.
 *
 * Differences from the workbook that the review flagged — each is a decision
 * for the architect, none is silent:
 *   - Order.Status: workbook says "Direct Map" from Purchase.Status ("Paid").
 *     Order.Status is a restricted Draft/Activated picklist and Salesforce
 *     rejects any new Order that isn't Draft (see Registration notes). "Paid"
 *     cannot be written. Orders are created Draft; the source status is not
 *     preserved anywhere yet.
 *   - Order.TotalAmount (← Subtotal): not writable (derived from OrderItems).
 *     Not mapped. Purchase Item supplies the amounts.
 *   - Order balance: workbook says BalanceDue__c; the field verified in
 *     Stanford_UAT (and used by Registration) is Balance_Due__c. Using the
 *     verified name.
 *   - Order.Description: workbook maps BOTH Notes and Message to Description.
 *     They are concatenated (Notes, blank line, Message).
 *   - Order.Payment_Transaction_Id__c (← CC_Transaction_ID): per workbook.
 *     Registration used OrderReferenceNumber for the same source column — the
 *     two tabs disagree. Field is not among the ones verified in UAT.
 *   - CardPaymentMethod.GatewayDate (← CC_Transaction_ID_Date_Entered): per
 *     workbook; not verified in UAT.
 *   - CC_Exp_Date: workbook says "Direct Map" into ExpiryMonth/ExpiryYear but
 *     the source is packed ("1020"); the Registration unpacking is reused.
 *   - Check_Amt, Reconciliation_ID, Student_Country: marked Direct Map with NO
 *     target in the workbook. Not mapped.
 *   - Order.BillToContact: not on this tab (it is on Registration). Not mapped.
 *   - Order.EffectiveDate (← Purchase_Date): required on Order. A row with no
 *     parseable Purchase_Date is out of scope.
 *   - 2-year scope: no cutoff column exists on this tab. Purchase_Date >=
 *     COMMERCE_TWO_YEAR_CUTOFF is assumed.
 */

import { flow, type Connection } from "@prismatic-io/spectral";
import {
  str,
  toDate,
  toSalesforceCountryCode,
  toSalesforceStateCode,
  getAccessToken,
  getSfInstanceUrl,
} from "./utils";
import { createPerObjectResultsSheet } from "./reportResults";
import {
  COMMERCE_TWO_YEAR_CUTOFF,
  EXT_ID_FIELD,
  type SfRecord,
  buildStudentEmailCache,
  getStandardPricebookId,
  invokeNextWindow,
  parseCurrency,
  parseExpiry,
  parseInteger,
  parseSuccessfulSfIds,
  readWindowCursor,
  streamTsvWindow,
  stripDotZero,
  upsertInBatches,
} from "./commerceShared";

const SF_CARD_PAYMENT_METHOD = "CardPaymentMethod";
const SF_ORDER = "Order";
const SF_PAYMENT_GROUP = "PaymentGroup";
const SF_PAYMENT = "Payment";
const FLOW_NAME = "Purchase Import";

/** External-ID namespace — see header. */
export const PURCHASE_EXT_PREFIX = "PUR-";

const MAX_ROWS = 25_000;
const TEST_MODE = true; // process one window only, no self-invoke
const TEST_LIMIT = 50;
const TEST_SKIP = 0;

/** Same default Registration uses (Draft is the only creatable Order status). */
const DEFAULT_ORDER_STATUS = "Draft";

const TEMP_STUDENT_ID_KEY = "_studentId4D";

export interface RawPurchaseRow {
  ID?: string;
  Student_ID?: string;
  Purchase_Date?: string;
  Status?: string;
  Notes?: string;
  Message?: string;
  CC_Last_Four?: string;
  CC_Exp_Date?: string;
  CC_Billing_Last_Name?: string;
  CC_Billing_First_Name?: string;
  CC_Billing_Address?: string;
  CC_Billing_City?: string;
  CC_Billing_State?: string;
  CC_Billing_Zip?: string;
  CC_Billing_Country?: string;
  CC_Transaction_ID?: string;
  CC_Transaction_ID_Date_Entered?: string;
  CC_Card_Type?: string;
  CC_Amt?: string;
  Subtotal?: string;
  Balance_Due?: string;
  [key: string]: string | undefined;
}

export function purchaseExtId(id: string): string {
  return `${PURCHASE_EXT_PREFIX}${id}`;
}

function billingAddressFields(raw: RawPurchaseRow) {
  const street = str(raw.CC_Billing_Address);
  const city = str(raw.CC_Billing_City);
  const countryCode = toSalesforceCountryCode(raw.CC_Billing_Country);
  const stateCode = countryCode
    ? toSalesforceStateCode(raw.CC_Billing_State, countryCode)
    : str(raw.CC_Billing_State);
  const zip = str(raw.CC_Billing_Zip);
  return { street, city, countryCode, stateCode, zip };
}

export function mapToCardPaymentMethod(raw: RawPurchaseRow): SfRecord | null {
  const id = str(raw.ID).trim();
  if (!id) return null;

  // Same guard as Registration: no card identifiers → no CardPaymentMethod.
  const hasCardData =
    str(raw.CC_Card_Type) || str(raw.CC_Last_Four) || str(raw.CC_Exp_Date);
  if (!hasCardData) return null;

  const record: SfRecord = {
    [EXT_ID_FIELD]: purchaseExtId(id),
    Status: "Active",
    ProcessingMode: "External",
  };

  const studentId = stripDotZero(raw.Student_ID);
  if (studentId && studentId !== "0") {
    record["Account.Student_ID_4D__c"] = studentId;
  }

  const { street, city, countryCode, stateCode, zip } =
    billingAddressFields(raw);
  if (street) record.PaymentMethodStreet = street;
  if (city) record.PaymentMethodCity = city;
  if (countryCode) record.PaymentMethodCountryCode = countryCode;
  if (stateCode) record.PaymentMethodStateCode = stateCode;
  if (zip) record.PaymentMethodPostalCode = zip;

  const cardType = str(raw.CC_Card_Type);
  if (cardType) record.CardType = cardType;

  const expiry = parseExpiry(raw.CC_Exp_Date);
  if (expiry) {
    record.ExpiryMonth = expiry.month;
    record.ExpiryYear = expiry.year;
  }

  const lastFour = parseInteger(raw.CC_Last_Four);
  if (lastFour !== undefined) record.CardLastFour = lastFour;

  const firstName = str(raw.CC_Billing_First_Name);
  if (firstName) record.CardHolderFirstName = firstName;
  const lastName = str(raw.CC_Billing_Last_Name);
  if (lastName) record.CardHolderLastName = lastName;

  const gatewayDate = toDate(raw.CC_Transaction_ID_Date_Entered);
  if (gatewayDate) record.GatewayDate = gatewayDate;

  return record;
}

export function mapToOrder(
  raw: RawPurchaseRow,
  standardPricebookId: string,
): SfRecord | null {
  const id = str(raw.ID).trim();
  if (!id) return null;

  const purchaseDate = toDate(raw.Purchase_Date);
  if (!purchaseDate) return null; // EffectiveDate is required

  const record: SfRecord = {
    [EXT_ID_FIELD]: purchaseExtId(id),
    Status: DEFAULT_ORDER_STATUS,
    EffectiveDate: purchaseDate,
    Pricebook2Id: standardPricebookId,
  };

  const studentId = stripDotZero(raw.Student_ID);
  if (studentId && studentId !== "0") {
    record["Account.Student_ID_4D__c"] = studentId;
  }

  const notes = str(raw.Notes)
    .replace(/_4DNL_/g, "\n")
    .trim();
  const message = str(raw.Message)
    .replace(/_4DNL_/g, "\n")
    .trim();
  const description = [notes, message].filter(Boolean).join("\n\n");
  if (description) record.Description = description.slice(0, 32000);

  const txnId = str(raw.CC_Transaction_ID);
  if (txnId) record.Payment_Transaction_Id__c = txnId;

  const balanceDue = parseCurrency(raw.Balance_Due);
  if (balanceDue !== undefined) record.Balance_Due__c = balanceDue;

  return record;
}

export function mapToPayment(
  raw: RawPurchaseRow,
  logger: { warn: (m: string) => void },
): SfRecord | null {
  const id = str(raw.ID).trim();
  if (!id) return null;

  const amount = parseCurrency(raw.CC_Amt);
  if (amount === undefined || amount === 0) return null;
  if (amount < 0) {
    logger.warn(
      `[Purchase Import][Payment] Purchase ${id} has a negative CC_Amt (${amount}) — ` +
        'creating as Type="Capture" with negative Amount, same interim handling as Registration refunds.',
    );
  }

  const record: SfRecord = {
    [EXT_ID_FIELD]: purchaseExtId(id),
    Type: "Capture",
    Status: "Processed",
    ProcessingMode: "External",
    Amount: amount,
  };

  const studentId = stripDotZero(raw.Student_ID);
  if (studentId && studentId !== "0") {
    record["Account.Student_ID_4D__c"] = studentId;
    record[TEMP_STUDENT_ID_KEY] = studentId;
  }

  const effectiveDate = toDate(raw.CC_Transaction_ID_Date_Entered);
  if (effectiveDate) record.EffectiveDate = effectiveDate;

  return record;
}

export const purchaseImport = flow({
  name: FLOW_NAME,
  stableKey: "purc2026-1014-4a02-9b10-0a1b2c3d4e02",
  description:
    "Streams the Purchase TSV from Google Drive one window at a time and " +
    "bulk-upserts CardPaymentMethod, Order, PaymentGroup, and Payment " +
    "records (External IDs prefixed PUR-). Must run after the Student flow " +
    "and before Purchase Item Import.",

  onTrigger: async (_context, payload) => {
    await Promise.resolve();
    return { payload };
  },

  onExecution: async (context, params) => {
    const { logger, configVars } = context;
    const { byteOffset, knownHeaders, windowNumber } = readWindowCursor(params);

    logger.info(
      `[Purchase Import] Starting window ${windowNumber} at byte ${byteOffset}…`,
    );

    const gdConn = configVars[
      "Google Drive Connection"
    ] as unknown as Connection;
    const sfConn = configVars["Salesforce Connection"] as unknown as Connection;
    const fileId = configVars["Purchase File ID"] as unknown as string;
    const failedFolderId = configVars["Failed Records Folder ID"] as
      string | undefined;
    if (!fileId) throw new Error("Purchase File ID config var is empty.");

    const gdToken = getAccessToken(gdConn);
    const sfToken = getAccessToken(sfConn);
    const sfBase = getSfInstanceUrl(sfConn);

    // ── Pre-flight caches + stream this window, in parallel ──────────────────
    let cardPaymentMethods: SfRecord[] = [];
    let orders: SfRecord[] = [];
    let payments: SfRecord[] = [];
    let filteredOut = 0;

    const stdPricebookId = await getStandardPricebookId(sfBase, sfToken);

    const [emailCache, window] = await Promise.all([
      buildStudentEmailCache(sfBase, sfToken, logger),
      streamTsvWindow(
        fileId,
        gdToken,
        byteOffset,
        MAX_ROWS,
        knownHeaders,
        (row: RawPurchaseRow) => {
          const purchaseDate = toDate(row.Purchase_Date);
          if (!purchaseDate || purchaseDate < COMMERCE_TWO_YEAR_CUTOFF) {
            filteredOut++;
            return;
          }
          const cpm = mapToCardPaymentMethod(row);
          if (cpm) cardPaymentMethods.push(cpm);
          const order = mapToOrder(row, stdPricebookId);
          if (order) orders.push(order);
          const payment = mapToPayment(row, logger);
          if (payment) payments.push(payment);
        },
      ),
    ]);
    const { rowsInWindow, hasMore, nextByteOffset, parsedHeaders } = window;

    logger.info(
      `[Purchase Import] Window ${windowNumber} stream complete — rows=${rowsInWindow}, ` +
        `filteredOut(2yr scope)=${filteredOut}, hasMore=${hasMore}, nextByte=${nextByteOffset}, ` +
        `cardPaymentMethods=${cardPaymentMethods.length}, orders=${orders.length}, payments=${payments.length}`,
    );

    // GroupPayee (Text, not a lookup) — stitched from the email cache.
    let groupPayeeMissing = 0;
    for (const payment of payments) {
      const studentId = payment[TEMP_STUDENT_ID_KEY] as string | undefined;
      delete payment[TEMP_STUDENT_ID_KEY];
      if (!studentId) continue;
      const email = emailCache.get(studentId);
      if (email) payment.GroupPayee__c = email;
      else groupPayeeMissing++;
    }
    if (groupPayeeMissing > 0) {
      logger.warn(
        `[Purchase Import][Payment] ${groupPayeeMissing} record(s) missing GroupPayee — ` +
          "Student_ID had no matching Account email in the cache",
      );
    }

    if (TEST_MODE) {
      cardPaymentMethods = cardPaymentMethods.slice(
        TEST_SKIP,
        TEST_SKIP + TEST_LIMIT,
      );
      orders = orders.slice(TEST_SKIP, TEST_SKIP + TEST_LIMIT);
      payments = payments.slice(TEST_SKIP, TEST_SKIP + TEST_LIMIT);
      logger.info(
        `[Purchase Import] TEST MODE: skipped first ${TEST_SKIP}, limited to next ${TEST_LIMIT} records per object, and won't invoke the next window.`,
      );
    }

    // ── Phase 1: CardPaymentMethod ───────────────────────────────────────────
    const cpm =
      cardPaymentMethods.length > 0
        ? await upsertInBatches(
            cardPaymentMethods,
            SF_CARD_PAYMENT_METHOD,
            sfBase,
            sfToken,
            logger,
            "[Purchase Import][CardPaymentMethod]",
          )
        : { processed: 0, failed: 0, successfulCsv: "", failedCsv: "" };

    // ── Phase 2: Order ───────────────────────────────────────────────────────
    const orderResult =
      orders.length > 0
        ? await upsertInBatches(
            orders,
            SF_ORDER,
            sfBase,
            sfToken,
            logger,
            "[Purchase Import][Order]",
          )
        : { processed: 0, failed: 0, successfulCsv: "", failedCsv: "" };

    // ── Phase 3: PaymentGroup (one per successful Order) ─────────────────────
    const orderSfIds = parseSuccessfulSfIds(orderResult.successfulCsv);
    const paymentGroups: SfRecord[] = [];
    for (const [extId, orderSfId] of orderSfIds) {
      paymentGroups.push({ [EXT_ID_FIELD]: extId, SourceObjectId: orderSfId });
    }
    if (orders.length > 0 && paymentGroups.length < orders.length) {
      logger.warn(
        `[Purchase Import][PaymentGroup] ${orders.length - paymentGroups.length} ` +
          "purchase(s) have no PaymentGroup — their Order did not succeed",
      );
    }
    const pg =
      paymentGroups.length > 0
        ? await upsertInBatches(
            paymentGroups,
            SF_PAYMENT_GROUP,
            sfBase,
            sfToken,
            logger,
            "[Purchase Import][PaymentGroup]",
          )
        : { processed: 0, failed: 0, successfulCsv: "", failedCsv: "" };

    // Stitch PaymentGroupId onto Payments
    const pgSfIds = parseSuccessfulSfIds(pg.successfulCsv);
    let paymentGroupMissing = 0;
    for (const payment of payments) {
      const pgId = pgSfIds.get(payment[EXT_ID_FIELD] as string);
      if (pgId) payment.PaymentGroupId = pgId;
      else paymentGroupMissing++;
    }
    if (paymentGroupMissing > 0) {
      logger.warn(
        `[Purchase Import][Payment] ${paymentGroupMissing} record(s) missing PaymentGroupId — ` +
          "their PaymentGroup (or its parent Order) did not succeed",
      );
    }

    // ── Phase 4: Payment ─────────────────────────────────────────────────────
    const paymentResult =
      payments.length > 0
        ? await upsertInBatches(
            payments,
            SF_PAYMENT,
            sfBase,
            sfToken,
            logger,
            "[Purchase Import][Payment]",
          )
        : { processed: 0, failed: 0, successfulCsv: "", failedCsv: "" };

    // ── Results sheet ────────────────────────────────────────────────────────
    try {
      const sheet = await createPerObjectResultsSheet({
        flowName: FLOW_NAME,
        objects: [
          {
            objectName: SF_CARD_PAYMENT_METHOD,
            successfulCsv: cpm.successfulCsv,
            failedCsv: cpm.failedCsv,
          },
          {
            objectName: SF_ORDER,
            successfulCsv: orderResult.successfulCsv,
            failedCsv: orderResult.failedCsv,
          },
          {
            objectName: SF_PAYMENT_GROUP,
            successfulCsv: pg.successfulCsv,
            failedCsv: pg.failedCsv,
          },
          {
            objectName: SF_PAYMENT,
            successfulCsv: paymentResult.successfulCsv,
            failedCsv: paymentResult.failedCsv,
          },
        ],
        accessToken: gdToken,
        folderId: failedFolderId,
      });
      logger.info(`[Purchase Import] Results sheet: ${sheet.url}`);
    } catch (err) {
      logger.warn(
        `[Purchase Import] Could not write results sheet: ${String(err)}`,
      );
    }

    logger.info(
      `[Purchase Import] Window ${windowNumber} complete —` +
        `\n  Window rows:                 ${rowsInWindow}` +
        `\n  CardPaymentMethod submitted: ${cardPaymentMethods.length}, processed: ${cpm.processed}, failed: ${cpm.failed}` +
        `\n  Order submitted:             ${orders.length}, processed: ${orderResult.processed}, failed: ${orderResult.failed}` +
        `\n  PaymentGroup submitted:      ${paymentGroups.length}, processed: ${pg.processed}, failed: ${pg.failed}` +
        `\n  Payment submitted:           ${payments.length}, processed: ${paymentResult.processed}, failed: ${paymentResult.failed}`,
    );

    if (TEST_MODE && hasMore) {
      logger.info(
        "[Purchase Import] TEST MODE: more rows remain, but stopping here — set TEST_MODE = false to process the full file.",
      );
    } else if (hasMore) {
      await invokeNextWindow(context, FLOW_NAME, {
        byteOffset: nextByteOffset,
        headers: parsedHeaders,
        windowNumber: windowNumber + 1,
      });
    } else {
      logger.info(
        `[Purchase Import] All rows processed — import complete after ${windowNumber} window(s).`,
      );
    }

    return {
      data: {
        windowNumber,
        byteOffset,
        nextByteOffset,
        hasMore,
        rowsInWindow,
        cardPaymentMethods: cardPaymentMethods.length,
        cardPaymentMethodsProcessed: cpm.processed,
        cardPaymentMethodsFailed: cpm.failed,
        orders: orders.length,
        ordersProcessed: orderResult.processed,
        ordersFailed: orderResult.failed,
        paymentGroups: paymentGroups.length,
        paymentGroupsProcessed: pg.processed,
        paymentGroupsFailed: pg.failed,
        payments: payments.length,
        paymentsProcessed: paymentResult.processed,
        paymentsFailed: paymentResult.failed,
      },
    };
  },
});

export default [purchaseImport];
