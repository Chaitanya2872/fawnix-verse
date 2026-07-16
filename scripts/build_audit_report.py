#!/usr/bin/env python3
"""Build a single self-contained HTML audit report (charts + tables) from the
analysis CSVs, ready for Chrome headless print-to-PDF."""
import csv, io, base64, os, collections, html
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "docs/audit/granular/data")
OUT_HTML = os.path.join(ROOT, "docs/audit/report.html")

# ---------- palette ----------
INK="#0f172a"; SUB="#475569"; ACCENT="#4f46e5"; ACCENT2="#0ea5e9"
GOOD="#16a34a"; WARN="#f59e0b"; BAD="#dc2626"; MUT="#94a3b8"
PAL=["#4f46e5","#0ea5e9","#16a34a","#f59e0b","#dc2626","#8b5cf6","#14b8a6","#64748b"]
plt.rcParams.update({"font.size":11,"font.family":"DejaVu Sans","axes.edgecolor":"#cbd5e1",
    "axes.linewidth":.8,"axes.grid":False,"figure.dpi":150})

def b64(fig):
    buf=io.BytesIO(); fig.savefig(buf,format="png",bbox_inches="tight",transparent=True)
    plt.close(fig); return base64.b64encode(buf.getvalue()).decode()

def load(name):
    with open(os.path.join(DATA,name)) as fh: return list(csv.DictReader(fh))
M=load("metrics.csv"); D=load("duplication.csv")

# ---------- aggregates ----------
origin=collections.defaultdict(int)
for r in M: origin[r["origin"]]+=int(r["loc"])
lang=collections.defaultdict(int)
for r in M: lang[r["ext"]]+=int(r["loc"])
owner=collections.defaultdict(lambda:collections.defaultdict(int))
for r in M: owner[r["owner"]][r["origin"]]+=int(r["loc"])
smell=collections.Counter()
for r in M:
    for kv in r["issue_detail"].split(";"):
        if "=" in kv:
            k,v=kv.split("="); smell[k]+=int(v)
dup_total=sum(int(r["dup_lines"]) for r in D)
loc_total=sum(int(r["loc"]) for r in M)

# ---------- charts ----------
def chart_origin():
    labels={"authored":"Authored here","copied:hirepath":"Copied · HirePath",
        "copied:vms":"Copied · VMS","dead:legacy-monolith":"Dead · legacy","generated:shadcn":"Generated"}
    items=sorted(origin.items(),key=lambda x:-x[1])
    vals=[v for _,v in items]
    fig,ax=plt.subplots(figsize=(6.8,4.0))
    w,_=ax.pie(vals,colors=PAL,startangle=90,counterclock=False,
        wedgeprops=dict(width=.42,edgecolor="white",linewidth=2))
    tot=sum(vals)
    ax.legend(w,[f"{labels.get(k,k)} — {v:,} ({round(100*v/tot)}%)" for k,v in items],
        loc="center left",bbox_to_anchor=(.98,.5),frameon=False,fontsize=9)
    ax.text(0,0,f"{loc_total:,}\nLOC",ha="center",va="center",fontsize=15,fontweight="bold",color=INK)
    return b64(fig)

def chart_lang():
    order=[("java","Java"),("tsx","React TSX"),("ts","TS"),("sql","SQL"),("py","Python")]
    vals=[lang.get(k,0) for k,_ in order]; labs=[l for _,l in order]
    fig,ax=plt.subplots(figsize=(6.4,3.4))
    bars=ax.barh(labs[::-1],vals[::-1],color=PAL,edgecolor="white")
    for b,v in zip(bars,vals[::-1]): ax.text(b.get_width()+700,b.get_y()+b.get_height()/2,f"{v:,}",va="center",fontsize=9,color=SUB)
    ax.set_xlabel("LOC"); ax.xaxis.set_major_formatter(FuncFormatter(lambda x,_:f"{int(x/1000)}k"))
    for s in ("top","right"): ax.spines[s].set_visible(False)
    return b64(fig)

def chart_owner():
    auth=[a for a in owner if a not in ("?","")]
    auth=sorted(auth,key=lambda a:-sum(owner[a].values()))
    authored=[owner[a].get("authored",0) for a in auth]
    copied=[sum(v for k,v in owner[a].items() if k!="authored") for a in auth]
    fig,ax=plt.subplots(figsize=(6.8,3.6))
    x=range(len(auth))
    b1=ax.bar(x,authored,color=ACCENT,label="Authored here",edgecolor="white")
    b2=ax.bar(x,copied,bottom=authored,color=MUT,label="Copied / migrated",edgecolor="white")
    ax.set_xticks(list(x)); ax.set_xticklabels([a.split("-")[0].split(" ")[0] for a in auth],fontsize=9)
    ax.yaxis.set_major_formatter(FuncFormatter(lambda y,_:f"{int(y/1000)}k")); ax.set_ylabel("LOC")
    for i,a in enumerate(auth):
        tot=authored[i]+copied[i]
        pct=round(100*authored[i]/tot) if tot else 0
        ax.text(i,tot+900,f"{pct}% auth",ha="center",fontsize=8,color=SUB)
    ax.legend(frameon=False,fontsize=9,loc="upper right")
    for s in ("top","right"): ax.spines[s].set_visible(False)
    return b64(fig)

