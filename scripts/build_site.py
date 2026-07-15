#!/usr/bin/env python3
"""Build the interactive audit website — Notion-style database (table + board views),
side peek panel, per-module metric strips. Self-contained; no innerHTML."""
import os, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "docs/audit/site")
data = json.load(open(os.path.join(SITE, "data.json")))
data_str = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")

CSS = r"""
:root{
  --bg:0 0% 100%; --fg:240 10% 3.9%; --card:0 0% 100%; --muted:240 4.8% 95.9%;
  --mfg:240 3.8% 46.1%; --border:240 5.9% 90%; --ring:240 5% 65%; --brand:243 75% 59%; --radius:10px;
  --shadow-sm:0 1px 2px 0 rgb(0 0 0/.05); --shadow:0 1px 3px 0 rgb(0 0 0/.09),0 1px 2px -1px rgb(0 0 0/.09);
  --shadow-lg:0 10px 30px -5px rgb(0 0 0/.25);
  --p0:#e11d48; --p1:#ea580c; --p2:#d97706; --p3:#64748b; --good:#16a34a;
  --sans:'Inter',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  --mono:ui-monospace,'SF Mono','DejaVu Sans Mono',Menlo,Consolas,monospace;
}
[data-theme=dark]{
  --bg:240 10% 3.9%; --fg:0 0% 98%; --card:240 10% 5.5%; --muted:240 3.7% 15.9%;
  --mfg:240 5% 64.9%; --border:240 3.7% 16.5%; --ring:240 4.9% 40%; --brand:243 80% 68%;
  --shadow-sm:0 1px 2px 0 rgb(0 0 0/.4); --shadow:0 1px 3px 0 rgb(0 0 0/.5); --shadow-lg:0 16px 40px -8px rgb(0 0 0/.7);
  --p0:#fb7185; --p1:#fb923c; --p2:#fbbf24; --p3:#94a3b8;
}
*{box-sizing:border-box}
html,body{margin:0;height:100%}
body{background:hsl(var(--bg));color:hsl(var(--fg));font:14px/1.55 var(--sans);-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
code,.mono{font-family:var(--mono)}
.app{display:grid;grid-template-columns:250px 1fr;grid-template-rows:57px 1fr;height:100vh}
.top{grid-column:1/3;display:flex;align-items:center;gap:14px;padding:0 18px;background:hsl(var(--bg)/.85);backdrop-filter:blur(8px);border-bottom:1px solid hsl(var(--border));position:sticky;top:0;z-index:20}
.brand{font-weight:700;font-size:14.5px;display:flex;align-items:center;gap:9px}
.brand .logo{width:26px;height:26px;border-radius:7px;background:linear-gradient(135deg,hsl(var(--brand)),#22d3ee);display:grid;place-items:center;color:#fff;font-weight:800;font-size:13px}
.brand small{color:hsl(var(--mfg));font-weight:500}
.top .spacer{flex:1}
.search{flex:0 1 400px;position:relative}
.search input{width:100%;background:hsl(var(--bg));border:1px solid hsl(var(--border));color:hsl(var(--fg));border-radius:8px;padding:8px 12px 8px 32px;font-size:13px;outline:none}
.search input:focus{border-color:hsl(var(--ring));box-shadow:0 0 0 3px hsl(var(--ring)/.18)}
.search .si{position:absolute;left:11px;top:8px;color:hsl(var(--mfg));font-size:13px}
.pill{font-size:12px;color:hsl(var(--mfg));background:hsl(var(--muted));border-radius:20px;padding:4px 11px}
.tbtn{background:hsl(var(--bg));border:1px solid hsl(var(--border));color:hsl(var(--mfg));border-radius:8px;padding:6px 9px;cursor:pointer;font-size:13px}
.tbtn:hover{background:hsl(var(--muted));color:hsl(var(--fg))}
.side{background:hsl(var(--bg));border-right:1px solid hsl(var(--border));overflow:auto;padding:12px 10px 40px}
.side::-webkit-scrollbar,.main::-webkit-scrollbar{width:9px}
.side::-webkit-scrollbar-thumb,.main::-webkit-scrollbar-thumb{background:hsl(var(--border));border-radius:6px}
.navg{margin:16px 8px 6px;font-size:11px;font-weight:600;color:hsl(var(--mfg))}
.nav{display:flex;align-items:center;gap:9px;padding:7px 10px;border-radius:8px;cursor:pointer;color:hsl(var(--mfg));font-size:13.5px;font-weight:500}
.nav:hover{background:hsl(var(--muted));color:hsl(var(--fg))}
.nav.active{background:hsl(var(--muted));color:hsl(var(--fg));font-weight:600}
.nav.big{color:hsl(var(--fg))}
.nav .sevdots{margin-left:auto;display:flex;gap:3px}
.sd{width:6px;height:6px;border-radius:50%}
.nav .cnt{margin-left:auto;color:hsl(var(--mfg));font-size:11px;background:hsl(var(--muted));border-radius:6px;padding:1px 7px}
.main{overflow:auto;padding:28px 40px 90px;max-width:1180px;margin:0 auto;width:100%}
.kicker{font-size:12px;color:hsl(var(--mfg));font-weight:500;margin-bottom:5px}
.h1{font-size:24px;font-weight:700;letter-spacing:-.02em;margin:0 0 4px}
.lede{color:hsl(var(--mfg));font-size:14.5px;margin:0 0 20px;max-width:80ch}
.sect{margin-top:30px}
.h2{font-size:16px;font-weight:700;margin:0 0 12px}
.grid{display:grid;gap:14px}
.cards2{grid-template-columns:1fr 1fr}.cards3{grid-template-columns:repeat(3,1fr)}
.statstrip{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.statstrip .cell{background:hsl(var(--card));border:1px solid hsl(var(--border));border-radius:12px;padding:18px 20px;box-shadow:var(--shadow-sm);position:relative;overflow:hidden}
.statstrip .cell::after{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:hsl(var(--border))}
.statstrip .cell.findings::after{background:hsl(var(--brand))}.statstrip .cell.p0::after{background:var(--p0)}.statstrip .cell.p1::after{background:var(--p1)}.statstrip .cell.good::after{background:var(--good)}
.stat .n{font-size:30px;font-weight:700;line-height:1}
.stat .l{font-size:12px;color:hsl(var(--mfg));margin-top:7px}
.stat.p0 .n{color:var(--p0)}.stat.p1 .n{color:var(--p1)}.stat.good .n{color:var(--good)}
.card{background:hsl(var(--card));border:1px solid hsl(var(--border));border-radius:12px;padding:18px;box-shadow:var(--shadow-sm)}
.ctitle{font-size:13.5px;font-weight:600;margin:0 0 3px}
.cdesc{font-size:12px;color:hsl(var(--mfg));margin:0 0 14px}
.bar-row{display:flex;align-items:center;gap:10px;margin:2px 0;cursor:pointer;padding:5px 8px;border-radius:8px}
.bar-row:hover{background:hsl(var(--muted)/.6)}.bar-row:hover .bl{color:hsl(var(--fg))}
.bl{width:150px;font-size:12.5px;color:hsl(var(--mfg));text-align:right;flex:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.btrack{flex:1;height:8px;background:hsl(var(--muted));border-radius:9999px;overflow:hidden;display:flex}
.bseg{height:100%}
.bv{width:38px;font-size:11.5px;color:hsl(var(--mfg));text-align:right;flex:none;font-variant-numeric:tabular-nums}
.legend{display:flex;gap:16px;flex-wrap:wrap;margin:0 0 10px 8px}
.legend .li{display:flex;align-items:center;gap:6px;font-size:12px;color:hsl(var(--mfg))}
.flowscroll{max-height:420px;overflow:auto;margin:0 -8px;padding:2px 8px}
.flowscroll::-webkit-scrollbar{width:8px}.flowscroll::-webkit-scrollbar-thumb{background:hsl(var(--border));border-radius:6px}
.badge{display:inline-flex;align-items:center;padding:1px 9px;border-radius:7px;font-size:11px;font-weight:600;border:1px solid transparent;white-space:nowrap}
.b-p0{background:#fee2e2;color:#b91c1c;border-color:#fecaca}.b-p1{background:#ffedd5;color:#c2410c;border-color:#fed7aa}
.b-p2{background:#fef3c7;color:#b45309;border-color:#fde68a}.b-p3{background:hsl(var(--muted));color:hsl(var(--mfg));border-color:hsl(var(--border))}
[data-theme=dark] .b-p0{background:#3b0d13;color:#fca5a5;border-color:#7f1d1d}
[data-theme=dark] .b-p1{background:#3a1a08;color:#fdba74;border-color:#7c2d12}
[data-theme=dark] .b-p2{background:#3a2c06;color:#fcd34d;border-color:#78500a}
.chip{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:7px;font-size:11px;background:hsl(var(--muted));color:hsl(var(--mfg));white-space:nowrap}
.chip.mono{font-family:var(--mono)}
.dotc{width:8px;height:8px;border-radius:50%;display:inline-block;flex:none}
.ava{width:22px;height:22px;border-radius:50%;display:inline-grid;place-items:center;color:#fff;font-size:10px;font-weight:700;flex:none}
.ava.sm{width:20px;height:20px;font-size:9px}
/* database toolbar */
.dbbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0 14px;padding:10px 0;position:sticky;top:57px;background:hsl(var(--bg));z-index:6}
.seg{display:inline-flex;border:1px solid hsl(var(--border));border-radius:8px;overflow:hidden;background:hsl(var(--card))}
.segb{border:0;background:transparent;color:hsl(var(--mfg));padding:6px 12px;font-size:12.5px;font-weight:500;cursor:pointer;font-family:var(--sans)}
.segb+.segb{border-left:1px solid hsl(var(--border))}
.segb.on{background:hsl(var(--fg));color:hsl(var(--bg))}
.fchip{padding:6px 11px;border-radius:8px;border:1px solid hsl(var(--border));background:hsl(var(--card));color:hsl(var(--mfg));cursor:pointer;font-size:12px;font-weight:500}
.fchip:hover{background:hsl(var(--muted))}
.fchip.on{background:hsl(var(--fg));color:hsl(var(--bg));border-color:hsl(var(--fg))}
.fchip.on.p0{background:var(--p0);border-color:var(--p0);color:#fff}.fchip.on.p1{background:var(--p1);border-color:var(--p1);color:#fff}
.fchip.on.p2{background:var(--p2);border-color:var(--p2);color:#fff}.fchip.on.p3{background:var(--p3);border-color:var(--p3);color:#fff}
select.fsel{background:hsl(var(--card));border:1px solid hsl(var(--border));color:hsl(var(--fg));border-radius:8px;padding:7px 10px;font-size:12px;outline:none;cursor:pointer}
/* notion table */
.tblwrap{border:1px solid hsl(var(--border));border-radius:12px;overflow:hidden;box-shadow:var(--shadow-sm)}
.ntable{width:100%;border-collapse:collapse;font-size:13px}
.ntable th{text-align:left;font-size:11px;font-weight:600;color:hsl(var(--mfg));padding:9px 12px;background:hsl(var(--muted)/.5);border-bottom:1px solid hsl(var(--border));white-space:nowrap;user-select:none}
.ntable th[data-k]:hover{color:hsl(var(--fg))}
.ntable td{padding:9px 12px;border-bottom:1px solid hsl(var(--border));vertical-align:middle}
.ntable tbody tr{cursor:pointer}
.ntable tbody tr:last-child td{border-bottom:none}
.ntable tbody tr:hover td{background:hsl(var(--muted)/.55)}
.ntable .c-sev{width:34px;padding-right:0}
.ntable .c-title{font-weight:500;min-width:280px}
.ntable .c-owner{white-space:nowrap}
.ntable .ownc{display:inline-flex;align-items:center;gap:7px}
.sevpip{width:9px;height:9px;border-radius:3px;display:inline-block}
.trow-p0 .sevpip{background:var(--p0)}.trow-p1 .sevpip{background:var(--p1)}.trow-p2 .sevpip{background:var(--p2)}.trow-p3 .sevpip{background:var(--p3)}
/* board */
.board{display:flex;gap:14px;overflow-x:auto;padding-bottom:10px}
.bcol{flex:0 0 300px;background:hsl(var(--muted)/.4);border:1px solid hsl(var(--border));border-radius:12px;padding:10px}
.bch{display:flex;align-items:center;gap:8px;padding:4px 6px 10px}
.bct{font-weight:600;font-size:13px}
.bcn{margin-left:auto;font-size:11px;color:hsl(var(--mfg));background:hsl(var(--card));border:1px solid hsl(var(--border));border-radius:6px;padding:0 7px}
.bcards{display:flex;flex-direction:column;gap:8px;max-height:70vh;overflow:auto}
.bcard{background:hsl(var(--card));border:1px solid hsl(var(--border));border-left:3px solid hsl(var(--border));border-radius:9px;padding:10px 11px;cursor:pointer;box-shadow:var(--shadow-sm)}
.bcard:hover{border-color:hsl(var(--ring))}
.bcard.p0{border-left-color:var(--p0)}.bcard.p1{border-left-color:var(--p1)}.bcard.p2{border-left-color:var(--p2)}.bcard.p3{border-left-color:var(--p3)}
.bcs{display:flex;gap:6px;align-items:center;margin-bottom:6px}
.bctitle{font-size:13px;font-weight:500;line-height:1.35;margin-bottom:9px}
.bcmeta{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
/* metric strip (per flow) */
.mstrip{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:12px;margin:16px 0 8px}
.mcard{background:hsl(var(--card));border:1px solid hsl(var(--border));border-radius:12px;padding:14px 16px;box-shadow:var(--shadow-sm)}
.mcard .mv{font-size:22px;font-weight:700;line-height:1}
.mcard .ml{font-size:11.5px;color:hsl(var(--mfg));margin-top:6px}
.mcard .mbar{height:6px;border-radius:9999px;background:hsl(var(--muted));overflow:hidden;margin-top:9px}
.mcard .mbar>span{display:block;height:100%}
.avarow{display:flex;gap:-6px}
.avarow .ava{margin-right:-6px;border:2px solid hsl(var(--card))}
/* peek drawer */
.peekov{position:fixed;inset:0;background:rgb(0 0 0/.38);display:none;z-index:40}
.peek{position:fixed;top:0;right:0;height:100vh;width:min(560px,94vw);background:hsl(var(--bg));border-left:1px solid hsl(var(--border));box-shadow:var(--shadow-lg);z-index:41;transform:translateX(100%);transition:transform .22s cubic-bezier(.4,0,.2,1);overflow:auto}
.peek.open{transform:translateX(0)}
.pkhead{padding:22px 26px 14px;border-bottom:1px solid hsl(var(--border));position:sticky;top:0;background:hsl(var(--bg))}
.pkclose{position:absolute;top:16px;right:18px;width:30px;height:30px;border-radius:8px;display:grid;place-items:center;cursor:pointer;color:hsl(var(--mfg))}
.pkclose:hover{background:hsl(var(--muted));color:hsl(var(--fg))}
.pktag{display:flex;gap:8px;align-items:center;margin-bottom:10px}
.pktitle{font-size:19px;font-weight:700;line-height:1.3;padding-right:30px}
.pkprops{padding:12px 26px;border-bottom:1px solid hsl(var(--border))}
.pkrow{display:flex;gap:14px;align-items:center;padding:6px 0;font-size:13px}
.pkk{width:110px;color:hsl(var(--mfg));flex:none;font-size:12.5px}
.pkv{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.pkbody{padding:16px 26px 60px;font-size:13.5px}
.pkbody p{line-height:1.65}
.pkbody pre{background:hsl(var(--muted));border:1px solid hsl(var(--border));border-radius:9px;padding:12px 14px;overflow:auto;font-size:12.5px;line-height:1.5}
.pkbody :not(pre)>code{background:hsl(var(--muted));padding:1px 5px;border-radius:5px;font-size:12.5px}
.pkbody h1,.pkbody h2,.pkbody h3,.pkbody h4{font-size:12px;font-weight:600;color:hsl(var(--mfg));text-transform:uppercase;letter-spacing:.04em;margin:16px 0 6px}
.pkbody table{border-collapse:collapse;width:100%;font-size:12px;margin:9px 0}
.pkbody th,.pkbody td{border:1px solid hsl(var(--border));padding:6px 9px;text-align:left}
.pkbody th{background:hsl(var(--muted))}
.acc{border:1px solid hsl(var(--border));border-radius:11px;margin:9px 0;overflow:hidden;background:hsl(var(--card));box-shadow:var(--shadow-sm)}
.acc>summary{padding:12px 15px;cursor:pointer;font-weight:600;font-size:13px;list-style:none;display:flex;align-items:center;gap:8px}
.acc>summary::-webkit-details-marker{display:none}
.acc>summary:hover{background:hsl(var(--muted))}
.acc[open]>summary{border-bottom:1px solid hsl(var(--border))}
.acc .inner{padding:8px 16px 14px}
.acc .inner table{border-collapse:collapse;width:100%;font-size:12px;margin:8px 0}
.acc .inner th,.acc .inner td{border:1px solid hsl(var(--border));padding:6px 9px;text-align:left}
.acc .inner th{background:hsl(var(--muted))}
.acc .inner pre{background:hsl(var(--muted));border:1px solid hsl(var(--border));border-radius:8px;padding:10px 12px;overflow:auto;font-size:12.5px}
.muted{color:hsl(var(--mfg))}.sub{color:hsl(var(--mfg))}
.tbl{width:100%;border-collapse:collapse;font-size:13px}
.tbl th{text-align:left;font-size:11px;font-weight:600;color:hsl(var(--mfg));padding:8px 10px;border-bottom:1px solid hsl(var(--border))}
.tbl td{padding:9px 10px;border-bottom:1px solid hsl(var(--border))}
.tbl tbody tr:hover td{background:hsl(var(--muted));cursor:pointer}
.callout{border:1px solid hsl(var(--border));background:hsl(var(--muted)/.5);border-radius:10px;padding:11px 14px;margin:12px 0;font-size:13px;color:hsl(var(--mfg))}
.callout b{color:hsl(var(--fg))}
.empty{color:hsl(var(--mfg));text-align:center;padding:44px}
@media(max-width:860px){.app{grid-template-columns:1fr}.side{display:none}.cards2,.cards3,.statstrip{grid-template-columns:1fr 1fr}.main{padding:20px}}
"""

