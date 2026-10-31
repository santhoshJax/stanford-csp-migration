# Environment — {{CLIENT_NAME}}

> Orgs, sandboxes, endpoints and **credential references**. Never credential values.

**Last reviewed:** 2026-10-16

## ⚠️ Never put secrets in this file

Record **where** a credential lives, never what it is:

- ✅ `Named Credential: Acme_ERP_Prod` · `LastPass: "Acme — ERP integration user"`
- ❌ a password, token, private key, session id, or connection string with credentials in it

## Salesforce orgs

| Purpose | Alias | Type | My Domain / URL | Notes |
|---|---|---|---|---|
| Production | | Production | | |
| UAT | | Sandbox | | |
| Dev | | Sandbox | | refreshed: |

<!-- Sandbox refreshes change org IDs and user IDs. When one is refreshed, note the DATE here —
     it explains a whole class of "it worked last week" problems. -->

## Connected systems

| System | Environment | How we authenticate | Credential reference |
|---|---|---|---|
| | | | |

## Deployment path

> **Not yet filled in.** — How does code actually reach production here? CI/CD? Manual change sets?
> Who has deploy rights? What is the release window? What is the rollback story?

## Access we hold

> **Not yet filled in.** — What access has the client granted us, to what, and when does it expire?
> Note anything time-boxed so it does not lapse mid-engagement.
