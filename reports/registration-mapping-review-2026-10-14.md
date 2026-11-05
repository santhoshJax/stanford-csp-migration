# Registration-area mapping review — 2026-10-14

Scope: the updated mapping workbook ("Registration" tab plus the related tabs
**Payments**, **Purchase**, **Purchase Item**, **Purchase Inventory**) compared
against `src/registrationFlow.ts` as it stands on `stanford-csp-orchestrate`,
and the new flows added in this change.

Nothing here was run against a Salesforce org or Google Drive source file —
every statement about org behaviour is either quoted from the existing flow's
verified notes or marked **unverified**. Unit tests (12) cover the pure mapping
functions only.

## 1. Registration tab vs. `registrationFlow.ts`

**Matches the tab (no change needed):** every Direct Map / Conversion row for
CardPaymentMethod, Order, PaymentGroup and Payment; all Do Not Map columns
(Batch_Print, Created_*, Last_Modified_*, Prior_Registration_ID,
Reconciliation_ID, Student_Country, Student_ID_Previous); Payment defaults
(Type = Capture, Status = Processed); `GroupPayee` from the Person Account
email; PaymentGroup reuse (satisfied by upsert on `External_ID_4D__c`);
2-year cutoff on `Registration_Date` (the one TRUE in "Field to Determine
2-Year Cutoff").

**Differences / gaps**

| # | Tab says | Flow does | Needs |
|---|---|---|---|
| R1 | New block: `OrderItem.OrderId` = created Order, `UnitPrice` ← `CC_Amt`, `Quantity` default 1 | Creates **no** OrderItems (header comment said the workbook had no line-item mapping — now stale; comment updated) | Architect: which Product2 / PricebookEntry do Registration lines use? OrderItem requires a `PricebookEntryId`, and the Order needs a `Pricebook2Id`. The tab names neither. |
| R2 | `CC_Amt` → `Order.TotalAmount` "Direct Map" | Not mapped — field is not writable (verified in UAT on 2026-10-01) | Tab row should be struck. Once R1 is built, TotalAmount is calculated by the platform from the lines. |
| R3 | `Order.Status` = "Default to Activated" | `Draft` (Activated is rejected on create; architect confirmed Draft-then-activate on 2026-10-06) | Tab is stale. A separate **Order activation** step is still needed after OrderItems exist — not built; it depends on R1. |
| R4 | `Payment.Amount` ← `CC_Amt`, Map Type blank | Direct map; zero skipped; negative kept as `Capture` with a negative amount (interim) | Tab now has a `Refund` object (Type = Referenced). Should negative `CC_Amt` rows become Refunds instead? |
| R5 | `Order.OrderReferenceNumber` "Conversion", no logic given | Pass-through | What conversion was intended? |
| R6 | `CardPaymentMethod.ExpiryYear` "set as 10" | Writes `10` | Confirm the org accepts a 2-digit year (unverified). |
| R7 | `PaymentGroup.Payment_Number__c` AutoNumber | Not mapped; verified field is actually `PaymentGroupNumber` | Tab field name is wrong; harmless (AutoNumber). |
| R8 | — | Cash/check/SNAP registrations still get a card + Capture payment (open since 2026-10-01); `Check_No` non-numeric skipped | Still awaiting the architect's answer. |

## 2. New flows (all `TEST_MODE = true`, 50 records)

Run order: Student → **Purchase Inventory** → Registration → **Purchase** →
**Purchase Item** → **Payments**.

| Flow | Tab | Writes | Notes |
|---|---|---|---|
| Purchase Inventory Import | Purchase Inventory | Product2, PricebookEntry (Standard Price Book) | Single pass. PricebookEntry insert-only (no external id on it); existing entries are skipped, not repriced. |
| Purchase Import | Purchase | CardPaymentMethod, Order, PaymentGroup, Payment | Registration's twin. External IDs `PUR-{id}`. Orders are Draft with `Pricebook2Id` = Standard. |
| Purchase Item Import | Purchase Item | OrderItem | External ID `PI-{id}`. Product resolved by `Product2.Name` → PricebookEntry. Lines whose parent Order isn't loaded are skipped and counted. |
| Payments Import | Payments | Payment, Refund, RefundLinePayment | External ID `PAY-{id}` on Payment and Refund. Linked to the Registration's PaymentGroup, not an "OrderId". Refund → Payment link is a `RefundLinePayment` (insert-only, re-run safe). |

## 3. Cross-tab problems found (decisions needed)

1. **External-ID collisions.** Every tab writes a raw 4D `ID` into
   `External_ID_4D__c` on shared objects (Order, Payment, CardPaymentMethod,
   PaymentGroup), and the id ranges overlap. Unprefixed, Purchase would
   overwrite Registration records. New flows prefix (`PUR-`, `PAY-`, `PI-`);
   Registration stays raw because it is already loaded in UAT.
2. **Possible double-counted payments.** Registration already creates a Payment
   from `CC_Amt`; a Payments row with a `Registration_ID` probably describes the
   same money. `REGISTRATION_LINKED_PAYMENTS` in `paymentsFlow.ts` is `"load"`
   (literal workbook) — switch to `"skip"` if the Registration-created payment
   should win. **Decide before any full run.**
3. **Field names that cannot be right.** `4D_Payment_Sub_Type__c` and
   `4D_Freeze__c` start with a digit (not a legal API name); `Payment_Type` has
   no `__c`. Left **unmapped** (`UNCONFIRMED_FIELDS`) until the real names are
   known.
4. **Order.Status "Paid"** (Purchase tab, Direct Map) can't be written — only
   Draft can be created. The source status isn't preserved anywhere yet; a
   custom field would be needed if it matters.
5. **Balance field name.** Purchase tab: `BalanceDue__c`; Registration tab and
   the field verified in UAT: `Balance_Due__c`. Used the verified one.
6. **Unverified fields the tabs require** (describe before the first real run;
   an unknown column fails a whole Bulk job): `Order.Payment_Transaction_Id__c`,
   `CardPaymentMethod.GatewayDate`, `OrderItem.Unit_Description__c`,
   `OrderItem.Ref_Record_ID__c`, `OrderItem.External_ID_4D__c`,
   `Product2.External_ID_4D__c`, `Refund.External_ID_4D__c` (must be created + flagged External ID), `Refund.ProcessingMode` = External,
   `Payment.Payment_Source__c`, `Payment.STAP_Amount__c`,
   `Payment.Transcript_Request__c`, plus FLS for `ProcessingMode` on Payment.
7. **Writable-field limits.** `OrderItem.TotalPrice` (← `Extended_Amount`) is a
   calculated field and not mapped (mismatches vs UnitPrice × Quantity are
   logged). `OrderItem.Type` (← `Item_Type (classification)`) is a restricted
   picklist; mapping is gated off (`MAP_ORDER_ITEM_TYPE`).
   `Product2.QuantityUnitOfMeasure` is restricted; only values in
   `VALID_QUANTITY_UNITS` (currently `Each`) are written.
8. **Scope.** None of the four new tabs has a "Field to Determine 2-Year
   Cutoff" column. Assumed `Purchase_Date` / `Date_Time_New` ≥ 2024-10-06 (same
   fixed date as Registration). Confirm.
