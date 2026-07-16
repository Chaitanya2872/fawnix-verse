#!/usr/bin/env python3
"""Generate index pages + consolidated roll-up from the per-flow audit census."""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# name, kind, score, [p0,p1,p2,p3], findings, revised
DATA = [
 ("identity-service","backend",9,[2,7,7,6],22,False),
 ("crm-service","backend",9,[3,6,6,9],24,False),
 ("inventory-service","backend",8,[3,4,5,5],17,False),
 ("hrms-service","backend",7,[2,3,3,2],10,True),
 ("sales-service","backend",8,[2,5,6,4],17,False),
 ("org-service","backend",8,[2,6,8,7],23,False),
 ("forms-service","backend",9,[3,8,8,6],25,False),
 ("approval-service","backend",8,[1,4,8,9],22,False),
 ("recruitment-service","backend",8,[2,6,9,6],23,False),
 ("integration-service","backend",8,[4,6,7,7],24,False),
 ("analytics-service","backend",9,[2,4,4,3],13,False),
 ("notifications-service","backend",8,[3,7,7,8],25,False),
 ("procurement-service","backend",8,[3,4,8,6],21,False),
 ("task-service","backend",8,[4,5,7,9],25,False),
 ("project-service","backend",8,[0,3,6,7],16,False),
 ("api-gateway","platform",8,[2,3,4,4],13,False),
 ("eureka-server","platform",8,[0,2,1,3],6,False),
 ("crm","frontend",9,[2,5,7,7],21,False),
 ("sales","frontend",8,[2,6,11,6],25,False),
 ("purchases","frontend",8,[2,6,7,8],23,False),
 ("inventory","frontend",8,[0,4,6,8],18,False),
 ("recruitment","frontend",8,[2,8,8,8],26,False),
 ("project-management","frontend",9,[2,6,7,4],19,False),
 ("task-management","frontend",9,[2,6,10,5],23,False),
 ("org","frontend",8,[3,5,8,7],23,False),
 ("forms","frontend",8,[2,5,7,6],20,False),
 ("approvals","frontend",8,[1,3,5,6],18,False),
 ("integrations","frontend",8,[0,3,6,7],16,False),
 ("reports","frontend",8,[0,3,4,5],12,False),
 ("users","frontend",8,[0,5,5,7],17,False),
 ("auth","frontend",8,[1,4,6,4],15,False),
 ("visitor-management","frontend",8,[4,6,12,5],27,False),
]

def link(name, kind):
    d = "services" if kind in ("backend","platform") else "modules"
    return f"{d}/{name}.md"

def totals(rows):
    t=[0,0,0,0]; f=0
    for _,_,_,s,fn,_ in rows:
        for i in range(4): t[i]+=s[i]
        f+=fn
    return t,f

ALL=DATA
T,F = totals(ALL)
be=[r for r in ALL if r[1] in ("backend","platform")]
fe=[r for r in ALL if r[1]=="frontend"]

def sev_badges(s):
    return f"{s[0]} / {s[1]} / {s[2]} / {s[3]}"

def table(rows, base):
    out=["| Flow | P0 | P1 | P2 | P3 | Total | Score | Report |","|---|--:|--:|--:|--:|--:|:--:|---|"]
    for name,kind,score,s,fn,rev in sorted(rows,key=lambda r:(-r[3][0],-r[3][1],-r[4])):
        d = "services" if kind in ("backend","platform") else "modules"
        rel = f"./{name}.md" if base==d else f"./{d}/{name}.md"
        flag=" 🔁" if rev else ""
        out.append(f"| **{name}**{flag} | {s[0]} | {s[1]} | {s[2]} | {s[3]} | {fn} | {score}/10 | [report]({rel}) |")
    return "\n".join(out)

# ---- services/README.md ----
tb_be,fb_be = totals(be)
svc = f"""# Backend Service Audits

Per-service granular reports from the {len(ALL)}-flow census (2026-07-14). Each report lists every
endpoint/entity/migration + every finding with `file:line`, severity, **confidence**, owner, quoted
code, and the proper fix. 🔁 = report was revised after review.

**Backend + platform totals — {fb_be} findings:** P0 {tb_be[0]} · P1 {tb_be[1]} · P2 {tb_be[2]} · P3 {tb_be[3]}

{table(be,"services")}

Frontend module reports: [../modules/](../modules/README.md) · Roll-up: [../granular/census-rollup.md](../granular/census-rollup.md)
"""
open(os.path.join(ROOT,"docs/audit/services/README.md"),"w").write(svc)

