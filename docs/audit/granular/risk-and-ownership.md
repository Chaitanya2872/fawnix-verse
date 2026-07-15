# Risk & Ownership — Quantitative Layer

The objective signals behind the findings. Raw data: [`data/metrics.csv`](./data/), [`data/duplication.csv`](./data/).
Read the [attribution caveat](./README.md#-read-this-first-how-to-read-the-attribution) before using the owner column.

---

## 1. Top hotspots by risk score

Risk = weighted blend of size, complexity (decision count), issue-density, and churn.
`dec` = cyclomatic-ish decision count. `iss` = smell count. `own%` = owner's share of lines.

| Risk | LOC | Cmts | Churn | dec | iss | Owner | own% | File |
|---:|---:|---:|---:|---:|---:|---|---:|---|
| 78.8 | 4129 | 25 | 11906 | 339 | 6 | Chaitanya2872 | 98 | `src/modules/task-management/page.tsx` |
| 53.8 | 2973 | 6 | 6099 | 266 | 2 | Chaitanya2872 | 100 | `src/modules/purchases/p2p/pr/page.tsx` |
| 44.3 | 2240 | 7 | 5373 | 218 | 4 | Chaitanya2872 | 100 | `src/modules/purchases/p2p/vendors/page.tsx` |
| 37.3 | 2262 | 25 | 6683 | 132 | 0 | Vaishnavi Nerella | 65 | `src/modules/purchases/p2p/po/page.tsx` |
| 34.3 | 1489 | 20 | 10032 | 114 | 1 | Chaitanya2872 | 100 | `src/modules/crm/leads/page.tsx` |
| 34.1 | 1497 | 2 | 1496 | 265 | 0 | Chaitanya2872 | 100 | `backend/postgresql-all-services-schema.sql` |
| 27.7 | 1878 | 6 | 3807 | 95 | 0 | Vaishnavi Nerella | 96 | `src/modules/project-management/pages/MeetingsPage.tsx` |
| 25.9 | 1845 | 11 | 2420 | 72 | 3 | Chaitanya2872 | 100 | `src/modules/sales/page.tsx` |
| 21.9 | 1181 | 9 | 4536 | 84 | 0 | Chaitanya2872 | 50 | `src/modules/project-management/components/ProjectForm.tsx` |
| 21.5 | 1737 | 10 | 1862 | 52 | 1 | Chaitanya2872 | 99 | `src/modules/sales/orders/components.tsx` |
| 21.2 | 824 | 5 | 871 | 135 | 5 | Chaitanya2872 | 100 | `crm-service/.../integrations/whatsapp/WhatsappQuestionnaireService.java` |
| 20.7 | 831 | 15 | 6283 | 44 | 4 | Chaitanya2872 | 98 | `src/modules/sales/orders/page.tsx` |
| 19.7 | 1238 | 15 | 4358 | 50 | 0 | Vaishnavi Nerella | 60 | `src/modules/users/page.tsx` |
| 19.3 | 1213 | 13 | 4416 | 39 | 1 | Chaitanya2872 | 84 | `src/modules/inventory/page.tsx` |
| 17.7 | 767 | 2 | 768 | 79 | 7 | Ravi-Shankar **[migrated]** | 100 | `src/modules/recruitment/ApplicationFormBuilderPage.tsx` |
| 16.8 | 941 | 2 | 992 | 103 | 0 | Chaitanya2872 | 100 | `sales-service/.../orders/service/SalesOrderService.java` |
| 16.7 | 880 | 12 | 981 | 109 | 0 | Chaitanya2872 | 100 | `crm-service/.../leads/service/LeadService.java` |
| 16.4 | 509 | 2 | 528 | 70 | 10 | Ravi-Shankar **[migrated]** | 100 | `src/modules/recruitment/CandidateProfilePage.tsx` |
| 14.9 | 902 | 9 | 1565 | 72 | 0 | Chaitanya2872 | 100 | `src/modules/crm/leads/components/LeadDetailPanel.tsx` |
| 14.9 | 702 | 6 | 3689 | 58 | 0 | Praveen | 59 | `src/modules/project-management/page.tsx` |

Observations:
- The **top 14 hotspots are all Chaitanya/Vaishnavi-authored** god-components — size and complexity,
  not defect count, dominate their risk.
- **Recruitment (Ravi, [migrated])** files rank on **issue-density**, not size — they are smaller but
  `any`-saturated and carry real bugs.
- `backend/postgresql-all-services-schema.sql` (1497 lines, 265 "decisions") is a **monolithic
  all-services schema file** that duplicates the per-service Flyway migrations — a redundancy smell
  (it should not exist; each service owns its schema via Flyway).

---

## 2. Duplication

**16,230 LOC (≈12% of scanned code) sits in copy-paste blocks** (≥6 identical lines appearing in
≥2 files). Biggest clusters:

| Cluster | Copies | Evidence |
|---|---:|---|
| `JwtAuthenticationFilter` (+ full security stack) | **15 services** | identical modulo package |
| Entity audit fields (`createdAt`/`updatedAt` + accessors) | **46 entities** | `data/duplication.csv` |
| `GlobalExceptionHandler` + `ApiErrorResponse` | 6 services | ~45–57 shared lines/pair |
| Cross-service client DTOs (`SendNotificationRequest`, `InternalFormSubmissionRequest`, …) | 2–4 each | 89–90% identical |
| `SalesOrderEntity` ≈ `QuoteEntity` | 2 | ~49% dup |
| P2P page helpers (`formatCurrency`, `toneForStatus`, stat cards, button styles) | 4–7 pages | verbatim |
| `formatDate`/`fmtDate` | ~14 files | vs canonical `lib/utils.ts` |
| `trimToNull` | 6 services | identical private method |
| `backend/src` legacy monolith | — | duplicates live crm-service (dead) |

Full treatment + the shared modules that remove it: [redundancy.md](./redundancy.md).

Most-duplicated single files:

| Dup LOC | LOC | % | Owner | File |
|---:|---:|---:|---|---|
| 183 | 532 | 34 | Chaitanya2872 | `crm-service/.../leads/entity/LeadEntity.java` |
| 153 | 259 | 59 | Chaitanya2872 | `backend/src/.../verse/leads/entity/LeadEntity.java` (dead) |
| 150 | 479 | 31 | Ravi-Shankar **[migrated]** | `approval-service/.../dto/ApprovalRequestResponse.java` |
| 114 | 128 | 89 | Ravi-Shankar **[migrated]** | `forms/.../InternalFormSubmissionRequest.java` |
| 114 | 128 | 89 | Ravi-Shankar **[migrated]** | `recruitment/.../client/dto/InternalFormSubmissionRequest.java` |
| 104 | 115 | 90 | Ravi-Shankar **[migrated]** | `notifications/.../SendNotificationRequest.java` (×3) |

---

## 3. Issue-density leaders (authored code, ≥120 LOC)

Highest smell-per-100-LOC. Note the concentration in Ravi's migrated recruitment/setup code
(`any`-heavy) and a couple of Chaitanya's backend files (broad/empty catch).

| /100 LOC | Issues | LOC | Owner | File | Detail |
|---:|---:|---:|---|---|---|
| 4.4 | 8 | 183 | Ravi-Shankar **[migrated]** | `src/lib/orgApi.ts` | any=8 |
| 3.5 | 8 | 227 | Ravi-Shankar **[migrated]** | `src/modules/recruitment/InterviewsPage.tsx` | any=8 |
| 3.1 | 9 | 290 | Ravi-Shankar **[migrated]** | `src/lib/formsApi.ts` | any=9 |
| 3.1 | 9 | 295 | Ravi-Shankar **[migrated]** | `src/modules/recruitment/OffersPage.tsx` | any=9 |
| 3.0 | 7 | 236 | Ravi-Shankar **[migrated]** | `src/lib/setupApi.ts` | any=7 |
| 2.9 | 4 | 139 | Chaitanya2872 | `crm-service/.../security/jwt/JwtService.java` | broad_catch=2; suppress=2 |
| 2.1 | 7 | 331 | Ravi-Shankar **[migrated]** | `src/modules/approvals/ApprovalsWorkflowsPage.tsx` | any=7 |
| 2.0 | 10 | 509 | Ravi-Shankar **[migrated]** | `src/modules/recruitment/CandidateProfilePage.tsx` | any=9; nonnull=1 |
| 1.3 | 3 | 225 | Chaitanya2872 | `crm-service/.../integrations/meta/MetaLeadClient.java` | empty_catch=3 |

---

## 4. Per-author detail

| Author | Total LOC | Authored | HirePath copy | VMS copy | Dead | shadcn |
|---|---:|---:|---:|---:|---:|---:|
| Chaitanya2872 | 84,591 | 74,629 (88%) | 5,440 | — | 3,559 | 963 |
| Ravi-Shankar-ACS | 40,108 | 10,805 (27%) | 29,303 | — | — | — |
| Vaishnavi Nerella | 16,705 | 10,178 (61%) | — | 6,388 | — | 139 |
| Praveen | 2,185 | 2,185 (100%) | — | — | — | — |

Commit counts (from `git shortlog`): Chaitanya 159, Vaishnavi 67, Ravi 4 (but very large — the
migration), Sampada 3, Praveen 1, root 1.

**Interpretation for routing fixes:**
- **Backend service logic + P2P/CRM/sales/task frontend → Chaitanya.** This is where the
  correctness bugs and the god-components live.
- **Recruitment/approvals/org/forms (front & back) → Ravi**, but treat as migrated HirePath debt:
  fixes are needed, "authorship" is shared with the upstream product.
- **P2P PO page (tax bug), Meetings, Users → Vaishnavi.**