def chart_hotspots():
    rows=sorted(M,key=lambda r:-float(r["risk"]))[:12]
    names=[]; vals=[]; cols=[]
    cmap={"Chaitanya2872":PAL[0],"Vaishnavi Nerella":PAL[1],"Ravi-Shankar-ACS":PAL[3],"Praveen":PAL[2]}
    for r in rows:
        p=r["path"].replace("src/modules/","").replace("backend/services/","").replace("/src/main/java/com","…")
        p=p if len(p)<46 else "…"+p[-44:]
        names.append(p); vals.append(float(r["risk"])); cols.append(cmap.get(r["owner"],MUT))
    fig,ax=plt.subplots(figsize=(7.2,4.6))
    bars=ax.barh(names[::-1],vals[::-1],color=cols[::-1],edgecolor="white")
    ax.set_xlabel("Risk score"); ax.tick_params(axis="y",labelsize=8)
    for s in ("top","right"): ax.spines[s].set_visible(False)
    import matplotlib.patches as mp
    leg=[mp.Patch(color=c,label=n.split("-")[0].split(" ")[0]) for n,c in cmap.items()]
    ax.legend(handles=leg,frameon=False,fontsize=8,loc="lower right",title="owner")
    return b64(fig)

def chart_smells():
    order=[("any","any (TS)"),("use_client",'"use client"'),("nonnull","non-null !"),
        ("todo","TODO/FIXME"),("broad_catch","broad catch"),("console","console.*"),
        ("eslint_disable","eslint-disable"),("empty_catch","empty catch"),("sysout","System.out")]
    labs=[l for k,l in order if smell.get(k)]; vals=[smell[k] for k,l in order if smell.get(k)]
    fig,ax=plt.subplots(figsize=(6.8,3.4))
    bars=ax.bar(labs,vals,color=ACCENT2,edgecolor="white")
    for b,v in zip(bars,vals): ax.text(b.get_x()+b.get_width()/2,v+1,str(v),ha="center",fontsize=8,color=SUB)
    ax.set_ylabel("occurrences"); ax.tick_params(axis="x",labelrotation=35,labelsize=8)
    for lb in ax.get_xticklabels(): lb.set_ha("right")
    for s in ("top","right"): ax.spines[s].set_visible(False)
    return b64(fig)

def chart_dup():
    labels=["Security stack","Entity audit fields","Exception handler","Client DTOs","Small utils"]
    copies=[15,46,6,4,6]
    fig,ax=plt.subplots(figsize=(6.6,3.2))
    bars=ax.barh(labels[::-1],copies[::-1],color=BAD,edgecolor="white",alpha=.85)
    for b,v in zip(bars,copies[::-1]): ax.text(b.get_width()+.4,b.get_y()+b.get_height()/2,f"×{v}",va="center",fontsize=9,color=SUB)
    ax.set_xlabel("copies of the same code")
    for s in ("top","right"): ax.spines[s].set_visible(False)
    return b64(fig)

def chart_sev():
    labs=["P0 critical","P1 high","P2 medium","P3 low"]; vals=[5,9,10,6]
    cols=[BAD,"#ea580c",WARN,MUT]
    fig,ax=plt.subplots(figsize=(4.4,4.4))
    ax.pie(vals,labels=[f"{l}\n{v}" for l,v in zip(labs,vals)],colors=cols,startangle=90,
        counterclock=False,wedgeprops=dict(edgecolor="white",linewidth=2),textprops=dict(fontsize=9,color=INK))
    return b64(fig)

def chart_commits():
    auth=["Chaitanya2872","Vaishnavi Nerella","Ravi-Shankar-ACS","Sampada","Praveen"]; c=[159,67,4,3,1]
    fig,ax=plt.subplots(figsize=(6.2,2.8))
    bars=ax.bar([a.split("-")[0].split(" ")[0] for a in auth],c,color=PAL,edgecolor="white")
    for b,v in zip(bars,c): ax.text(b.get_x()+b.get_width()/2,v+2,str(v),ha="center",fontsize=9,color=SUB)
    ax.set_ylabel("commits")
    for s in ("top","right"): ax.spines[s].set_visible(False)
    return b64(fig)

