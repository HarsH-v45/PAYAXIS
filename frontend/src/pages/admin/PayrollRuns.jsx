import { useState, useEffect } from "react";
import { usePayrollStore } from "../../store/stores";

const MONTHS = ["","January","February","March","April","May","June","July","August","September","October","November","December"];
const S = { SUCCESS:{bg:"#0a2a1a",color:"#34d97b",label:"Processed"}, FAILED:{bg:"#2a0a0a",color:"#ff5c5c",label:"Failed"}, PROCESSING:{bg:"#1a1a0a",color:"#f0c040",label:"Processing"}, PENDING:{bg:"#0a0a2a",color:"#6b9fff",label:"Pending"}, HOLD:{bg:"#1a0a1a",color:"#c084fc",label:"On Hold"} };
const fmt = n => `₹${new Intl.NumberFormat("en-IN").format(n||0)}`;

function Badge({ status }) {
  const c = S[status]||S.PENDING;
  return <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, background:c.bg, color:c.color, fontSize:11, fontWeight:700, fontFamily:"'DM Mono',monospace" }}><span style={{ width:5,height:5,borderRadius:"50%",background:c.color,boxShadow:`0 0 5px ${c.color}` }}/>{c.label}</span>;
}

export default function PayrollRuns() {
  const { runs, records, summary, metrics, loading, fetchRuns, fetchRun, trigger, fetchMetrics, retry } = usePayrollStore();
  const [selRun, setSelRun]         = useState(null);
  const [statusF, setStatusF]       = useState("ALL");
  const [search, setSearch]         = useState("");
  const [modal, setModal]           = useState(false);
  const [tMonth, setTMonth]         = useState(new Date().getMonth()+1);
  const [tYear,  setTYear]          = useState(new Date().getFullYear());
  const [trigging, setTrigging]     = useState(false);

  useEffect(() => { fetchRuns(); fetchMetrics(); }, []);
  useEffect(() => { const id=setInterval(fetchMetrics,8000); return ()=>clearInterval(id); }, []);

  async function selectRun(run) { setSelRun(run); await fetchRun(run.id); }
  async function doTrigger() { setTrigging(true); try { await trigger(tMonth,tYear); setModal(false); } finally { setTrigging(false); } }

  const filtered = records.filter(r => {
    const ms = statusF==="ALL"||r.status===statusF;
    const ms2 = !search||r.full_name?.toLowerCase().includes(search.toLowerCase())||r.employee_code?.toLowerCase().includes(search.toLowerCase());
    return ms&&ms2;
  });

  return (
    <div style={{ padding:"28px 32px", minHeight:"100vh" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:"#f9fafb", letterSpacing:"-0.5px" }}>Payroll Runs</h1>
          <div style={{ color:"#6b7280", fontSize:13, marginTop:3 }}>Manage and monitor payroll processing</div>
        </div>
        <button onClick={()=>setModal(true)} style={{ padding:"10px 18px", borderRadius:9, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#059669,#34d97b)", color:"#fff", fontWeight:700, fontSize:13, boxShadow:"0 0 16px rgba(52,217,123,0.3)" }}>▶ Manual Run</button>
      </div>

      {/* Queue metrics */}
      {metrics && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:20 }}>
          {[["Waiting",metrics.waiting,"#6b9fff"],["Active",metrics.active,"#f0c040"],["Done",metrics.completed,"#34d97b"],["Failed",metrics.failed,"#ff5c5c"],["Delayed",metrics.delayed,"#c084fc"]].map(([l,v,c])=>(
            <div key={l} style={{ background:"#0d1117", border:`1px solid ${c}22`, borderRadius:10, padding:"11px 13px" }}>
              <div style={{ color:c, fontSize:22, fontWeight:800, fontFamily:"'DM Mono',monospace" }}>{v}</div>
              <div style={{ color:"#6b7280", fontSize:10, marginTop:2, textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"270px 1fr", gap:16, alignItems:"start" }}>
        {/* Run list */}
        <div style={{ background:"#0d1117", border:"1px solid #1e2a3a", borderRadius:12, overflow:"hidden" }}>
          <div style={{ padding:"13px 15px", borderBottom:"1px solid #1e2a3a", color:"#e5e7eb", fontWeight:700, fontSize:13 }}>Run History</div>
          <div style={{ maxHeight:520, overflowY:"auto" }}>
            {runs.map(run => (
              <div key={run.id} onClick={()=>selectRun(run)} style={{ padding:"13px 15px", borderBottom:"1px solid #111827", cursor:"pointer", background:selRun?.id===run.id?"#0a1a0a":"transparent", borderLeft:`3px solid ${selRun?.id===run.id?"#34d97b":"transparent"}`, transition:"all 0.15s" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ color:selRun?.id===run.id?"#34d97b":"#e5e7eb", fontWeight:700, fontSize:13 }}>{MONTHS[run.month]} {run.year}</span>
                  <span style={{ fontSize:10, fontWeight:600, padding:"2px 7px", borderRadius:20, background:run.run_type==="AUTO"?"#0a1a2a":"#1a1200", color:run.run_type==="AUTO"?"#6b9fff":"#f0a500" }}>{run.run_type}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ color:"#6b7280", fontSize:11, fontFamily:"'DM Mono',monospace" }}>{run.processed_count||0}/{run.total_employees||0}</span>
                 {/* BUG FIX #9: Use actual status from DB instead of a flawed heuristic */}
                 <Badge status={run.status || (run.processed_count === run.total_employees ? (run.failed_count > 0 ? "FAILED" : "SUCCESS") : "PROCESSING")} />
              </div>
              </div>
            ))}
          </div>
        </div>

        {/* Records table */}
        <div style={{ background:"#0d1117", border:"1px solid #1e2a3a", borderRadius:12, overflow:"hidden" }}>
          <div style={{ padding:"13px 16px", borderBottom:"1px solid #1e2a3a", display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
            <div style={{ flex:1 }}>
              <div style={{ color:"#e5e7eb", fontWeight:700, fontSize:13 }}>{selRun?`${MONTHS[selRun.month]} ${selRun.year} Records`:"Select a run"}</div>
              {summary && <div style={{ color:"#6b7280", fontSize:11, marginTop:1 }}>Net: <span style={{ color:"#34d97b" }}>{fmt(summary.total_net)}</span></div>}
            </div>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{ padding:"7px 11px", background:"#111827", border:"1px solid #1e2a3a", borderRadius:8, color:"#e5e7eb", fontSize:12, outline:"none", width:170 }}/>
            <div style={{ display:"flex", gap:3 }}>
              {["ALL","SUCCESS","PROCESSING","PENDING","FAILED"].map(s=>(
                <button key={s} onClick={()=>setStatusF(s)} style={{ padding:"5px 9px", borderRadius:7, border:"none", cursor:"pointer", background:statusF===s?"#1e3a2a":"transparent", color:statusF===s?"#34d97b":"#6b7280", fontSize:11, fontWeight:600 }}>{s}</button>
              ))}
            </div>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:"#111827" }}>
                  {["Employee","Gross","Net Pay","TDS","Status",""].map(h=>(
                    <th key={h} style={{ padding:"9px 14px", textAlign:"left", color:"#6b7280", fontWeight:600, fontSize:10, letterSpacing:"0.06em", textTransform:"uppercase", borderBottom:"1px solid #1e2a3a", fontFamily:"'DM Mono',monospace" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!selRun && <tr><td colSpan={6} style={{ textAlign:"center", padding:48, color:"#4b5563" }}>Select a payroll run</td></tr>}
                {filtered.map(r=>(
                  <tr key={r.id} style={{ borderBottom:"1px solid #111827", transition:"background 0.1s" }} onMouseEnter={e=>e.currentTarget.style.background="#0a0f1a"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"11px 14px" }}>
                      <div style={{ color:"#e5e7eb", fontWeight:600 }}>{r.full_name}</div>
                      <div style={{ color:"#6b7280", fontSize:10, fontFamily:"'DM Mono',monospace" }}>{r.employee_code}</div>
                    </td>
                    <td style={{ padding:"11px 14px", color:"#e5e7eb", fontFamily:"'DM Mono',monospace" }}>{fmt(r.gross_pay)}</td>
                    <td style={{ padding:"11px 14px", color:"#34d97b", fontWeight:700, fontFamily:"'DM Mono',monospace" }}>{fmt(r.net_pay)}</td>
                    <td style={{ padding:"11px 14px", color:"#c084fc", fontFamily:"'DM Mono',monospace" }}>{fmt(r.tds_amount)}</td>
                    <td style={{ padding:"11px 14px" }}><Badge status={r.status}/></td>
                    <td style={{ padding:"11px 14px" }}>
                      {r.status==="FAILED" && <button onClick={()=>retry(r.employee_id,selRun?.month,selRun?.year)} style={{ padding:"4px 10px", borderRadius:6, border:"1px solid #3a1a1a", background:"transparent", color:"#ff5c5c", fontSize:10, cursor:"pointer", fontWeight:600 }}>Retry</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Trigger modal */}
      {modal && (
        <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center" }} onClick={()=>setModal(false)}>
          <div style={{ background:"#0d1117", border:"1px solid #1e2a3a", borderRadius:16, padding:30, width:340 }} onClick={e=>e.stopPropagation()}>
            <div style={{ color:"#f9fafb", fontSize:17, fontWeight:700, marginBottom:6 }}>Manual Payroll Run</div>
            <div style={{ color:"#6b7280", fontSize:13, marginBottom:22 }}>Enqueues payroll for all active employees.</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:22 }}>
              {[["Month","month",MONTHS.slice(1).map((m,i)=>[i+1,m]),tMonth,setTMonth],["Year","year",[[2024,2024],[2025,2025],[2026,2026]],tYear,setTYear]].map(([label,,opts,val,setter])=>(
                <div key={label}>
                  <label style={{ display:"block", color:"#9ca3af", fontSize:11, fontWeight:600, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</label>
                  <select value={val} onChange={e=>setter(+e.target.value)} style={{ width:"100%", padding:"8px 11px", background:"#111827", border:"1px solid #1e2a3a", borderRadius:8, color:"#e5e7eb", fontSize:13, outline:"none" }}>
                    {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setModal(false)} style={{ flex:1, padding:"9px", background:"transparent", border:"1px solid #1e2a3a", borderRadius:8, color:"#6b7280", cursor:"pointer", fontWeight:600 }}>Cancel</button>
              <button onClick={doTrigger} disabled={trigging} style={{ flex:2, padding:"9px", background:"linear-gradient(135deg,#059669,#34d97b)", border:"none", borderRadius:8, color:"#fff", cursor:"pointer", fontWeight:700, opacity:trigging?0.7:1 }}>
                {trigging?"Queuing…":`Run ${MONTHS[tMonth]} ${tYear}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
