import { useState } from "react";
import { employeeAPI } from "../api/client";

export default function SalaryModal({ emp, onClose, onSave }) {
  const [f, setF] = useState({
    annual_ctc: "",
    basic_percent: "0.5",
    monthly_basic: "",
    monthly_hra: "",
    special_allowance: ""
  });

  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  async function save() {
    try {
      await employeeAPI.revise(emp.id, {
        annual_ctc: Number(f.annual_ctc),
        basic_percent: Number(f.basic_percent),
        monthly_basic: Number(f.monthly_basic),
        monthly_hra: Number(f.monthly_hra),
        components: {
          special_allowance: Number(f.special_allowance || 0)
        }
      });

      onSave();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", justifyContent:"center", alignItems:"center" }}>
      <div style={{ width:400, background:"#0d1117", padding:20, borderRadius:10 }}>
        <h3 style={{ color:"#fff" }}>Add Salary - {emp.full_name}</h3>

        {[
          ["annual_ctc","Annual CTC"],
          ["basic_percent","Basic % (0.5 = 50%)"],
          ["monthly_basic","Monthly Basic"],
          ["monthly_hra","Monthly HRA"],
          ["special_allowance","Special Allowance"]
        ].map(([k,label]) => (
          <input
            key={k}
            placeholder={label}
            value={f[k]}
            onChange={e => set(k, e.target.value)}
            style={{ width:"100%", marginBottom:10, padding:8, background:"#111827", border:"1px solid #1e2a3a", color:"#fff" }}
          />
        ))}

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={save} style={{ background:"#34d97b", color:"#000" }}>Save</button>
        </div>
      </div>
    </div>
  );
}