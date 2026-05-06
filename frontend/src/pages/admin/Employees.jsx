import { useState, useEffect } from "react";
import { useEmployeeStore } from "../../store/stores";
import { employeeAPI } from "../../api/client";
import SalaryModal from "../../components/SalaryModal";

const DCOL = { Engineering:"#6b9fff", Product:"#c084fc", Design:"#f0a500", Finance:"#34d97b", HR:"#fb7185", Sales:"#38bdf8" };

function Avatar({ name, size=34 }) {
  const init = name?.split(" ").map(n=>n[0]).join("").slice(0,2)||"?";
  const h = (name?.charCodeAt(0)||0)*17%360;
  return <div style={{ width:size,height:size,borderRadius:"50%",flexShrink:0,background:`hsl(${h},40%,20%)`,border:`1.5px solid hsl(${h},50%,33%)`,display:"flex",alignItems:"center",justifyContent:"center",color:`hsl(${h},70%,65%)`,fontSize:size*0.34,fontWeight:700 }}>{init}</div>;
}

function Drawer({ emp, onClose, onSave }) {
  const [f, setF] = useState({ fullName:"",email:"",designation:"",joiningDate:"",taxRegime:"new",state:"KA",employmentType:"FULL_TIME",...(emp||{}) });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));

async function save() {
  setLoading(true);

  try {
    const employeeCode = "EMP" + Math.floor(1000 + Math.random() * 9000);

    const payload = {
      ...f,
      employee_code: employeeCode,   // ✅ REQUIRED FIX
    };
    console.log("Payload being sent to API:", payload); // ✅ DEBUG LOG
    emp?.id
      ? await employeeAPI.update(emp.id, payload)
      : await employeeAPI.create(payload);

    onSave();
  } finally {
    setLoading(false);
  }
}

  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",display:"flex",justifyContent:"flex-end" }} onClick={onClose}>
      <div style={{ width:460,background:"#0d1117",borderLeft:"1px solid #1e2a3a",height:"100%",overflowY:"auto",padding:26 }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22 }}>
          <div style={{ color:"#f9fafb",fontSize:17,fontWeight:700 }}>{emp?.id?"Edit":"Add"} Employee</div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:"#6b7280",fontSize:18 }}>✕</button>
        </div>
        {[["fullName","Full Name","text","Arjun Mehta"],["email","Email","email","arjun@company.com"],["designation","Designation","text","Senior Engineer"],["joiningDate","Joining Date","date",""]].map(([k,label,type,ph])=>(
          <div key={k} style={{ marginBottom:14 }}>
            <label style={{ display:"block",color:"#9ca3af",fontSize:11,fontWeight:600,marginBottom:5,letterSpacing:"0.06em",textTransform:"uppercase" }}>{label}</label>
            <input type={type} value={f[k]||""} onChange={e=>set(k,e.target.value)} placeholder={ph}
              style={{ width:"100%",padding:"9px 12px",background:"#111827",border:"1px solid #1e2a3a",borderRadius:8,color:"#e5e7eb",fontSize:13,outline:"none" }}
              onFocus={e=>e.target.style.borderColor="#34d97b"} onBlur={e=>e.target.style.borderColor="#1e2a3a"}/>
          </div>
        ))}
        {[["taxRegime","Tax Regime",[["new","New Regime"],["old","Old Regime"]]],["state","State",[["KA","Karnataka"],["MH","Maharashtra"],["DL","Delhi"],["TN","Tamil Nadu"],["WB","West Bengal"],["GJ","Gujarat"],["AP","Andhra Pradesh"],["TS","Telangana"]]],["employmentType","Employment",[["FULL_TIME","Full Time"],["PART_TIME","Part Time"],["CONTRACT","Contract"],["INTERN","Intern"]]]].map(([k,label,opts])=>(
          <div key={k} style={{ marginBottom:14 }}>
            <label style={{ display:"block",color:"#9ca3af",fontSize:11,fontWeight:600,marginBottom:5,letterSpacing:"0.06em",textTransform:"uppercase" }}>{label}</label>
            <select value={f[k]||""} onChange={e=>set(k,e.target.value)} style={{ width:"100%",padding:"9px 12px",background:"#111827",border:"1px solid #1e2a3a",borderRadius:8,color:"#e5e7eb",fontSize:13,outline:"none" }}>
              {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        ))}
        <div style={{ display:"flex",gap:10,marginTop:24 }}>
          <button onClick={onClose} style={{ flex:1,padding:"10px",background:"transparent",border:"1px solid #1e2a3a",borderRadius:8,color:"#6b7280",cursor:"pointer",fontWeight:600 }}>Cancel</button>
          <button onClick={save} disabled={loading} style={{ flex:2,padding:"10px",background:"linear-gradient(135deg,#059669,#34d97b)",border:"none",borderRadius:8,color:"#fff",cursor:"pointer",fontWeight:700,opacity:loading?0.7:1 }}>{loading?"Saving…":emp?.id?"Save Changes":"Add Employee"}</button>
        </div>
      </div>
    </div>
  );
}

