import { useState } from "react";
import { employeeAPI } from "../api/client";

export default function SalaryModal({ emp, onClose, onSave }) {
  const [f, setF] = useState({
    annual_ctc:     "",
    basic_percent:  "0.40",
    monthly_hra:    "",
  });
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState("");
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  // Preview computed values
  const monthly      = f.annual_ctc ? Math.round(Number(f.annual_ctc) / 12) : 0;
  const basicPct     = Number(f.basic_percent) || 0.40;
  const basicAmt     = Math.round(monthly * basicPct);
  const hraAmt       = Number(f.monthly_hra) || 0;
  const saAmt        = Math.max(0, monthly - basicAmt - hraAmt); // remainder

  async function save() {
    setError("");
    const ctc = Number(f.annual_ctc);
    if (!ctc || ctc <= 0) { setError("Annual CTC is required and must be positive"); return; }
    if (basicPct <= 0 || basicPct > 1) { setError("Basic % must be between 0 and 1 (e.g. 0.40 for 40%)"); return; }

    setLoading(true);
    try {
      // BUG FIX K: Build a proper components array so the tax engine includes
      // Basic and HRA in gross pay. Previously this was a plain object {special_allowance: N}
      // which caused basic and HRA to be entirely missing from all pay calculations.
      const components = [
        {
          code: "BASIC", label: "Basic Salary",
          type: "percent_of_ctc", rate: basicPct,
          taxable: true, pf: true,               // pf:true ensures PF is calculated on basic
        },
        ...(hraAmt > 0 ? [{
          code: "HRA", label: "House Rent Allowance",
          type: "fixed", monthly: hraAmt,
          taxable: true, pf: false,
        }] : []),
        {
          code: "SA", label: "Special Allowance",
          type: "remainder",                      // gets what's left after basic + HRA
          taxable: true, pf: false,
        },
      ];

      await employeeAPI.revise(emp.id, {
        annual_ctc:    ctc,
        basic_percent: basicPct,   // BUG FIX K: route now accepts basic_percent (snake_case)
        monthly_hra:   hraAmt,     // BUG FIX K: now stored so HRA exemption in TDS works
        components,
      });
      onSave();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to save salary structure. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inp = (k, label, placeholder, help) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display:"block", color:"#9ca3af", fontSize:11, fontWeight:600, marginBottom:5, letterSpacing:"0.06em", textTransform:"uppercase" }}>{label}</label>
      <input
        placeholder={placeholder}
        value={f[k]}
        onChange={e => set(k, e.target.value)}
        style={{ width:"100%", padding:"9px 12px", background:"#111827", border:"1px solid #1e2a3a", borderRadius:8, color:"#e5e7eb", fontSize:13, outline:"none" }}
      />
      {help && <div style={{ color:"#4b5563", fontSize:11, marginTop:4 }}>{help}</div>}
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", backdropFilter:"blur(4px)", display:"flex", justifyContent:"center", alignItems:"center", zIndex:300 }} onClick={onClose}>
      <div style={{ width:430, background:"#0d1117", padding:26, borderRadius:14, border:"1px solid #1e2a3a" }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div>
            <div style={{ color:"#f9fafb", fontSize:16, fontWeight:700 }}>Set Salary Structure</div>
            <div style={{ color:"#6b7280", fontSize:12, marginTop:2 }}>{emp.full_name}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#6b7280", fontSize:18 }}>✕</button>
        </div>

        {inp("annual_ctc",    "Annual CTC (₹)",       "e.g. 1200000")}
        {inp("basic_percent", "Basic % of CTC",        "e.g. 0.40 for 40%", "Basic salary as a fraction of CTC (0.30 – 0.50 is typical)")}
        {inp("monthly_hra",   "Monthly HRA (₹)",       "e.g. 16000", "Leave blank to compute automatically")}

        {/* Live preview */}
        {monthly > 0 && (
          <div style={{ background:"rgba(52,217,123,0.06)", border:"1px solid rgba(52,217,123,0.15)", borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
            <div style={{ color:"#34d97b", fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8, fontFamily:"monospace" }}>Breakdown Preview</div>
            {[
              ["Monthly CTC",   `₹${monthly.toLocaleString("en-IN")}`,  "#f0a500"],
              ["Basic",         `₹${basicAmt.toLocaleString("en-IN")}`, "#6b9fff"],
              ["HRA",           `₹${hraAmt.toLocaleString("en-IN")}`,   "#c084fc"],
              ["Special Allow", `₹${saAmt.toLocaleString("en-IN")}`,    "#34d97b"],
            ].map(([l,v,c]) => (
              <div key={l} style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ color:"#6b7280", fontSize:12 }}>{l}</span>
                <span style={{ color:c, fontWeight:700, fontSize:12, fontFamily:"monospace" }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div style={{ color:"#f87171", fontSize:12, marginBottom:12, padding:"8px 12px", background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.2)", borderRadius:8 }}>
            {error}
          </div>
        )}

        <div style={{ display:"flex", gap:10, marginTop:4 }}>
          <button onClick={onClose} style={{ flex:1, padding:"10px", background:"transparent", border:"1px solid #1e2a3a", borderRadius:8, color:"#6b7280", cursor:"pointer", fontWeight:600 }}>Cancel</button>
          <button onClick={save} disabled={loading} style={{ flex:2, padding:"10px", background:"linear-gradient(135deg,#059669,#34d97b)", border:"none", borderRadius:8, color:"#fff", cursor:"pointer", fontWeight:700, opacity:loading?0.7:1 }}>
            {loading ? "Saving…" : "Save Salary Structure"}
          </button>
        </div>
      </div>
    </div>
  );
}