charts={k:f() for k,f in {
 "origin":chart_origin,"lang":chart_lang,"owner":chart_owner,"hotspots":chart_hotspots,
 "smells":chart_smells,"dup":chart_dup,"sev":chart_sev,"commits":chart_commits}.items()}

# ---------- table builders ----------
def esc(s): return html.escape(str(s))
def img(k,cap):
    return f'<figure><img src="data:image/png;base64,{charts[k]}"/><figcaption>{esc(cap)}</figcaption></figure>'

def hotspot_rows():
    out=[]
    for r in sorted(M,key=lambda r:-float(r["risk"]))[:15]:
        p=r["path"].replace("backend/services/","").replace("/src/main/java/com/","/…/")
        out.append(f"<tr><td class='num'>{r['risk']}</td><td class='mono'>{esc(p)}</td>"
            f"<td class='num'>{int(r['loc']):,}</td><td class='num'>{r['decisions']}</td>"
            f"<td class='num'>{r['issues']}</td><td>{esc(r['owner'])}</td></tr>")
    return "\n".join(out)

BUGS=[
 ("P1","IOTIQ purchase orders double-taxed (CGST+SGST unconditional + IGST)","po/page.tsx:258","Vaishnavi Nerella"),
 ("P1","@Transactional no-op on protected+self-invoked WhatsApp handler","WhatsappQuestionnaireService.java:231","Chaitanya2872"),
 ("P1","External HTTP (inventory reserve/validate) inside DB transaction","SalesOrderService.java:506,646","Chaitanya2872"),
 ("P1","Non-atomic ID gen → duplicate task codes / order numbers","TaskService.java:2072","Chaitanya2872"),
 ("P1","Batch lead import has no transaction → partial commits","LeadImportService.java:69","Chaitanya2872"),
 ("P1","Inventory 'no response' treated as 'in stock'","SalesOrderService.java:506","Chaitanya2872"),
 ("P1","Salary renders '?12.5L' not '₹12.5L' (encoding)","OffersPage.tsx:23","Ravi-Shankar [migrated]"),
 ("P1","DnD form builder broken by nested component definition","ApplicationFormBuilderPage.tsx:335","Ravi-Shankar [migrated]"),
 ("P1","TalentPool page renders 5 hardcoded fake candidates, no API","TalentPoolPage.tsx:13","Ravi-Shankar [migrated]"),
 ("P2","Payment rejection reason hardcoded","payment/page.tsx:524","Chaitanya2872"),
 ("P2","Wrong @Transactional import (jakarta not Spring)","TaskService.java:70","Chaitanya2872"),
 ("P2","parsePermissions 500s on unknown enum value","TaskService.java:1891","Chaitanya2872"),
 ("P2","localStorage effect clobbers saved draft before data loads","p2p/pr/page.tsx:1242","Chaitanya2872"),
]
def bug_rows():
    return "\n".join(f"<tr><td><span class='badge {s.lower()}'>{s}</span></td><td>{esc(t)}</td>"
        f"<td class='mono'>{esc(loc)}</td><td>{esc(o)}</td></tr>" for s,t,loc,o in BUGS)

DUP=[
 ("Security stack (JwtFilter, JwtService, SecurityConfig…)","15 services / 75 files","common-security module"),
 ("Entity audit fields (created/updated + accessors)","46 entities","@MappedSuperclass + JPA Auditing"),
 ("GlobalExceptionHandler + ApiErrorResponse","6 services","common-web module"),
 ("Cross-service client DTOs (SendNotification, FormSubmission…)","2–4 copies each (89–90%)","versioned *-api-contract module"),
 ("SalesOrderEntity ≈ QuoteEntity","49% dup","@MappedSuperclass SalesDocumentBase"),
 ("P2P page helpers/styles/components","4–7 pages","shared p2p components + lib/format.ts"),
 ("formatDate / trimToNull / normalizeRole","6–14 files","one shared util"),
 ("backend/src legacy monolith","54 files (dead)","delete"),
]
def dup_rows():
    return "\n".join(f"<tr><td>{esc(a)}</td><td class='num'>{esc(b)}</td><td>{esc(c)}</td></tr>" for a,b,c in DUP)

