// Reports.jsx
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const MONTHS = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const COLORS  = ["#34d97b","#6b9fff","#f0a500","#c084fc","#fb7185","#38bdf8","#a3e635"];
const fmtL = n => `₹${((n||0)/100000).toFixed(1)}L`;

const TREND = [
  {month:"Oct",gross:1680000,net:1420000,tds:142000},{month:"Nov",gross:1720000,net:1455000,tds:148000},
  {month:"Dec",gross:1810000,net:1530000,tds:162000},{month:"Jan",gross:1780000,net:1505000,tds:155000},
  {month:"Feb",gross:1820000,net:1538000,tds:163000},{month:"Mar",gross:1950000,net:1648000,tds:174000},
  {month:"Apr",gross:1843000,net:1598000,tds:161000},
];
const DEPT = [
  {department:"Engineering",headcount:58,gross_payout:9800000,net_payout:8280000,total_tds:980000},
  {department:"Product",    headcount:14,gross_payout:3080000,net_payout:2604000,total_tds:308000},
  {department:"Design",     headcount:12,gross_payout:1740000,net_payout:1479000,total_tds:174000},
  {department:"Finance",    headcount:10,gross_payout:1650000,net_payout:1402000,total_tds:165000},
  {department:"Sales",      headcount:22,gross_payout:1760000,net_payout:1496000,total_tds:176000},
  {department:"HR",         headcount: 8,gross_payout:1120000,net_payout: 952000,total_tds:112000},
];
const REGIME = [{name:"New Regime",value:108},{name:"Old Regime",value:34}];

const TT = ({active,payload,label}) => !active?null:(
  <div style={{background:"#111827",border:"1px solid #1e2a3a",borderRadius:8,padding:"10px 14px",fontSize:12}}>
    <div style={{color:"#9ca3af",marginBottom:5}}>{label}</div>
    {payload.map((p,i)=><div key={i} style={{color:p.color,marginBottom:2}}>{p.name}: <strong>{fmtL(p.value)}</strong></div>)}
  </div>
);

function Card({title,sub,children}) {
  return <div style={{background:"#0d1117",border:"1px solid #1e2a3a",borderRadius:14,padding:22}}>
    <div style={{marginBottom:16}}><div style={{color:"#e5e7eb",fontWeight:700,fontSize:14}}>{title}</div>{sub&&<div style={{color:"#6b7280",fontSize:12,marginTop:2}}>{sub}</div>}</div>
    {children}
  </div>;
}

export default function Reports() {
  const total = {gross:DEPT.reduce((s,d)=>s+d.gross_payout,0), net:DEPT.reduce((s,d)=>s+d.net_payout,0), tds:DEPT.reduce((s,d)=>s+d.total_tds,0), emp:DEPT.reduce((s,d)=>s+d.headcount,0)};
  return (
    <div style={{padding:"28px 32px",minHeight:"100vh"}}>
      <div style={{marginBottom:22}}><h1 style={{fontSize:22,fontWeight:800,color:"#f9fafb",letterSpacing:"-0.5px"}}>Reports</h1><div style={{color:"#6b7280",fontSize:13,marginTop:3}}>Payroll analytics — April 2025</div></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20}}>
        {[["Headcount",total.emp,"#6b9fff","👥"],["Gross",fmtL(total.gross),"#f0a500","💰"],["Net Paid",fmtL(total.net),"#34d97b","🏦"],["TDS",fmtL(total.tds),"#c084fc","📋"]].map(([l,v,c,i])=>(
          <div key={l} style={{background:"linear-gradient(135deg,#0d1117,#111827)",border:"1px solid #1e2a3a",borderRadius:14,padding:"18px 20px",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,right:0,width:80,height:80,background:`radial-gradient(circle at top right,${c}18 0%,transparent 70%)`}}/>
            <div style={{fontSize:20,marginBottom:8}}>{i}</div>
            <div style={{color:"#9ca3af",fontSize:10,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:5,fontFamily:"'DM Mono',monospace"}}>{l}</div>
            <div style={{color:c,fontSize:24,fontWeight:800,letterSpacing:"-0.5px"}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
        <Card title="Monthly Trend" sub="Last 7 months">
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={TREND} margin={{top:5,right:10,bottom:0,left:5}}>
              <XAxis dataKey="month" tick={{fill:"#6b7280",fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={fmtL} tick={{fill:"#6b7280",fontSize:10}} axisLine={false} tickLine={false} width={46}/>
              <Tooltip content={<TT/>}/>
              <Line type="monotone" dataKey="gross" stroke="#f0a500" strokeWidth={2.5} dot={false} name="Gross"/>
              <Line type="monotone" dataKey="net"   stroke="#34d97b" strokeWidth={2.5} dot={false} name="Net"/>
              <Line type="monotone" dataKey="tds"   stroke="#c084fc" strokeWidth={1.5} dot={false} name="TDS" strokeDasharray="4 2"/>
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Tax Regime Split">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={REGIME} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4}>
                {REGIME.map((_,i)=><Cell key={i} fill={COLORS[i]} strokeWidth={0}/>)}
              </Pie>
              <Tooltip formatter={v=>[`${v} employees`]} contentStyle={{background:"#111827",border:"1px solid #1e2a3a",borderRadius:8}}/>
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Card title="Dept Gross Payout">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={DEPT} margin={{top:5,right:5,bottom:0,left:5}} barSize={22}>
              <XAxis dataKey="department" tick={{fill:"#6b7280",fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={fmtL} tick={{fill:"#6b7280",fontSize:9}} axisLine={false} tickLine={false} width={38}/>
              <Tooltip content={<TT/>}/>
              <Bar dataKey="gross_payout" name="Gross" radius={[4,4,0,0]}>
                {DEPT.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Department Table">
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr>{["Dept","HC","Net","TDS"].map(h=><th key={h} style={{padding:"6px 8px",textAlign:"left",color:"#6b7280",fontWeight:600,fontSize:10,letterSpacing:"0.06em",textTransform:"uppercase",borderBottom:"1px solid #1e2a3a"}}>{h}</th>)}</tr></thead>
            <tbody>
              {DEPT.map((d,i)=>(
                <tr key={d.department} style={{borderBottom:"1px solid #111827"}}>
                  <td style={{padding:"8px 8px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:7,height:7,borderRadius:"50%",background:COLORS[i%COLORS.length]}}/><span style={{color:"#e5e7eb",fontWeight:600,fontSize:12}}>{d.department}</span></div></td>
                  <td style={{padding:"8px 8px",color:"#9ca3af",fontFamily:"'DM Mono',monospace"}}>{d.headcount}</td>
                  <td style={{padding:"8px 8px",color:"#34d97b",fontFamily:"'DM Mono',monospace"}}>{fmtL(d.net_payout)}</td>
                  <td style={{padding:"8px 8px",color:"#c084fc",fontFamily:"'DM Mono',monospace"}}>{fmtL(d.total_tds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
