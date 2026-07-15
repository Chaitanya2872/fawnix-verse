#!/usr/bin/env python3
"""Parse the 32 per-flow markdown audit reports into structured JSON for the site.
Resilient to header-level variance; validates finding counts against known totals."""
import os, re, json, html as _html
import markdown

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUD = os.path.join(ROOT, "docs/audit")

# name -> (kind, score, [p0,p1,p2,p3], expectedFindings)
META = {
 "identity-service":("backend",9,[2,7,7,6],22),"crm-service":("backend",9,[3,6,6,9],24),
 "inventory-service":("backend",8,[3,4,5,5],17),"hrms-service":("backend",7,[2,3,3,2],10),
 "sales-service":("backend",8,[2,5,6,4],17),"org-service":("backend",8,[2,6,8,7],23),
 "forms-service":("backend",9,[3,8,8,6],25),"approval-service":("backend",8,[1,4,8,9],22),
 "recruitment-service":("backend",8,[2,6,9,6],23),"integration-service":("backend",8,[4,6,7,7],24),
 "analytics-service":("backend",9,[2,4,4,3],13),"notifications-service":("backend",8,[3,7,7,8],25),
 "procurement-service":("backend",8,[3,4,8,6],21),"task-service":("backend",8,[4,5,7,9],25),
 "project-service":("backend",8,[0,3,6,7],16),"api-gateway":("platform",8,[2,3,4,4],13),
 "eureka-server":("platform",8,[0,2,1,3],6),
 "crm":("frontend",9,[2,5,7,7],21),"sales":("frontend",8,[2,6,11,6],25),
 "purchases":("frontend",8,[2,6,7,8],23),"inventory":("frontend",8,[0,4,6,8],18),
 "recruitment":("frontend",8,[2,8,8,8],26),"project-management":("frontend",9,[2,6,7,4],19),
 "task-management":("frontend",9,[2,6,10,5],23),"org":("frontend",8,[3,5,8,7],23),
 "forms":("frontend",8,[2,5,7,6],20),"approvals":("frontend",8,[1,3,5,6],18),
 "integrations":("frontend",8,[0,3,6,7],16),"reports":("frontend",8,[0,3,4,5],12),
 "users":("frontend",8,[0,5,5,7],17),"auth":("frontend",8,[1,4,6,4],15),
 "visitor-management":("frontend",8,[4,6,12,5],27),
}

md = markdown.Markdown(extensions=["tables","fenced_code","sane_lists"])
def render(t):
    md.reset(); return md.convert(t.strip())

SEV_RE = re.compile(r'Severity[^\n]*?\b(P[0-3])\b', re.I)
CONF_RE = re.compile(r'Confidence[^\n]*?\b(High|Medium|Med|Low)\b', re.I)
OWN_RE = re.compile(r'Owner[^\n]*?[:*]\s*([^\n|]+)', re.I)
LOC_RE = re.compile(r'(?:File[^\n]*?[:*]\s*|^)\s*`?([A-Za-z0-9_./ -]+\.[A-Za-z]{1,5}:[0-9]+(?:[-–][0-9]+)?)', re.M)
ID_RE = re.compile(r'\b([A-Z][A-Z0-9]{1,6}-\d{1,3})\b')
PGROUP_RE = re.compile(r'^#{2,6}\s*P[0-3]\b', re.I)
HEAD_RE = re.compile(r'^(#{2,6})\s+(.*)$')

CATS = [
 ("Security", r'secret|jwt|\bauth|cors|credential|token|password|inject|xss|hardcoded url|ngrok|\bkey\b'),
 ("Transaction / Data integrity", r'transaction|@transactional|rollback|\bcommit|race|atomic|split-brain|idempoten'),
 ("Performance / N+1", r'n\+1|findall|\boom\b|missing index|pagination|memory|full table|eager|lazy load'),
 ("Redundancy / Duplication", r'duplicat|copy-paste|copied|boilerplate|mappedsuperclass|shared (module|lib)|repeated'),
 ("Structure / God-class", r'god|>?\s*400 line|package-by|namespace|hirepath|decompos|too (large|long)|single responsib'),
 ("Types / any", r'\bany\b|ts-ignore|as any|untyped|missing (response )?type'),
 ("Error handling", r'catch|exception handler|swallow|globalexception|error (body|response)'),
 ("Config / Secrets", r'application\.yml|env var|default (secret|cred)|profile|\.env|config'),
 ("Testing", r'\btest'),
 ("Standards / Style", r'use client|eslint|convention|naming|prettier|dead code|console\.'),
]
def categorize(text):
    t = text.lower()
    for name, pat in CATS:
        if re.search(pat, t): return name
    return "Other / Correctness"

