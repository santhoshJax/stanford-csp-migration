/**
 * Stanford CSP Migration – Registration Import flow.
 *
 * Windowed execution (same model as the Student flow): streams the
 * Registration TSV from Google Drive in MAX_ROWS-row windows using HTTP
 * Range headers (cursor = byteOffset). Each execution downloads only the
 * bytes it needs, maps that window to Salesforce records, and bulk-upserts
 * via Bulk API 2.0. When more rows remain the flow invokes itself
 * recursively via context.invokeFlow, advancing the byte cursor to where
 * the previous window ended — this is what keeps a single execution from
 * having to hold the entire (very large) source file in memory at once.
 *
 * ORDER LIFECYCLE (2026-11-02 — CURRENT; supersedes the Order.Status,
 * TotalAmount and "no OrderItems" notes further down, kept as history):
 *   Round 1  "Activate Registration Orders" = false → Orders are created Draft
 *            with Pricebook2Id = the order price book (first custom book in
 *            the "Price Books" config var).
 *   Items    Registration Item Import (src/registrationItemFlow.ts) reads the
 *            Enrollment TSV and adds one OrderItem per enrollment
 *            (ENR-{Enrollment.ID}, UnitPrice = Tuition, Quantity 1).
 *   Round 2  "Activate Registration Orders" = true → every Draft Order with at
 *            least one OrderItem is switched to Activated (planOrderActivation,
 *            shared with Purchase Import). Draft Orders without items stay
 *            Draft and are logged; Activated Orders are never re-sent.
 *   Extra lines (2026-11-05 / 2026-11-09), all on the Order's price book:
 *     FEE-{id}  round 1, UnitPrice = Reg_Fee ("Registration Fee Product")
 *     STAP-{id} round 1, UnitPrice = Discount_Amt (signed) when the discount
 *               type is STAP Benefit ("STAP Product")
 *     DROP-{id} round 2, before activation, UnitPrice = Courses_Subtotal on a
 *               drop Order (Prior_Registration_ID set) with no ENR- line;
 *               product = the prior registration's course line, else
 *               "Course Drop Product". So drop Orders get a line and activate.
 *   Prior_Registration_ID → Order.Prior_Registration__c, only when the prior
 *   Order is already in Salesforce (otherwise loaded unlinked and counted).
 *   Order.TotalAmount stays unmapped — Salesforce calculates it from the
 *   OrderItems, and the workbook's CC_Amt → TotalAmount row is a
 *   reconciliation check against the Payment total.
 *
 * Each window bulk-upserts FOUR Salesforce objects from each source row:
 *   1. CardPaymentMethod — stored card details (billing name/address, card
 *      type, last four, expiry).
 *   2. Order             — the registration/order record itself (billing
 *      address, amounts, dates, discount/TA info, notes).
 *   3. PaymentGroup       — one per Order, created after Order so it can
 *      point SourceObjectId at the real Order Id. Upserted on
 *      External_ID_4D__c = "REG-" + Registration.ID like everything else, which
 *      satisfies the workbook's "if a PaymentGroup already exists for this
 *      Order, reuse it" rule for free (a re-run just updates the same row
 *      instead of creating a duplicate). Payment_Number__c is an AutoNumber
 *      field — Salesforce assigns it, nothing is mapped to it.
 *   4. Payment            — a single Capture/Processed payment record per
 *      registration (amount, effective date, payee, PaymentGroupId).
 *
 * Runs in 4 phases because of the PaymentGroup dependency chain: Order must
 * exist before PaymentGroup can reference it (SourceObjectId), and
 * PaymentGroup must exist before Payment can reference it (PaymentGroupId).
 * CardPaymentMethod has no such dependency and could run anywhere, but stays
 * first to match the workbook's field order. Real Salesforce Ids are pulled
 * out of each phase's Bulk API successfulResults CSV (sf__Id column) and
 * matched back to source rows via External_ID_4D__c — no extra SOQL queries
 * needed for this chaining.
 *
 * Source: "CSP Data Migration Mapping Workbook - Registration.pdf" (architect
 * mapping doc, updated with the PaymentGroup/Order.Status addendum). Field-
 * by-field mapping below follows that workbook's "Map Type" column: "Direct
 * Map" rows are passed through with only type coercion (currency/date
 * parsing); "Conversion" rows apply the specific logic the workbook calls
 * out in its Notes column. Anything the workbook marks "Do Not Map" is
 * intentionally excluded and skipped entirely, with no exceptions borrowed
 * from other flows: Batch_Print, Created_By/Date/Time, Last_Modified_By/
 * Date/Time, Prior_Registration_ID, Reconciliation_ID, Student_Country,
 * Student_ID_Previous.
 *
 * PREREQUISITES (must run before this flow):
 *   Student flow — loads Person Account / Contact, both carrying
 *   Student_ID_4D__c (confirmed present on BOTH Account and Contact in this
 *   org). Because of that, AccountId and BillToContactId are resolved by
 *   Salesforce itself during the Bulk API job via external-ID relationship
 *   syntax (`Account.Student_ID_4D__c` / `BillToContact.Student_ID_4D__c`)
 *   — no pre-flight SOQL query needed for either. Only Payment.GroupPayee
 *   (an actual email string, not a lookup) still needs a real value fetched
 *   ahead of time — see "Student email cache" below.
 *
 * Upsert key: External_ID_4D__c = "REG-" + Registration.ID (registrationExtId
 *   in commerceShared), set on all four objects. Decided 2026-11-02 so that
 *   Registration and Purchase ("PUR-") records can be told apart by key.
 *   Registration Item Import finds the Order, and Payments Import the
 *   PaymentGroup, with the same REG- key.
 *
 * Student email cache: Salesforce's external-ID relationship trick only
 *   resolves lookup fields (a value copied into a Text field, like
 *   GroupPayee, is out of scope for it — Bulk API can't do that during
 *   ingest). This flow still runs one SOQL query
 *   (Student_ID_4D__c → PersonEmail only, ~190k Account rows / ~95 pages of
 *   2,000) but fires it in parallel with the TSV streaming/mapping step via
 *   Promise.all, instead of blocking on it first — the two no longer have
 *   any dependency on each other. GroupPayee is stitched onto the already-
 *   mapped Payment records once both finish. Each page is logged as it
 *   comes in so this step is never silently stuck.
 *
 * Compound address fields — VERIFIED against the real org (`sf sobject
 * describe` run against the STANFORD-DEV sandbox, not just the workbook):
 *   CardPaymentMethod : PaymentMethodStreet, PaymentMethodCity,
 *                        PaymentMethodStateCode, PaymentMethodPostalCode,
 *                        PaymentMethodCountryCode
 *   Order              : BillingStreet, BillingCity, BillingStateCode,
 *                        BillingPostalCode, BillingCountryCode
 *   The workbook's dotted notation (e.g. "PaymentMethodAddress.street")
 *   describes the compound field *grouping* in Setup, not what Bulk API 2.0
 *   accepts on ingest — dotted names in a Bulk API payload mean "traverse
 *   this relationship", not "set this compound sub-field". Bulk fix applied
 *   after the describe: CardPaymentMethod's bare Street/City/StateCode/
 *   PostalCode/CountryCode do not exist on that object at all — real names
 *   are "PaymentMethod"-prefixed. (Order's Billing* names were already
 *   right.) Also confirmed: State/Country are Picklist-typed on both
 *   objects, so the *Code component is the real writable field, not the
 *   plain State/Country text-mirror field — this flow already used
 *   CountryCode/BillingCountryCode but had been inconsistently writing
 *   State/BillingState until fixed to StateCode/BillingStateCode too.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * VERIFIED 2026-09-29 via `sf sobject describe` against the STANFORD-DEV
 * sandbox (not just the workbook). This is real org metadata, not
 * assumption — see below for what's confirmed working vs. what's a hard
 * blocker right now.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ✅ CONFIRMED against Stanford_UAT (the authoritative org — confirmed
 * 2026-09-29 after STANFORD-DEV and Stanford_UAT were found out of sync;
 * UAT is the one that matters). No changes needed, all verified working:
 *   - External_ID_4D__c exists and is flagged External ID on all 4 objects
 *     this flow writes to (CardPaymentMethod, Order, PaymentGroup, Payment)
 *     plus Account/Contact (used by the relationship-syntax lookups).
 *   - All 9 of Order's mapped custom fields exist: Adjustment__c,
 *     BalanceDue__c (was Balance_Due__c until 2026-11-09), Check_Amount__c,
 *     Check_Number__c, Courses_Subtotal__c,
 *     Discount_Amount__c, TA_Discount_Type__c, Registration_Fee__c,
 *     Registration_Date__c.
 *   - Payment.GroupPayee__c exists (Text 255) — initially came back missing
 *     from an `sf sobject describe` check, which turned out to be a
 *     Field-Level Security restriction on the checking user, not a missing
 *     field (Setup showed it fine). FLS was updated to grant the migration
 *     permission set access, re-verified accessible via describe after.
 *     Worth remembering: a field "missing" from describe() can mean FLS,
 *     not "doesn't exist" — check Setup directly if a describe result looks
 *     surprising.
 *   - PaymentGroup.SourceObjectId exists; no other field is required to
 *     save one — confirmed independently both by describe() (only 9 fields
 *     total on the object) and by the architect directly in a design
 *     review call ("the payment group itself doesn't really have any other
 *     fields on it... it's the ID and then here's your source object").
 *     That same call also confirmed creating a new PaymentGroup per
 *     registration (rather than a stricter reuse-lookup) is fine — matches
 *     this flow's upsert-by-External_ID_4D__c approach already.
 *   - PaymentGroup's AutoNumber field is actually named PaymentGroupNumber
 *     in this org — neither "PaymentNumber" nor "Payment_Number__c", the
 *     two names the workbook has used across its revisions. Not mapped to
 *     either way since it's AutoNumber, but worth knowing for accuracy.
 *   - CardPaymentMethod/Order/Payment's other fields (AccountId,
 *     BillToContactId, billing address, Status, OrderReferenceNumber,
 *     PoDate, Description, CardType, ExpiryMonth/Year, CardLastFour,
 *     CardHolderFirstName/LastName, Type, Amount, PaymentGroupId) all exist
 *     with the expected types. (Order.TotalAmount is the one exception —
 *     see the 2026-09-30 real-run findings below: it exists but isn't
 *     writable by anyone, which `describe()` alone didn't make obvious.)
 *
 * 🐛 BUGS FOUND AND FIXED BY THIS VERIFICATION:
 *   - CardPaymentMethod's address fields were wrong. Bare Street/City/
 *     StateCode/PostalCode/CountryCode do not exist on this object — the
 *     real fields are prefixed "PaymentMethod" (PaymentMethodStreet, etc.).
 *     Every CardPaymentMethod record would have been rejected outright.
 *     Fixed.
 *   - Order.EffectiveDate: previously believed (from a prior manual check)
 *     not to exist on Order at all, and the mapping was removed on that
 *     basis. The describe call shows it DOES exist and is REQUIRED. That
 *     earlier information was wrong — restored the mapping (Registration_Date
 *     falling back to PoDate), since without it every Order fails to save.
 *     Still no real source mapped to it in the workbook — confirm with
 *     architect whether the Registration_Date fallback is correct.
 *   - State/Country picklist fields: this flow was inconsistently writing
 *     State/BillingState instead of StateCode/BillingStateCode (while
 *     already correctly using CountryCode/BillingCountryCode) — fixed.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * FIRST REAL BULK API RUN — 2026-09-30, 100 records/object against
 * Stanford_UAT (TEST_MODE window 1). All 300 records failed; every failure
 * had a specific, actionable Bulk API error — none were silent or generic.
 * This surfaced 4 things `sf sobject describe` alone didn't catch, since it
 * shows a field exists but not always whether it's actually writable or
 * what a default should be:
 * ══════════════════════════════════════════════════════════════════════════
 *   - CardPaymentMethod.Status and .ProcessingMode — both required, neither
 *     in the workbook, neither had a code default. FIXED: Status="Active",
 *     ProcessingMode="External". CONFIRMED by architect (2026-10-01) — both
 *     *values* are correct, no longer a guess. BUT a second real run the
 *     same day showed ProcessingMode is also blocked by Field-Level
 *     Security on this org's migration permission set
 *     (INVALID_FIELD_FOR_INSERT_UPDATE, same failure mode as the earlier
 *     GroupPayee__c issue) — needs FLS edit access granted, same fix
 *     pattern as before, on both CardPaymentMethod and Payment.
 *   - Payment.Status and .ProcessingMode — Status="Processed" was already
 *     from the workbook; ProcessingMode="External" was the same guess as
 *     CardPaymentMethod's. Both CONFIRMED by architect (2026-10-01), same
 *     FLS caveat as CardPaymentMethod above.
 *   - Order.Status — REOPENED (2026-10-01): "Default to Activated" (the
 *     architect's earlier addendum) fails outright — FAILED_ACTIVATION:
 *     "For a new or cloned order, choose Draft. An Activated order's status
 *     can't be edited." New Orders must be created as Draft; Activated is a
 *     separate follow-up transition, almost certainly gated on the Order
 *     having real line items (same root cause as the TotalAmount finding
 *     above — this flow creates none). Defaulted to "Draft" so Orders can
 *     actually be created; needs the architect to confirm whether Draft is
 *     the intended final state or a later activation step is expected.
 *     [SUPERSEDED 2026-11-02 — see ORDER LIFECYCLE at the top: Draft, then
 *     items, then round-2 activation.]
 *   - Order.TotalAmount — NOT a Field-Level Security issue like GroupPayee__c
 *     was. `describe()` shows createable=false/updateable=false — nobody can
 *     write this field via API; it's Order's own built-in platform behavior
 *     once OrderItem line items exist (confirmed not a visible Roll-Up
 *     Summary field via Setup screenshot — native standard-object behavior).
 *     REMOVED the CC_Amt → TotalAmount mapping entirely. RESOLVED
 *     (2026-10-01): the workbook has no Order line item mapping anywhere, so
 *     no OrderItems are created; CC_Amt stays on Payment.Amount only and
 *     Order.TotalAmount is intentionally left blank.
 *     [SUPERSEDED 2026-11-02 — OrderItems now come from Registration Item
 *     Import, so TotalAmount is calculated by Salesforce.]
 *   - Order.TA_Discount_Type__c — real source values ("65+", "MLA",
 *     "SAA onetime", "Teacher", ...) don't match any of the object's actual
 *     picklist values ("Senior 65+", "Stanford Affiliate", "SAA Member",
 *     "Educator", etc. — see VALID_TA_DISCOUNT_TYPES). The workbook called
 *     this "Direct Map"; it isn't. FIXED (defensively): only an exact match
 *     is now set, anything else is skipped with a warning instead of
 *     rejecting the whole Order record — but the real source→target mapping
 *     still needs the architect (some pairs look obvious — "65+" →
 *     "Senior 65+" — others don't, e.g. "MLA").
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ARCHITECT ANSWERS — 2026-10-06 (all four implemented):
 * ══════════════════════════════════════════════════════════════════════════
 *   - "Let's set the Order Start Date as the Registration_Date" — RESOLVED.
 *     Order.EffectiveDate is now a direct map from Registration_Date, no
 *     fallback to PoDate. This also resolves the 141,255-row blank-date
 *     problem as a side effect: the new 2-year scope filter (below) is
 *     keyed on the same Registration_Date field and already excludes any
 *     row where it's blank/unparseable before mapToOrder ever sees it, so
 *     EffectiveDate is guaranteed non-blank for every row that makes it
 *     through.
 *   - "Let's go ahead and add the picklist values for the discount types"
 *     — RESOLVED (2026-10-06). 5 raw values that were just a shorter/
 *     differently-cased form of an existing option are translated via
 *     TA_DISCOUNT_TYPE_ALIASES, no Salesforce change needed for those:
 *     "65+"→Senior 65+, "CSP full"→CSP Full (case only), "SAA"→SAA Member,
 *     "STAP"/"STEP"→STAP Benefit. The other 6 (MLA, SAA onetime, Teacher,
 *     Medical Center, Faculty, World Affairs Council) were added as new
 *     picklist options in Salesforce and re-verified via
 *     `sf sobject describe` — exact spelling confirmed matching — then
 *     added to VALID_TA_DISCOUNT_TYPES below. Every Discount_Type value
 *     seen in the source data so far now resolves to a valid option.
 *   - "Let's do the last 2 years and the date to go off of is the
 *     Registration_Date" — RESOLVED, implemented as TWO_YEAR_CUTOFF
 *     (currently "2024-10-06", ~2 years back from when this was decided —
 *     a fixed date, not dynamically computed from the run date, same
 *     convention as Transcript Request's TWO_YEAR_CUTOFF). Confirm this
 *     exact cutoff date is what was intended. Rows with a blank or
 *     unparseable Registration_Date are treated as out-of-scope, not given
 *     the benefit of the doubt — same precedent as Transcript Request.
 *   - "Go ahead and set them all as Draft as the default values to start
 *     and then we can rerun them as Activated" — CONFIRMS the existing
 *     Status="Draft" default is correct. Also tells us a FUTURE flow (not
 *     built yet) will be needed to transition these Orders from Draft to
 *     Activated after this initial load — out of scope for this flow today.
 *     [BUILT 2026-11-02 — that step is round 2 of this same flow ("Activate
 *     Registration Orders" = true), not a separate flow.]
 *
 * ══════════════════════════════════════════════════════════════════════════
 * UPDATED WORKBOOK REVIEW — 2026-10-14 (comment-only; no logic changed)
 * ══════════════════════════════════════════════════════════════════════════
 * The Registration tab now carries OrderItem rows (OrderId = the created
 * Order, UnitPrice = CC_Amt, Quantity default 1), so the 2026-10-01 note above
 * that "the workbook has no Order line item mapping anywhere" is OUT OF DATE.
 * This flow still creates no OrderItems — blocked on questions the tab does not
 * answer (OrderItem needs a PricebookEntryId and the Order needs a Pricebook2Id;
 * which product do Registration lines use?). See
 * reports/registration-mapping-review-2026-10-14.md for the full list. Once
 * OrderItems exist, Order.TotalAmount becomes platform-calculated, which also
 * reconciles the tab's still-listed CC_Amt → TotalAmount "Direct Map".
 * Also: Payments/Purchase flows use prefixed External IDs (PAY-/PUR-/PIT-);
 * [UPDATED 2026-11-02: this flow now uses REG- keys as well.]
 * [SUPERSEDED 2026-11-02 — the product/price-book questions are answered:
 * Registration lines use the course Product (Product2.External_ID_4D__c =
 * Course_ID) through its entry in the order price book.]
 *
 * ⚠️  STILL OPEN — with the architect (2026-11-02; do not build until answered):
 *   - Order_Type__c vs a record type to tell Registration and Purchase
 *     Orders apart (until then the REG- / PUR- key prefix is the marker).
 *   (Decided 2026-11-02: REG- prefix; no ATEs for historical data, as the
 *   2026-09-28 decision says.)
 *   - Payments table as the single payment source; registrations with no
 *     card; transcript-only payments.
 *   - Final state of historical Orders: Draft or Activated.
 *   - Enrollments whose Registration falls outside the 2-year Order window
 *     are skipped by Registration Item Import ("Order not loaded").
 *   - Registration Item rules (registrationItemFlow.ts) — all decided by the
 *     architect 2026-11-02: UnitPrice = Tuition, not Extension; every
 *     enrollment row under a registration gets its own line item (Add, Drop,
 *     AJST, and every Status incl. New / DupEnrollment).
 *   - Check_No → Order.Check_Number__c is typed "Number"; non-numeric
 *     values are skipped with a warning. DEFERRED (2026-10-01) — architect
 *     indicated historically all payments were by credit card, so this is
 *     lower priority for now; revisit once the card-vs-check question
 *     below is fully resolved.
 *   - The cash/check-paid-registration gap — CONFIRMED real with evidence
 *     (2026-10-01): checked the actual source file directly — rows where
 *     Check_No is "cash" or "SNAP - ..." have CC_Card_Type, CC_Last_Four,
 *     and CC_Amt all completely blank, not just unused. These are
 *     genuinely non-card payments. Still creating a CardPaymentMethod and
 *     a Type="Capture" Payment unconditionally for every registration
 *     regardless. Question sent to architect: should Card/Capture-Payment
 *     be skipped for these rows, with Payment.Amount coming from
 *     Check_Amt instead of CC_Amt? Code unchanged pending their answer.
 *   - Windowed execution (new): rebuilds the ~190k-row Student email cache
 *     on every window rather than once for the whole file, since each
 *     execution is otherwise stateless. MAX_ROWS=25,000 keeps this to a few
 *     dozen rebuilds for the full file rather than hundreds — if the real
 *     row count turns out much larger than expected, or the cache rebuild
 *     cost becomes a real problem, worth revisiting (e.g. a wider MAX_ROWS,
 *     or caching the email lookup somewhere windows can share).
 */

