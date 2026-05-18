// Reports.jsx
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const MONTHS = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const COLORS  = ["#34d97b","#6b9fff","#f0a500","#c084fc","#fb7185","#38bdf8","#a3e635"];
const fmtL = n => `₹${((n||0)/100000).toFixed(1)}L`;


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
const [stats, setStats] = useState(null);
const [trend, setTrend] = useState([]);
const [dept, setDept] = useState([]);
const [regime, setRegime] = useState([]);

useEffect(() => {
  fetch("http://localhost:4000/api/reports/summary")
    .then(res => res.json())
    .then(data => {
      setStats(data.data.stats);
      setTrend(data.data.trend);
      setDept(data.data.departments);
      setRegime(data.data.regime);
    })
    .catch(console.error);
}, []);

  return (
  <div style={{padding:"28px 32px",minHeight:"100vh"}}>

    <div style={{marginBottom:22}}>
      <h1 style={{fontSize:22,fontWeight:800,color:"#f9fafb"}}>
        Reports
      </h1>

      <div style={{color:"#6b7280",fontSize:13}}>
        Payroll analytics
      </div>
    </div>

    {/* Top Stats */}
    <div style={{
      display:"grid",
      gridTemplateColumns:"repeat(4,1fr)",
      gap:14,
      marginBottom:20
    }}>

      {[
        ["Headcount", stats?.headcount || 0, "#6b9fff", "👥"],
        ["Gross", fmtL(stats?.gross || 0), "#f0a500", "💰"],
        ["Net Paid", fmtL(stats?.net || 0), "#34d97b", "🏦"],
        ["TDS", fmtL(stats?.tds || 0), "#c084fc", "📋"]
      ].map(([l,v,c,i]) => (

        <div key={l}
          style={{
            background:"linear-gradient(135deg,#0d1117,#111827)",
            border:"1px solid #1e2a3a",
            borderRadius:14,
            padding:"18px 20px"
          }}
        >

          <div style={{fontSize:20,marginBottom:8}}>
            {i}
          </div>

          <div style={{
            color:"#9ca3af",
            fontSize:10,
            textTransform:"uppercase"
          }}>
            {l}
          </div>

          <div style={{
            color:c,
            fontSize:24,
            fontWeight:800
          }}>
            {v}
          </div>

        </div>
      ))}
    </div>

    {/* Monthly Trend */}
    <Card title="Monthly Trend">

      <ResponsiveContainer width="100%" height={250}>

        <LineChart data={trend}>

          <XAxis
            dataKey="month"
            tick={{fill:"#6b7280"}}
          />

          <YAxis
            tickFormatter={fmtL}
            tick={{fill:"#6b7280"}}
          />

          <Tooltip content={<TT/>}/>

          <Line
            type="monotone"
            dataKey="gross"
            stroke="#f0a500"
            strokeWidth={2}
          />

          <Line
            type="monotone"
            dataKey="net"
            stroke="#34d97b"
            strokeWidth={2}
          />

        </LineChart>

      </ResponsiveContainer>

    </Card>
    <div style={{
  marginTop:20,
  display:"grid",
  gridTemplateColumns:"1fr 1fr",
  gap:20
}}>

  {/* Tax Regime Pie Chart */}
  <Card title="Tax Regime Split">

    <ResponsiveContainer width="100%" height={300}>

      <PieChart>

        <Pie
          data={regime}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          innerRadius={60}
          label={({name,value}) => `${name}: ${value}`}
        >

          {regime.map((entry, index) => (
            <Cell
              key={index}
              fill={COLORS[index % COLORS.length]}
            />
          ))}

        </Pie>

        <Tooltip />

      </PieChart>

    </ResponsiveContainer>

  </Card>

</div>

  </div>
);
}
