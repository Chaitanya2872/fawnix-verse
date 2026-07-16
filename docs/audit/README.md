# Fawnix Verse — Code Audit

A code review of the codebase as of **2026-07-14** (commit `5939027`), covering
infrastructure, adherence to coding standards, and cleanup opportunities. Findings were
gathered by reading the source directly; the most severe were verified against `git`.

**Severity**: **P0** critical/security · **P1** high · **P2** medium · **P3** low/tech-debt.

> **📋 Full per-flow census complete.** Every microservice and frontend module was deep-audited —
> one report each, independently reviewed for accuracy/insight. **[32 flow reports](./services/README.md)**,
> **629 findings — 61 P0 · 158 P1 · 213 P2 · 194 P3**, every finding carrying `file:line`, confidence,
> owner, and fix. Start at the **[census roll-up](./granular/census-rollup.md)**, or browse
> **[backend services](./services/README.md)** · **[frontend modules](./modules/README.md)**.
> _(The risk register below is the earlier hotspot pass; the census supersedes its counts.)_

---

## Executive summary

Fawnix Verse is a capable, feature-rich ERP platform with a sound high-level architecture
(feature-per-service backend, per-service databases, a modern typed frontend). The main risks
are **not** in the architecture — they are in **security hygiene, an incomplete product merge,
the total absence of tests, and CI/CD that deploys unverified code straight to production.**

The single most urgent issue: **live Google/Gemini API keys are committed to git** and several
services ship **usable default credentials**. These need action before anything else.

The second theme is an **incomplete HirePath → Fawnix merge**: 8 backend services still live
under the `com.hirepath` namespace, lack global exception handling, and carry residual
artifacts; on the frontend, the "visitor management" module is a foreign body with its own
auth, HTTP client, and a hardcoded ngrok URL.

The third theme is **maintainability drag**: a handful of 1,000–4,000-line god-components, a
security stack copy-pasted into ~14 services, three competing internal-auth mechanisms, and
duplicated helper code.

None of these block the product from running — but together they make it fragile to change and
risky to operate. The good news: most are mechanical to fix, and the [cleanup
checklist](./cleanup-checklist.md) sequences them.

---

## Consolidated risk register (top items)

