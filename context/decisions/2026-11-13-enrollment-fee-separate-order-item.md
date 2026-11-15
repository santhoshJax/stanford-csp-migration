# Enrollment Fee loads as its own OrderItem ("Course Additional Fees")

**Status:** Accepted · **Date:** 2026-11-13 · **Deciders:** Trevor Shields (with Santhosh Kumar Aleti)
**Source:** Firefly — Internal | Stanford CSP Data Migration Standup, 2026-11-13 (01M70JZ864BQ98W93Y261J1D6J); question first raised at the 2026-11-11 standup (01M6M1TRYNFDEFC3Y3NGEH92P3).

## Context
Enrollment rows carry Tuition, Fee and TA_Discount (Extension = Tuition + TA_Discount + Fee). The fee is a bucket amount with no fee type (e.g. ART 132: $15). UAT has no fee product; QA has a "Material Fee" product.

## Decision
- When Enrollment.Fee > 0, create a separate OrderItem on the registration Order: one generic product (Trevor is fine with "Course Additional Fees"; "Material Fee" also acceptable), UnitPrice = Fee, Quantity = 1.
- When Fee is 0 or empty, no fee OrderItem.
- The product needs a PricebookEntry, but each line overrides the price with the row's Fee.
- Supersedes the option of pricing the course line at Tuition + Fee, and the built behaviour of putting the fee inside the "discount" adjustment.

## Consequences
- Course line stays UnitPrice = Tuition; the discount adjustment becomes TA_Discount only.
- Product must be created in UAT (Trevor to verify generic fee products).