import { flow, type Connection } from "@prismatic-io/spectral";
import axios from "axios";
import Papa, {
  parse as papaParse,
  type ParseResult,
  type Parser,
} from "papaparse";
import { Transform } from "stream";
import {
  str,
  toDate,
  toSalesforceCountryCode,
  toSalesforceStateCode,
  getAccessToken,
  getSfInstanceUrl,
  runBulkJob,
} from "./utils";
import { createPerObjectResultsSheet } from "./reportResults";
import {
  logUnknownCardTypes,
  mapCardType,
  parseExpiry,
  PRICE_BOOKS_CONFIG_VAR,
  loadOrderStates,
  orderPricebook,
  paymentToRefund,
  ORDER_FLOWS_CREATE_PAYMENTS,
  REGISTRATION_EXT_PREFIX,
  registrationExtId,
  resolveConfiguredPricebooks,
} from "./commerceShared";
import { ACTIVATED_ORDER_STATUS, planOrderActivation } from "./purchaseFlow";

// ── Constants ─────────────────────────────────────────────────────────────────
const BULK_BATCH_SIZE = 50_000;
const EXT_ID_FIELD = "External_ID_4D__c";
const SF_CARD_PAYMENT_METHOD = "CardPaymentMethod";
const SF_ORDER = "Order";
const SF_PAYMENT_GROUP = "PaymentGroup";
const SF_PAYMENT = "Payment";
const SF_REFUND = "Refund";
// Rows per execution window (see "Windowed execution" note in the header
// comment). Bounded well under BULK_BATCH_SIZE so each window submits
// exactly one Bulk API batch per object.
const MAX_ROWS = 25_000;

// 2-year scope filter per architect (2026-10-06): "Let's do the last 2
// years and the date to go off of is the Registration_Date" — same pattern
// as Transcript Request's TWO_YEAR_CUTOFF (a fixed date, not dynamically
// computed from the run date, so the migration scope stays stable across
// re-runs). Set to ~2 years back from the date this was decided; confirm
// with architect if a different exact cutoff was intended.
const TWO_YEAR_CUTOFF = "2024-10-06";

const TEST_MODE = true; // when true: process one window only, then stop (no self-invoke)
const TEST_LIMIT = 50; // additionally cap records (per object) within that one window
// Skips the first N mapped rows before applying TEST_LIMIT — lets a test run
// target fresh, never-before-touched registrations instead of re-hitting
// ones from an earlier test (some of which may now be in a locked Salesforce
// state, e.g. Payment.Status="Canceled" records that can never be upserted
// again). Set to 0 for normal behavior (test the first TEST_LIMIT rows).
const TEST_SKIP = 100;

// Order.Status default — REOPENED (2026-10-01). Architect's addendum said
// "Default to Activated", but the real org rejects that: FAILED_ACTIVATION
// — "For a new or cloned order, choose Draft. An Activated order's status
// can't be edited." Salesforce requires every new Order to be created as
// Draft; Activated is a separate follow-up transition, typically gated on
// the Order actually having line items (same root cause as the TotalAmount
// issue — this flow doesn't create any). Defaulting to "Draft" so Orders
// can actually be created; confirm with architect whether that's the real
// final state, or whether a later activation step is expected once/if
// OrderItems enter scope.
const DEFAULT_ORDER_STATUS = "Draft";

// Order.Status — DECIDED 2026-11-02 (same two-round model as Purchase Import):
//   Round 1 ("Activate Registration Orders" = false): Orders are created
//     Draft with Pricebook2Id = the order price book. Registration Item
//     Import then adds one OrderItem per enrollment.
//   Round 2 ("Activate Registration Orders" = true): every existing Order
//     still in Draft AND with at least one OrderItem is switched to
//     ACTIVATED_ORDER_STATUS. Draft Orders with no OrderItems stay Draft and
//     are logged. An Order that is already Activated is never re-sent.
/** Boolean config var that switches this flow into round 2. */
export const ACTIVATE_REGISTRATION_ORDERS_CONFIG_VAR =
  "Activate Registration Orders";

