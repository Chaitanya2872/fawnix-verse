# CRM Expansion Plan

## Goal
Implement missing CRM modules and analytics to match the requested feature set (Leads + Contacts/Accounts + Deals/Pipeline + Activities/Tasks + Reports/Analytics + Automation/Notifications), while preserving existing patterns in this codebase.

## Current State (Quick Audit)
- **Leads**: CRUD + pipeline status + assignment + notes + remarks + activity history + follow-ups/schedules + Meta/WhatsApp integration + SSE notifications.
- **Sales**: Quotes module (sales-service) with list/detail/status updates.
- **Reports**: Overview + Pre-sales endpoints only; UI has a basic reports dashboard.
- **RBAC**: Roles/permissions exist in identity-service and frontend; sidebar already includes Opportunities route (missing implementation).

**Missing vs request:** Contacts & Accounts module, Deals/Opportunities pipeline, Tasks/Activities module, lead scoring, attachments, communication timeline (email/WhatsApp history consolidated), workflow automation, advanced reports/forecasting, exports, audit logs.

---

## Phase 1: Data Model & Migrations (backend/crm-service)
Add normalized tables and relations (Flyway migrations):
1. **Accounts (Companies)**
   - `accounts` (id, name, industry, website, address, owner_user_id, created_at, updated_at)
2. **Contacts**
   - `contacts` (id, account_id, name, email, phone, title, source, tags, created_at, updated_at)
   - `contact_activities` link/notes optional
3. **Deals/Opportunities**
   - `deals` (id, name, account_id, contact_id, lead_id, stage, value, probability, expected_close, owner_user_id, created_at, updated_at)
   - `deal_stage_history`
4. **Tasks/Activities**
   - `crm_tasks` (id, type, subject, due_at, status, assigned_to_user_id, related_type, related_id, notes, created_at, updated_at)
5. **Attachments**
   - `crm_attachments` (id, related_type, related_id, filename, content_type, size, storage_key, created_at)
6. **Lead Scoring**
   - `lead_score` column in `leads` + optional `lead_score_rules` table
7. **Audit Log** (optional but recommended)
   - `audit_logs` (entity_type, entity_id, action, by_user_id, payload, created_at)

Files likely touched:
- `backend/services/crm-service/src/main/resources/db/migration/V14__*.sql` onward
- `backend/services/crm-service/src/main/java/com/fawnix/crm/**/entity/*.java`

---

## Phase 2: Backend APIs & Services
Create REST endpoints mirroring existing Lead patterns:
1. **Contacts**
   - Controller, Service, Repository, Mapper, DTOs
   - Search/filter/pagination; link to Accounts & Leads
2. **Accounts**
   - CRUD + list + optional “account timeline” aggregation
3. **Deals/Opportunities**
   - CRUD + stage update + Kanban list + pipeline summary
   - Stage history updates + forecasting data
4. **Tasks/Activities**
   - CRUD + status updates + due reminders scheduler
   - Link to lead/contact/deal; log to activity timeline
5. **Attachments**
   - Upload + list + delete
   - Use existing ObjectStorageService for file storage
6. **Lead Scoring**
   - Score calculation endpoint + rules config
7. **Reporting APIs**
   - Lead analytics (source, status, conversion trends)
   - Pipeline analytics (deals per stage, cycle time)
   - Performance metrics (user revenue/activity)
   - Forecasting (probability-weighted)

Files likely touched:
- `backend/services/crm-service/src/main/java/com/fawnix/crm/**/*Controller.java`
- `backend/services/crm-service/src/main/java/com/fawnix/crm/**/*Service.java`
- `backend/services/crm-service/src/main/java/com/fawnix/crm/**/*Repository.java`
- `backend/services/crm-service/src/main/java/com/fawnix/crm/reports/**`

---

## Phase 3: Frontend Modules & UX
Add new CRM sections using existing patterns (list + preview + detail page):
1. **Contacts UI**
   - `src/modules/crm/contacts/*` (list, detail, preview panel)
   - Link to accounts + interaction timeline
2. **Accounts UI**
   - `src/modules/crm/accounts/*` (list, detail)
3. **Deals UI**
   - `src/modules/crm/deals/*` with **Kanban + Table view** toggle
   - Drag-and-drop pipeline (use dnd-kit or react-beautiful-dnd)
4. **Activities UI**
   - `src/modules/crm/activities/*` (task list, calendar view)
5. **Shared Components**
   - Timeline, status chips, preview cards, filters
6. **Reports & Analytics UI**
   - Charts for lead source, conversion trend, pipeline analytics, performance

Routing & navigation updates:
- `src/app/router.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/modules/auth/permissions.ts`

---

## Phase 4: Automation & Notifications
1. Auto-assignment rules for leads
2. Trigger tasks/notifications on stage changes
3. Extend SSE notifications (tasks due, deal changes)
4. Alerts in Topbar notification dropdown

---

## Phase 5: Optional Enhancements
- AI-based lead scoring (rule-based first, ML later)
- Meta Ads auto-lead capture (already partly there)
- Export reports (CSV now, PDF later)
- Audit log viewer for admins

---

## Testing / Verification
- Backend: add unit/integration tests for new controllers/services (if test infra exists)
- Frontend: smoke test flows
  1. Create Account ? Contact ? Deal
  2. Move deal across stages
  3. Create task ? due reminder notification
  4. Lead scoring updates
  5. Reports charts render with real data
- Manual validation in browser for responsive layout and preview panel

---

## Decisions (Confirmed)
1. **Priority order**: Start with **Contacts + Deals** using the existing pipeline/stage model already in the CRM.
2. **Deal stages**: Align with the **current lead pipeline** to stay consistent across modules.

Open items (can be decided later without blocking Phase 1):
1. **Lead scoring**: Rule-based first, AI later.
2. **Attachments**: Storage target selection (local/minio/S3).