def clean(s):
    s = re.sub(r'\*\*|`|\[|\]', '', s).strip()
    return s

AUTHORS = ["Chaitanya2872","Ravi-Shankar-ACS","Vaishnavi Nerella","Praveen","Sampada"]
def canon_owner(o):
    o = re.sub(r'\bmigrated\b','',o, flags=re.I).strip(" -–—")
    for a in AUTHORS:
        if a.lower() in o.lower(): return a
    if (not o) or o in {"*","—","-"} or len(o) < 3 or o.lower() in {"java","none","n/a","various","mixed","unknown","see below"}:
        return "Unknown / mixed"
    return o

def split_findings(findings_md, flow, expected):
    lines = findings_md.split('\n')
    # Strategy A: header-based
    blocks=[]; cur=None
    for ln in lines:
        h = HEAD_RE.match(ln)
        if h and not PGROUP_RE.match(ln):
            title = h.group(2).strip()
            # a finding header usually has an ID or a substantial title
            if cur is not None: blocks.append(cur)
            cur = [ln]
        elif h and PGROUP_RE.match(ln):
            if cur is not None: blocks.append(cur); cur=None
        else:
            if cur is not None: cur.append(ln)
    if cur is not None: blocks.append(cur)
    a = ['\n'.join(b) for b in blocks if '\n'.join(b).strip()]
    # Strategy B: split on ID tokens if A under-delivers
    if len(a) < max(3, int(0.6*expected)):
        idx = [m.start() for m in re.finditer(r'(?m)^\s*(?:#{2,6}\s*|[-*]\s*|\*\*)?[A-Z][A-Z0-9]{1,6}-\d{1,3}\b', findings_md)]
        if len(idx) >= len(a):
            idx.append(len(findings_md))
            a = [findings_md[idx[i]:idx[i+1]] for i in range(len(idx)-1)]
    return a

def parse_finding(block, flow, i, cur_sev):
    head = HEAD_RE.match(block.strip().split('\n')[0])
    header_txt = head.group(2).strip() if head else block.strip().split('\n')[0][:120]
    header_txt = clean(header_txt)
    idm = ID_RE.search(header_txt)
    fid = idm.group(1) if idm else f"{flow[:3].upper()}-{i+1:02d}"
    title = header_txt
    if idm: title = re.sub(r'^\W*'+re.escape(fid)+r'\W*[—–:-]?\s*', '', header_txt).strip() or header_txt
    sev = (SEV_RE.search(block) or [None, cur_sev])[1] if SEV_RE.search(block) else cur_sev
    sev = SEV_RE.search(block).group(1).upper() if SEV_RE.search(block) else (cur_sev or "P3")
    conf = CONF_RE.search(block); conf = conf.group(1).title().replace("Med","Medium") if conf else ""
    own = OWN_RE.search(block); owner = clean(own.group(1)) if own else ""
    migrated = "[migrated]" in block.lower() or "migrated" in owner.lower()
    owner = canon_owner(owner.replace("[migrated]","").replace("[Migrated]","").strip())
    loc = LOC_RE.search(block); location = loc.group(1).strip() if loc else ""
    cat = categorize(block)
    # body: drop the header line + strip standalone metadata label lines
    body_lines=[]
    for ln in block.split('\n')[1:]:
        s=ln.strip()
        if re.match(r'^[-*]?\s*\**(Severity|Confidence|Owner|File:?lines?|File)\b', s, re.I) and len(s)<160:
            continue
        body_lines.append(ln)
    bodyHtml = render('\n'.join(body_lines))
    return {"id":fid,"title":title,"severity":sev,"confidence":conf,"owner":owner or "—",
            "migrated":migrated,"location":location,"category":cat,"bodyHtml":bodyHtml}

