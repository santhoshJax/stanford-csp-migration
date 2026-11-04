# Handoff — current state

> **Rewritten at the end of every session.** This file is *now*; [`gotchas.md`](gotchas.md) is *forever*.
> If this file and [`../CONTEXT.md`](../CONTEXT.md) disagree, this one is newer.

**Last updated:** 2026-10-16 · **By:** <session or person>

---

## Where things stand

> **Not yet filled in.** — Where is the work right now, in two or three sentences? Someone picking
> this up cold reads this first.

## In progress

| What | State | Where it lives | Blocked on |
|---|---|---|---|
| | | | |

## Next steps

<!-- Ordered. The top item should be the one to do next, not the most interesting one. -->

1.

## Waiting on someone else

| What | Who | Since | Chased? |
|---|---|---|---|
| | | | |

## Things the next session should know

<!-- Anything true right now that is not obvious from the code: a half-finished refactor, a
     deliberately disabled test, a workaround that needs removing, a deploy that is half-applied.
     If you leave something in a strange state, this is where you say so. -->

-

<!-- orchestrate:session-state:start -->
<!-- Written by Orchestrate at the end of each session. Edits inside this block are
     replaced next session; anything OUTSIDE it is yours and is never touched. -->
### Engagement state — 2026-11-04
**Status:** blocked — Quick status: I've checked the branch and found one new code change since my last review.

**Done this session**
- Quick status: I've checked the branch and found one new code change since my last review. Here's the full list of concerns. There are **4 things to change**, **6 decisions to make** and **4 things to check in UAT**. I haven't changed any c…

**Open items**
- Decide: use TA_Discount or Extension−Tuition for adjustment Amount (both equal in sample, but differ in principle)
- Decide: take Discount Name from Enrollment.Discount_Type or keep fixed text (conflicts with Trevor's Order-level discount type statement)
- Decide: link Payments.Purchase_ID via Conversion logic (sheet now says Conversion, code says Do Not Map)
- Decide: find course product via Product2.Course_Offering__c (sheet option B) or External_ID_4D__c (current code)
- Run sf deploy validate against UAT org to verify field requirements & schema
- Test adjustment creation in UAT: no OrderAdjustmentGroup required, all required fields present
- Open PR #1 for review & merge to main
- Rebuild & import three course integrations into Prismatic

**Decisions**
- Discount adjustment amount = Extension − Tuition (no separate sign rule per row type)
- Adjustment keyed ADJ-{Enrollment.ID}, attached to line via ENR-{id}
- Adjustment loads as second step in Registration Item Import, before activation
- No adjustment created if Extension − Tuition = 0
- REG- prefix for registration orders; ENR- for registration line items; PIT- for purchase line items
- All enrollment rows (Add, Drop, AJST, New, DupEnrollment, Course cancel) generate line items
- Line item price sourced from Tuition field, not Extension
- TA_Discount compared only for mismatch warning; not written to Salesforce

**Blockers**
- Workbook edit history unavailable — cannot confirm who changed what or when exactly
- 3 mapping differences between code and workbook require architect confirmation before build
- Validation deploy not yet run — code unverified against UAT org schema

**Next**
- Confirm with architect (or Trevor): Amount = TA_Discount or Extension−Tuition; Name from Discount_Type or fixed text; Purchase_ID Conversion logic; product lookup via Course_Offering__c or External_ID_4D__c
- Run sf deploy validate against UAT org
- Test adjustment creation in UAT (no OrderAdjustmentGroup, required fields)
- Update code if architect confirms changes, or close differences if workbook reverts to code logic
- Open PR #1 for review & merge

**Checked live on 2026-11-04:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-11-04
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements- Build |
| Session | `be60d849-b984-488e-85da-da28ad9ff44a` |
**In its own words (excerpt):**
Quick status: I've checked the branch and found one new code change since my last review. Here's the full list of concerns.

There are **4 things to change**, **6 decisions to make** and **4 things to check in UAT**. I haven't changed any code. One finding is new since my last answer: commit `65ed324` (2026-11-04) removed product and price book entry creation from the course flows, so Salesforce org automation now creates them. That makes the first item below the most urgent.

## 1. Changes I recommend (ready to build when you say so)

**A. Find the course product through its Course Offering** (workbook rows 63 and 66)
- **Now:** Registration Item looks for a price book entry where `Product2.External_ID_4D__c = Course_ID`. That only works if the org automation writes our ID onto the Product. The commit message says it does, but nobody has checked that in UAT.
- **Change:** look it up through `Product2.Course_Offering__r.External_ID_4D__c = Course_ID`. That's what the sheet says, and it works whether or not the automation sets the ID.
- **Related risk:** our earlier course runs already created Products and entries in UAT (`STD-…` / `<Course.ID>` keys). If the automation now adds its

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