JS = r"""
const DATA=JSON.parse(document.getElementById('AUDIT').textContent);
const SEV=['P0','P1','P2','P3'];
const SEVC={P0:'#e11d48',P1:'#ea580c',P2:'#d97706',P3:'#64748b'};
const CATC={};const CATPAL=['#6366f1','#0ea5e9','#10b981','#f59e0b','#f43f5e','#8b5cf6','#14b8a6','#06b6d4','#84cc16','#d946ef','#64748b'];
Object.keys(DATA.insights.byCategory).sort().forEach((c,i)=>CATC[c]=CATPAL[i%CATPAL.length]);
const byName={};DATA.flows.forEach(f=>byName[f.name]=f);
const ALLF=[];DATA.flows.forEach(f=>f.findings.forEach(x=>ALLF.push(Object.assign({flow:f.name,kind:f.kind},x))));
const OWNC={};const OWNPAL=['#6366f1','#0ea5e9','#e11d48','#16a34a','#d97706','#8b5cf6','#0891b2','#64748b'];
Object.keys(DATA.insights.byOwner).sort().forEach((o,i)=>OWNC[o]=OWNPAL[i%OWNPAL.length]);
const MAXRISK=Math.max.apply(null,DATA.flows.map(f=>f.sev.p0*8+f.sev.p1*4+f.sev.p2*2+f.sev.p3).concat([1]));
let Q='';
const SAN=h=>String(h).replace(/<\s*(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,'').replace(/<\s*(script|style|iframe|object|embed)\b[^>]*>/gi,'').replace(/\son\w+\s*=\s*"[^"]*"/gi,'').replace(/\son\w+\s*=\s*'[^']*'/gi,'').replace(/javascript:/gi,'');
const H=(n,h)=>{n.replaceChildren(document.createRange().createContextualFragment(SAN(h)));return n;};
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)H(e,h);return e;};
const esc=s=>(s||'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
const sevBadge=s=>`<span class="badge b-${s.toLowerCase()}">${s}</span>`;
function initials(o){if(!o||o==='—'||o.indexOf('?')===0||o.indexOf('Unknown')===0)return '?';const p=o.split(/[\s\-\/]+/).filter(Boolean);let s=(p[0]||'?')[0];if(p[1]&&/[A-Za-z]/.test(p[1][0]))s+=p[1][0];return s.toUpperCase();}
const ava=(o,sm)=>`<span class="ava${sm?' sm':''}" style="background:${OWNC[o]||'#94a3b8'}" title="${esc(o)}">${initials(o)}</span>`;

/* ---- charts ---- */
function stackedBar(rows,onClick){const max=Math.max.apply(null,rows.map(r=>r.total).concat([1]));const box=el('div');
  rows.forEach(r=>{const row=el('div','bar-row');row.appendChild(el('div','bl',esc(r.label)));const tr=el('div','btrack');
    r.seg.forEach(s=>{if(s.v>0){const g=el('div','bseg');g.style.width=(100*s.v/max)+'%';g.style.background=s.color;g.title=s.v;tr.appendChild(g);}});
    row.appendChild(tr);row.appendChild(el('div','bv',String(r.total)));if(onClick)row.onclick=()=>onClick(r.name);box.appendChild(row);});return box;}
function simpleBar(pairs,color){const max=Math.max.apply(null,pairs.map(p=>p[1]).concat([1])),box=el('div');
  pairs.forEach(p=>{const row=el('div','bar-row');row.appendChild(el('div','bl',esc(p[0])));const tr=el('div','btrack');const g=el('div','bseg');g.style.width=(100*p[1]/max)+'%';g.style.background=color||'hsl(var(--brand))';g.style.borderRadius='9999px';tr.appendChild(g);
    row.appendChild(tr);row.appendChild(el('div','bv',String(p[1])));box.appendChild(row);});return box;}
function donut(parts){const tot=parts.reduce((a,p)=>a+p.value,0)||1;let a=-90;const R=54,C=64,sw=18;let seg='';
  parts.forEach(p=>{const ang=360*p.value/tot,l=2*Math.PI*R*ang/360;seg+=`<circle r="${R}" cx="${C}" cy="${C}" fill="none" stroke="${p.color}" stroke-width="${sw}" stroke-dasharray="${l} ${2*Math.PI*R}" transform="rotate(${a} ${C} ${C})"></circle>`;a+=ang;});
  const leg=parts.map(p=>`<div style="display:flex;gap:8px;align-items:center;font-size:12.5px;margin:5px 0"><span class="dotc" style="background:${p.color}"></span><span class="sub">${p.label}</span><b style="margin-left:auto;font-variant-numeric:tabular-nums">${p.value}</b></div>`).join('');
  const w=el('div');w.style.cssText='display:flex;gap:18px;align-items:center';
  H(w,`<svg width="128" height="128" viewBox="0 0 128 128"><circle r="${R}" cx="${C}" cy="${C}" fill="none" stroke="hsl(var(--muted))" stroke-width="${sw}"></circle>${seg}<text x="64" y="61" text-anchor="middle" font-size="24" font-weight="700" fill="hsl(var(--fg))">${tot}</text><text x="64" y="79" text-anchor="middle" font-size="10" fill="hsl(var(--mfg))">findings</text></svg><div style="flex:1">${leg}</div>`);return w;}

/* ---- sidebar ---- */
function buildSide(){const s=document.getElementById('side');s.replaceChildren();
  const add=(label,route,extra,cls)=>{const n=el('div','nav'+(cls?' '+cls:''));n.dataset.route=route;H(n,`<span>${label}</span>`+(extra||''));n.onclick=()=>go(route);s.appendChild(n);return n;};
  add('Overview','overview','','big');add('Insights','insights','','big');add('All findings','findings',`<span class="cnt">${ALLF.length}</span>`,'big');
  [['Backend & platform',f=>f.kind!=='frontend'],['Frontend modules',f=>f.kind==='frontend']].forEach(g=>{
    s.appendChild(el('div','navg',g[0]));
    DATA.flows.filter(g[1]).sort((a,b)=>(b.sev.p0*3+b.sev.p1)-(a.sev.p0*3+a.sev.p1)).forEach(f=>{
      const dots=SEV.map(sv=>{const k=sv.toLowerCase();return f.sev[k]?`<span class="sd" title="${sv}:${f.sev[k]}" style="background:${SEVC[sv]}"></span>`:'';}).join('');
      add(esc(f.name),'flow/'+f.name,`<span class="sevdots">${dots}</span>`);});});}
function markActive(r){document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.route===r));}

/* ---- side peek ---- */
function openPeek(x){if(!x)return;const pk=document.getElementById('peek'),ov=document.getElementById('peekov');
  const props=[['Flow',`<a data-goflow="${esc(x.flow)}" style="color:hsl(var(--brand));cursor:pointer">${esc(x.flow)}</a> <span class="muted">${esc(x.kind||'')}</span>`],
    ['Severity',sevBadge(x.severity)],
    ['Owner',`${ava(x.owner,1)} ${esc(x.owner)}${x.migrated?' <span class="chip">migrated</span>':''}`],
    ['Category',`<span class="dotc" style="background:${CATC[x.category]||'#888'}"></span> ${esc(x.category)}`],
    ['Confidence',esc(x.confidence||'—')],
    ['Location',x.location?`<span class="mono">${esc(x.location)}</span>`:'—'],
    ['Finding ID',`<span class="mono">${esc(x.id)}</span>`]];
  H(pk,`<div class="pkhead"><div class="pkclose" id="pkx">✕</div><div class="pktag">${sevBadge(x.severity)}<span class="chip">${esc(x.category)}</span></div><div class="pktitle">${esc(x.title)}</div></div>`+
    `<div class="pkprops">${props.map(p=>`<div class="pkrow"><div class="pkk">${p[0]}</div><div class="pkv">${p[1]}</div></div>`).join('')}</div>`+
    `<div class="pkbody">${x.bodyHtml}</div>`);
  pk.querySelector('#pkx').onclick=closePeek;
  const gf=pk.querySelector('[data-goflow]');if(gf)gf.onclick=()=>{closePeek();go('flow/'+gf.dataset.goflow);};
  pk.scrollTop=0;ov.style.display='block';pk.classList.add('open');}
function closePeek(){document.getElementById('peek').classList.remove('open');document.getElementById('peekov').style.display='none';}

/* ---- database (table + board) ---- */
let DB={view:'table',group:'severity',sort:'severity',dir:1};
let FILT={sev:new Set(),cat:'',owner:'',conf:''};
const SORDER={P0:0,P1:1,P2:2,P3:3};
function filtered(items){const q=Q.toLowerCase();return items.filter(x=>{
  if(FILT.sev.size&&!FILT.sev.has(x.severity))return false;
  if(FILT.cat&&x.category!==FILT.cat)return false;
  if(FILT.owner&&x.owner!==FILT.owner)return false;
  if(FILT.conf&&(x.confidence||'').toLowerCase()!==FILT.conf.toLowerCase())return false;
  if(q&&!((x.title+' '+x.location+' '+x.bodyHtml+' '+x.id+' '+x.flow+' '+x.owner).toLowerCase().includes(q)))return false;
  return true;});}
function sortItems(items){const k=DB.sort,d=DB.dir;return items.slice().sort((a,b)=>{
  let va,vb;if(k==='severity'){va=SORDER[a.severity];vb=SORDER[b.severity];}else{va=(a[k]||'').toString().toLowerCase();vb=(b[k]||'').toString().toLowerCase();}
  return va<vb?-1*d:va>vb?1*d:0;});}
function renderDB(mount,base,scope){
  mount.replaceChildren();
  const bar=el('div','dbbar');
  const seg=el('div','seg');['table','board'].forEach(v=>{const b=el('button','segb'+(DB.view===v?' on':''),v[0].toUpperCase()+v.slice(1)+' view');b.onclick=()=>{DB.view=v;renderDB(mount,base,scope);};seg.appendChild(b);});
  bar.appendChild(seg);
  if(DB.view==='board'){const gs=el('select','fsel');const gopts=['severity','owner','category'].concat(scope?[]:['flow']);
    H(gs,gopts.map(g=>`<option value="${g}" ${DB.group===g?'selected':''}>Group by ${g}</option>`).join(''));gs.onchange=()=>{DB.group=gs.value;renderDB(mount,base,scope);};bar.appendChild(gs);}
  else{const ss=el('select','fsel');const sopts=['severity','title','owner','category','confidence','location'].concat(scope?[]:['flow']);
    H(ss,sopts.map(c=>`<option value="${c}" ${DB.sort===c?'selected':''}>Sort by ${c}</option>`).join(''));ss.onchange=()=>{DB.sort=ss.value;renderDB(mount,base,scope);};bar.appendChild(ss);
    const d=el('button','segb',DB.dir>0?'↑ Asc':'↓ Desc');d.style.border='1px solid hsl(var(--border))';d.style.borderRadius='8px';d.onclick=()=>{DB.dir*=-1;renderDB(mount,base,scope);};bar.appendChild(d);}
  SEV.forEach(s=>{const c=el('span','fchip '+s.toLowerCase()+(FILT.sev.has(s)?' on '+s.toLowerCase():''),s);c.onclick=()=>{FILT.sev.has(s)?FILT.sev.delete(s):FILT.sev.add(s);renderDB(mount,base,scope);};bar.appendChild(c);});
  const catsel=el('select','fsel');H(catsel,`<option value="">All categories</option>`+Object.keys(DATA.insights.byCategory).sort().map(c=>`<option ${FILT.cat===c?'selected':''}>${esc(c)}</option>`).join(''));catsel.onchange=()=>{FILT.cat=catsel.value;renderDB(mount,base,scope);};bar.appendChild(catsel);
  if(!scope){const os=el('select','fsel');H(os,`<option value="">All owners</option>`+Object.keys(DATA.insights.byOwner).sort().map(o=>`<option ${FILT.owner===o?'selected':''}>${esc(o)}</option>`).join(''));os.onchange=()=>{FILT.owner=os.value;renderDB(mount,base,scope);};bar.appendChild(os);}
  const items=filtered(base);
  const cnt=el('span','pill',items.length+' findings');bar.appendChild(cnt);
  mount.appendChild(bar);
  const body=el('div');mount.appendChild(body);
  if(!items.length){body.appendChild(el('div','empty','No findings match these filters.'));return;}
  if(DB.view==='board')boardView(body,items,scope);else tableView(body,items,scope);
}
function tableView(mount,items,scope){
  const cols=scope?['sev','title','owner','category','conf','loc']:['sev','title','flow','owner','category','conf','loc'];
  const lbl={sev:'',title:'Finding',flow:'Flow',owner:'Owner',category:'Category',conf:'Conf.',loc:'Location'};
  const sorted=sortItems(items);const cap=Math.min(sorted.length,500);
  const head='<thead><tr>'+cols.map(c=>`<th class="c-${c}" ${c!=='sev'?'data-k="'+(c==='conf'?'confidence':c==='loc'?'location':c)+'"':''} style="${c!=='sev'?'cursor:pointer':''}">${lbl[c]}${DB.sort===(c==='conf'?'confidence':c==='loc'?'location':c)?(DB.dir>0?' ↑':' ↓'):''}</th>`).join('')+'</tr></thead>';
  const rows=sorted.slice(0,cap).map((x,i)=>{
    const cell={sev:`<td class="c-sev"><span class="sevpip"></span></td>`,
      title:`<td class="c-title">${esc(x.title)}</td>`,
      flow:`<td><span class="chip">${esc(x.flow)}</span></td>`,
      owner:`<td class="c-owner"><span class="ownc">${ava(x.owner,1)}${esc(x.owner)}${x.migrated?' <span class="chip">mig</span>':''}</span></td>`,
      category:`<td><span class="dotc" style="background:${CATC[x.category]||'#888'}"></span> ${esc(x.category)}</td>`,
      conf:`<td>${esc(x.confidence||'—')}</td>`,
      loc:`<td class="mono" style="font-size:11px;color:hsl(var(--mfg))">${esc(x.location||'—')}</td>`};
    return `<tr class="trow-${x.severity.toLowerCase()}" data-i="${i}">`+cols.map(c=>cell[c]).join('')+'</tr>';}).join('');
  const wrap=el('div','tblwrap');H(wrap,`<table class="ntable">${head}<tbody>${rows}</tbody></table>`);
  wrap.querySelectorAll('th[data-k]').forEach(h=>h.onclick=()=>{const k=h.dataset.k;if(DB.sort===k)DB.dir*=-1;else{DB.sort=k;DB.dir=1;}renderCurrent();});
  wrap.querySelectorAll('tr[data-i]').forEach(tr=>tr.onclick=()=>openPeek(sorted[+tr.dataset.i]));
  mount.appendChild(wrap);
  if(sorted.length>cap)mount.appendChild(el('div','muted','Showing '+cap+' of '+sorted.length+' — narrow the filters to see the rest.'));
}
function groupVal(x,k){return k==='severity'?x.severity:k==='owner'?x.owner:k==='category'?x.category:x.flow;}
function boardView(mount,items,scope){
  const key=DB.group;const groups={};items.forEach(x=>{const g=groupVal(x,key)||'—';(groups[g]=groups[g]||[]).push(x);});
  let order=key==='severity'?SEV.slice():Object.keys(groups).sort((a,b)=>groups[b].length-groups[a].length);
  const board=el('div','board');
  order.forEach(g=>{if(!groups[g])return;const col=el('div','bcol');
    const hd=el('div','bch');H(hd,`<span class="bct">${key==='owner'?ava(g,1)+' ':''}${key==='category'?`<span class="dotc" style="background:${CATC[g]||'#888'}"></span> `:''}${esc(g)}</span><span class="bcn">${groups[g].length}</span>`);col.appendChild(hd);
    const list=el('div','bcards');
    groups[g].forEach(x=>{const card=el('div','bcard '+x.severity.toLowerCase());
      H(card,`<div class="bcs">${sevBadge(x.severity)}${scope?'':`<span class="chip">${esc(x.flow)}</span>`}<span class="fid mono" style="margin-left:auto;font-size:10px;color:hsl(var(--mfg))">${esc(x.id)}</span></div><div class="bctitle">${esc(x.title)}</div><div class="bcmeta">${ava(x.owner,1)}<span class="chip"><span class="dotc" style="background:${CATC[x.category]||'#888'}"></span>${esc(x.category)}</span></div>`);
      card.onclick=()=>openPeek(x);list.appendChild(card);});
    col.appendChild(list);board.appendChild(col);});
  mount.appendChild(board);
}
let CURRENT=()=>{};
function renderCurrent(){CURRENT();}

/* ---- views ---- */
function vOverview(){const m=document.getElementById('view');m.replaceChildren();const t=DATA.totals;
  m.appendChild(el('div','kicker','Codebase audit · updated '+DATA.generated));
  m.appendChild(el('div','h1','Overview'));
  m.appendChild(el('p','lede',`All 32 flows — 15 services, gateway, registry and 15 frontend modules — deep-audited and independently reviewed. <b>${t.findings} findings</b>, each with file, line, severity, confidence, owner and fix. Click any bar or row to drill in.`));
  const strip=el('div','statstrip');
  [['findings',t.findings,'Total findings'],['p0',t.P0,'Critical · P0'],['p1',t.P1,'High · P1'],['good',0,'Automated tests']].forEach(c=>{const d=el('div','cell stat '+c[0]);H(d,`<div class="n">${c[1]}</div><div class="l">${c[2]}</div>`);strip.appendChild(d);});
  m.appendChild(strip);
  const row=el('div','grid cards2 sect');
  const c1=el('div','card');c1.appendChild(el('div','ctitle','By severity'));c1.appendChild(el('div','cdesc','Distribution across all findings'));c1.appendChild(donut(SEV.map(s=>({label:s,value:t[s],color:SEVC[s]}))));
  const prop=el('div');prop.style.marginTop='20px';const pb=el('div');pb.style.cssText='display:flex;height:10px;border-radius:9999px;overflow:hidden;background:hsl(var(--muted))';
  SEV.forEach(s=>{const g=el('div');g.style.cssText=`background:${SEVC[s]};width:${100*t[s]/t.findings}%`;g.title=s+' · '+t[s];pb.appendChild(g);});prop.appendChild(pb);
  const cap=el('div','sub');cap.style.cssText='margin-top:11px;font-size:12.5px';H(cap,`Critical + High (P0 + P1) = <b style="color:hsl(var(--fg))">${t.P0+t.P1}</b> · <b style="color:hsl(var(--fg))">${Math.round(100*(t.P0+t.P1)/t.findings)}%</b> of the total`);prop.appendChild(cap);
  const worst=DATA.insights.worst.slice(0,4);const wl=el('div');wl.style.cssText='margin-top:18px;border-top:1px solid hsl(var(--border));padding-top:14px';
  H(wl,`<div class="cdesc" style="margin-bottom:10px">Most critical flows</div>`+worst.map(f=>`<div data-go="flow/${f.name}" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;cursor:pointer;font-size:13px"><span style="flex:1">${esc(f.name)} <span class="muted" style="font-size:11px">${f.kind}</span></span><span class="badge b-p0">${f.p0} P0</span><span class="muted" style="font-size:12px;width:54px;text-align:right">${f.total} total</span></div>`).join(''));
  wl.querySelectorAll('[data-go]').forEach(r=>{r.onmouseenter=()=>r.style.background='hsl(var(--muted))';r.onmouseleave=()=>r.style.background='';r.onclick=()=>go(r.dataset.go);});
  prop.appendChild(wl);c1.appendChild(prop);
  const c2=el('div','card');c2.appendChild(el('div','ctitle','By category'));c2.appendChild(el('div','cdesc','What kind of problems dominate'));c2.appendChild(simpleBar(Object.entries(DATA.insights.byCategory).sort((a,b)=>b[1]-a[1]),'hsl(var(--brand))'));
  row.append(c1,c2);m.appendChild(row);
  const c3=el('div','card sect');c3.appendChild(el('div','ctitle','By flow'));c3.appendChild(el('div','cdesc','Stacked P0·P1·P2·P3 — click a bar to open the flow'));
  const leg=el('div','legend');H(leg,SEV.map(s=>`<span class="li"><span class="dotc" style="background:${SEVC[s]}"></span>${s}</span>`).join(''));c3.appendChild(leg);
  const rows=DATA.flows.map(f=>({label:f.name,name:f.name,total:f.findings.length,seg:SEV.map(s=>({v:f.sev[s.toLowerCase()],color:SEVC[s]}))})).sort((a,b)=>b.total-a.total);
  const sc=el('div','flowscroll');sc.appendChild(stackedBar(rows,n=>go('flow/'+n)));c3.appendChild(sc);m.appendChild(c3);
  const c4=el('div','card sect');c4.appendChild(el('div','ctitle','Ownership'));c4.appendChild(el('div','cdesc','Primary line-author of the flagged code — attribution, not blame'));c4.appendChild(simpleBar(Object.entries(DATA.insights.byOwner).filter(o=>o[1]>2).sort((a,b)=>b[1]-a[1]),'hsl(var(--brand))'));
  c4.appendChild(el('div','callout','Ravi-Shankar’s share is chiefly bulk-migrated HirePath code (carried debt, not written here). Chaitanya authored the core Fawnix services and the main frontend.'));m.appendChild(c4);
  m.appendChild(systemicSection());CURRENT=vOverview;}
function systemicSection(){const wrap=el('div','sect');wrap.appendChild(el('div','h2','Systemic patterns'));
  const items=[['No automated tests','Zero <code>src/test</code> in any of 15 services; no frontend test runner.','monorepo-wide'],['Security stack copy-pasted','JWT filter/service/config duplicated into 15 services → <code>common-security</code>.','15 services'],['Entity audit fields copied','created/updated + accessors in 46 entities → <code>@MappedSuperclass</code> + JPA Auditing.','46 entities'],['Missing GlobalExceptionHandler','8 <code>com.hirepath</code> services leak default error bodies.','8 services'],['HTTP calls inside @Transactional','Inventory/WhatsApp calls hold DB connections → pool exhaustion.','crm, sales, +'],['findAll()-then-filter in Java','List endpoints load whole tables → OOM at real volume.','many services'],['Committed secrets','Live Gemini keys + default JWT/Admin@123/minioadmin in git.','infra-wide'],['com.hirepath namespace','8 migrated services still under the wrong package + groupId.','8 services']];
  const g=el('div','grid cards2');items.forEach(it=>{const c=el('div','card');H(c,`<div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><b style="font-size:14px">${it[0]}</b><span class="chip">${it[2]}</span></div><div class="sub" style="margin-top:7px">${it[1]}</div>`);g.appendChild(c);});wrap.appendChild(g);return wrap;}

function vInsights(){const m=document.getElementById('view');m.replaceChildren();CURRENT=vInsights;
  m.appendChild(el('div','kicker','Cross-cutting analysis'));m.appendChild(el('div','h1','Insights'));
  m.appendChild(el('p','lede','Where the risk concentrates, and the fixes that pay for themselves.'));
  const lev=el('div','card sect');lev.appendChild(el('div','ctitle','Highest-leverage fixes'));lev.appendChild(el('div','cdesc','One change, many findings gone'));
  const L=[['Extract common-security module','~15','Removes the duplicated JWT stack across every service'],['@MappedSuperclass + JPA Auditing','~46','Deletes the copy-pasted audit fields in every entity'],['Add CI gates (lint / type / test)','∞','Stops every future any / unused / unformatted / untested merge'],['common-web (exception handler)','~8','One error contract for all services incl. the HirePath ones'],['Move external calls after commit','~10+','Ends the transaction-pollution class of P0/P1 bugs']];
  const tbw=el('div');H(tbw,'<table class="tbl"><thead><tr><th>Fix</th><th>~Findings</th><th>Why</th></tr></thead><tbody>'+L.map(r=>`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td class="sub">${r[2]}</td></tr>`).join('')+'</tbody></table>');lev.appendChild(tbw);m.appendChild(lev);
  const cd=el('div','card sect');cd.appendChild(el('div','ctitle','Where each risk type lives'));cd.appendChild(el('div','cdesc','Click a card to open that category in the findings database'));
  const g=el('div','grid cards3');Object.entries(DATA.insights.byCategory).sort((a,b)=>b[1]-a[1]).forEach(ct=>{const c=ct[0],n=ct[1];const top=DATA.flows.map(f=>[f.name,f.findings.filter(x=>x.category===c).length]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,3);
    const card=el('div','card');card.style.cursor='pointer';card.onclick=()=>{FILT.cat=c;go('findings');};
    H(card,`<div style="display:flex;align-items:center;gap:8px"><span class="dotc" style="background:${CATC[c]}"></span><b style="font-size:13.5px">${c}</b><span style="margin-left:auto" class="badge b-p3">${n}</span></div><div class="sub" style="margin-top:8px;font-size:12px">${top.map(t=>esc(t[0])+' ('+t[1]+')').join(' · ')}</div>`);g.appendChild(card);});
  cd.appendChild(g);m.appendChild(cd);
  const row=el('div','grid cards2 sect');const w=el('div','card');w.appendChild(el('div','ctitle','Worst flows'));w.appendChild(el('div','cdesc','Weighted P0×3 + P1'));
  const wtw=el('div');H(wtw,'<table class="tbl"><thead><tr><th>Flow</th><th>P0</th><th>P1</th><th>Total</th></tr></thead><tbody>'+DATA.insights.worst.map(f=>`<tr data-go="flow/${f.name}"><td><b>${esc(f.name)}</b> <span class="muted">${f.kind}</span></td><td>${f.p0}</td><td>${f.p1}</td><td>${f.total}</td></tr>`).join('')+'</tbody></table>');wtw.querySelectorAll('tr[data-go]').forEach(tr=>tr.onclick=()=>go(tr.dataset.go));w.appendChild(wtw);
  const cf=el('div','card');cf.appendChild(el('div','ctitle','Confidence'));cf.appendChild(el('div','cdesc','How sure each finding is'));const conf={};ALLF.forEach(x=>{const k=x.confidence||'Unspecified';conf[k]=(conf[k]||0)+1;});cf.appendChild(simpleBar(Object.entries(conf).sort((a,b)=>b[1]-a[1]),'var(--good)'));cf.appendChild(el('div','callout','Low-confidence items are suspicions to confirm — filter by confidence in the findings database.'));
  row.append(w,cf);m.appendChild(row);
  const rm=el('div','card sect');rm.appendChild(el('div','ctitle','Suggested remediation order'));
  const R=[['1 · Contain','Rotate & purge committed keys; kill default creds; remove ngrok/demo auth','days'],['2 · Guardrails','CI gates (tsc, eslint --max-warnings 0, prettier, spotless) + first tests','~1 wk'],['3 · Correctness','Fix P0/P1 bugs: tax double-count, txn-pollution, ID races, missing handlers','1–2 wk'],['4 · Harden infra','Non-root containers; prod frontend image; resource limits; per-service creds','1–2 wk'],['5 · De-duplicate','common-jpa / common-web / common-security + api-contract modules','2–3 wk'],['6 · Refactor','Split god-components; finish com.hirepath→com.fawnix; delete dead code','ongoing']];
  const rtw=el('div');H(rtw,'<table class="tbl"><thead><tr><th>Phase</th><th>Work</th><th>Effort</th></tr></thead><tbody>'+R.map(r=>`<tr><td><b>${r[0]}</b></td><td class="sub">${r[1]}</td><td>${r[2]}</td></tr>`).join('')+'</tbody></table>');rm.appendChild(rtw);m.appendChild(rm);}

function vFindings(){const m=document.getElementById('view');m.replaceChildren();
  m.appendChild(el('div','kicker','Every finding across all 32 flows'));m.appendChild(el('div','h1','All findings'));
  m.appendChild(el('p','lede','A database of all findings. Switch Table / Board, group, sort and filter; click a row to open it in the side panel.'));
  const mount=el('div');m.appendChild(mount);
  CURRENT=()=>renderDB(mount,ALLF,null);renderDB(mount,ALLF,null);}

function metric(v,l,extra){const c=el('div','mcard');H(c,`<div class="mv">${v}</div><div class="ml">${l}</div>${extra||''}`);return c;}
function vFlow(name){const f=byName[name];if(!f){go('overview');return;}const m=document.getElementById('view');m.replaceChildren();
  const files=new Set(f.findings.map(x=>(x.location||'').split(':')[0].trim()).filter(Boolean)).size;
  const crit=f.sev.p0+f.sev.p1;const risk=f.sev.p0*8+f.sev.p1*4+f.sev.p2*2+f.sev.p3;
  const owners={};f.findings.forEach(x=>{owners[x.owner]=(owners[x.owner]||0)+1;});const ownArr=Object.entries(owners).sort((a,b)=>b[1]-a[1]);
  const cats={};f.findings.forEach(x=>{cats[x.category]=(cats[x.category]||0)+1;});const topCat=Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];
  m.appendChild(el('div','kicker',(f.kind==='frontend'?'Frontend module':'Backend service')+' · review score '+f.score+'/10'));
  m.appendChild(el('div','h1',esc(f.name)));
  const mstrip=el('div','mstrip');
  mstrip.appendChild(metric(f.findings.length,'Findings'));
  mstrip.appendChild(metric(crit,'Critical + High',`<div class="mbar"><span style="width:${Math.round(100*crit/(f.findings.length||1))}%;background:var(--p0)"></span></div>`));
  mstrip.appendChild(metric(files||'—','Files implicated'));
  mstrip.appendChild(metric(f.score+'/10','Review score',`<div class="mbar"><span style="width:${f.score*10}%;background:var(--good)"></span></div>`));
  mstrip.appendChild(metric(Math.round(100*risk/MAXRISK),'Risk index',`<div class="mbar"><span style="width:${Math.round(100*risk/MAXRISK)}%;background:hsl(var(--brand))"></span></div>`));
  const ownEx=`<div class="avarow" style="margin-top:9px">${ownArr.slice(0,5).map(o=>ava(o[0],1)).join('')}</div>`;
  mstrip.appendChild(metric(ownArr.length,'Owners',ownEx));
  const tc=topCat?topCat[0]:'—';mstrip.appendChild(metric(topCat?topCat[1]:'—','Top: '+tc));
  m.appendChild(mstrip);
  // severity chips row
  const chips=el('div');chips.style.cssText='display:flex;gap:8px;margin:8px 0 4px;flex-wrap:wrap';
  H(chips,SEV.map(s=>f.sev[s.toLowerCase()]?`<span class="badge b-${s.toLowerCase()}">${s} · ${f.sev[s.toLowerCase()]}</span>`:'').filter(Boolean).join(''));m.appendChild(chips);
  if(f.summaryHtml){const s=el('div','card sect');H(s,`<div class="ctitle">Summary</div><div class="muted" style="font-size:13.5px;line-height:1.6">${f.summaryHtml}</div>`);m.appendChild(s);}
  if(f.sections.length){const sw=el('div','sect');sw.appendChild(el('div','h2','Reference'));f.sections.forEach(sec=>{const d=el('details','acc');if(/surface/i.test(sec.title))d.open=true;H(d,`<summary>▸ ${esc(sec.title)}</summary><div class="inner">${sec.html}</div>`);sw.appendChild(d);});m.appendChild(sw);}
  m.appendChild(el('div','h2 sect','Findings'));
  const mount=el('div');m.appendChild(mount);
  CURRENT=()=>renderDB(mount,f.findings.map(x=>Object.assign({flow:f.name,kind:f.kind},x)),f.name);CURRENT();}

function go(route){location.hash='#/'+route;}
function render(){closePeek();const r=(location.hash||'#/overview').replace(/^#\//,'');markActive(r);
  if(r.startsWith('flow/'))vFlow(decodeURIComponent(r.slice(5)));else if(r==='insights')vInsights();else if(r==='findings')vFindings();else vOverview();
  const mn=document.getElementById('main');if(mn)mn.scrollTop=0;}
window.addEventListener('hashchange',render);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePeek();});
buildSide();
document.getElementById('peekov').onclick=closePeek;
const si=document.getElementById('gsearch');si.addEventListener('input',e=>{Q=e.target.value;const r=(location.hash||'').replace(/^#\//,'');if(r==='findings'||r.startsWith('flow/'))renderCurrent();else if(Q)go('findings');});
document.getElementById('theme').onclick=()=>{const d=document.documentElement;const t=d.getAttribute('data-theme')==='dark'?'':'dark';t?d.setAttribute('data-theme',t):d.removeAttribute('data-theme');try{localStorage.setItem('audit-theme',t)}catch(e){}};
try{if(localStorage.getItem('audit-theme')==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}
render();
"""

HTML = (
 '<!doctype html><html lang="en" data-theme=""><head>'
 '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
 '<title>Fawnix Verse — Audit</title><style>' + CSS + '</style></head><body>'
 '<div class="app"><div class="top">'
 '<div class="brand"><span class="logo">F</span>Fawnix Verse <small>Audit</small></div>'
 '<div class="spacer"></div>'
 '<div class="search"><span class="si">&#9906;</span><input id="gsearch" placeholder="Search findings — code, file, owner, keyword…"></div>'
 f'<span class="pill">{data["totals"]["findings"]} findings</span>'
 '<button class="tbtn" id="theme" title="toggle theme">&#9680;</button>'
 '</div><div class="side" id="side"></div>'
 '<div class="main" id="main"><div id="view"></div></div></div>'
 '<div class="peekov" id="peekov"></div><div class="peek" id="peek"></div>'
 '<script id="AUDIT" type="application/json">' + data_str + '</script>'
 '<script>' + JS + '</script></body></html>'
)
open(os.path.join(SITE, "index.html"), "w", encoding="utf-8").write(HTML)
print("wrote", os.path.join(SITE, "index.html"), round(len(HTML)/1024), "KB")