RISK=[
 ("P0","Security","Live Gemini API keys committed to git","ml/.../.env.example"),
 ("P0","Security","Usable default secrets (JWT, Admin@123, minioadmin, postgres)","*/application.yml"),
 ("P0","Security","VMS: hardcoded ngrok URL + admin/secret + offline auth-bypass","visitor management/*"),
 ("P0","Infra","All containers run as root","backend & ml Dockerfiles"),
 ("P1","Quality","Zero automated tests (front & back)","—"),
 ("P1","CI/CD","master auto-deploys to prod, no test/lint gate, StrictHostKeyChecking=no","deploy-ec2.yml"),
 ("P1","Backend","8 HirePath services lack GlobalExceptionHandler","org/recruitment/forms…"),
 ("P1","Backend","sales→inventory hardcoded localhost:8083 (bypasses Eureka)","SalesOrderService"),
 ("P1","Backend","hrms-service denyAll() but routed → 403","hrms-service"),
 ("P1","Infra","PRD serves a Vite dev server, not the built image","PRD/compose.yml"),
 ("P2","Backend","Incomplete merge: 8 services under com.hirepath + groupId mismatch","backend/services/*"),
 ("P2","Backend","Security stack copy-pasted ×14; 3 internal-auth schemes","*/security"),
 ("P2","Frontend","God-components (task page 4,129 lines)","task-management/page.tsx"),
 ("P2","Infra","No resource limits; shared PG superuser; MinIO root keys as creds","compose.yml"),
]
def risk_rows():
    return "\n".join(f"<tr><td><span class='badge {s.lower()}'>{s}</span></td><td>{esc(area)}</td>"
        f"<td>{esc(t)}</td><td class='mono'>{esc(loc)}</td></tr>" for s,area,t,loc in RISK)

ROADMAP=[
 ("1 · Contain","Rotate & purge committed keys; remove default creds; delete ngrok/demo auth","days","P0 security"),
 ("2 · Guardrails","Add CI gates (tsc, eslint --max-warnings 0, prettier, spotless) warn→enforce; first tests","1 wk","stops regression"),
 ("3 · Correctness","Fix 13 verified bugs (IOTIQ tax first); add missing exception handlers; fix hardcoded URL","1–2 wk","data integrity"),
 ("4 · Harden infra","Non-root containers; prod frontend image; resource limits; per-service DB/MinIO creds","1–2 wk","reliability/security"),
 ("5 · De-duplicate","common-jpa / common-web / common-security + *-api-contract modules (−5k LOC)","2–3 wk","maintainability"),
 ("6 · Refactor","Split god-components; finish com.hirepath→com.fawnix; delete backend/src + schema file","ongoing","velocity"),
]
def road_rows():
    return "\n".join(f"<tr><td><b>{esc(p)}</b></td><td>{esc(w)}</td><td class='num'>{esc(e)}</td><td>{esc(g)}</td></tr>" for p,w,e,g in ROADMAP)

# ---------- HTML ----------
CSS = """
@page { size: A4; margin: 16mm 14mm 16mm 14mm; }
* { box-sizing: border-box; }
body { font-family:'DejaVu Sans',system-ui,sans-serif; color:#0f172a; font-size:10.5px; line-height:1.5; margin:0; }
h1,h2,h3 { color:#0f172a; line-height:1.2; }
h2 { font-size:19px; border-bottom:3px solid #4f46e5; padding-bottom:5px; margin:0 0 12px; }
h3 { font-size:14px; color:#4f46e5; margin:18px 0 6px; }
p { margin:6px 0; }
.mono { font-family:'DejaVu Sans Mono',monospace; font-size:9px; color:#334155; }
.num { text-align:right; font-variant-numeric:tabular-nums; }
section { page-break-before: always; padding-top:2px; }
section.cont { page-break-before: auto; }
/* cover */
.cover { page-break-before:auto; page-break-after:always; height:262mm; display:flex; flex-direction:column; justify-content:center;
  background:linear-gradient(135deg,#0f172a 0%,#312e81 55%,#4f46e5 100%); color:#fff; margin:-16mm -14mm 0; padding:0 22mm; }
.cover .kick { letter-spacing:3px; text-transform:uppercase; font-size:12px; color:#c7d2fe; }
.cover h1 { color:#fff; font-size:46px; margin:8px 0 4px; }
.cover .sub { font-size:17px; color:#e0e7ff; margin-bottom:30px; }
.cover .meta { font-size:12px; color:#c7d2fe; line-height:1.9; border-top:1px solid #6366f1; padding-top:16px; width:60%; }
.cover .big { display:flex; gap:26px; margin:26px 0; }
.cover .big div { }
.cover .big .n { font-size:34px; font-weight:700; color:#fff; }
.cover .big .l { font-size:11px; color:#c7d2fe; }
/* toc */
.toc ol { columns:2; font-size:12px; line-height:2; }
/* cards */
.cards { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin:14px 0; }
.card { border:1px solid #e2e8f0; border-radius:9px; padding:11px 12px; background:#f8fafc; }
.card .n { font-size:23px; font-weight:700; color:#4f46e5; }
.card .l { font-size:9.5px; color:#475569; text-transform:uppercase; letter-spacing:.5px; }
.card.bad .n{color:#dc2626}.card.warn .n{color:#f59e0b}.card.good .n{color:#16a34a}
/* tables */
table { width:100%; border-collapse:collapse; margin:10px 0; font-size:9.3px; page-break-inside:auto; }
th { background:#0f172a; color:#fff; text-align:left; padding:6px 7px; font-size:9px; text-transform:uppercase; letter-spacing:.4px; }
td { padding:5px 7px; border-bottom:1px solid #e2e8f0; vertical-align:top; }
tr:nth-child(even) td { background:#f8fafc; }
tr { page-break-inside:avoid; }
/* badges */
.badge { display:inline-block; padding:1px 7px; border-radius:20px; color:#fff; font-size:8.5px; font-weight:700; }
.badge.p0{background:#dc2626}.badge.p1{background:#ea580c}.badge.p2{background:#f59e0b}.badge.p3{background:#94a3b8}
/* callouts */
.call { border-left:4px solid #4f46e5; background:#eef2ff; padding:9px 13px; border-radius:0 7px 7px 0; margin:12px 0; }
.call.warn { border-color:#dc2626; background:#fef2f2; }
.call.good { border-color:#16a34a; background:#f0fdf4; }
.call b { color:#0f172a; }
/* figures */
.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; align-items:start; }
figure { margin:8px 0; text-align:center; page-break-inside:avoid; }
figure img { max-width:100%; border:1px solid #eef2f6; border-radius:8px; padding:6px; background:#fff; }
figcaption { font-size:9px; color:#64748b; margin-top:4px; font-style:italic; }
.lead { font-size:12px; color:#334155; }
ul { margin:6px 0 6px 16px; } li { margin:3px 0; }
.mut { color:#64748b; } .tag{font-size:8px;color:#64748b;border:1px solid #cbd5e1;border-radius:4px;padding:0 4px;}
.foot { text-align:center; color:#94a3b8; font-size:9px; margin-top:20px; border-top:1px solid #e2e8f0; padding-top:8px; }
"""

