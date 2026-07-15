# Granular Code Audit

A file-level, evidence-backed review of the whole codebase, with **code ownership** attributed
for follow-up. Produced 2026-07-14 (commit `5939027`).

This is the deep-dive companion to the [top-level audit](../README.md). Where that audit gives
the architectural picture, this one names specific files, lines, owners, and the correct fix.

---

## ⚠ Read this first: how to read the attribution

The team is small and the history has two big distortions, so **"owner" must be read carefully.**

- **"Owner" = primary line-author** (who added the most lines to a file, via `git log --numstat`).
  It is **not** proof of who wrote the logic or made the design decision. Reformats, renames, and
  bulk migrations all reassign lines. `git blame` has the same limitation (it shows the last
  toucher).
- **98% of commits are from 2 people** (Chaitanya2872, Vaishnavi Nerella). This is effectively a
  two-author codebase. The goal of attribution here is **to route each fix to the person who owns
  that area** — not to assign blame.
- **Bulk-migration distortion.** A large share of attributed lines is **copied code, not authored
  code**:
  - Ravi-Shankar-ACS's footprint is **73% bulk-migrated HirePath code** — one commit alone was
    *394 files / 31,916 insertions / 13 deletions* ("integrate HRMS modules"). The recruitment /
    org / forms / approvals modules (front and back) were **copied in** from the HirePath product.
    Defects in that migrated code **may pre-date this repo** — the owner is accountable for what
    ships, but did not necessarily write it from scratch.
  - Vaishnavi Nerella's footprint is **38% the copied "visitor management" module.**
  - Chaitanya2872 is **88% genuinely authored** — the core author of the Fawnix services and the
    main frontend.

Findings in migrated code are tagged **[migrated]** so you can tell "inherited debt" from
"written here."

---

## Method

No linters were installed in the environment (`node_modules`, `mvn`, `semgrep` absent), so the
objective signals were produced with **git + custom analyzers** (offline, reproducible):

1. **Per-file metrics** — size, a cyclomatic-ish decision count, and language-specific smell
   counts (`any`, `@ts-ignore`, `eslint-disable`, `console.*`, `"use client"`, non-null `!`;
   `System.out`, broad/empty catch, `printStackTrace`, TODO). → `data/metrics.csv`
2. **Churn & ownership** — one `git log --numstat` pass for commits-touching, lines added/deleted,
   and primary author per file.
3. **Duplication** — a k-line (k=6) clone detector across all TS/Java (shadcn excluded). →
   `data/duplication.csv`
4. **Risk score** — weighted blend of size, complexity, issue-density, and churn; used to rank
   hotspots.
5. **Hotspot deep-dive** — the top files by risk + duplication were read line-by-line; the
   flagship bugs were **verified in source** before publishing.

Raw data is in [`data/`](./data/) (CSV) so any number here can be re-checked.

---

## Headline numbers

| Metric | Value |
|---|---|
| Source files analyzed | 1,189 |
| Lines of code | 143,589 |
| **Genuinely authored** | 97,797 LOC (636 files) |
| Copied — HirePath backend | 34,743 LOC (440 files) |
| Copied — visitor-management | 6,388 LOC (50 files) |
| Dead — legacy monolith (`backend/src`) | 3,559 LOC (54 files) |
| Generated — shadcn/ui | 1,102 LOC (9 files) |
| **Duplicated code** (≥6-line blocks in ≥2 files) | **16,230 LOC ≈ 12%** |
| Tests | **0** |

---

## Ownership summary (with caveats)

Primary-owner by lines added, split by whether the code was authored here or copied in:

| Author | Files | LOC | Authored | Migrated/Copied | Notes |
|---|---:|---:|---:|---:|---|
| **Chaitanya2872** | 653 | 84,591 | **88%** | 6% hirepath + 4% dead | Core author: Fawnix services, main frontend, the god-components, most service-layer bugs, and the entity/exception/security duplication. |
| **Ravi-Shankar-ACS** | 450 | 40,108 | 27% | **73% HirePath** | Mostly the HirePath bulk migration (1 giant commit). Authored slice = recruitment frontend + cross-service client DTOs + setup/org APIs — **highest defect density** in the repo. Many findings tagged **[migrated]**. |
| **Vaishnavi Nerella** | 78 | 16,705 | 61% | 38% VMS | Authored: P2P PO page (tax bug), Meetings, Users. Also committed the copied visitor-management module. |
| **Praveen** | 8 | 2,185 | 100% | — | project-management page. |
| Sampada, root | — | — | — | — | 3 + 1 commits; negligible / automation. |

Per-file numbers: [`risk-and-ownership.md`](./risk-and-ownership.md).

---

## The report

| Doc | What's in it |
|---|---|
| [risk-and-ownership.md](./risk-and-ownership.md) | Ranked hotspot table, duplication stats, issue-density leaders, per-author detail. |
| [real-bugs.md](./real-bugs.md) | **Verified correctness bugs** — the fix-now list. Owner-tagged. |
| [redundancy.md](./redundancy.md) | The copy-paste report (the "redundant code" ask) + the shared abstractions that remove it. |
| [findings-frontend.md](./findings-frontend.md) | Frontend structural/standards findings, owner-tagged, with proper fixes. |
| [findings-backend.md](./findings-backend.md) | Backend performance/structure findings, owner-tagged, with proper fixes. |
| [fixing-properly.md](./fixing-properly.md) | **Teaching doc**: each recurring junior anti-pattern → the correct pattern, with code. |

Severity: **P0** critical · **P1** high · **P2** medium · **P3** low.