// Order.TA_Discount_Type__c — real picklist values confirmed via
// `sf sobject describe` against Stanford_UAT. Only an exact match (after
// the alias translation below) is set; anything else is skipped with a
// warning rather than sent and rejecting the whole Order.
const VALID_TA_DISCOUNT_TYPES = new Set([
  "Senior 65+",
  "Stanford Affiliate",
  "Stanford Healthcare",
  "SAA Member",
  "SBSAA Member",
  "CSP Full",
  "Century Club V1",
  "Century Club V2",
  "DCI",
  "Educator",
  "Promo Code",
  "STAP Benefit",
  // Added by architect/admin 2026-10-06, re-verified via `sf sobject
  // describe` against Stanford_UAT — exact spelling confirmed matching.
  // "Medical Center" was removed 2026-11-09: it is the same discount as
  // Stanford Healthcare (see TA_DISCOUNT_TYPE_ALIASES).
  "MLA",
  "SAA onetime",
  "Teacher",
  "Faculty",
  "World Affairs Council",
]);

// Raw Discount_Type values that are just a shorter/differently-cased form
// of an existing picklist option, confirmed by user (2026-10-06) — these
// translate to the existing option rather than needing a new picklist
// value added in Salesforce. Keyed lowercase for a case-insensitive match
// (covers "CSP full" vs "CSP Full"); everything else still needs an exact
// match against VALID_TA_DISCOUNT_TYPES, or gets added as a new picklist
// value per the architect ("let's go ahead and add the picklist values").
const TA_DISCOUNT_TYPE_ALIASES = new Map<string, string>([
  ["65+", "Senior 65+"],
  ["csp full", "CSP Full"],
  ["saa", "SAA Member"],
  ["stap", "STAP Benefit"],
  ["step", "STAP Benefit"], // likely a typo of STAP
  // Confirmed 2026-11-09: Medical Center is the same as Stanford Healthcare.
  ["medical center", "Stanford Healthcare"],
  ["stanford medical center", "Stanford Healthcare"],
  // Added 2026-11-11 (user confirmed the picklist values exist): the source
  // writes the short name of an existing option.
  ["sbsaa", "SBSAA Member"],
]);

// Promotion codes arrive as "PROMO-<code>" (e.g. "PROMO-J2h2PM3vlw"); every
// one loads as the "Promo Code" picklist value (added 2026-11-11).
const PROMO_CODE_PREFIX = "promo-";
const PROMO_CODE_TYPE = "Promo Code";

export function resolveTaDiscountType(raw: string): string | undefined {
  const lower = raw.toLowerCase();
  const alias = TA_DISCOUNT_TYPE_ALIASES.get(lower);
  if (alias) return alias;
  if (lower.startsWith(PROMO_CODE_PREFIX)) return PROMO_CODE_TYPE;
  return VALID_TA_DISCOUNT_TYPES.has(raw) ? raw : undefined;
}

// ── Raw row type ──────────────────────────────────────────────────────────────

export interface RawRegistrationRow {
  ID?: string;
  Student_ID?: string;
  CC_Billing_Address?: string;
  CC_Billing_City?: string;
  CC_Billing_Country?: string;
  CC_Billing_State?: string;
  CC_Billing_Zip?: string;
  CC_Card_Type?: string;
  CC_Exp_Date?: string;
  CC_Last_Four?: string;
  Adjustment?: string;
  Balance_Due?: string;
  Batch_Print?: string; // Do Not Map
  CC_Amt?: string;
  CC_Billing_First_Name?: string;
  CC_Billing_Last_Name?: string;
  CC_Transaction_ID?: string;
  CC_Transaction_ID_Date_Entered?: string;
  Check_Amt?: string;
  Check_No?: string;
  Courses_Subtotal?: string;
  Created_By?: string; // Do Not Map
  Created_Date?: string; // Do Not Map
  Created_Time?: string; // Do Not Map
  Discount_Amt?: string;
  Discount_Type?: string;
  Last_Modified_By?: string; // Do Not Map
  Last_Modified_Date?: string; // Do Not Map
  Last_Modified_Time?: string; // Do Not Map
  Notes?: string;
  Prior_Registration_ID?: string; // → Order.Prior_Registration__c (decided 2026-11-05)
  Reconciliation_ID?: string; // Do Not Map
  Reg_Fee?: string;
  Registration_Date?: string;
  Student_Country?: string; // Do Not Map
  Student_ID_Previous?: string; // Do Not Map
  [key: string]: string | undefined;
}

// ── Value mapping helpers ─────────────────────────────────────────────────────

// Strips trailing ".0" (4D Longint-to-Text export artifact).
function stripDotZero(v: string | undefined): string {
  return str(v).trim().replace(/\.0$/, "");
}

function parseCurrency(raw: string | undefined): number | undefined {
  const s = str(raw).trim();
  if (!s) return undefined;
  const n = parseFloat(s);
  return isNaN(n) ? undefined : n;
}

function parseInteger(raw: string | undefined): number | undefined {
  const s = str(raw).trim();
  if (!s) return undefined;
  const n = parseInt(s, 10);
  return isNaN(n) ? undefined : n;
}

// ── Salesforce query helper ───────────────────────────────────────────────────

// Hard cap on each query page so a stalled connection surfaces as a clear
// timeout error instead of leaving the flow spinning with no signal.
const SF_QUERY_TIMEOUT_MS = 120_000;

async function sfQueryAll<T>(
  base: string,
  token: string,
  soql: string,
  logger?: { info: (m: string) => void },
): Promise<T[]> {
  const SF_API = "v60.0";
  const headers = { Authorization: `Bearer ${token}` };
  const all: T[] = [];
  let nextUrl: string | null = null;
  let done = false;
  let page = 0;

  const fetch = async (url: string | null) => {
    const { data } = await axios.get<{
      records: T[];
      done: boolean;
      nextRecordsUrl?: string;
    }>(
      url ?? `${base}/services/data/${SF_API}/query`,
      url
        ? { headers, timeout: SF_QUERY_TIMEOUT_MS }
        : { params: { q: soql }, headers, timeout: SF_QUERY_TIMEOUT_MS },
    );
    all.push(...data.records);
    done = data.done;
    nextUrl = data.nextRecordsUrl ? `${base}${data.nextRecordsUrl}` : null;
    page++;
    logger?.info(
      `  … page ${page} — ${all.length} record(s) so far${done ? " (done)" : ""}`,
    );
  };

  await fetch(null);
  while (!done && nextUrl) await fetch(nextUrl);
  return all;
}

// ── Student email cache ─────────────────────────────────────────────────────
// Only needed for Payment.GroupPayee — AccountId/BillToContactId are
// resolved by Salesforce itself via external-ID relationship syntax (see
// mapToCardPaymentMethod / mapToOrder / mapToPayment below), so this no
// longer blocks anything else. Runs in parallel with streamAndMap.
// ~190k Account rows / ~95 pages — expect a couple of minutes; each page is
// logged as it arrives (see sfQueryAll) so it's visibly progressing.

async function buildStudentEmailCache(
  base: string,
  token: string,
  logger: { info: (m: string) => void },
): Promise<Map<string, string>> {
  const records = await sfQueryAll<{
    PersonEmail: string | null;
    Student_ID_4D__c: string;
  }>(
    base,
    token,
    "SELECT PersonEmail, Student_ID_4D__c FROM Account WHERE IsPersonAccount = true AND Student_ID_4D__c != null",
    logger,
  );
  const map = new Map<string, string>();
  for (const r of records) {
    if (r.Student_ID_4D__c && r.PersonEmail) {
      map.set(r.Student_ID_4D__c, r.PersonEmail);
    }
  }
  return map;
}

// ── SF record mappers ──────────────────────────────────────────────────────────

type SfRecord = Record<string, unknown>;

/** Shared billing-address fields, reused across CardPaymentMethod and Order. */
function billingAddressFields(raw: RawRegistrationRow): {
  street: string;
  city: string;
  countryCode: string;
  stateCode: string;
  zip: string;
} {
  const street = str(raw.CC_Billing_Address);
  const city = str(raw.CC_Billing_City);
  const countryCode = toSalesforceCountryCode(raw.CC_Billing_Country);
  const stateCode = countryCode
    ? toSalesforceStateCode(raw.CC_Billing_State, countryCode)
    : str(raw.CC_Billing_State);
  const zip = str(raw.CC_Billing_Zip);
  return { street, city, countryCode, stateCode, zip };
}

export function mapToCardPaymentMethod(
  raw: RawRegistrationRow,
  unknownCardTypes: Map<string, number> = new Map(),
): SfRecord | null {
  const id = str(raw.ID).trim();
  if (!id) return null;

  // Card detail fields are blank on refund/follow-up rows (confirmed by
  // direct data review, 2026-10-09 — only the original charge row carries
  // CC_Last_Four/CC_Exp_Date/CC_Card_Type). Without this guard, every one of
  // those rows would still produce a CardPaymentMethod record with
  // Status="Active" but no actual card on it. Skip when there's nothing to
  // identify a card by.
  const hasCardData =
    str(raw.CC_Card_Type) || str(raw.CC_Last_Four) || str(raw.CC_Exp_Date);
  if (!hasCardData) return null;

  // Status and ProcessingMode are both required (confirmed via `sf sobject
  // describe`) and not in the workbook at all — every CardPaymentMethod
  // upload failed with REQUIRED_FIELD_MISSING before these were added.
  // Status="Active", ProcessingMode="External" — both CONFIRMED correct by
  // the architect (2026-10-01).
  const record: SfRecord = {
    [EXT_ID_FIELD]: registrationExtId(id),
    Status: "Active",
    ProcessingMode: "External",
  };

  // AccountId — resolved by Salesforce during the Bulk API job via external-ID
  // relationship syntax; no pre-fetch needed. See OPEN ITEMS re: relationship name.
  const studentId = stripDotZero(raw.Student_ID);
  if (studentId && studentId !== "0") {
    record["Account.Student_ID_4D__c"] = studentId;
  }

  // Real field names confirmed via `sf sobject describe CardPaymentMethod`
  // against STANFORD-DEV: the PaymentMethodAddress compound field's flat,
  // writable components are prefixed "PaymentMethod", not bare Street/City/
  // etc. (which don't exist on this object at all).
  const { street, city, countryCode, stateCode, zip } =
    billingAddressFields(raw);
  if (street) record.PaymentMethodStreet = street;
  if (city) record.PaymentMethodCity = city;
  if (countryCode) record.PaymentMethodCountryCode = countryCode;
  if (stateCode) record.PaymentMethodStateCode = stateCode;
  if (zip) record.PaymentMethodPostalCode = zip;

  // CardType is a restricted picklist — translate 4D short forms (MC, AmEx).
  const rawCardType = str(raw.CC_Card_Type).trim();
  const cardType = mapCardType(rawCardType);
  if (cardType) record.CardType = cardType;
  else if (rawCardType)
    unknownCardTypes.set(
      rawCardType,
      (unknownCardTypes.get(rawCardType) ?? 0) + 1,
    );

  const expiry = parseExpiry(raw.CC_Exp_Date);
  if (expiry) {
    record.ExpiryMonth = expiry.month;
    record.ExpiryYear = expiry.year;
  }

  // CardLastFour is Number(4,0) in the org (confirmed 2026-11-04), so a
  // leading zero cannot be stored: "0418" is saved as 418.
  const lastFour = parseInteger(raw.CC_Last_Four);
  if (lastFour !== undefined) record.CardLastFour = lastFour;

  const firstName = str(raw.CC_Billing_First_Name);
  if (firstName) record.CardHolderFirstName = firstName;

  const lastName = str(raw.CC_Billing_Last_Name);
  if (lastName) record.CardHolderLastName = lastName;

  return record;
}