def parse_file(path, name):
    kind, score, sev, expected = META[name]
    txt = open(path, encoding="utf-8").read()
    # split into H2 sections
    parts = re.split(r'(?m)^##\s+', txt)
    title_block = parts[0]
    title = (re.search(r'^#\s+(.*)', title_block, re.M) or [None,name])[1] if re.search(r'^#\s+(.*)', title_block, re.M) else name
    sections={}
    order=[]
    for p in parts[1:]:
        htitle = p.split('\n',1)[0].strip()
        body = p[len(p.split('\n',1)[0]):].strip()
        key = htitle.lower()
        sections[key]=(htitle, body); order.append(key)
    summaryHtml = render(sections.get("summary",("",""))[1]) if "summary" in sections else ""
    # findings section (key contains 'finding')
    fkey = next((k for k in sections if 'finding' in k), None)
    findings=[]
    if fkey:
        fmd = sections[fkey][1]
        # track current P-group severity while splitting
        blocks = split_findings(fmd, name, expected)
        # determine cur_sev per block by scanning preceding P-group in raw
        for i,b in enumerate(blocks):
            m = PGROUP_RE.search(b) or re.search(r'\bP[0-3]\b', b[:80])
            cur = None
            findings.append(parse_finding(b, name, i, cur))
    # generic extra sections (surface, redundancy, tests, coverage, everything except summary/findings)
    extra=[]
    for k in order:
        if k=="summary" or k==fkey: continue
        htitle, body = sections[k]
        extra.append({"title":htitle, "html":render(body)})
    # recount severity from parsed findings
    pc={"P0":0,"P1":0,"P2":0,"P3":0}
    for f in findings: pc[f["severity"]]=pc.get(f["severity"],0)+1
    return {"name":name,"kind":kind,"score":score,"title":clean(title),
            "sevDeclared":{"p0":sev[0],"p1":sev[1],"p2":sev[2],"p3":sev[3]},
            "sev":{"p0":pc["P0"],"p1":pc["P1"],"p2":pc["P2"],"p3":pc["P3"]},
            "expected":expected,"summaryHtml":summaryHtml,"sections":extra,"findings":findings}

flows=[]
for sub in ("services","modules"):
    for fn in sorted(os.listdir(os.path.join(AUD,sub))):
        if not fn.endswith(".md") or fn=="README.md": continue
        name=fn[:-3]
        if name not in META: continue
        flows.append(parse_file(os.path.join(AUD,sub,fn), name))

# validation
print(f"{'flow':<24}{'parsed':>7}{'expect':>7}  status")
bad=[]
for f in flows:
    n=len(f["findings"]); e=f["expected"]
    ok = n >= max(3, int(0.8*e))
    if not ok: bad.append(f["name"])
    print(f"{f['name']:<24}{n:>7}{e:>7}  {'ok' if ok else 'LOW <<<'}")
print(f"\nTotal parsed findings: {sum(len(f['findings']) for f in flows)} (expected ~629)")
if bad: print("UNDER-PARSED:", bad)

# insights
byOwner={}; byCat={}; bySev={"P0":0,"P1":0,"P2":0,"P3":0}
for f in flows:
    for x in f["findings"]:
        o=(x["owner"] or "—").split("(")[0].strip()
        byOwner[o]=byOwner.get(o,0)+1
        byCat[x["category"]]=byCat.get(x["category"],0)+1
        bySev[x["severity"]]=bySev.get(x["severity"],0)+1
worst=sorted(flows,key=lambda f:(-(f["sev"]["p0"]*3+f["sev"]["p1"])))[:12]
data={
 "generated":"2026-07-15",
 "flows":flows,
 "totals":{"flows":len(flows),"findings":sum(len(f["findings"]) for f in flows),**bySev},
 "insights":{
   "byOwner":byOwner,"byCategory":byCat,"bySeverity":bySev,
   "worst":[{"name":f["name"],"kind":f["kind"],"p0":f["sev"]["p0"],"p1":f["sev"]["p1"],"total":len(f["findings"])} for f in worst],
 },
}
os.makedirs(os.path.join(AUD,"site"),exist_ok=True)
json.dump(data, open(os.path.join(AUD,"site/data.json"),"w"))
print("wrote docs/audit/site/data.json")