9. **Standard Price Book** is assumed for PricebookEntry, Order and OrderItem —
   the tabs never name a price book.
10. **`Purchase_ID` on Payments is Do Not Map**, so purchase-paid payments are
    not attached to their `PUR-` PaymentGroup. Probably worth mapping.
11. **Payments "Payment.OrderId".** Payment has no OrderId; linked via
    PaymentGroup instead (Registration creates one per Order).
12. **Purchase tab typos:** `CC_Last_Four` "224" has lost a leading zero in the
    sample; `CC_Exp_Date` is packed ("1020") although marked Direct Map into two
    fields — Registration's unpacking is reused.

## 4. Not built

- Order activation (Draft → Activated) — depends on R1.
- Registration OrderItems — depends on R1.

## 5. Build-session fix (2026-10-14)

The General-session draft built each Refund with `PaymentId`. `Refund` has no
such field — the standard link from a refund to the payment it returns is the
`RefundLinePayment` junction (`RefundId`, `PaymentId`, `Amount`,
`Type = Applied`). Left as-is, the whole Refund Bulk job would have failed on an
unknown column. Now:

- Refund carries `ProcessingMode = External` (required on Refund) and inherits
  `Date`, Account (`Account.Student_ID_4D__c`) and PaymentGroup from its Payment.
- A third phase inserts one `RefundLinePayment` per successful Refund, skipping
  refunds that already have a line, so re-runs don't duplicate.
- Still **unverified against the org** (no org attached to this session):
  run a describe of `Refund` and `RefundLinePayment` before the first real run.