export function mapToOrder(
  raw: RawRegistrationRow,
  logger: { warn: (m: string) => void },
  pricebookId: string,
): SfRecord | null {
  const id = str(raw.ID).trim();
  if (!id) return null;

  const record: SfRecord = {
    [EXT_ID_FIELD]: registrationExtId(id),
    Status: DEFAULT_ORDER_STATUS, // "Draft" — see note above re: FAILED_ACTIVATION
    // Required before any OrderItem can be added; Registration Item Import
    // takes its PricebookEntry from this same book (workbook: Order.Pricebook2Id).
    Pricebook2Id: pricebookId,
  };

  // AccountId / BillToContactId — resolved by Salesforce during the Bulk API
  // job via external-ID relationship syntax; no pre-fetch needed.
  // See OPEN ITEMS re: relationship names.
  const studentId = stripDotZero(raw.Student_ID);
  if (studentId && studentId !== "0") {
    record["Account.Student_ID_4D__c"] = studentId;
    record["BillToContact.Student_ID_4D__c"] = studentId; // workbook: "Bill To Contact"
  }

  const { street, city, countryCode, stateCode, zip } =
    billingAddressFields(raw);
  if (street) record.BillingStreet = street;
  if (city) record.BillingCity = city;
  if (countryCode) record.BillingCountryCode = countryCode;
  if (stateCode) record.BillingStateCode = stateCode; // Picklist per workbook
  if (zip) record.BillingPostalCode = zip;

  const adjustment = parseCurrency(raw.Adjustment);
  if (adjustment !== undefined) record.Adjustment__c = adjustment;

  const balanceDue = parseCurrency(raw.Balance_Due);
  // Order balance — DECIDED 2026-11-09: BalanceDue__c, the same field
  // Purchase Import writes (Balance_Due__c is no longer used).
  if (balanceDue !== undefined) record.BalanceDue__c = balanceDue;

  // Batch_Print — Do Not Map

  // TotalAmount — REMOVED, CONFIRMED (2026-10-01). Workbook maps CC_Amt
  // here as "Direct Map", but `sf sobject describe` shows createable=false,
  // updateable=false on this field in the real org — not a Field-Level
  // Security issue (that can be granted per-profile), this is Order's
  // built-in platform behavior: once OrderItem line items exist, Salesforce
  // itself takes over this field and nobody can write it directly via API,
  // even though it displays as a plain Currency field in Setup (confirmed
  // via screenshot — not a visible Roll-Up Summary field, this behavior is
  // native to the standard Order object). The workbook has no Order line
  // item mapping anywhere, so no OrderItems are created here — CC_Amt stays
  // on Payment.Amount only, and Order.TotalAmount is intentionally left
  // blank. UPDATED 2026-11-02: OrderItems are now loaded by Registration
  // Item Import (UnitPrice = Enrollment.Tuition), so Salesforce calculates
  // TotalAmount from them. CC_Amt stays on Payment.Amount, and the
  // workbook's CC_Amt → TotalAmount row is now a reconciliation check
  // (TotalAmount vs the Payment total), not a mapping.

  // OrderReferenceNumber — workbook marks "Conversion" with no described logic;
  // passthrough raw value. See OPEN ITEMS.
  const txnId = str(raw.CC_Transaction_ID);
  if (txnId) record.OrderReferenceNumber = txnId;

  const poDate = toDate(raw.CC_Transaction_ID_Date_Entered);
  if (poDate) record.PoDate = poDate;

  const checkAmt = parseCurrency(raw.Check_Amt);
  if (checkAmt !== undefined) record.Check_Amount__c = checkAmt;

  const checkNoRaw = str(raw.Check_No);
  if (checkNoRaw) {
    const checkNo = parseInteger(checkNoRaw);
    if (checkNo !== undefined) {
      record.Check_Number__c = checkNo;
    } else {
      // Also logging the CC_* fields here (not just Check_No) to answer the
      // architect's question directly from real data: for a cash/check/SNAP
      // row, are the credit card fields blank, or do some rows carry both a
      // check number AND card details? See OPEN ITEMS re: card-vs-check.
      logger.warn(
        `[Registration Import][Order] Non-numeric Check_No "${checkNoRaw}" for Registration ${id} ` +
          `— skipped (field type is Number). CC_Card_Type="${str(raw.CC_Card_Type)}" ` +
          `CC_Last_Four="${str(raw.CC_Last_Four)}" CC_Amt="${str(raw.CC_Amt)}"`,
      );
    }
  }

  const coursesSubtotal = parseCurrency(raw.Courses_Subtotal);
  if (coursesSubtotal !== undefined)
    record.Courses_Subtotal__c = coursesSubtotal;

  const discountAmt = parseCurrency(raw.Discount_Amt);
  if (discountAmt !== undefined) record.Discount_Amount__c = discountAmt;

  const discountType = str(raw.Discount_Type);
  // "not" is a real, common value in this column meaning "no discount" —
  // confirmed by direct data review, 2026-10-09 (it sits alongside STAP,
  // 65+, SAA, etc. as one of the 22 actual Discount_Type values, present on
  // the majority of rows). Not a typo or an invalid picklist attempt, so
  // skip silently rather than logging it as an unmatched value every time.
  if (discountType && discountType.toLowerCase() !== "not") {
    const resolved = resolveTaDiscountType(discountType);
    if (resolved) {
      record.TA_Discount_Type__c = resolved;
    } else {
      logger.warn(
        `[Registration Import][Order] Discount_Type "${discountType}" for Registration ${id} ` +
          "doesn't match any TA_Discount_Type__c picklist value — skipped (field left blank)",
      );
    }
  }

  const notes = str(raw.Notes)
    .replace(/_4DNL_/g, "\n")
    .trim();
  if (notes) record.Description = notes.slice(0, 32000);

  const regFee = parseCurrency(raw.Reg_Fee);
  if (regFee !== undefined) record.Registration_Fee__c = regFee;

  const regDate = toDate(raw.Registration_Date);
  if (regDate) record.Registration_Date__c = regDate;

  // Prior_Registration_ID — DECIDED 2026-11-05 standup (was "Do Not Map"):
  // a drop / change registration links to the Order it changes through the
  // Order lookup Prior_Registration__c (field name confirmed 2026-11-09).
  // Carried as a temp key here and resolved in onExecution only when the
  // prior Order exists in Salesforce (stripped before upload).
  const priorId = stripDotZero(raw.Prior_Registration_ID);
  if (priorId && priorId !== "0" && priorId !== id) {
    record[TEMP_PRIOR_REGISTRATION_KEY] = priorId;
  }

  // Order.EffectiveDate — RESOLVED (2026-10-06): architect confirmed
  // "Let's set the Order Start Date as the Registration_Date". Direct map,
  // no fallback to PoDate needed — and the 141,255-blank-date problem this
  // field had is now moot anyway, since the 2-year scope filter above
  // (also keyed on Registration_Date, per the same architect message)
  // already excludes any row with a blank/unparseable Registration_Date
  // before it ever reaches this mapper. Kept as a conditional set rather
  // than unconditional purely as a defensive guard, not because it's
  // expected to actually be empty here.
  if (regDate) record.EffectiveDate = regDate;

  // Created_By/Date/Time, Last_Modified_By/Date/Time — Do Not Map per this
  // workbook. Each flow's mapping is independent; not borrowing Enrollment's
  // audit-field override here since Registration's own workbook doesn't ask
  // for it.

  return record;
}

// ── Registration fee line (decided 2026-11-05) ───────────────────────────────
// Reg_Fee becomes its own OrderItem on the registration's Order, next to the
// enrollment (tuition) lines from Registration Item Import, so the Order
// total includes the fee: e.g. 592434586 = $610 course + $35 fee = $645.
// The fee product is found by Product2.Name (config var below) in the order
// price book, the same way Purchase Item resolves products.
const SF_ORDER_ITEM = "OrderItem";
/** Text config var: Product2.Name of the registration fee product. */
export const REGISTRATION_FEE_PRODUCT_CONFIG_VAR = "Registration Fee Product";
export const DEFAULT_REGISTRATION_FEE_PRODUCT = "Registration Fee";
/** OrderItem key prefix for the fee line: FEE-{Registration.ID}. */
export const REGISTRATION_FEE_EXT_PREFIX = "FEE-";

/**
 * Builds the fee OrderItem for one mapped Order, or null when there is no
 * fee (Reg_Fee blank or 0). Pure — tested directly. A negative fee (drop
 * registrations) is loaded as-is, like a negative tuition line.
 */
export function mapToRegistrationFeeItem(
  order: SfRecord,
  pricebookEntryId: string,
): SfRecord | null {
  const fee = order.Registration_Fee__c;
  if (typeof fee !== "number" || fee === 0) return null;
  const orderExtId = order[EXT_ID_FIELD] as string;
  const registrationId = orderExtId.startsWith(REGISTRATION_EXT_PREFIX)
    ? orderExtId.slice(REGISTRATION_EXT_PREFIX.length)
    : orderExtId;
  const item: SfRecord = {
    [EXT_ID_FIELD]: `${REGISTRATION_FEE_EXT_PREFIX}${registrationId}`,
    "Order.External_ID_4D__c": orderExtId,
    PricebookEntryId: pricebookEntryId,
    UnitPrice: fee,
    Quantity: 1,
    Type: "Order Product",
  };
  const studentId = order["Account.Student_ID_4D__c"];
  if (typeof studentId === "string" && studentId) {
    item["Student__r.Student_ID_4D__c"] = studentId;
  }
  return item;
}

// ── Prior registration link, STAP line and drop line (decided 2026-11-05) ──
// From the 2026-11-05 standup notes ("Aligned"): an add and its drop are two
// separate Orders, linked by an Order lookup on the prior registration; drop
// Orders are activated like normal Orders; STAP is a negative line for the
// benefit amount and comes back as a positive line when a course is dropped.
// The three details the notes leave open are named below so they are easy to
// change if Trevor disagrees:
//   - STAP amount = Discount_Amt as it is in the file. It is already signed
//     (Courses_Subtotal + Reg_Fee + Discount_Amt + Adjustment − CC_Amt −
//     Check_Amt = Balance_Due), so it is −415 on 592436117 and +610 on drop
//     592436118, matching Trevor's examples. Only Orders whose discount type
//     is STAP Benefit get it (other discounts are already the per-enrollment
//     adjustments from Registration Item Import).
//   - STAP product = Product2.Name from the "STAP Product" config var.
//   - Drop line = Courses_Subtotal, added in round 2 only to a Draft drop
//     Order that has no enrollment (ENR-) line, using the product of the
//     prior registration's course line (see chooseDropLineEntry).

/** Temp key on mapped Orders: raw Prior_Registration_ID. Never uploaded. */
export const TEMP_PRIOR_REGISTRATION_KEY = "_priorRegistrationId";
/** Order lookup to the prior registration's Order (confirmed 2026-11-09). */
export const PRIOR_REGISTRATION_FIELD = "Prior_Registration__c";

/** Text config var: Product2.Name of the STAP benefit product. */
export const STAP_PRODUCT_CONFIG_VAR = "STAP Product";
export const DEFAULT_STAP_PRODUCT = "STAP";
/** OrderItem key prefix for the STAP line: STAP-{Registration.ID}. */
export const STAP_EXT_PREFIX = "STAP-";
/** TA_Discount_Type__c value that gets a STAP line. */
export const STAP_DISCOUNT_TYPE = "STAP Benefit";

/** Text config var: fallback product for a drop line with no single prior course. */
export const COURSE_DROP_PRODUCT_CONFIG_VAR = "Course Drop Product";
export const DEFAULT_COURSE_DROP_PRODUCT = "Course Drop";
/** OrderItem key prefix for the drop line: DROP-{Registration.ID}. */
export const DROP_EXT_PREFIX = "DROP-";

function registrationIdOf(order: SfRecord): string {
  const extId = order[EXT_ID_FIELD] as string;
  return extId.startsWith(REGISTRATION_EXT_PREFIX)
    ? extId.slice(REGISTRATION_EXT_PREFIX.length)
    : extId;
}

/** Removes the temp keys so a mapped Order can be uploaded. Returns a copy. */
export function stripOrderTempKeys(order: SfRecord): SfRecord {
  const copy: SfRecord = { ...order };
  delete copy[TEMP_PRIOR_REGISTRATION_KEY];
  return copy;
}

/**
 * The Salesforce Id of this Order's prior registration Order, or undefined
 * when it has none or the prior Order is not in Salesforce (link if it
 * exists, same rule as Payments Import). Pure — tested directly.
 */
export function priorRegistrationOrderId(
  order: SfRecord,
  priorOrderIdByExtId: Map<string, string>,
): string | undefined {
  const priorId = order[TEMP_PRIOR_REGISTRATION_KEY];
  if (typeof priorId !== "string" || !priorId) return undefined;
  return priorOrderIdByExtId.get(registrationExtId(priorId));
}