| # | Sev | Area | Finding | Detail |
|---|---|---|---|---|
| 1 | **P0** | Security | Live Gemini API keys committed to git | [security](./security.md#1) |
| 2 | **P0** | Security | Usable default secrets/credentials shipped (`JWT_SECRET`, `Admin@123`, `minioadmin`, `postgres`) | [security](./security.md#2) |
| 3 | **P0** | Security | Hardcoded ngrok URL + demo creds (`admin`/`secret`) in VMS frontend | [security](./security.md#3) |
| 4 | **P0** | Security | VMS "offline demo" mode forges a session on network failure | [security](./security.md#4) |
| 5 | **P0** | Infra | All containers run as **root** | [infrastructure](./infrastructure.md#containers-root) |
| 6 | **P1** | Quality | **Zero tests** in frontend or backend | [backend](./backend.md#tests), [frontend](./frontend.md#tests) |
| 7 | **P1** | CI/CD | `master` auto-deploys to prod with no test/lint gate; builds on the host; `StrictHostKeyChecking=no` | [infrastructure](./infrastructure.md#cicd) |
| 8 | **P1** | Backend | 8 HirePath services lack a `GlobalExceptionHandler` (break frontend error contract) | [backend](./backend.md#exceptions) |
| 9 | **P1** | Backend | `sales → inventory` uses hardcoded `localhost:8083` (fails in containers) | [backend](./backend.md#hardcoded-url) |
| 10 | **P1** | Backend | `hrms-service` `denyAll()` — registered/routed but non-functional | [backend](./backend.md#hrms) |
| 11 | **P1** | Infra | PRD serves the frontend via a **Vite dev server**, not the built image | [infrastructure](./infrastructure.md#prd-vite) |
| 12 | **P2** | Backend | Incomplete merge: 8 services under `com.hirepath` + groupId mismatch | [backend](./backend.md#hirepath) |
| 13 | **P2** | Backend | Security stack copy-pasted into ~14 services; 3 internal-auth schemes | [backend](./backend.md#security-dup) |
| 14 | **P2** | Frontend | God-components (task-management `page.tsx` ~4,128 lines) | [frontend](./frontend.md#god-components) |
| 15 | **P2** | Frontend | VMS is a foreign body (own auth/HTTP/UI, space in folder name, excluded from tsc) | [frontend](./frontend.md#vms) |
| 16 | **P2** | Frontend | Competing API clients (axios vs fetch); inline query keys; no default `staleTime` | [frontend](./frontend.md#data) |
| 17 | **P2** | Infra | No resource limits; shared Postgres superuser; MinIO root keys as app creds | [infrastructure](./infrastructure.md) |
| 18 | **P3** | Repo | Dead code + committed clutter (`backend/src`, dead pages, plan `.md`, debug png, dup ESLint config) | [cleanup](./cleanup-checklist.md) |
| 19 | **P3** | Infra | No observability (metrics/tracing/log aggregation); floating image tags | [infrastructure](./infrastructure.md#observability) |
| 20 | **P3** | Frontend | ~87 `any`, 25 no-op `"use client"`, duplicated `formatDate` in 14 files | [frontend](./frontend.md) |

---

## Suggested remediation order

1. **Contain the security exposure** (items 1–4): rotate keys, purge from history, remove
   default credentials, delete the ngrok/demo code. Fast, high-impact.
2. **Add CI gates** (item 7) in warn-only mode, then enforce — so nothing regresses while you
   fix the rest.
3. **Backend correctness** (items 8–10): add the missing exception handlers, fix the hardcoded
   inventory URL, decide hrms-service's fate.
4. **Harden infra** (items 5, 11, 17): non-root containers, prod frontend image, resource
   limits, per-service credentials.
5. **Start testing** (item 6): begin with the highest-risk service logic and the god-components.
6. **Finish the merge & de-duplicate** (items 12–13): namespace migration, shared security lib,
   one internal-auth scheme.
7. **Refactor & clean up** (items 14–20): split god-components, unify API clients, delete dead
   code and clutter.

Detailed findings:
[security](./security.md) · [frontend](./frontend.md) · [backend](./backend.md) ·
[infrastructure](./infrastructure.md) · [cleanup checklist](./cleanup-checklist.md)

---

## Granular, owner-attributed deep-dive

For the file-level review — every hotspot, verified bugs, copy-paste clusters, and **who owns each
area** (with authorship caveats) — see [`granular/`](./granular/README.md):

| Doc | What's in it |
|---|---|
| [granular/README.md](./granular/README.md) | Method, headline numbers, ownership table + attribution caveat. |
| [granular/risk-and-ownership.md](./granular/risk-and-ownership.md) | Ranked hotspots, duplication stats, issue-density, per-author detail. |
| [granular/real-bugs.md](./granular/real-bugs.md) | 13 **verified** correctness bugs, owner-tagged. |
| [granular/redundancy.md](./granular/redundancy.md) | The 12%-duplication report + the shared modules that remove it. |
| [granular/findings-frontend.md](./granular/findings-frontend.md) · [findings-backend.md](./granular/findings-backend.md) | Structural/perf findings with fixes. |
| [granular/fixing-properly.md](./granular/fixing-properly.md) | Anti-pattern → correct pattern, with code (teaching doc). |

Headline: **143.6k LOC**, **~12% duplicated**, **0 tests**. Ownership (with caveats): Chaitanya2872
88%-authored core; Ravi-Shankar-ACS mostly the HirePath migration (73% copied); Vaishnavi Nerella
authored P2P PO + Meetings (38% copied VMS).