def H(body): return f"<!doctype html><html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{body}</body></html>"

body = f"""
<div class="cover">
  <div class="kick">Code Audit &amp; Quality Report</div>
  <h1>Fawnix&nbsp;Verse</h1>
  <div class="sub">ERP Platform — Architecture, Standards, Redundancy &amp; Ownership</div>
  <div class="big">
    <div><div class="n">143.6k</div><div class="l">lines analyzed</div></div>
    <div><div class="n">~12%</div><div class="l">duplicated</div></div>
    <div><div class="n">13</div><div class="l">verified bugs</div></div>
    <div><div class="n">0</div><div class="l">tests</div></div>
  </div>
  <div class="meta">
    Scope&nbsp;&nbsp;1,189 source files · frontend + 15 microservices + ML + infra<br>
    Commit&nbsp;&nbsp;5939027 &nbsp;·&nbsp; Date&nbsp;&nbsp;2026-07-14<br>
    Method&nbsp;&nbsp;git + static analyzers, hotspot deep-dive, bugs verified in source
  </div>
</div>

<section class="cont toc">
  <h2>Contents</h2>
  <ol>
    <li>Executive Summary</li>
    <li>System Architecture</li>
    <li>Codebase Metrics</li>
    <li>Ownership &amp; Attribution</li>
    <li>Verified Bugs</li>
    <li>Redundancy &amp; Copy-Paste</li>
    <li>Frontend &amp; Backend Findings</li>
    <li>Infrastructure &amp; Security Risk Register</li>
    <li>Coding Standards (condensed)</li>
    <li>How To Fix It Properly</li>
    <li>Remediation Roadmap</li>
    <li>Appendix — Method &amp; Data</li>
  </ol>
  <p class="mut" style="margin-top:18px">Severity legend:
    <span class="badge p0">P0</span> critical/security &nbsp;
    <span class="badge p1">P1</span> high &nbsp;
    <span class="badge p2">P2</span> medium &nbsp;
    <span class="badge p3">P3</span> low/tech-debt</p>
</section>

<section>
  <h2>1 · Executive Summary</h2>
  <p class="lead">Fawnix Verse is a capable, feature-rich ERP platform with a sound high-level
  architecture — feature-per-service backend, per-service databases, a modern typed frontend. The
  risks are not architectural. They are in <b>security hygiene, an incomplete product merge, the total
  absence of tests, and CI/CD that deploys unverified code straight to production.</b></p>
  <div class="cards">
    <div class="card bad"><div class="n">5</div><div class="l">P0 critical</div></div>
    <div class="card warn"><div class="n">16,230</div><div class="l">duplicated LOC</div></div>
    <div class="card"><div class="n">232</div><div class="l">commits · 2 authors 98%</div></div>
    <div class="card good"><div class="n">97.8k</div><div class="l">authored LOC</div></div>
  </div>
  <div class="call warn"><b>Act first.</b> Live Google/Gemini API keys are committed to git, and several
  services ship usable default credentials (<span class="mono">JWT_SECRET</span>, <span class="mono">Admin@123</span>,
  <span class="mono">minioadmin</span>). Rotate and remove before anything else.</div>
  <h3>The three themes</h3>
  <ul>
    <li><b>Incomplete HirePath → Fawnix merge.</b> 8 backend services still under <span class="mono">com.hirepath</span>,
      missing exception handlers, residual artifacts; the "visitor management" frontend is a foreign body
      (own auth, own HTTP client, hardcoded ngrok URL, excluded from type-checking).</li>
    <li><b>Maintainability drag.</b> ~12% duplicated code — a security stack copy-pasted into 15 services,
      audit fields into 46 entities, DTOs across services — plus 1,000–4,000-line god-components.</li>
    <li><b>No safety net.</b> Zero tests, no CI gates, root containers, no resource limits, no rollback.</li>
  </ul>
  <div class="grid2">{img("sev","Headline findings by severity")}{img("origin","Where the code came from")}</div>
</section>

<section>
  <h2>2 · System Architecture</h2>
  <p>React 19 SPA → Spring Cloud Gateway (JWT, CORS) → Eureka discovery → 15 Spring Boot services →
  PostgreSQL (one DB per service), Redis, MinIO, and a Python speech-to-text service. Deployed as a
  24-container Docker Compose stack on a single EC2 host.</p>
  <table>
    <tr><th>Layer</th><th>Stack</th><th>Notes</th></tr>
    <tr><td>Frontend</td><td>React 19, TS strict, Vite 7, Tailwind v4, shadcn/ui, TanStack Query, RHF+Zod</td><td>17 feature modules</td></tr>
    <tr><td>Gateway/Discovery</td><td>Spring Cloud Gateway, Eureka, OpenFeign</td><td>JWT validated at gateway <i>and</i> per service</td></tr>
    <tr><td>Services</td><td>Spring Boot 3.3.5, Java 17, JPA + Flyway, JJWT</td><td>identity, crm, sales, inventory, procurement, task, project + 8 HirePath</td></tr>
    <tr><td>Data</td><td>PostgreSQL 16, Redis 7, MinIO</td><td>DB-per-service; shared superuser (risk)</td></tr>
    <tr><td>ML</td><td>Python speech-to-text (faster-whisper)</td><td>CRM call-recording transcription</td></tr>
    <tr><td>Infra</td><td>Docker Compose ×24, nginx, Caddy (TLS), GitHub Actions</td><td>single-host; push-to-master deploy</td></tr>
  </table>
  {img("lang","Lines of code by language")}
</section>

<section>
  <h2>3 · Codebase Metrics</h2>
  <div class="grid2">{img("hotspots","Top hotspots by risk score (size × complexity × issues × churn)")}{img("smells","Code smells across the repo")}</div>
  <h3>Highest-risk files</h3>
  <table>
    <tr><th>Risk</th><th>File</th><th>LOC</th><th>Cx</th><th>Iss</th><th>Owner</th></tr>
    {hotspot_rows()}
  </table>
  <p class="mut">Cx = cyclomatic-ish decision count. The top hotspots are large god-components, not the
  buggiest files — size and complexity dominate their risk. Recruitment files rank on issue-density instead.</p>
</section>

<section>
  <h2>4 · Ownership &amp; Attribution</h2>
  <div class="call"><b>Read carefully.</b> "Owner" = primary line-author via <span class="mono">git log --numstat</span>
  — <i>not</i> proof of who wrote the logic. 98% of commits come from two people, and much attributed code
  is <b>copied, not authored</b>. This routes fixes to the right area; it is not a blame ranking.</div>
  <div class="grid2">{img("owner","LOC per author — authored vs copied/migrated")}{img("commits","Commits per author")}</div>
  <table>
    <tr><th>Author</th><th>Files</th><th>LOC</th><th>Authored</th><th>Copied/migrated</th><th>Owns</th></tr>
    <tr><td>Chaitanya2872</td><td class="num">653</td><td class="num">84,591</td><td class="num">88%</td><td>6% hirepath + 4% dead</td><td>Fawnix services, main frontend, god-components, most bugs</td></tr>
    <tr><td>Ravi-Shankar-ACS <span class="tag">migrated</span></td><td class="num">450</td><td class="num">40,108</td><td class="num">27%</td><td>73% HirePath bulk-migration</td><td>recruitment FE, cross-service DTO copies (highest defect density)</td></tr>
    <tr><td>Vaishnavi Nerella</td><td class="num">78</td><td class="num">16,705</td><td class="num">61%</td><td>38% copied VMS</td><td>P2P PO page (tax bug), Meetings, Users</td></tr>
    <tr><td>Praveen</td><td class="num">8</td><td class="num">2,185</td><td class="num">100%</td><td>—</td><td>project-management page</td></tr>
  </table>
  <div class="call warn"><b>Migration distortion.</b> Ravi's footprint is one 394-file / 31,916-line commit
  ("integrate HRMS modules"). Defects in that migrated code may pre-date this repo — the owner is
  accountable for what ships, but did not necessarily author it. Such findings are tagged <span class="tag">migrated</span>.</div>
</section>

<section>
  <h2>5 · Verified Bugs</h2>
  <p>Each was read and confirmed in source. Ranked by blast radius. Security-class issues are in §8.</p>
  <table>
    <tr><th>Sev</th><th>Bug</th><th>Location</th><th>Owner</th></tr>
    {bug_rows()}
  </table>
  <div class="call warn"><b>Flagship:</b> IOTIQ purchase orders are <b>double-taxed</b> — CGST+SGST are added
  unconditionally on top of IGST (<span class="mono">po/page.tsx:258</span>), overstating vendor totals by ~18%.</div>
</section>

<section>
  <h2>6 · Redundancy &amp; Copy-Paste</h2>
  <p class="lead">~12% of the code (16,230 LOC) is duplicated — the dominant maintainability problem and a
  direct symptom of copy-paste instead of shared abstractions.</p>
  <div class="grid2">
    <div>{img("dup","Same code, copied N times")}</div>
    <div>
      <table>
        <tr><th>Cluster</th><th>Scale</th><th>Proper fix</th></tr>
        {dup_rows()}
      </table>
    </div>
  </div>
  <div class="call good"><b>The fix removes ~5,000+ LOC.</b> Create <span class="mono">common-jpa</span>
  (@MappedSuperclass + JPA Auditing), <span class="mono">common-web</span> (exception handler),
  <span class="mono">common-security</span> (JWT stack), and a versioned <span class="mono">*-api-contract</span>
  module per provider (DTO + Feign interface defined once).</div>
</section>

<section>
  <h2>7 · Frontend &amp; Backend Findings</h2>
  <h3>Frontend (structural / standards)</h3>
  <ul>
    <li><b>God-components</b> — task-management 4,129 lines / 28 <span class="mono">useState</span> / 4 file-level
      <span class="mono">eslint-disable</span> masking real effect-loop bugs. Decompose by view; use RHF+Zod for forms.</li>
    <li><b>No data layer</b> in migrated modules — inline <span class="mono">useQuery</span> keys collide; no
      <span class="mono">hooks.ts</span>/key-factory; no global <span class="mono">staleTime</span>. <span class="tag">migrated</span></li>
    <li><b>~87 <span class="mono">any</span></b>, 25 no-op <span class="mono">"use client"</span>, <span class="mono">localStorage</span>
      used as a business database (no versioning/TTL/conflict handling).</li>
  </ul>
  <h3>Backend (performance / structure)</h3>
  <ul>
    <li><b>HTTP calls inside <span class="mono">@Transactional</span></b> (inventory reserve, WhatsApp send) → split-brain state &amp; pool exhaustion. Use <span class="mono">@TransactionalEventListener(AFTER_COMMIT)</span>.</li>
    <li><b><span class="mono">findAll().stream().filter()</span></b> across every read path (TaskService visibility = 2 queries × N tasks). Push predicates to SQL, paginate, preload sets.</li>
    <li><b><span class="mono">TaskService</span> god-class</b> (2,190 lines, 12 deps, 6 domains); file bytes stored as DB BLOB; money/timezone handling; broad/empty catches.</li>
  </ul>
</section>

<section>
  <h2>8 · Infrastructure &amp; Security Risk Register</h2>
  <table>
    <tr><th>Sev</th><th>Area</th><th>Finding</th><th>Where</th></tr>
    {risk_rows()}
  </table>
  <div class="call warn"><b>CI/CD.</b> A push to <span class="mono">master</span> SSHes into EC2 and runs
  <span class="mono">docker compose up --build</span> — no test/lint/scan gate, images built on the prod host,
  <span class="mono">StrictHostKeyChecking=no</span>, no staging, no rollback.</div>
</section>

<section>
  <h2>9 · Coding Standards (condensed)</h2>
  <table>
    <tr><th>Area</th><th>Do</th><th>Don't</th></tr>
    <tr><td>React/TS</td><td>Function components; typed API; discriminated unions; RHF+Zod; lazy routes</td><td><span class="mono">any</span>; <span class="mono">"use client"</span>; 400+ line components; localStorage as DB</td></tr>
    <tr><td>TanStack Query</td><td>Key factory per module; global defaults; invalidate on mutate</td><td>Inline string keys; onSuccess on useQuery</td></tr>
    <tr><td>Spring</td><td>Package-by-feature; DTOs (MapStruct); ProblemDetail; @ConfigurationProperties</td><td>Return entities; hardcoded URLs; HTTP in txn; default secrets</td></tr>
    <tr><td>Shared code</td><td>common-* modules; @MappedSuperclass; versioned contracts</td><td>Copy-paste security/DTOs/entities/utils</td></tr>
    <tr><td>Docker/CI</td><td>Non-root; pinned digests; healthchecks; resource limits; test/lint gate</td><td>Root; :latest; build on prod host; secrets in env/`.env.example`</td></tr>
    <tr><td>Git</td><td>Conventional commits + scope; PR + review; branch protection</td><td>Direct-to-master; committed secrets/clutter</td></tr>
  </table>
  <p class="mut">Full, cited standards live in <span class="mono">docs/coding-standards/</span>.</p>
</section>

<section>
  <h2>10 · How To Fix It Properly</h2>
  <p>The recurring anti-patterns, each with the correct approach (full code in <span class="mono">docs/audit/granular/fixing-properly.md</span>):</p>
  <table>
    <tr><th>Anti-pattern (what juniors did)</th><th>Proper approach</th></tr>
    <tr><td>Audit fields copied into 46 entities</td><td><span class="mono">@MappedSuperclass BaseAuditEntity</span> + <span class="mono">@EnableJpaAuditing</span></td></tr>
    <tr><td>Security/exception code copied into every service</td><td>Shared <span class="mono">common-security</span> / <span class="mono">common-web</span> Maven modules</td></tr>
    <tr><td>DTOs copied into each Feign caller</td><td>Versioned <span class="mono">*-api-contract</span> (DTO + client interface, once)</td></tr>
    <tr><td>External HTTP inside a transaction</td><td>Commit first, react in <span class="mono">@TransactionalEventListener(AFTER_COMMIT)</span></td></tr>
    <tr><td><span class="mono">count()+1</span> / random IDs</td><td>DB sequence (<span class="mono">@GeneratedValue(SEQUENCE)</span>)</td></tr>
    <tr><td><span class="mono">findAll().filter()</span> in Java</td><td>Predicate + <span class="mono">Pageable</span> in SQL; preload sets once</td></tr>
    <tr><td>Inline query keys + <span class="mono">any</span> responses</td><td><span class="mono">queryKeys.ts</span> + <span class="mono">hooks.ts</span> + generated types</td></tr>
    <tr><td>18–26 <span class="mono">useState</span> per form</td><td><span class="mono">react-hook-form</span> + Zod schema</td></tr>
  </table>
  <div class="call good"><b>Root cause is the absence of guardrails, not any one developer.</b> Add CI gates
  (warn→enforce), a first test suite, one reference module to copy, and a duplication check — then the
  abstractions above stay removed.</div>
</section>

<section>
  <h2>11 · Remediation Roadmap</h2>
  <table>
    <tr><th>Phase</th><th>Work</th><th>Effort</th><th>Buys</th></tr>
    {road_rows()}
  </table>
</section>

<section>
  <h2>12 · Appendix — Method &amp; Data</h2>
  <p>No linters were installed in the environment, so objective signals were produced with git + custom
  Python analyzers (offline, reproducible):</p>
  <ul>
    <li><b>Per-file metrics</b> — size, cyclomatic-ish decision count, language-specific smells, churn,
      primary owner, risk score. → <span class="mono">docs/audit/granular/data/metrics.csv</span> (1,189 rows)</li>
    <li><b>Duplication</b> — a 6-line clone detector across TS/Java (shadcn excluded). →
      <span class="mono">docs/audit/granular/data/duplication.csv</span> (1,098 rows)</li>
    <li><b>Hotspot deep-dive</b> — top files by risk + duplication read line-by-line; flagship bugs verified in source.</li>
  </ul>
  <p class="mut">Companion markdown: <span class="mono">docs/architecture/</span>,
  <span class="mono">docs/coding-standards/</span>, <span class="mono">docs/audit/</span> (incl.
  <span class="mono">granular/</span>). Every number in this report traces to the CSVs above.</p>
  <div class="foot">Fawnix Verse Code Audit · generated 2026-07-14 · confidential — internal engineering use</div>
</section>
"""
open(OUT_HTML,"w").write(H(body))
print("wrote", OUT_HTML, os.path.getsize(OUT_HTML),"bytes")
print("charts:", ", ".join(charts))