/** Shared shape of the Registration Import line items. */
function registrationLine(
  order: SfRecord,
  prefix: string,
  pricebookEntryId: string,
  unitPrice: number,
): SfRecord {
  const item: SfRecord = {
    [EXT_ID_FIELD]: `${prefix}${registrationIdOf(order)}`,
    "Order.External_ID_4D__c": order[EXT_ID_FIELD] as string,
    PricebookEntryId: pricebookEntryId,
    UnitPrice: unitPrice,
    Quantity: 1,
    Type: "Order Product",
  };
  const studentId = order["Account.Student_ID_4D__c"];
  if (typeof studentId === "string" && studentId) {
    item["Student__r.Student_ID_4D__c"] = studentId;
  }
  return item;
}

/**
 * STAP line for one mapped Order: UnitPrice = Discount_Amt (signed), only
 * when the discount type is STAP Benefit and the amount is not 0.
 */
export function mapToStapItem(
  order: SfRecord,
  pricebookEntryId: string,
): SfRecord | null {
  if (order.TA_Discount_Type__c !== STAP_DISCOUNT_TYPE) return null;
  const amount = order.Discount_Amount__c;
  if (typeof amount !== "number" || amount === 0) return null;
  return registrationLine(order, STAP_EXT_PREFIX, pricebookEntryId, amount);
}

// ── Registration adjustment line (decided 2026-11-11) ────────────────────────
// Registration.Adjustment (a staff write-off, no-fee waiver or correction,
// signed like Discount_Amt) becomes its own OrderItem so the Order total
// matches what the student owed: e.g. 592420813 = $540 course + $35 fee −
// $575 adjustment = $0. Without it the Order showed $575 (27 of 1,394
// matched sample registrations were wrong). Adjustment__c is still written.

/** Text config var: Product2.Name of the registration adjustment product. */
export const REGISTRATION_ADJUSTMENT_PRODUCT_CONFIG_VAR =
  "Registration Adjustment Product";
export const DEFAULT_REGISTRATION_ADJUSTMENT_PRODUCT = "Adjustment";
/** OrderItem key prefix for the adjustment line: REGADJ-{Registration.ID}. */
export const REGISTRATION_ADJUSTMENT_EXT_PREFIX = "REGADJ-";

/**
 * Adjustment line for one mapped Order: UnitPrice = Adjustment as signed in
 * the file, or null when it is blank or 0. Pure — tested directly.
 */
export function mapToRegistrationAdjustmentItem(
  order: SfRecord,
  pricebookEntryId: string,
): SfRecord | null {
  const amount = order.Adjustment__c;
  if (typeof amount !== "number" || amount === 0) return null;
  return registrationLine(
    order,
    REGISTRATION_ADJUSTMENT_EXT_PREFIX,
    pricebookEntryId,
    amount,
  );
}

/** A course (ENR-) line already on the prior registration's Order. */
export interface PriorCourseLine {
  pricebookEntryId: string;
  unitPrice: number;
  courseOfferingId?: string | null;
}

/**
 * Picks the product for a drop line: the prior registration's course line
 * when there is exactly one, or exactly one whose price equals the dropped
 * amount; otherwise null (the caller uses the "Course Drop" product).
 */
export function chooseDropLineEntry(
  coursesSubtotal: number,
  priorLines: PriorCourseLine[],
): PriorCourseLine | null {
  const distinct = new Map<string, PriorCourseLine>();
  for (const line of priorLines) {
    if (!distinct.has(line.pricebookEntryId)) {
      distinct.set(line.pricebookEntryId, line);
    }
  }
  if (distinct.size === 1) return [...distinct.values()][0];
  const target = Math.abs(coursesSubtotal);
  const byPrice = [...distinct.values()].filter(
    (l) => Math.abs(l.unitPrice) === target,
  );
  return byPrice.length === 1 ? byPrice[0] : null;
}

/**
 * Drop line for a drop registration with no enrollment line:
 * UnitPrice = Courses_Subtotal (e.g. −610 on 592436118). Null when the
 * Order is not a drop (no prior registration) or the subtotal is 0/blank.
 */
export function mapToDropItem(
  order: SfRecord,
  pricebookEntryId: string,
  courseOfferingId?: string | null,
): SfRecord | null {
  if (!order[TEMP_PRIOR_REGISTRATION_KEY]) return null;
  const subtotal = order.Courses_Subtotal__c;
  if (typeof subtotal !== "number" || subtotal === 0) return null;
  const item = registrationLine(
    order,
    DROP_EXT_PREFIX,
    pricebookEntryId,
    subtotal,
  );
  if (courseOfferingId) item.Course_Offering__c = courseOfferingId;
  return item;
}

// Temp key stashed on mapped Payment records to carry the raw Student_ID
// through to the post-stream GroupPayee stitch (see onExecution). Stripped
// before any record is sent to Salesforce — never actually uploaded.
const TEMP_STUDENT_ID_KEY = "_studentId4D";

export function mapToPayment(
  raw: RawRegistrationRow,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept so callers and tests keep one signature
  logger: { warn: (m: string) => void },
): SfRecord | null {
  const id = str(raw.ID).trim();
  if (!id) return null;

  // CC_Amt == 0 — no money actually moved on this row (e.g. STAP fully
  // covering the charge, NOFEE rows, or a drop where no refund was ever
  // processed — confirmed by direct data review, 2026-10-09: 892 of 8,440
  // rows). Creating a "Capture"/"Processed" Payment of $0 would be wrong
  // regardless of how negative (refund) amounts end up being handled, so
  // this is skipped unconditionally rather than left as an open question.
  const amount = parseCurrency(raw.CC_Amt);
  if (amount === undefined || amount === 0) return null;

  // CC_Amt < 0 — a card refund (1,191 "Drop w/Refund" rows) or a negative
  // adjustment (e.g. 592436039, −165 Teacher discount). DECIDED 2026-11-04:
  // these load as a Refund, not a negative Payment. The record is still built
  // here with its negative Amount; onExecution turns it into an Unreferenced
  // Refund for the absolute amount (paymentToRefund) before Phase 4.

  const record: SfRecord = {
    [EXT_ID_FIELD]: registrationExtId(id),
    Type: "Capture", // Default value per workbook
    Status: "Processed", // Default value per workbook
    // ProcessingMode is required (confirmed via describe) and not in the
    // workbook — every Payment upload failed with REQUIRED_FIELD_MISSING
    // before this was added. "External" — CONFIRMED correct by the
    // architect (2026-10-01), same as CardPaymentMethod.
    ProcessingMode: "External",
    Amount: amount,
  };

  // AccountId — resolved by Salesforce during the Bulk API job via
  // external-ID relationship syntax; no pre-fetch needed.
  // GroupPayee (a Text field, not a lookup) can't use that trick — the raw
  // Student_ID is stashed here and resolved against the email cache once
  // it's ready (see onExecution), then this temp key is deleted.
  const studentId = stripDotZero(raw.Student_ID);
  if (studentId && studentId !== "0") {
    record["Account.Student_ID_4D__c"] = studentId;
    record[TEMP_STUDENT_ID_KEY] = studentId;
  }

  const effectiveDate = toDate(raw.CC_Transaction_ID_Date_Entered);
  if (effectiveDate) record.EffectiveDate = effectiveDate;

  return record;
}

// ── TSV streaming (windowed) ────────────────────────────────────────────────
// Same mechanism as the Student flow: an HTTP Range header downloads only the
// bytes needed for this window (byteOffset onward), a Transform stream tracks
// the exact file-byte position after every newline (accurate even for
// multi-byte UTF-8 characters, unlike PapaParse's own character-counting
// cursor), and parsing stops once MAX_ROWS rows have been mapped. The byte
// position of the last *fully processed* row becomes nextByteOffset — the
// exact resume point for the next window, with no gap or overlap.

interface WindowStreamResult {
  cardPaymentMethods: SfRecord[];
  orders: SfRecord[];
  payments: SfRecord[];
  rowsInWindow: number;
  filteredOut: number; // rows skipped by the 2-year Registration_Date scope filter
  hasMore: boolean;
  nextByteOffset: number;
  parsedHeaders: string[];
}

/** Active PricebookEntry Id for a Product2.Name in one price book, if any. */
async function findPricebookEntryByProductName(
  base: string,
  token: string,
  pricebookId: string,
  productName: string,
): Promise<string | undefined> {
  const escaped = productName.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const rows = await sfQueryAll<{ Id: string }>(
    base,
    token,
    `SELECT Id FROM PricebookEntry WHERE Pricebook2Id = '${pricebookId}' ` +
      `AND IsActive = true AND Product2.Name = '${escaped}' LIMIT 1`,
  );
  return rows[0]?.Id;
}

/**
 * Enrollment (ENR-) OrderItems on the given Orders, grouped by the Order's
 * External_ID_4D__c. Used for drop lines: whether a drop Order already has a
 * course line, and which course the prior registration had.
 */
async function loadCourseLines(
  base: string,
  token: string,
  orderExtIds: string[],
): Promise<Map<string, PriorCourseLine[]>> {
  const map = new Map<string, PriorCourseLine[]>();
  const unique = [...new Set(orderExtIds)];
  for (let i = 0; i < unique.length; i += 200) {
    const list = unique
      .slice(i, i + 200)
      .map((id) => `'${id.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`)
      .join(",");
    const rows = await sfQueryAll<{
      PricebookEntryId: string;
      UnitPrice: number;
      Course_Offering__c: string | null;
      Order: { External_ID_4D__c: string } | null;
    }>(
      base,
      token,
      "SELECT PricebookEntryId, UnitPrice, Course_Offering__c, Order.External_ID_4D__c FROM OrderItem " +
        `WHERE Order.External_ID_4D__c IN (${list}) AND External_ID_4D__c LIKE 'ENR-%'`,
    );
    for (const row of rows) {
      const key = row.Order?.External_ID_4D__c;
      if (!key) continue;
      const lines = map.get(key) ?? [];
      lines.push({
        pricebookEntryId: row.PricebookEntryId,
        unitPrice: row.UnitPrice,
        courseOfferingId: row.Course_Offering__c,
      });
      map.set(key, lines);
    }
  }
  return map;
}

async function streamAndMapWindow(
  fileId: string,
  accessToken: string,
  byteOffset: number,
  maxRows: number,
  knownHeaders: string[],
  logger: { info: (m: string) => void; warn: (m: string) => void },
  pricebookId: string,
): Promise<WindowStreamResult> {
  const reqHeaders: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  if (byteOffset > 0) {
    reqHeaders.Range = `bytes=${byteOffset}-`;
  }

  const response = await axios.get(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      params: { alt: "media", supportsAllDrives: "true" },
      headers: reqHeaders,
      responseType: "stream",
    },
  );

  const lineEndBytes: number[] = [];
  let totalBytesReceived = 0;

  const byteTracker = new Transform({
    transform(
      chunk: Buffer,
      _encoding: BufferEncoding,
      callback: (err?: Error | null, data?: Buffer) => void,
    ) {
      for (let i = 0; i < chunk.length; i++) {
        if (chunk[i] === 0x0a) {
          lineEndBytes.push(byteOffset + totalBytesReceived + i + 1);
        }
      }
      totalBytesReceived += chunk.length;
      callback(null, chunk);
    },
  });

  (response.data as NodeJS.ReadableStream).pipe(byteTracker);

  return new Promise((resolve, reject) => {
    // For byteOffset > 0 this window has no header row — use knownHeaders
    // passed down from the previous window via the self-invoke payload.
    let headers: string[] = knownHeaders.length > 0 ? [...knownHeaders] : [];
    const cardPaymentMethods: SfRecord[] = [];
    const unknownCardTypes = new Map<string, number>();
    const orders: SfRecord[] = [];
    const payments: SfRecord[] = [];
    let rowsInWindow = 0;
    let filteredOut = 0;
    let aborted = false;
    // Byte position after the last fully-processed row. Updated BEFORE the
    // maxRows check below, so when we abort, this already points to the
    // start of the first unprocessed row — the correct resume point.
    let lastCompletedCursor = byteOffset;
    let stepCount = 0;

    papaParse(byteTracker as unknown as NodeJS.ReadableStream, {
      delimiter: "\t",
      quoteChar: "\0",
      header: false,
      // Must be false so step() fires for every raw line (including empty
      // ones), keeping stepCount in sync with lineEndBytes.
      skipEmptyLines: false,

      step: (result: ParseResult<string[]>, parser: Parser) => {
        if (aborted) return;

        const raw = result.data as unknown as string[];
        const rowEndByte =
          lineEndBytes[stepCount] ?? byteOffset + totalBytesReceived;
        stepCount++;

        if (raw.length === 0 || raw.every((c) => c.replace(/\r/g, "") === "")) {
          lastCompletedCursor = rowEndByte;
          return;
        }

        if (headers.length === 0) {
          headers = raw.map(
            (h, i) =>
              h.replace(/^﻿/, "").replace(/\r/g, "").trim() || `__blank_${i}`,
          );
          lastCompletedCursor = rowEndByte;
          return;
        }

        if (rowsInWindow >= maxRows) {
          aborted = true;
          parser.abort();
          return;
        }

        const row: RawRegistrationRow = {};
        headers.forEach((h, i) => {
          if (!h.startsWith("__blank_")) {
            row[h] = (raw[i] ?? "").replace(/\r/g, "");
          }
        });

        if (!str(row.ID).trim()) {
          lastCompletedCursor = rowEndByte;
          return;
        }
        rowsInWindow++;

        // 2-year scope filter — per architect, Registration_Date is the
        // field to go off of; a blank/unparseable date is treated as
        // out-of-scope rather than given the benefit of the doubt (same
        // precedent as Transcript Request's TWO_YEAR_CUTOFF filter).
        const registrationDate = toDate(row.Registration_Date);
        if (!registrationDate || registrationDate < TWO_YEAR_CUTOFF) {
          filteredOut++;
          lastCompletedCursor = rowEndByte;
          return;
        }

        const cpm = mapToCardPaymentMethod(row, unknownCardTypes);
        if (cpm) cardPaymentMethods.push(cpm);

        const order = mapToOrder(row, logger, pricebookId);
        if (order) orders.push(order);

        const payment = mapToPayment(row, logger);
        if (payment) payments.push(payment);

        lastCompletedCursor = rowEndByte;
      },

      complete: () => {
        logUnknownCardTypes("Registration Import", unknownCardTypes, logger);
        resolve({
          cardPaymentMethods,
          orders,
          payments,
          rowsInWindow,
          filteredOut,
          hasMore: aborted,
          nextByteOffset: lastCompletedCursor,
          parsedHeaders: headers,
        });
      },
      error: (err: Error) => reject(err),
    });
  });
}

