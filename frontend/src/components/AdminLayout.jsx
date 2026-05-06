import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/stores";

const NAV = [
  { to:"/admin",           label:"Dashboard",    icon:"⚡", end:true },
  { to:"/admin/payroll",   label:"Payroll Runs", icon:"💰" },
  { to:"/admin/employees", label:"Employees",    icon:"👥" },
  { to:"/admin/reports",   label:"Reports",      icon:"📊" },
  { to:"/admin/audit",     label:"Audit Logs",   icon:"🔍" },
  { to:"/ess",             label:"My Portal",    icon:"👤", divider:true },
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [col, setCol] = useState(false);

  async function handleLogout() { await logout(); navigate("/login"); }

  return (
    <div style={{ display:"flex", minHeight:"100vh" }}>
      <style>{`
        .nav-link-active .nav-item { background:linear-gradient(135deg,#0a2a1a,#0d3a22)!important; color:#34d97b!important; border-left:2px solid #34d97b!important; }
        .nav-item:hover { background:rgba(255,255,255,0.05)!important; }
      `}</style>

      <aside style={{ width:col?64:216, background:"#0d1117", borderRight:"1px solid #1e2a3a", display:"flex", flexDirection:"column", position:"sticky", top:0, height:"100vh", transition:"width 0.2s", flexShrink:0, overflow:"hidden", zIndex:50 }}>
        {/* Logo */}
        <div style={{ padding:"18px 14px", borderBottom:"1px solid #1e2a3a", display:"flex", alignItems:"center", gap:10, minHeight:64 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:"linear-gradient(135deg,#059669,#34d97b)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, fontWeight:900, color:"#fff", flexShrink:0, boxShadow:"0 0 14px rgba(52,217,123,0.3)" }}>P</div>
          {!col && <div style={{ flex:1 }}><div style={{ fontWeight:800, fontSize:16, color:"#f9fafb", letterSpacing:"-0.3px" }}>PayAxis</div><div style={{ color:"#34d97b", fontSize:9, fontFamily:"'DM Mono',monospace", letterSpacing:"0.1em" }}>HRMS v2.1</div></div>}
          <button onClick={()=>setCol(!col)} style={{ background:"none", border:"none", cursor:"pointer", color:"#6b7280", fontSize:14, padding:2, flexShrink:0 }}>{col?"→":"←"}</button>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"14px 8px", display:"flex", flexDirection:"column", gap:2, overflowY:"auto" }}>
          {NAV.map(item => (
            <div key={item.to}>
              {item.divider && <div style={{ borderTop:"1px solid #1e2a3a", margin:"8px 0" }}/>}
              <NavLink to={item.to} end={item.end} className={({isActive})=>isActive?"nav-link-active":""} style={{ display:"block", textDecoration:"none" }}>
                <div className="nav-item" style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 11px", borderRadius:9, cursor:"pointer", color:"#6b7280", borderLeft:"2px solid transparent", transition:"all 0.15s", whiteSpace:"nowrap" }}>
                  <span style={{ fontSize:15, flexShrink:0 }}>{item.icon}</span>
                  {!col && <span style={{ fontSize:13, fontWeight:600 }}>{item.label}</span>}
                </div>
              </NavLink>
            </div>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding:"12px 10px", borderTop:"1px solid #1e2a3a" }}>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <div style={{ width:30, height:30, borderRadius:"50%", background:"linear-gradient(135deg,#4f46e5,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", flexShrink:0 }}>
              {user?.name?.split(" ").map(n=>n[0]).join("").slice(0,2)||"U"}
            </div>
            {!col && <div style={{ flex:1, minWidth:0 }}>
              <div style={{ color:"#e5e7eb", fontSize:12, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.name}</div>
              <div style={{ color:"#6b7280", fontSize:10, fontFamily:"'DM Mono',monospace" }}>{user?.role}</div>
            </div>}
          </div>
          {!col && <button onClick={handleLogout} style={{ width:"100%", marginTop:9, padding:"6px", background:"transparent", border:"1px solid #1e2a3a", borderRadius:7, cursor:"pointer", color:"#6b7280", fontSize:11, fontWeight:600, transition:"all 0.15s" }} onMouseEnter={e=>{e.target.style.borderColor="#ff5c5c";e.target.style.color="#ff5c5c"}} onMouseLeave={e=>{e.target.style.borderColor="#1e2a3a";e.target.style.color="#6b7280"}}>Sign Out</button>}
        </div>
      </aside>

      <main style={{ flex:1, overflow:"auto", minWidth:0 }}><Outlet/></main>
    </div>
  );
}