export default function Employees() {
  const { employees, loading, fetchAll } = useEmployeeStore();
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState(null);
  const [salaryEmp, setSalaryEmp] = useState(null); 

  useEffect(() => { fetchAll(); }, []);

  const filtered = employees.filter(e =>
    !search||[e.full_name,e.employee_code,e.email].some(s=>s?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ padding:"28px 32px", minHeight:"100vh" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22 }}>
        <div>
          <h1 style={{ fontSize:22,fontWeight:800,color:"#f9fafb",letterSpacing:"-0.5px" }}>Employees</h1>
          <div style={{ color:"#6b7280",fontSize:13,marginTop:3 }}>{employees.filter(e=>e.is_active).length} active members</div>
        </div>
        <button onClick={()=>setDrawer({})} style={{ padding:"10px 18px",borderRadius:9,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#059669,#34d97b)",color:"#fff",fontWeight:700,fontSize:13,boxShadow:"0 0 16px rgba(52,217,123,0.3)" }}>+ Add Employee</button>
      </div>

      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search name, code or email…"
        style={{ width:"100%",maxWidth:400,padding:"9px 14px",background:"#0d1117",border:"1px solid #1e2a3a",borderRadius:9,color:"#e5e7eb",fontSize:13,outline:"none",marginBottom:18 }}/>

      <div style={{ background:"#0d1117",border:"1px solid #1e2a3a",borderRadius:14,overflow:"hidden" }}>
        <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
          <thead>
            <tr style={{ background:"#111827" }}>
              {["Employee","Department","Designation","Tax Regime","CTC","Actions"].map(h=>(
                <th key={h} style={{ padding:"10px 16px",textAlign:"left",color:"#6b7280",fontWeight:600,fontSize:10,letterSpacing:"0.06em",textTransform:"uppercase",borderBottom:"1px solid #1e2a3a",fontFamily:"'DM Mono',monospace" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={{ textAlign:"center",padding:40,color:"#6b7280" }}>Loading…</td></tr>}
            {!loading && filtered.map(emp=>(
              <tr key={emp.id} style={{ borderBottom:"1px solid #111827",transition:"background 0.1s" }} onMouseEnter={e=>e.currentTarget.style.background="#0a0f1a"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{ padding:"12px 16px" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                    <Avatar name={emp.full_name}/>
                    <div>
                      <div style={{ color:"#e5e7eb",fontWeight:600 }}>{emp.full_name}</div>
                      <div style={{ color:"#6b7280",fontSize:11,fontFamily:"'DM Mono',monospace" }}>{emp.employee_code}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding:"12px 16px" }}>
                  {emp.department && <span style={{ padding:"3px 9px",borderRadius:20,fontSize:11,fontWeight:600,background:`${DCOL[emp.department]||"#6b7280"}18`,color:DCOL[emp.department]||"#6b7280" }}>{emp.department}</span>}
                </td>
                <td style={{ padding:"12px 16px",color:"#9ca3af" }}>{emp.designation||"—"}</td>
                <td style={{ padding:"12px 16px" }}><span style={{ color:emp.tax_regime==="new"?"#34d97b":"#f0a500",fontWeight:600,fontSize:12 }}>{emp.tax_regime==="new"?"New":"Old"}</span></td>
                <td style={{ padding:"12px 16px",color:"#e5e7eb",fontFamily:"'DM Mono',monospace",fontSize:12 }}>{emp.annual_ctc?`₹${(emp.annual_ctc/100000).toFixed(1)}L`:"—"}</td>
                <td style={{ padding:"12px 16px" }}>
                  <button onClick={()=>setDrawer({emp})} style={{ padding:"5px 12px",borderRadius:6,border:"1px solid #1e3a5a",background:"transparent",color:"#6b9fff",fontSize:11,cursor:"pointer",fontWeight:600 }}>Edit</button>
                    <button 
                      onClick={()=>setSalaryEmp(emp)}   // 👈 NEW
                      style={{ padding:"5px 12px",borderRadius:6,border:"1px solid #065f46",background:"transparent",color:"#34d97b",fontSize:11,cursor:"pointer",fontWeight:600 }}
                    >
                      Salary
                    </button>      
                    {salaryEmp && (
                      <SalaryModal
                        emp={salaryEmp}
                        onClose={() => setSalaryEmp(null)}
                        onSave={() => {
                          setSalaryEmp(null);
                          fetchAll();
                        }}
                      />
                    )}         
                </td>
              </tr>
            ))}
            {!loading && !filtered.length && <tr><td colSpan={6} style={{ textAlign:"center",padding:48,color:"#4b5563" }}>No employees found.</td></tr>}
          </tbody>
        </table>
      </div>

      {drawer !== null && <Drawer emp={drawer.emp} onClose={()=>setDrawer(null)} onSave={()=>{ setDrawer(null); fetchAll(); }}/>}
    </div>
  );
}
