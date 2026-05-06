// AuditLogs.jsx
import { useState } from "react";
const LOGS = [
  {id:1,action:"PAYROLL_PROCESSED",entity_type:"PayrollRecord",actor_name:"SYSTEM",actor_role:"SYSTEM",description:"Payroll processed for PAX-0042 — Net: ₹186,400",occurred_at:"2025-04-01T02:14:23Z"},
  {id:2,action:"PAYROLL_RUN_INITIATED",entity_type:"PayrollRun",actor_name:"Sneha Bose",actor_role:"HR_MANAGER",description:"Manual run for 4/2025 — 142 employees",occurred_at:"2025-04-01T02:00:01Z"},
  {id:3,action:"SALARY_REVISED",entity_type:"SalaryStructure",actor_name:"Sneha Bose",actor_role:"HR_MANAGER",description:"Salary revised for PAX-0033 — ₹18L → ₹22L CTC",occurred_at:"2025-03-28T11:34:00Z"},
  {id:4,action:"EMPLOYEE_CREATED",entity_type:"Employee",actor_name:"Rahul Verma",actor_role:"ADMIN",description:"New employee: Divya Menon (PAX-0142)",occurred_at:"2025-03-25T09:12:00Z"},
  {id:5,action:"DECLARATION_SUBMITTED",entity_type:"InvestmentDeclaration",actor_name:"Arjun Mehta",actor_role:"EMPLOYEE",description:"Investment declaration submitted for FY25-26",occurred_at:"2025-03-20T14:05:00Z"},
  {id:6,action:"PAYROLL_FAILED",entity_type:"PayrollRecord",actor_name:"SYSTEM",actor_role:"SYSTEM",description:"Payroll failed for PAX-0078: No salary structure found",occurred_at:"2025-04-01T02:18:45Z"},
  {id:7,action:"USER_LOGIN",entity_type:"User",actor_name:"Sneha Bose",actor_role:"HR_MANAGER",description:"Sneha Bose logged in",occurred_at:"2025-04-01T01:58:00Z"},
  {id:8,action:"PAYSLIP_DOWNLOADED",entity_type:"PayrollRecord",actor_name:"Arjun Mehta",actor_role:"EMPLOYEE",description:"Payslip downloaded — Mar 2025",occurred_at:"2025-04-02T09:30:00Z"},
];
const ACT = {PAYROLL_PROCESSED:{color:"#34d97b",bg:"#0a2a1a",icon:"✓"},PAYROLL_FAILED:{color:"#ff5c5c",bg:"#2a0a0a",icon:"✗"},PAYROLL_RUN_INITIATED:{color:"#f0a500",bg:"#1a1200",icon:"▶"},SALARY_REVISED:{color:"#c084fc",bg:"#1a0a2a",icon:"↑"},EMPLOYEE_CREATED:{color:"#6b9fff",bg:"#0a0a2a",icon:"+"},DECLARATION_SUBMITTED:{color:"#38bdf8",bg:"#0a1a2a",icon:"📋"},PAYSLIP_DOWNLOADED:{color:"#9ca3af",bg:"#111827",icon:"↓"},USER_LOGIN:{color:"#9ca3af",bg:"#111827",icon:"🔐"}};

export default function AuditLogs() {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [exp, setExp]       = useState(null);
  const filtered = LOGS.filter(l => (filter==="ALL"||l.action===filter) && (!search||l.description?.toLowerCase().includes(search.toLowerCase())||l.actor_name?.toLowerCase().includes(search.toLowerCase())));
  return (
    <div style={{padding:"28px 32px",minHeight:"100vh"}}>
      <div style={{marginBottom:22}}><h1 style={{fontSize:22,fontWeight:800,color:"#f9fafb",letterSpacing:"-0.5px"}}>Audit Logs</h1><div style={{color:"#6b7280",fontSize:13,marginTop:3}}>Immutable record of all system and user actions</div></div>
      <div style={{display:"flex",gap:12,marginBottom:18,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search…" style={{flex:1,minWidth:200,padding:"8px 13px",background:"#0d1117",border:"1px solid #1e2a3a",borderRadius:9,color:"#e5e7eb",fontSize:13,outline:"none"}}/>
        <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
          {["ALL","PAYROLL_PROCESSED","PAYROLL_FAILED","SALARY_REVISED","EMPLOYEE_CREATED","USER_LOGIN"].map(a=>(
            <button key={a} onClick={()=>setFilter(a)} style={{padding:"6px 10px",borderRadius:7,border:"none",cursor:"pointer",background:filter===a?(ACT[a]?.bg||"#1e2a3a"):"transparent",color:filter===a?(ACT[a]?.color||"#34d97b"):"#6b7280",fontSize:10,fontWeight:600,fontFamily:"'DM Mono',monospace"}}>{a.replace(/_/g," ")}</button>
          ))}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:5}}>
        {filtered.map(log=>{
          const c=ACT[log.action]||{color:"#9ca3af",bg:"#111827",icon:"•"};
          const open=exp===log.id;
          return (
            <div key={log.id} style={{background:open?"#0d1117":"rgba(255,255,255,0.02)",border:`1px solid ${open?c.color+"44":"#1e2a3a"}`,borderRadius:10,overflow:"hidden",transition:"border-color 0.15s"}}>
              <div style={{padding:"12px 15px",cursor:"pointer",display:"flex",alignItems:"flex-start",gap:11}} onClick={()=>setExp(open?null:log.id)}>
                <div style={{width:26,height:26,borderRadius:7,background:c.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:c.color,fontWeight:700,flexShrink:0,border:`1px solid ${c.color}33`}}>{c.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                    <span style={{color:c.color,fontSize:11,fontWeight:700,fontFamily:"'DM Mono',monospace",letterSpacing:"0.04em"}}>{log.action.replace(/_/g," ")}</span>
                    <span style={{color:"#374151",fontSize:11}}>·</span>
                    <span style={{color:"#6b7280",fontSize:11}}>{log.actor_name}</span>
                    <span style={{background:`${c.color}18`,color:c.color,fontSize:9,fontWeight:600,padding:"1px 7px",borderRadius:20}}>{log.actor_role}</span>
                  </div>
                  <div style={{color:"#9ca3af",fontSize:12,marginTop:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:open?"normal":"nowrap"}}>{log.description}</div>
                </div>
                <div style={{color:"#4b5563",fontSize:10,fontFamily:"'DM Mono',monospace",flexShrink:0}}>{new Date(log.occurred_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata",dateStyle:"short",timeStyle:"short"})}</div>
              </div>
              {open && <div style={{padding:"0 15px 12px 52px",borderTop:"1px solid #111827"}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,paddingTop:10}}>
                  {[["Entity",log.entity_type],["Type",log.actor_role]].map(([l,v])=>(
                    <div key={l}><div style={{color:"#6b7280",fontSize:9,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:2}}>{l}</div><div style={{color:"#e5e7eb",fontSize:12,fontFamily:"'DM Mono',monospace"}}>{v}</div></div>
                  ))}
                </div>
              </div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
