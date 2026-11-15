# OrderItem keys use a {source}-{type}-{id} scheme

**Status:** Accepted · **Date:** 2026-11-15 · **Deciders:** Santhosh Kumar Aleti

## Context
Registration Orders get lines from two files: the Registration file (fee, STAP, adjustment, drop) and the Enrollment file (course, course fee, discount adjustment). The old keys (`FEE-`, `STAP-`, `REGADJ-`, `DROP-`, `ADJ-`) did not say which file a line came from, and the new course fee line would have looked like the registration fee line.

## Decision
All in `External_ID_4D__c`:
- From Registration (Registration ID): `REG-FEE-`, `REG-STAP-`, `REG-ADJ-`, `REG-DROP-` on OrderItem.
- From Enrollment (Enrollment ID): `ENR-FEE-` on OrderItem (course fee line, Fee > 0), `ENR-ADJ-` on OrderItemAdjustmentLineItem.
- The course (tuition) line keeps `ENR-{Enrollment.ID}`.
- Unchanged: Orders `REG-`/`PUR-`, payments `PAY-`, purchase lines `PIT-`.
- Course fee product name: "Course Additional Fees" (config var "Course Additional Fee Product").

## Consequences
- Built in commit on `stanford-csp-orchestrate`, 2026-11-15.
- Any lines already loaded under the old keys would be duplicated on re-run; registration had not been loaded to UAT as of the 13 Nov standup.
- "Course Additional Fees" must be created in UAT with an active entry in the order price book.
