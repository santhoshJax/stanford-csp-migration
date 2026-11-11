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
### Engagement state — 2026-11-11
**Status:** on track — Purchase Inventory flow reviewed; no changes made. Screen recording still unprocessable; awaiting decision on next steps.

**Done this session**
- Reviewed purchaseInventoryFlow.ts and commerceShared.ts; documented flow logic, prerequisites, and known risks

**Open items**
- Team: attempt CSV load to UAT; report FIELD_INTEGRITY_EXCEPTION or duplicate rule errors
- Team: confirm Grade_Option__c picklist labels match CSV values (Letter Grade, CR/NC, NGR, blank)
- Admin: verify/create Order.Prior_Registration__c, Order.BalanceDue__c, Payment.Transcript_Request__c lookups in UAT
- Admin: mark External_ID_4D__c as External ID on PaymentGroup, Refund, Product2
- Admin: create STAP, Course Drop, Registration Fee products in UAT ($0 price, both price books)
- Dev: refactor section 1a code to use CSP_Storefront_Base_URL label
- Confirm: delete 12 zeroed Hypercare - Stan:ContEd records or leave as-is
- Obtain usable content from 2026-11-09 screen recording (wait, describe, screenshots, or re-record with narration)

**Decisions**
- Keep site API names (StanfordContinuingStudies); change display name and URL path only
- Move hardcoded portal URLs to CSP_Storefront_Base_URL label
- Split ParticipantId into ParticipantContactId and ParticipantAccountId columns
- Use real API names from org describe; ParticipationStatus replaces placeholder Status
- CSV uses real 003 Contact IDs and 001 Account IDs (no fallback needed)
- Update existing records in org rather than insert new ones (keep Id column in CSV)
- Jason's hours consolidated to single workstream record per week (not split evenly)

**Blockers**
- Grade_Option__c picklist labels unconfirmed against org schema
- Duplicate rule on student + offering may block CSV load if active
- Required UAT fields (Prior_Registration__c, BalanceDue__c, Transcript_Request__c, External_ID_4D__c) not yet verified/created
- Screen recording (2026-11-09) unprocessable; no transcript or usable content extracted

**Next**
- Decide on screen recording: wait for reprocessing, describe content, share screenshots, or re-record with narration
- Team: attempt CSV load to UAT; report any errors to unblock field confirmation
- Admin: complete UAT product and field setup in parallel with CSV load attempt
- Team: confirm Grade_Option__c picklist labels from Setup → Object Manager → Course Offering Participant

**Checked live on 2026-11-11:** the repository
### Last session — 2026-11-11
| | |
|---|---|
| Type | REVIEW |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Purchase-Inventory |
| Session | `37d53c41-f101-4747-94db-b73400d5256e` |
**In its own words (excerpt):**
I read the flow in `src/purchaseInventoryFlow.ts` on branch `stanford-csp-orchestrate`, plus the shared helpers it calls in `src/commerceShared.ts`. I changed nothing.

## What it does, in plain words

Purchase Inventory is 4D's menu of things a student can buy, such as Transcript, Manuscript Surcharge, Registration Fee or Course Drop. This flow turns that menu into products and prices in Salesforce. The Purchase Item import later uses those products to attach "what was bought" to each order.

**Step 0: Read the file.** It reads the Purchase Inventory TSV from Google Drive (the "Purchase Inventory File ID" setting). The file is only a few dozen rows, so it is processed in a single pass.

**Step 1: Check the setup before writing anything.**
- It looks up the price books named in the "Price Books" setting. The Standard Price Book is always included and is loaded first.
- If a named price book doesn't exist or isn't active, the run stops before any data is written. That avoids a half-finished load.
- Per the handoff notes, the other book here is "StanfordContinuingStudies Price Book".

**Step 2: Create or update the products (Product2).** Each row becomes one product, matched on `Exte

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