# ---- modules/README.md ----
tb_fe,fb_fe = totals(fe)
mod = f"""# Frontend Module Audits

Per-module granular reports from the {len(ALL)}-flow census (2026-07-14). Each lists pages/hooks/components
+ every finding with `file:line`, severity, **confidence**, owner, quoted code, and the proper fix.

**Frontend totals — {fb_fe} findings:** P0 {tb_fe[0]} · P1 {tb_fe[1]} · P2 {tb_fe[2]} · P3 {tb_fe[3]}

> Not separately audited: `access` and `public` (1 file each — trivial). Covered indirectly via `auth`.

{table(fe,"modules")}

Backend reports: [../services/](../services/README.md) · Roll-up: [../granular/census-rollup.md](../granular/census-rollup.md)
"""
open(os.path.join(ROOT,"docs/audit/modules/README.md"),"w").write(mod)

# ---- granular/census-rollup.md ----
top = sorted(ALL,key=lambda r:(-(r[3][0]*3+r[3][1]),-r[3][0]))[:10]
rup = f"""# Per-Flow Audit — Consolidated Roll-up

The full granular census: **{len(ALL)} flows** (15 services + api-gateway + eureka + {len(fe)} frontend modules),
each deep-audited by a dedicated sub-agent, then **reviewed by a second agent** for accuracy and insight
(spot-checking claims against source); reports scoring < 8/10 were revised. Produced 2026-07-14.

## Totals

| | Findings | P0 | P1 | P2 | P3 |
|---|--:|--:|--:|--:|--:|
| Backend + platform ({len(be)}) | {fb_be} | {tb_be[0]} | {tb_be[1]} | {tb_be[2]} | {tb_be[3]} |
| Frontend ({len(fe)}) | {fb_fe} | {tb_fe[0]} | {tb_fe[1]} | {tb_fe[2]} | {tb_fe[3]} |
| **All ({len(ALL)})** | **{F}** | **{T[0]}** | **{T[1]}** | **{T[2]}** | **{T[3]}** |

> This supersedes the earlier 13-bug figure — that was a ~2.5% hotspot sample. This is the census:
> **{F} findings, {T[0]} P0, {T[1]} P1** across every flow, all confidence-tagged.

## Worst flows (by weighted P0×3 + P1)

| Flow | Kind | P0 | P1 | Total | Report |
|---|---|--:|--:|--:|---|
""" + "\n".join(
    f"| **{n}** | {k} | {s[0]} | {s[1]} | {fn} | [{link(n,k)}]({os.path.relpath(os.path.join(ROOT,'docs/audit',link(n,k)), os.path.join(ROOT,'docs/audit/granular'))}) |"
    for n,k,sc,s,fn,rev in top) + f"""

## Backend + platform

{table(be,"granular")}

## Frontend

{table(fe,"granular")}

## Systemic patterns (recur across many flows)

These appeared in report after report — fix them once, centrally (see
[redundancy.md](./redundancy.md) and [fixing-properly.md](./fixing-properly.md)):

- **No tests anywhere.** Zero `src/test` in any of the 15 services; no frontend test runner. Monorepo-wide.
- **Security stack copy-pasted into 15 services** (JWT filter/service/config) → `common-security`.
- **`SecurityConfig` in the root package in 5 services** (inventory, project, task, procurement, sales) — not under `security/config/`.
- **Missing `GlobalExceptionHandler`** in the 8 `com.hirepath` services → default error bodies break the frontend contract.
- **Entity audit fields copied into 46 entities** → `@MappedSuperclass` + JPA Auditing.
- **External HTTP calls inside `@Transactional`** (crm, sales, and others) → connection-pool exhaustion + split-brain state.
- **`findAll()`-then-filter-in-Java** on list endpoints → OOM at real data volume.
- **Committed default secrets** (`JWT_SECRET`, `Admin@123`, `minioadmin`) and **live Gemini keys** in git.
- **`com.hirepath` namespace + groupId** still in 8 migrated services.
- **`hrms-service` uses `spring-boot-starter-jdbc`, not JPA** (review-surfaced) — the first JPA entity added will fail at startup.

## Coverage & confidence

- **{len(ALL)}/{len(ALL)+2} targets audited.** `access` + `public` frontend modules (1 file each) were not
  given separate reports — trivial, and their concern (route guard) is covered in `auth`.
- Every report was independently reviewed; scores ranged 7–9/10. Only **hrms-service** needed revision
  (7→revised: added the JDBC-not-JPA gap, corrected the root-`SecurityConfig` scope to 5 services, and
  reframed the missing-tests point as monorepo-wide).
- Findings are confidence-tagged **High/Med/Low** inside each report — Low items are suspicions to confirm,
  not established facts.

## Reports
- Backend index: [../services/README.md](../services/README.md)
- Frontend index: [../modules/README.md](../modules/README.md)
"""
open(os.path.join(ROOT,"docs/audit/granular/census-rollup.md"),"w").write(rup)

print("Totals: findings=%d  P0=%d P1=%d P2=%d P3=%d" % (F,T[0],T[1],T[2],T[3]))
print("Backend: findings=%d P0=%d P1=%d | Frontend: findings=%d P0=%d P1=%d" % (fb_be,tb_be[0],tb_be[1],fb_fe,tb_fe[0],tb_fe[1]))
print("wrote services/README.md, modules/README.md, granular/census-rollup.md")