// ── Bulk upsert helper ────────────────────────────────────────────────────────

async function upsertInBatches(
  records: SfRecord[],
  objectName: string,
  sfBase: string,
  sfToken: string,
  logger: {
    info: (m: string) => void;
    warn: (m: string) => void;
    error: (m: string) => void;
  },
  logPrefix: string,
): Promise<{
  processed: number;
  failed: number;
  successfulCsv: string;
  failedCsv: string;
}> {
  let processed = 0;
  let failed = 0;
  let successfulCsv = "";
  let failedCsv = "";

  const batches: SfRecord[][] = [];
  for (let i = 0; i < records.length; i += BULK_BATCH_SIZE) {
    batches.push(records.slice(i, i + BULK_BATCH_SIZE));
  }

  for (let b = 0; b < batches.length; b++) {
    logger.info(
      `${logPrefix} Batch ${b + 1}/${batches.length} — ${batches[b].length} records`,
    );
    const result = await runBulkJob(
      sfBase,
      sfToken,
      objectName,
      EXT_ID_FIELD,
      batches[b],
      logger,
      `${logPrefix} Batch ${b + 1}`,
    );
    processed += result.numberRecordsProcessed;
    failed += result.numberRecordsFailed;
    if (result.successfulCsv)
      successfulCsv += (successfulCsv ? "\n" : "") + result.successfulCsv;
    if (result.failedCsv)
      failedCsv += (failedCsv ? "\n" : "") + result.failedCsv;
  }

  return { processed, failed, successfulCsv, failedCsv };
}

/**
 * Bulk API 2.0's /successfulResults CSV includes every originally-submitted
 * column plus two extras: sf__Id (the real Salesforce record Id assigned)
 * and sf__Created. This pulls out extIdField → sf__Id so a later phase can
 * reference the real Id of a record created in an earlier phase, without a
 * separate SOQL round-trip.
 */
function parseSuccessfulSfIds(
  successfulCsv: string,
  extIdField: string,
): Map<string, string> {
  const map = new Map<string, string>();
  if (!successfulCsv.trim()) return map;
  const parsed = Papa.parse<Record<string, string>>(successfulCsv, {
    header: true,
    skipEmptyLines: true,
  });
  for (const row of parsed.data) {
    const extId = row[extIdField];
    const sfId = row["sf__Id"];
    if (extId && sfId) map.set(extId, sfId);
  }
  return map;
}

// ── Flow ──────────────────────────────────────────────────────────────────────
// Windowed execution (same model as the Student flow): each execution reads
// and processes at most MAX_ROWS rows, starting from a byte-offset cursor
// carried in the trigger payload. When more rows remain, this flow invokes
// itself via context.invokeFlow with the next byte offset, so a file with
// hundreds of thousands of rows runs as a chain of many small, well-bounded
// executions instead of one giant one. TEST_MODE stops that chain after a
// single window regardless of how much of the file remains.

