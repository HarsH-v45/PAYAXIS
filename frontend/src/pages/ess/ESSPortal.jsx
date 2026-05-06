import { api, essAPI } from "../../api/client";
import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/stores";

const MONTHS = ["","January","February","March","April","May","June","July","August","September","October","November","December"];
const fmt = n => `₹${new Intl.NumberFormat("en-IN").format(n || 0)}`;

function computeTotalDed(slip) {
  if (!slip?.snapshot?.deductions?.employee) return 0;
  return slip.snapshot.deductions.employee.reduce((s, d) => s + (d.amount || 0), 0);
}

function SlipDetail({ slip }) {
  const [tab, setTab] = useState("breakdown");
  // BUG FIX #4 & #5: Proper PDF download with revokeObjectURL + visible error state
  const [dlError, setDlError] = useState("");
  const [dlLoading, setDlLoading] = useState(false);

  async function handleDownload() {
    setDlError("");
    setDlLoading(true);
    let fileUrl = null;
    try {
      const response = await api.get(
        `/ess/payslips/${slip.month}/${slip.year}/download`,
        { responseType: "blob" }
      );
      fileUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = `Payslip-${slip.month}-${slip.year}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setDlError("Download failed. Please try again.");
      console.error("Download failed", err);
    } finally {
      setDlLoading(false);
      if (fileUrl) window.URL.revokeObjectURL(fileUrl); // BUG FIX #4: prevent memory leak
    }
  }

  if (!slip) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:10,color:"#475569"}}>
      <div style={{fontSize:44}}>📄</div><div>Select a payslip</div>
    </div>
  );

  // BUG FIX #1: Use real snapshot data from API, not hardcoded arrays
  const snapshot = slip.snapshot || {};
  const earnings = snapshot.earnings || [];
  const deductions = snapshot.deductions?.employee || [];
  const totalDed = computeTotalDed(slip);
  const grossPay = slip.gross_pay ?? snapshot.grossPay ?? 0;
  const netPay   = slip.net_pay   ?? snapshot.netPay   ?? 0;
  const tds      = snapshot.tds   || {};
  const attendance = snapshot.metadata?.attendance || {};

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"20px 22px",background:"linear-gradient(135deg,#1a1200,#2a1d00)",borderBottom:"1px solid #2a2000",borderRadius:"12px 12px 0 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{color:"#f0a500",fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4,fontFamily:"'DM Mono',monospace"}}>PAY SLIP</div>
            <div style={{color:"#f8fafc",fontSize:20,fontWeight:800,letterSpacing:"-0.4px"}}>{MONTHS[slip.month]} {slip.year}</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
            <button onClick={handleDownload} disabled={dlLoading} style={{padding:"9px 16px",borderRadius:8,border:"none",cursor:dlLoading?"not-allowed":"pointer",background:dlLoading?"#7a5200":"#f0a500",color:"#1a1200",fontWeight:700,fontSize:12,opacity:dlLoading?0.7:1}}>
              {dlLoading?"Downloading…":"↓ Download PDF"}
            </button>
            {dlError && <div style={{color:"#f87171",fontSize:11}}>{dlError}</div>}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginTop:16}}>
          {[["GROSS PAY",fmt(grossPay),"#f0a500"],["DEDUCTIONS",fmt(totalDed),"#f87171"],["NET PAY",fmt(netPay),"#34d97b"]].map(([l,v,c])=>(
            <div key={l} style={{background:"rgba(0,0,0,0.3)",borderRadius:8,padding:"9px 12px",border:"1px solid rgba(255,255,255,0.07)"}}>
              <div style={{color:"#94a3b8",fontSize:9,fontWeight:700,letterSpacing:"0.1em",fontFamily:"'DM Mono',monospace",marginBottom:2}}>{l}</div>
              <div style={{color:c,fontSize:15,fontWeight:800,fontFamily:"'DM Mono',monospace"}}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{borderBottom:"1px solid #1e2a3a",display:"flex",padding:"0 22px"}}>
        {[["breakdown","Breakdown"],["tax","Tax"],["attendance","Attendance"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:"11px 14px",border:"none",cursor:"pointer",background:"transparent",color:tab===id?"#f0a500":"#64748b",borderBottom:`2px solid ${tab===id?"#f0a500":"transparent"}`,fontWeight:600,fontSize:12,marginBottom:-1}}>{label}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"18px 22px"}}>
        {tab==="breakdown" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
            <div>
              <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,letterSpacing:"0.1em",marginBottom:10,textTransform:"uppercase",fontFamily:"'DM Mono',monospace"}}>Earnings</div>
              {earnings.length===0 && <div style={{color:"#475569",fontSize:12}}>No earnings data</div>}
              {earnings.map(e=>(
                <div key={e.code||e.label} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #1e2a3a"}}>
                  <div><div style={{color:"#e2e8f0",fontSize:12}}>{e.label}</div><div style={{color:e.taxable?"#34d97b":"#f0a500",fontSize:10,fontFamily:"'DM Mono',monospace"}}>{e.taxable?"taxable":"exempt"}</div></div>
                  <div style={{color:"#e2e8f0",fontWeight:600,fontFamily:"'DM Mono',monospace"}}>{fmt(e.amount)}</div>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderTop:"2px solid #2a3a4a"}}><span style={{color:"#f0a500",fontWeight:700}}>Total</span><span style={{color:"#f0a500",fontWeight:800,fontFamily:"'DM Mono',monospace"}}>{fmt(grossPay)}</span></div>
            </div>
            <div>
              <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,letterSpacing:"0.1em",marginBottom:10,textTransform:"uppercase",fontFamily:"'DM Mono',monospace"}}>Deductions</div>
              {deductions.length===0 && <div style={{color:"#475569",fontSize:12}}>No deduction data</div>}
              {deductions.map(d=>(
                <div key={d.code||d.label} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #1e2a3a"}}>
                  <div style={{color:"#e2e8f0",fontSize:12}}>{d.label}</div>
                  <div style={{color:"#f87171",fontWeight:600,fontFamily:"'DM Mono',monospace"}}>-{fmt(d.amount)}</div>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderTop:"2px solid #2a3a4a"}}><span style={{color:"#f87171",fontWeight:700}}>Total</span><span style={{color:"#f87171",fontWeight:800,fontFamily:"'DM Mono',monospace"}}>-{fmt(totalDed)}</span></div>
            </div>
          </div>
        )}
        {tab==="tax" && (
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{background:"rgba(240,165,0,0.08)",border:"1px solid rgba(240,165,0,0.2)",borderRadius:10,padding:"14px 16px"}}>
              <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,letterSpacing:"0.1em",fontFamily:"'DM Mono',monospace",marginBottom:10}}>TDS PROJECTION — {(snapshot.regime||"new").toUpperCase()} REGIME</div>
              {[
                ["Projected Annual Tax", fmt(tds.projectedAnnualTax||0)],
                ["This Month TDS",       fmt(tds.monthlyTDS||slip.tds_amount||0)],
                ["Effective Rate",       tds.effectiveRate!=null?`${(tds.effectiveRate*100).toFixed(1)}%`:"—"],
              ].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                  <span style={{color:"#94a3b8",fontSize:12}}>{l}</span>
                  <span style={{color:"#f0a500",fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab==="attendance" && (
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
            {[["Working Days",attendance.totalDays??"—","#6b9fff"],["Present",attendance.presentDays??"—","#34d97b"],["LOP Days",snapshot.lopDays??0,"#f87171"]].map(([l,v,c])=>(
              <div key={l} style={{background:"rgba(255,255,255,0.03)",border:"1px solid #1e2a3a",borderRadius:10,padding:"16px",textAlign:"center"}}>
                <div style={{color:c,fontSize:32,fontWeight:800,fontFamily:"'DM Mono',monospace"}}>{v}</div>
                <div style={{color:"#64748b",fontSize:11,marginTop:5,textTransform:"uppercase",letterSpacing:"0.06em"}}>{l}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DeclForm() {
  // BUG FIX #2 & #3: snake_case field names matching backend; form actually calls API
  const [vals, setVals] = useState({ppf:"",elss:"",life_insurance:"",health_insurance:"",nps:"",rent_paid:""});
  const [saved, setSaved]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState("");
  const set = (k,v) => setVals(p=>({...p,[k]:v}));
  const total80C = ["ppf","elss","life_insurance"].reduce((s,k)=>s+(+vals[k]||0),0);
  const FIELDS = [
    {key:"ppf",             label:"PPF",               sec:"80C"},
    {key:"elss",            label:"ELSS Mutual Funds",  sec:"80C"},
    {key:"life_insurance",  label:"Life Insurance",     sec:"80C"},   // was "lifeInsurance"
    {key:"health_insurance",label:"Health Insurance",   sec:"80D"},   // was "healthInsurance"
    {key:"nps",             label:"NPS (80CCD1B)",       sec:"80CCD"},
    {key:"rent_paid",       label:"Monthly Rent Paid",  sec:"HRA"},   // was "rentPaid"
  ];
  const SCOL = {"80C":"#6b9fff","80D":"#34d97b","80CCD":"#c084fc","HRA":"#f0a500"};

  async function handleSubmit() {
    setSaving(true);
    setSaveError("");
    try {
      const currentYear = new Date().getFullYear();
      const fiscalYear = new Date().getMonth() >= 3 ? currentYear : currentYear - 1; // Apr-based FY
      await essAPI.saveDecl({ fiscalYear, ...vals });
      setSaved(true);
      setTimeout(()=>setSaved(false),3000);
    } catch(err) {
      setSaveError(err.response?.data?.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{padding:24,maxWidth:680}}>
      <div style={{marginBottom:22}}><div style={{color:"#f8fafc",fontSize:19,fontWeight:800,marginBottom:4}}>Investment Declaration</div><div style={{color:"#64748b",fontSize:13}}>FY 2025-26 · Submit before 31st March 2026</div></div>
      <div style={{background:"rgba(107,159,255,0.08)",border:"1px solid rgba(107,159,255,0.2)",borderRadius:10,padding:"13px 16px",marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><span style={{color:"#6b9fff",fontWeight:700,fontSize:13}}>Section 80C</span><span style={{color:"#6b9fff",fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:700}}>{fmt(Math.min(total80C,150000))} / ₹1,50,000</span></div>
        <div style={{background:"#1e2a3a",borderRadius:6,height:6}}><div style={{width:`${Math.min(total80C/150000*100,100)}%`,height:"100%",background:"#6b9fff",borderRadius:6,transition:"width 0.4s"}}/></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
        {FIELDS.map(f=>(
          <div key={f.key} style={{background:"rgba(255,255,255,0.03)",border:"1px solid #1e2a3a",borderRadius:10,padding:"13px 15px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
              <div style={{color:"#e2e8f0",fontSize:12,fontWeight:600}}>{f.label}</div>
              <span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:20,background:`${SCOL[f.sec]}22`,color:SCOL[f.sec],fontFamily:"'DM Mono',monospace"}}>{f.sec}</span>
            </div>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"#64748b",fontSize:12}}>₹</span>
              <input type="number" placeholder="0" value={vals[f.key]} onChange={e=>set(f.key,e.target.value)} style={{width:"100%",padding:"7px 9px 7px 20px",background:"#0d1117",border:"1px solid #2a3a4a",borderRadius:7,color:"#f0a500",fontFamily:"'DM Mono',monospace",fontSize:13,outline:"none"}}/>
            </div>
          </div>
        ))}
      </div>
      {saveError && <div style={{color:"#f87171",fontSize:12,marginBottom:12,padding:"8px 12px",background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:8}}>{saveError}</div>}
      <button onClick={handleSubmit} disabled={saving} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",cursor:saving?"not-allowed":"pointer",background:saved?"#0a2a1a":"linear-gradient(135deg,#f0a500,#d97706)",color:saved?"#34d97b":"#1a1200",fontWeight:800,fontSize:14,transition:"all 0.3s",opacity:saving?0.7:1}}>
        {saving?"Saving…":saved?"✓ Declaration Saved":"Submit Declaration"}
      </button>
    </div>
  );
}

export default function ESSPortal() {
  const { user, logout } = useAuthStore();
  const [nav,  setNav]  = useState("payslips");
  // BUG FIX #1: real payslip state fetched from API
  const [payslips, setPayslips] = useState([]);
  const [slip, setSlip] = useState(null);
  const [loadingSlips, setLoadingSlips] = useState(true);

  useEffect(() => {
    essAPI.payslips()
      .then(({data}) => {
        const list = data.data || [];
        setPayslips(list);
        if (list.length > 0) setSlip(list[0]);
      })
      .catch(err => console.error("Failed to load payslips", err))
      .finally(() => setLoadingSlips(false));
  }, []);

  const ytdNet = payslips.filter(p=>p.status==="SUCCESS").reduce((s,p)=>s+(p.net_pay||0),0);
  const ytdTDS = payslips.filter(p=>p.status==="SUCCESS").reduce((s,p)=>s+(p.tds_amount||0),0);

  return (
    <div style={{minHeight:"100vh",background:"#07090f",color:"#e2e8f0",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=DM+Mono:wght@400;600&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{background:"#0d1117",borderBottom:"1px solid #1e2a3a",padding:"0 28px",display:"flex",alignItems:"center",gap:14,height:58,position:"sticky",top:0,zIndex:100}}>
        <div style={{width:28,height:28,borderRadius:8,background:"#f0a500",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:14,color:"#1a1200"}}>P</div>
        <div style={{fontWeight:800,fontSize:15,color:"#f8fafc",letterSpacing:"-0.3px"}}>PayAxis</div>
        <div style={{width:1,height:18,background:"#1e2a3a",margin:"0 4px"}}/>
        <div style={{color:"#64748b",fontSize:12,fontFamily:"'DM Mono',monospace"}}>Employee Self-Service</div>
        <div style={{flex:1}}/>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#f0a500,#d97706)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,color:"#1a1200"}}>{user?.name?.split(" ").map(n=>n[0]).join("").slice(0,2)||"U"}</div>
          <div style={{color:"#e2e8f0",fontWeight:600,fontSize:13}}>{user?.name}</div>
        </div>
        <button onClick={logout} style={{padding:"5px 12px",borderRadius:7,border:"1px solid #1e2a3a",background:"transparent",color:"#6b7280",cursor:"pointer",fontSize:11,fontWeight:600}}>Sign Out</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"200px 1fr",minHeight:"calc(100vh - 58px)"}}>
        <div style={{background:"#0d1117",borderRight:"1px solid #1e2a3a",padding:"20px 10px",display:"flex",flexDirection:"column",gap:2}}>
          <div style={{background:"rgba(240,165,0,0.08)",border:"1px solid rgba(240,165,0,0.15)",borderRadius:10,padding:"13px",marginBottom:14}}>
            <div style={{color:"#64748b",fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'DM Mono',monospace",marginBottom:8}}>FY25 YTD</div>
            {[["Net Earned",fmt(ytdNet),"#f0a500"],["TDS Paid",fmt(ytdTDS),"#f87171"]].map(([l,v,c])=>(
              <div key={l} style={{marginBottom:7}}><div style={{color:"#475569",fontSize:9,marginBottom:1}}>{l}</div><div style={{color:c,fontWeight:800,fontSize:13,fontFamily:"'DM Mono',monospace"}}>{v}</div></div>
            ))}
          </div>
          {[["payslips","My Payslips","📄"],["declarations","Declarations","📋"],["profile","My Profile","👤"]].map(([id,label,icon])=>(
            <button key={id} onClick={()=>setNav(id)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:9,border:"none",cursor:"pointer",background:nav===id?"rgba(240,165,0,0.12)":"transparent",color:nav===id?"#f0a500":"#64748b",borderLeft:`2px solid ${nav===id?"#f0a500":"transparent"}`,fontSize:13,fontWeight:600,textAlign:"left"}}>
              <span>{icon}</span>{label}
            </button>
          ))}
        </div>

        <div style={{overflowY:"auto"}}>
          {nav==="payslips" && (
            <div style={{display:"grid",gridTemplateColumns:"240px 1fr",height:"100%"}}>
              <div style={{borderRight:"1px solid #1e2a3a",padding:"18px 14px",overflowY:"auto"}}>
                <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",fontFamily:"'DM Mono',monospace",marginBottom:10}}>History</div>
                {loadingSlips && <div style={{color:"#475569",fontSize:12,padding:"8px 0"}}>Loading…</div>}
                {!loadingSlips && payslips.length===0 && <div style={{color:"#475569",fontSize:12}}>No payslips found</div>}
                {payslips.map(s=>(
                  <button key={`${s.month}-${s.year}`} onClick={()=>setSlip(s)} style={{width:"100%",textAlign:"left",border:"none",cursor:"pointer",padding:"12px 14px",borderRadius:9,background:slip?.month===s.month&&slip?.year===s.year?"linear-gradient(135deg,#1a1200,#2a1f00)":"rgba(255,255,255,0.03)",borderLeft:`3px solid ${slip?.month===s.month&&slip?.year===s.year?"#f0a500":"transparent"}`,marginBottom:4,transition:"all 0.15s"}}>
                    <div style={{color:slip?.month===s.month&&slip?.year===s.year?"#f0a500":"#e2e8f0",fontWeight:700,fontSize:13}}>{MONTHS[s.month]} {s.year}</div>
                    <div style={{color:"#94a3b8",fontSize:11,marginTop:2,fontFamily:"'DM Mono',monospace"}}>Net: {fmt(s.net_pay)}</div>
                  </button>
                ))}
              </div>
              <div style={{background:"#0a0e16"}}><SlipDetail slip={slip}/></div>
            </div>
          )}
          {nav==="declarations" && <div style={{background:"#0a0e16",minHeight:"100%"}}><DeclForm/></div>}
          {nav==="profile" && (
            <div style={{padding:26}}>
              <div style={{color:"#f8fafc",fontSize:18,fontWeight:800,marginBottom:18}}>My Profile</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,maxWidth:580}}>
                {[["Full Name",user?.name||"—"],["Employee ID",user?.code||"—"],["Email",user?.email||"—"],["Role",user?.role||"—"]].map(([l,v])=>(
                  <div key={l} style={{background:"rgba(255,255,255,0.03)",border:"1px solid #1e2a3a",borderRadius:10,padding:"13px 15px"}}>
                    <div style={{color:"#475569",fontSize:10,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:4,fontFamily:"'DM Mono',monospace"}}>{l}</div>
                    <div style={{color:"#e2e8f0",fontSize:13,fontWeight:600}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
