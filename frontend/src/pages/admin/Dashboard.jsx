import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePayrollStore, useAuthStore } from "../../store/stores";

const CARDS = [
  { to:"/admin/payroll",   label:"Payroll Runs",   desc:"Monitor & trigger payroll processing", icon:"⚡", color:"#34d97b" },
  { to:"/admin/employees", label:"Employees",       desc:"Manage headcount & salary structures",  icon:"👥", color:"#6b9fff" },
  { to:"/admin/reports",   label:"Reports",         desc:"Payout analytics & department data",    icon:"📊", color:"#f0a500" },
  { to:"/admin/audit",     label:"Audit Logs",      desc:"Immutable trail of all system actions", icon:"🔍", color:"#c084fc" },
];

function KpiBox({ label, value, color }) {
  return (
    <div style={{ textAlign:"center" }}>
      <div style={{ color, fontSize:30, fontWeight:800, fontFamily:"'DM Mono',monospace" }}>{value}</div>
      <div style={{ color:"#6b7280", fontSize:10, marginTop:3, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { metrics, fetchMetrics } = usePayrollStore();

  useEffect(() => {
    fetchMetrics();
    const id = setInterval(fetchMetrics, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ padding:"28px 32px", minHeight:"100vh" }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:24, fontWeight:800, color:"#f9fafb", letterSpacing:"-0.5px" }}>
          Welcome, {user?.name?.split(" ")[0]} 👋
        </h1>
        <div style={{ color:"#6b7280", fontSize:13, marginTop:4 }}>
          {new Date().toLocaleDateString("en-IN", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
        </div>
      </div>

      {/* Queue strip */}
      {metrics && (
        <div style={{ background:"#0d1117", border:"1px solid #1e2a3a", borderRadius:14, padding:"18px 24px", marginBottom:22 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ color:"#e5e7eb", fontWeight:700, fontSize:14 }}>BullMQ Queue</div>
            <span style={{ fontSize:10, fontWeight:700, padding:"2px 9px", borderRadius:20, background:"#0a2a1a", color:"#34d97b", fontFamily:"'DM Mono',monospace" }}>● LIVE</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:16 }}>
            {[["Waiting",metrics.waiting,"#6b9fff"],["Active",metrics.active,"#f0c040"],["Completed",metrics.completed,"#34d97b"],["Failed",metrics.failed,"#ff5c5c"],["Delayed",metrics.delayed,"#c084fc"]].map(([l,v,c])=>
              <KpiBox key={l} label={l} value={v} color={c}/>
            )}
          </div>
        </div>
      )}

      {/* Nav cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:14 }}>
        {CARDS.map(c => (
          <div key={c.to} onClick={()=>navigate(c.to)}
            style={{ background:"linear-gradient(135deg,#0d1117,#111827)", border:"1px solid #1e2a3a", borderRadius:14, padding:"24px", cursor:"pointer", transition:"all 0.18s", position:"relative", overflow:"hidden" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=c.color+"55";e.currentTarget.style.transform="translateY(-2px)"}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#1e2a3a";e.currentTarget.style.transform="translateY(0)"}}>
            <div style={{ position:"absolute", top:0, right:0, width:90, height:90, background:`radial-gradient(circle at top right, ${c.color}14 0%, transparent 70%)` }}/>
            <div style={{ fontSize:28, marginBottom:12 }}>{c.icon}</div>
            <div style={{ color:c.color, fontWeight:700, fontSize:16, marginBottom:5 }}>{c.label}</div>
            <div style={{ color:"#6b7280", fontSize:13 }}>{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