export const registrationImport = flow({
  name: "Registration Import",
  stableKey: "reg22334-4556-4778-9900-aabbccddeeff",
  description:
    "Streams the Registration TSV from Google Drive one window at a time " +
    "and bulk-upserts CardPaymentMethod, Order and PaymentGroup (Payments come from Payments Import) " +
    "records via Bulk API 2.0. Orders are created Draft with the order " +
    "price book; run Registration Item Import, then set Activate " +
    "Registration Orders = true and run this flow again to activate them. " +
    "Recurses until the full file has been processed. Must run after the " +
    "Student flow and the Course imports.",

  onTrigger: async (_context, payload) => {
    await Promise.resolve();
    return { payload };
  },

  onExecution: async (context, params) => {
    const { logger, configVars } = context;

    // ── Read cursor (byteOffset) from trigger payload ────────────────────────
    const triggerBody = (
      params.onTrigger.results as unknown as
        { body?: { data?: unknown } } | undefined
    )?.body?.data as Record<string, unknown> | undefined;
    const byteOffset =
      typeof triggerBody?.byteOffset === "number" ? triggerBody.byteOffset : 0;
    const knownHeaders = Array.isArray(triggerBody?.headers)
      ? (triggerBody.headers as string[])
      : [];
    const windowNumber =
      typeof triggerBody?.windowNumber === "number"
        ? triggerBody.windowNumber
        : 1;

    logger.info(
      `[Registration Import] Starting window ${windowNumber} at byte ${byteOffset}…`,
    );

    // ── Connections ───────────────────────────────────────────────────────────
    const gdConn = configVars[
      "Google Drive Connection"
    ] as unknown as Connection;
    const sfConn = configVars["Salesforce Connection"] as unknown as Connection;
    const fileId = configVars["Registration File ID"] as unknown as string;
    const failedFolderId = configVars["Failed Records Folder ID"] as
      string | undefined;

    if (!fileId) throw new Error("Registration File ID config var is empty.");

    const gdToken = getAccessToken(gdConn);
    const sfToken = getAccessToken(sfConn);
    const sfBase = getSfInstanceUrl(sfConn);

    // ── Order price book + round (see "Order.Status — DECIDED" above) ────────
    const orderBook = orderPricebook(
      await resolveConfiguredPricebooks(
        sfBase,
        sfToken,
        configVars[PRICE_BOOKS_CONFIG_VAR] as unknown as string | undefined,
        logger,
      ),
    );
    logger.info(`[Registration Import] Order price book: "${orderBook.name}"`);
    const activateOrders =
      String(configVars[ACTIVATE_REGISTRATION_ORDERS_CONFIG_VAR]) === "true";
    logger.info(
      `[Registration Import] ${ACTIVATE_REGISTRATION_ORDERS_CONFIG_VAR} = ${activateOrders} — ` +
        (activateOrders
          ? `round 2: Draft Orders with line items → ${ACTIVATED_ORDER_STATUS}`
          : "round 1: Orders created/refreshed as Draft"),
    );

    // ── Build email cache + stream/map this window in parallel ───────────────
    // Neither depends on the other any more: AccountId/BillToContactId are
    // resolved by Salesforce itself (external-ID relationship syntax), so
    // the only thing the cache still feeds is GroupPayee, stitched on below
    // once both finish. The cache is rebuilt every window (~190k accounts,
    // ~95 pages) — a real cost of windowing, traded off against MAX_ROWS
    // being wide enough (25,000) that it's only paid a few dozen times for
    // the whole file rather than once per tiny window.
    logger.info(
      `[Registration Import] Window ${windowNumber}: building Student email ` +
        "cache and streaming this window of the Registration TSV in parallel…",
    );
    const [emailCache, windowResult] = await Promise.all([
      // The cache only feeds Payment.GroupPayee, so skip it when this flow
      // does not create Payments (see ORDER_FLOWS_CREATE_PAYMENTS).
      ORDER_FLOWS_CREATE_PAYMENTS
        ? buildStudentEmailCache(sfBase, sfToken, logger)
        : Promise.resolve(new Map<string, string>()),
      streamAndMapWindow(
        fileId,
        gdToken,
        byteOffset,
        MAX_ROWS,
        knownHeaders,
        logger,
        orderBook.id,
      ),
    ]);
    logger.info(
      `[Registration Import] Email cache — students=${emailCache.size}`,
    );

    let { cardPaymentMethods, orders, payments } = windowResult;
    const {
      rowsInWindow,
      filteredOut,
      hasMore,
      nextByteOffset,
      parsedHeaders,
    } = windowResult;

    logger.info(
      `[Registration Import] Window ${windowNumber} stream complete — ` +
        `rows=${rowsInWindow}, filteredOut(2yr scope)=${filteredOut}, ` +
        `hasMore=${hasMore}, nextByte=${nextByteOffset}, ` +
        `cardPaymentMethods=${cardPaymentMethods.length}, orders=${orders.length}, ` +
        `payments=${payments.length}`,
    );

    // ── Payments come from Payments Import, not from CC_Amt (decided 2026-11-08) ──
    if (!ORDER_FLOWS_CREATE_PAYMENTS) {
      if (payments.length > 0) {
        logger.info(
          `[Registration Import] ${payments.length} CC_Amt payment/refund row(s) NOT created — ` +
            "Payments Import is the only source of Payment and Refund records",
        );
      }
      payments = [];
    }

    // ── Negative CC_Amt → Refund, not a negative Payment (decided 2026-11-04) ──
    const refunds: SfRecord[] = [];
    payments = payments.filter((payment) => {
      if (Number(payment.Amount) >= 0) return true;
      delete payment[TEMP_STUDENT_ID_KEY];
      refunds.push(paymentToRefund(payment));
      return false;
    });
    if (refunds.length > 0) {
      logger.info(
        `[Registration Import] ${refunds.length} negative CC_Amt row(s) will load as Unreferenced Refunds`,
      );
    }

    // ── Stitch GroupPayee onto Payment records now that the email cache is ready ──
    let groupPayeeMissing = 0;
    for (const payment of payments) {
      const studentId = payment[TEMP_STUDENT_ID_KEY] as string | undefined;
      delete payment[TEMP_STUDENT_ID_KEY];
      if (!studentId) continue;
      const email = emailCache.get(studentId);
      if (email) {
        payment.GroupPayee__c = email;
      } else {
        groupPayeeMissing++;
      }
    }
    if (groupPayeeMissing > 0) {
      logger.warn(
        `[Registration Import][Payment] ${groupPayeeMissing} record(s) missing GroupPayee — ` +
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
      refunds.splice(TEST_LIMIT);
      logger.info(
        `[Registration Import] TEST MODE: skipped first ${TEST_SKIP}, limited to next ${TEST_LIMIT} records per object, and won't invoke the next window.`,
      );
    }

    // ── Upsert this window's records (skipped entirely if the window was empty) ──
    if (
      cardPaymentMethods.length === 0 &&
      orders.length === 0 &&
      payments.length === 0
    ) {
      logger.info(
        `[Registration Import] Window ${windowNumber}: no records to upsert.`,
      );
    }

    // ── Phase 1: CardPaymentMethod ────────────────────────────────────────────
    let cpmProcessed = 0;
    let cpmFailed = 0;
    let cpmSuccessfulCsv = "";
    let cpmFailedCsv = "";

    if (cardPaymentMethods.length > 0) {
      logger.info(
        `[Registration Import] Upserting ${cardPaymentMethods.length} CardPaymentMethod record(s)…`,
      );
      const r = await upsertInBatches(
        cardPaymentMethods,
        SF_CARD_PAYMENT_METHOD,
        sfBase,
        sfToken,
        logger,
        "[Registration Import][CardPaymentMethod]",
      );
      cpmProcessed = r.processed;
      cpmFailed = r.failed;
      cpmSuccessfulCsv = r.successfulCsv;
      cpmFailedCsv = r.failedCsv;
    }

    // ── Phase 2: Order (Draft create, or round-2 activation) ─────────────────
    let orderProcessed = 0;
    let orderFailed = 0;
    let orderSuccessfulCsv = "";
    let orderFailedCsv = "";

    const existingOrders = await loadOrderStates(
      sfBase,
      sfToken,
      orders.map((o) => o[EXT_ID_FIELD] as string),
      logger,
    );

    // ── Prior registration Orders that exist in Salesforce (link if exists) ──
    const priorExtIds = orders
      .map((o) => o[TEMP_PRIOR_REGISTRATION_KEY])
      .filter((v): v is string => typeof v === "string" && v !== "")
      .map((v) => registrationExtId(v));
    const priorOrderIdByExtId = new Map<string, string>();
    if (priorExtIds.length > 0) {
      const priorStates = await loadOrderStates(
        sfBase,
        sfToken,
        priorExtIds,
        logger,
      );
      for (const [extId, st] of priorStates)
        priorOrderIdByExtId.set(extId, st.id);
    }
    const withPrior = orders.filter((o) => o[TEMP_PRIOR_REGISTRATION_KEY]);
    const priorNotInOrg = withPrior.filter(
      (o) => !priorRegistrationOrderId(o, priorOrderIdByExtId),
    ).length;
    logger.info(
      `[Registration Import][Order] ${withPrior.length} Order(s) have a Prior_Registration_ID; ` +
        `${withPrior.length - priorNotInOrg} prior Order(s) found in Salesforce, ` +
        `${priorNotInOrg} not (yet) in Salesforce — loaded without ${PRIOR_REGISTRATION_FIELD}` +
        (activateOrders ? "" : " (round 2 links any loaded since)"),
    );

    // ── Round 2: drop line for drop Orders with no enrollment line ──────────
    // Runs BEFORE activation: a line cannot be added to an Activated Order.
    const dropItems: SfRecord[] = [];
    let dropResult = {
      processed: 0,
      failed: 0,
      successfulCsv: "",
      failedCsv: "",
    };
    let dropFallback = 0;
    if (activateOrders) {
      const dropCandidates = orders.filter((o) => {
        const st = existingOrders.get(o[EXT_ID_FIELD] as string);
        return (
          st?.status === DEFAULT_ORDER_STATUS &&
          o[TEMP_PRIOR_REGISTRATION_KEY] &&
          typeof o.Courses_Subtotal__c === "number" &&
          o.Courses_Subtotal__c !== 0
        );
      });
      if (dropCandidates.length > 0) {
        const courseLines = await loadCourseLines(sfBase, sfToken, [
          ...dropCandidates.map((o) => o[EXT_ID_FIELD] as string),
          ...dropCandidates.map((o) =>
            registrationExtId(o[TEMP_PRIOR_REGISTRATION_KEY] as string),
          ),
        ]);
        const needLine = dropCandidates.filter(
          (o) => !courseLines.has(o[EXT_ID_FIELD] as string),
        );
        let fallbackEntryId: string | undefined;
        const fallbackName =
          String(configVars[COURSE_DROP_PRODUCT_CONFIG_VAR] ?? "").trim() ||
          DEFAULT_COURSE_DROP_PRODUCT;
        for (const order of needLine) {
          const priorLines =
            courseLines.get(
              registrationExtId(order[TEMP_PRIOR_REGISTRATION_KEY] as string),
            ) ?? [];
          const chosen = chooseDropLineEntry(
            order.Courses_Subtotal__c as number,
            priorLines,
          );
          let entryId = chosen?.pricebookEntryId;
          if (!entryId) {
            if (fallbackEntryId === undefined) {
              fallbackEntryId =
                (await findPricebookEntryByProductName(
                  sfBase,
                  sfToken,
                  orderBook.id,
                  fallbackName,
                )) ?? "";
            }
            entryId = fallbackEntryId || undefined;
            dropFallback++;
          }
          if (!entryId) continue;
          const item = mapToDropItem(order, entryId, chosen?.courseOfferingId);
          if (item) dropItems.push(item);
        }
        logger.info(
          `[Registration Import][Drop] ${dropCandidates.length} Draft drop Order(s) in this window; ` +
            `${needLine.length} have no enrollment line; ${dropItems.length} drop line(s) to send ` +
            `(${dropFallback} without a single prior course → "${fallbackName}")`,
        );
        if (dropFallback > 0 && !fallbackEntryId) {
          logger.warn(
            `[Registration Import][Drop] No active PricebookEntry for Product2.Name "${fallbackName}" in ` +
              `"${orderBook.name}" — ${dropFallback} drop line(s) NOT created. Create the product (or set ` +
              `${COURSE_DROP_PRODUCT_CONFIG_VAR}) and re-run round 2.`,
          );
        }
        if (dropItems.length > 0) {
          dropResult = await upsertInBatches(
            dropItems,
            SF_ORDER_ITEM,
            sfBase,
            sfToken,
            logger,
            "[Registration Import][Drop OrderItem]",
          );
          // Orders that now have a line can be activated in this same run.
          const loaded = parseSuccessfulSfIds(
            dropResult.successfulCsv,
            EXT_ID_FIELD,
          );
          for (const item of dropItems) {
            if (!loaded.has(item[EXT_ID_FIELD] as string)) continue;
            const st = existingOrders.get(
              item["Order.External_ID_4D__c"] as string,
            );
            if (st) st.hasItems = true;
          }
        }
      }
    }

    const rawPlan = planOrderActivation(orders, existingOrders, activateOrders);
    const mappedByExtId = new Map(
      orders.map((o) => [o[EXT_ID_FIELD] as string, o] as const),
    );
    const plan = {
      ...rawPlan,
      toUpsert: rawPlan.toUpsert.map((rec) => {
        const upload = stripOrderTempKeys(rec);
        const mapped = mappedByExtId.get(rec[EXT_ID_FIELD] as string);
        const priorSfId = mapped
          ? priorRegistrationOrderId(mapped, priorOrderIdByExtId)
          : undefined;
        if (priorSfId) upload[PRIOR_REGISTRATION_FIELD] = priorSfId;
        return upload;
      }),
    };
    logger.info(
      `[Registration Import][Order] to send=${plan.toUpsert.length} (activating=${plan.activating}), ` +
        `already Activated (skipped)=${plan.alreadyActivated.size}, ` +
        `Draft without line items (left Draft)=${plan.draftWithoutItems.length}`,
    );
    if (plan.draftWithoutItems.length > 0) {
      logger.warn(
        `[Registration Import][Order] ${plan.draftWithoutItems.length} Draft Order(s) have no OrderItems ` +
          `and were NOT activated — run Registration Item Import first. e.g. ${plan.draftWithoutItems
            .slice(0, 10)
            .join(", ")}`,
      );
    }

    if (plan.toUpsert.length > 0) {
      logger.info(
        `[Registration Import] Upserting ${plan.toUpsert.length} Order record(s)…`,
      );
      const r = await upsertInBatches(
        plan.toUpsert,
        SF_ORDER,
        sfBase,
        sfToken,
        logger,
        "[Registration Import][Order]",
      );
      orderProcessed = r.processed;
      orderFailed = r.failed;
      orderSuccessfulCsv = r.successfulCsv;
      orderFailedCsv = r.failedCsv;
    }

    // ── Phase 2b: Registration fee OrderItem (round 1 only) ──────────────────
    // One FEE-{id} line per Order that just loaded as Draft and has a
    // non-zero Reg_Fee. Skipped in round 2: line items cannot be added to an
    // Activated Order, and round 1 already created them.
    const feeProductName =
      String(configVars[REGISTRATION_FEE_PRODUCT_CONFIG_VAR] ?? "").trim() ||
      DEFAULT_REGISTRATION_FEE_PRODUCT;
    const feeItems: SfRecord[] = [];
    let feeResult = {
      processed: 0,
      failed: 0,
      successfulCsv: "",
      failedCsv: "",
    };
    if (!activateOrders) {
      const loadedOrderExtIds = new Set(
        parseSuccessfulSfIds(orderSuccessfulCsv, EXT_ID_FIELD).keys(),
      );
      const withFee = orders.filter(
        (o) =>
          loadedOrderExtIds.has(o[EXT_ID_FIELD] as string) &&
          typeof o.Registration_Fee__c === "number" &&
          o.Registration_Fee__c !== 0,
      );
      if (withFee.length > 0) {
        const escapedName = feeProductName
          .replace(/\\/g, "\\\\")
          .replace(/'/g, "\\'");
        const feeEntries = await sfQueryAll<{ Id: string }>(
          sfBase,
          sfToken,
          `SELECT Id FROM PricebookEntry WHERE Pricebook2Id = '${orderBook.id}' ` +
            `AND IsActive = true AND Product2.Name = '${escapedName}' LIMIT 1`,
        );
        const feeEntryId = feeEntries[0]?.Id;
        if (!feeEntryId) {
          logger.warn(
            `[Registration Import][Fee] No active PricebookEntry for Product2.Name "${feeProductName}" in ` +
              `"${orderBook.name}" — ${withFee.length} fee line(s) NOT created. Create the product and its ` +
              `entry (or set the ${REGISTRATION_FEE_PRODUCT_CONFIG_VAR} config var), then re-run round 1.`,
          );
        } else {
          for (const order of withFee) {
            const item = mapToRegistrationFeeItem(order, feeEntryId);
            if (item) feeItems.push(item);
          }
          logger.info(
            `[Registration Import] Upserting ${feeItems.length} registration fee OrderItem(s) ("${feeProductName}")…`,
          );
          feeResult = await upsertInBatches(
            feeItems,
            SF_ORDER_ITEM,
            sfBase,
            sfToken,
            logger,
            "[Registration Import][Fee OrderItem]",
          );
        }
      }
    }

    // ── Phase 2c: STAP OrderItem (round 1 only) ──────────────────────────────
    const stapProductName =
      String(configVars[STAP_PRODUCT_CONFIG_VAR] ?? "").trim() ||
      DEFAULT_STAP_PRODUCT;
    const stapItems: SfRecord[] = [];
    let stapResult = {
      processed: 0,
      failed: 0,
      successfulCsv: "",
      failedCsv: "",
    };
    if (!activateOrders) {
      const loadedOrderExtIds = new Set(
        parseSuccessfulSfIds(orderSuccessfulCsv, EXT_ID_FIELD).keys(),
      );
      const withStap = orders.filter(
        (o) =>
          loadedOrderExtIds.has(o[EXT_ID_FIELD] as string) &&
          mapToStapItem(o, "x") !== null,
      );
      if (withStap.length > 0) {
        const stapEntryId = await findPricebookEntryByProductName(
          sfBase,
          sfToken,
          orderBook.id,
          stapProductName,
        );
        if (!stapEntryId) {
          logger.warn(
            `[Registration Import][STAP] No active PricebookEntry for Product2.Name "${stapProductName}" in ` +
              `"${orderBook.name}" — ${withStap.length} STAP line(s) NOT created. Create the product and its ` +
              `entry (or set the ${STAP_PRODUCT_CONFIG_VAR} config var), then re-run round 1.`,
          );
        } else {
          for (const order of withStap) {
            const item = mapToStapItem(order, stapEntryId);
            if (item) stapItems.push(item);
          }
          logger.info(
            `[Registration Import] Upserting ${stapItems.length} STAP OrderItem(s) ("${stapProductName}")…`,
          );
          stapResult = await upsertInBatches(
            stapItems,
            SF_ORDER_ITEM,
            sfBase,
            sfToken,
            logger,
            "[Registration Import][STAP OrderItem]",
          );
        }
      }
    }

    // ── Phase 2d: Registration adjustment OrderItem (round 1 only) ───────────
    const adjustmentProductName =
      String(configVars[REGISTRATION_ADJUSTMENT_PRODUCT_CONFIG_VAR] ?? "").trim() ||
      DEFAULT_REGISTRATION_ADJUSTMENT_PRODUCT;
    const adjustmentItems: SfRecord[] = [];
    let adjustmentResult = {
      processed: 0,
      failed: 0,
      successfulCsv: "",
      failedCsv: "",
    };
    if (!activateOrders) {
      const loadedOrderExtIds = new Set(
        parseSuccessfulSfIds(orderSuccessfulCsv, EXT_ID_FIELD).keys(),
      );
      const withAdjustment = orders.filter(
        (o) =>
          loadedOrderExtIds.has(o[EXT_ID_FIELD] as string) &&
          mapToRegistrationAdjustmentItem(o, "x") !== null,
      );
      if (withAdjustment.length > 0) {
        const adjustmentEntryId = await findPricebookEntryByProductName(
          sfBase,
          sfToken,
          orderBook.id,
          adjustmentProductName,
        );
        if (!adjustmentEntryId) {
          logger.warn(
            `[Registration Import][Adjustment] No active PricebookEntry for Product2.Name "${adjustmentProductName}" in ` +
              `"${orderBook.name}" — ${withAdjustment.length} adjustment line(s) NOT created, so those Order totals ` +
              `will not match. Create the product and its entry (or set the ${REGISTRATION_ADJUSTMENT_PRODUCT_CONFIG_VAR} ` +
              "config var), then re-run round 1.",
          );
        } else {
          for (const order of withAdjustment) {
            const item = mapToRegistrationAdjustmentItem(order, adjustmentEntryId);
            if (item) adjustmentItems.push(item);
          }
          logger.info(
            `[Registration Import] Upserting ${adjustmentItems.length} adjustment OrderItem(s) ("${adjustmentProductName}")…`,
          );
          adjustmentResult = await upsertInBatches(
            adjustmentItems,
            SF_ORDER_ITEM,
            sfBase,
            sfToken,
            logger,
            "[Registration Import][Adjustment OrderItem]",
          );
        }
      }
    }

    // ── Phase 3: PaymentGroup ─────────────────────────────────────────────────
    // One per successfully-upserted Order: SourceObjectId = that Order's real
    // Salesforce Id (pulled from Order's successfulResults, not re-queried).
    // Upserted on External_ID_4D__c = "REG-" + Registration.ID (the Order's
    // own key, reused), same as every other
    // object here — re-running the flow updates the same PaymentGroup instead
    // of creating a duplicate, which is what the workbook's "reuse if one
    // already exists for this Order" instruction asks for. See OPEN ITEMS re:
    // this field's existence on PaymentGroup.
    const orderSfIds = parseSuccessfulSfIds(orderSuccessfulCsv, EXT_ID_FIELD);
    // Orders skipped this run still exist — keep their PaymentGroup upserts.
    for (const [extId, sfId] of plan.alreadyActivated)
      orderSfIds.set(extId, sfId);
    for (const extId of plan.draftWithoutItems) {
      const current = existingOrders.get(extId);
      if (current) orderSfIds.set(extId, current.id);
    }
    const paymentGroups: SfRecord[] = [];
    for (const [registrationId, orderSfId] of orderSfIds) {
      paymentGroups.push({
        [EXT_ID_FIELD]: registrationId,
        SourceObjectId: orderSfId,
      });
    }
    if (orders.length > 0 && paymentGroups.length < orders.length) {
      logger.warn(
        `[Registration Import][PaymentGroup] ${orders.length - paymentGroups.length} ` +
          "registration(s) have no PaymentGroup — their Order did not succeed",
      );
    }

    let pgProcessed = 0;
    let pgFailed = 0;
    let pgSuccessfulCsv = "";
    let pgFailedCsv = "";

    if (paymentGroups.length > 0) {
      logger.info(
        `[Registration Import] Upserting ${paymentGroups.length} PaymentGroup record(s)…`,
      );
      const r = await upsertInBatches(
        paymentGroups,
        SF_PAYMENT_GROUP,
        sfBase,
        sfToken,
        logger,
        "[Registration Import][PaymentGroup]",
      );
      pgProcessed = r.processed;
      pgFailed = r.failed;
      pgSuccessfulCsv = r.successfulCsv;
      pgFailedCsv = r.failedCsv;
    }

    // ── Stitch PaymentGroupId onto Payment records now that PaymentGroup exists ──
    const paymentGroupSfIds = parseSuccessfulSfIds(
      pgSuccessfulCsv,
      EXT_ID_FIELD,
    );
    let paymentGroupMissing = 0;
    for (const payment of payments) {
      const registrationId = payment[EXT_ID_FIELD] as string;
      const pgId = paymentGroupSfIds.get(registrationId);
      if (pgId) {
        payment.PaymentGroupId = pgId;
      } else {
        paymentGroupMissing++;
      }
    }
    if (paymentGroupMissing > 0) {
      logger.warn(
        `[Registration Import][Payment] ${paymentGroupMissing} record(s) missing ` +
          "PaymentGroupId — their PaymentGroup (or its parent Order) did not succeed",
      );
    }

    // ── Phase 4: Payment ──────────────────────────────────────────────────────
    let paymentProcessed = 0;
    let paymentFailed = 0;
    let paymentSuccessfulCsv = "";
    let paymentFailedCsv = "";

    if (payments.length > 0) {
      logger.info(
        `[Registration Import] Upserting ${payments.length} Payment record(s)…`,
      );
      const r = await upsertInBatches(
        payments,
        SF_PAYMENT,
        sfBase,
        sfToken,
        logger,
        "[Registration Import][Payment]",
      );
      paymentProcessed = r.processed;
      paymentFailed = r.failed;
      paymentSuccessfulCsv = r.successfulCsv;
      paymentFailedCsv = r.failedCsv;
    }

    // ── Phase 5: Refund (negative CC_Amt rows) ───────────────────────────────
    let refundMissingGroup = 0;
    for (const refund of refunds) {
      const pgId = paymentGroupSfIds.get(refund[EXT_ID_FIELD] as string);
      if (pgId) refund.PaymentGroupId = pgId;
      else refundMissingGroup++;
    }
    if (refundMissingGroup > 0) {
      logger.warn(
        `[Registration Import][Refund] ${refundMissingGroup} record(s) missing PaymentGroupId — ` +
          "their PaymentGroup (or its parent Order) did not succeed",
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
            "[Registration Import][Refund]",
          )
        : { processed: 0, failed: 0, successfulCsv: "", failedCsv: "" };

    // ── Results sheet ─────────────────────────────────────────────────────────
    try {
      const sheet = await createPerObjectResultsSheet({
        flowName: "Registration Import",
        objects: [
          {
            objectName: SF_CARD_PAYMENT_METHOD,
            successfulCsv: cpmSuccessfulCsv,
            failedCsv: cpmFailedCsv,
          },
          {
            objectName: SF_ORDER,
            successfulCsv: orderSuccessfulCsv,
            failedCsv: orderFailedCsv,
          },
          {
            objectName: `${SF_ORDER_ITEM} (Registration Fee)`,
            successfulCsv: feeResult.successfulCsv,
            failedCsv: feeResult.failedCsv,
          },
          {
            objectName: `${SF_ORDER_ITEM} (STAP)`,
            successfulCsv: stapResult.successfulCsv,
            failedCsv: stapResult.failedCsv,
          },
          {
            objectName: `${SF_ORDER_ITEM} (Adjustment)`,
            successfulCsv: adjustmentResult.successfulCsv,
            failedCsv: adjustmentResult.failedCsv,
          },
          {
            objectName: `${SF_ORDER_ITEM} (Drop)`,
            successfulCsv: dropResult.successfulCsv,
            failedCsv: dropResult.failedCsv,
          },
          {
            objectName: SF_PAYMENT_GROUP,
            successfulCsv: pgSuccessfulCsv,
            failedCsv: pgFailedCsv,
          },
          ...(ORDER_FLOWS_CREATE_PAYMENTS
            ? [
                {
                  objectName: SF_PAYMENT,
                  successfulCsv: paymentSuccessfulCsv,
                  failedCsv: paymentFailedCsv,
                },
                {
                  objectName: SF_REFUND,
                  successfulCsv: refundResult.successfulCsv,
                  failedCsv: refundResult.failedCsv,
                },
              ]
            : []),
        ],
        accessToken: gdToken,
        folderId: failedFolderId,
      });
      logger.info(`[Registration Import] Results sheet: ${sheet.url}`);
    } catch (err) {
      logger.warn(
        `[Registration Import] Could not write results sheet: ${String(err)}`,
      );
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    logger.info(
      `[Registration Import] Window ${windowNumber} complete —` +
        `\n  Window rows:               ${rowsInWindow}` +
        `\n  CardPaymentMethod submitted: ${cardPaymentMethods.length}, processed: ${cpmProcessed}, failed: ${cpmFailed}` +
        `\n  Order mapped:                ${orders.length}, sent: ${plan.toUpsert.length}, activating: ${plan.activating}, ` +
        `already Activated: ${plan.alreadyActivated.size}, Draft w/o items: ${plan.draftWithoutItems.length}` +
        `\n  Order submitted:             ${plan.toUpsert.length}, processed: ${orderProcessed}, failed: ${orderFailed}` +
        `\n  Fee OrderItem submitted:     ${feeItems.length}, processed: ${feeResult.processed}, failed: ${feeResult.failed}` +
        `\n  STAP OrderItem submitted:    ${stapItems.length}, processed: ${stapResult.processed}, failed: ${stapResult.failed}` +
        `\n  Adjustment OrderItem submitted: ${adjustmentItems.length}, processed: ${adjustmentResult.processed}, failed: ${adjustmentResult.failed}` +
        `\n  Drop OrderItem submitted:    ${dropItems.length}, processed: ${dropResult.processed}, failed: ${dropResult.failed}` +
        `\n  Prior registration:          ${withPrior.length} with ID, ${priorNotInOrg} not in Salesforce (unlinked)` +
        `\n  PaymentGroup submitted:      ${paymentGroups.length}, processed: ${pgProcessed}, failed: ${pgFailed}` +
        `\n  Payment submitted:           ${payments.length}, processed: ${paymentProcessed}, failed: ${paymentFailed}` +
        `\n  Refund submitted:            ${refunds.length}, processed: ${refundResult.processed}, failed: ${refundResult.failed}`,
    );

    // ── Invoke next window if more rows remain ───────────────────────────────
    if (TEST_MODE && hasMore) {
      logger.info(
        "[Registration Import] TEST MODE: more rows remain, but stopping here " +
          "— set TEST_MODE = false to process the full file.",
      );
    } else if (hasMore) {
      logger.info(
        `[Registration Import] More rows remain — invoking window ${windowNumber + 1} ` +
          `at byte ${nextByteOffset}…`,
      );
      await (
        context as unknown as {
          invokeFlow(name: string, payload: unknown): Promise<void>;
        }
      ).invokeFlow("Registration Import", {
        byteOffset: nextByteOffset,
        headers: parsedHeaders,
        windowNumber: windowNumber + 1,
      });
    } else {
      logger.info(
        `[Registration Import] All rows processed — import complete after ${windowNumber} window(s).`,
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
        cardPaymentMethodsProcessed: cpmProcessed,
        cardPaymentMethodsFailed: cpmFailed,
        orders: orders.length,
        activateOrders,
        ordersActivating: plan.activating,
        ordersAlreadyActivated: plan.alreadyActivated.size,
        ordersDraftWithoutItems: plan.draftWithoutItems.length,
        ordersProcessed: orderProcessed,
        ordersFailed: orderFailed,
        feeOrderItems: feeItems.length,
        feeOrderItemsProcessed: feeResult.processed,
        feeOrderItemsFailed: feeResult.failed,
        stapOrderItems: stapItems.length,
        stapOrderItemsProcessed: stapResult.processed,
        stapOrderItemsFailed: stapResult.failed,
        adjustmentOrderItems: adjustmentItems.length,
        adjustmentOrderItemsProcessed: adjustmentResult.processed,
        adjustmentOrderItemsFailed: adjustmentResult.failed,
        dropOrderItems: dropItems.length,
        dropOrderItemsProcessed: dropResult.processed,
        dropOrderItemsFailed: dropResult.failed,
        dropOrderItemsFallbackProduct: dropFallback,
        ordersWithPriorRegistration: withPrior.length,
        priorRegistrationNotInOrg: priorNotInOrg,
        paymentGroups: paymentGroups.length,
        paymentGroupsProcessed: pgProcessed,
        paymentGroupsFailed: pgFailed,
        payments: payments.length,
        paymentsProcessed: paymentProcessed,
        paymentsFailed: paymentFailed,
        refunds: refunds.length,
        refundsProcessed: refundResult.processed,
        refundsFailed: refundResult.failed,
      },
    };
  },
});

export default [registrationImport];
