import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/stores";

export default function Login() {
  const [email, setEmail]     = useState("");
  const [pass,  setPass]      = useState("");
  const [show,  setShow]      = useState(false);
  const { login, loading, error } = useAuthStore();
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    try {
      const user = await login(email, pass);
      navigate(user.role === "EMPLOYEE" ? "/ess" : "/admin");
    } catch {}
  }

  return (
    <div style={{ minHeight:"100vh", background:"#060a10", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
      <style>{`
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-18px)}}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Background glows */}
      <div style={{ position:"absolute", top:"-15%", right:"-8%", width:500, height:500, background:"radial-gradient(circle, rgba(52,217,123,0.09) 0%, transparent 70%)", animation:"float 9s ease-in-out infinite", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", bottom:"-10%", left:"-5%", width:420, height:420, background:"radial-gradient(circle, rgba(107,159,255,0.07) 0%, transparent 70%)", animation:"float 12s ease-in-out infinite reverse", pointerEvents:"none" }}/>
      <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.035, pointerEvents:"none" }}>
        <defs><pattern id="g" width="56" height="56" patternUnits="userSpaceOnUse"><path d="M56 0L0 0 0 56" fill="none" stroke="#34d97b" strokeWidth="0.5"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
      </svg>

      <div style={{ width:"100%", maxWidth:420, padding:"0 20px", animation:"fadeUp 0.45s ease" }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ width:54, height:54, borderRadius:16, margin:"0 auto 14px", background:"linear-gradient(135deg,#059669,#34d97b)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, fontWeight:900, color:"#fff", boxShadow:"0 0 36px rgba(52,217,123,0.4)" }}>P</div>
          <h1 style={{ fontSize:26, fontWeight:800, color:"#f9fafb", letterSpacing:"-0.7px", marginBottom:5 }}>PayAxis</h1>
          <p style={{ color:"#6b7280", fontSize:13 }}>HRMS &amp; Payroll Platform</p>
        </div>

        {/* Card */}
        <div style={{ background:"linear-gradient(145deg,#0d1117,#111827)", border:"1px solid #1e2a3a", borderRadius:20, padding:"34px 34px 30px", boxShadow:"0 24px 60px rgba(0,0,0,0.55)" }}>
          <h2 style={{ fontSize:19, fontWeight:700, color:"#f9fafb", marginBottom:4 }}>Welcome back</h2>
          <p style={{ color:"#6b7280", fontSize:13, marginBottom:26 }}>Sign in to continue</p>

          {error && (
            <div style={{ background:"#2a0a0a", border:"1px solid #ff5c5c44", borderRadius:9, padding:"10px 13px", marginBottom:18, color:"#ff5c5c", fontSize:13 }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={submit}>
            {/* Email */}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", color:"#9ca3af", fontSize:11, fontWeight:600, marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" }}>Email</label>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com"
                style={{ width:"100%", padding:"11px 13px", background:"#0d1117", border:"1px solid #1e2a3a", borderRadius:9, color:"#e5e7eb", fontSize:13, outline:"none", transition:"border-color 0.15s" }}
                onFocus={e=>e.target.style.borderColor="#34d97b"} onBlur={e=>e.target.style.borderColor="#1e2a3a"}/>
            </div>

            {/* Password */}
            <div style={{ marginBottom:24 }}>
              <label style={{ display:"block", color:"#9ca3af", fontSize:11, fontWeight:600, marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" }}>Password</label>
              <div style={{ position:"relative" }}>
                <input type={show?"text":"password"} required value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••"
                  style={{ width:"100%", padding:"11px 40px 11px 13px", background:"#0d1117", border:"1px solid #1e2a3a", borderRadius:9, color:"#e5e7eb", fontSize:13, outline:"none", transition:"border-color 0.15s" }}
                  onFocus={e=>e.target.style.borderColor="#34d97b"} onBlur={e=>e.target.style.borderColor="#1e2a3a"}/>
                <button type="button" onClick={()=>setShow(!show)} style={{ position:"absolute", right:11, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#6b7280", fontSize:15 }}>
                  {show?"🙈":"👁"}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ width:"100%", padding:"12px", background:loading?"#1e2a3a":"linear-gradient(135deg,#059669,#34d97b)", border:"none", borderRadius:9, cursor:loading?"wait":"pointer", color:loading?"#6b7280":"#fff", fontWeight:700, fontSize:14, boxShadow:loading?"none":"0 0 22px rgba(52,217,123,0.35)", transition:"all 0.2s" }}>
              {loading ? <span>⟳ Signing in…</span> : "Sign In"}
            </button>
          </form>
        </div>

        <p style={{ textAlign:"center", color:"#374151", fontSize:11, marginTop:20 }}>
          
        </p>
      </div>
    </div>
  );
}
