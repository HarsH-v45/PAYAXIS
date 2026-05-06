import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/stores";
import Login          from "./pages/Login";
import AdminLayout    from "./components/AdminLayout";
import Dashboard      from "./pages/admin/Dashboard";
import PayrollRuns    from "./pages/admin/PayrollRuns";
import Employees      from "./pages/admin/Employees";
import Reports        from "./pages/admin/Reports";
import AuditLogs      from "./pages/admin/AuditLogs";
import ESSPortal      from "./pages/ess/ESSPortal";

function RequireAuth({ children, adminOnly=false }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace/>;
  if (adminOnly && user.role === "EMPLOYEE") return <Navigate to="/ess" replace/>;
  return children;
}
function RequireGuest({ children }) {
  const { user } = useAuthStore();
  if (user) return <Navigate to={user.role==="EMPLOYEE"?"/ess":"/admin"} replace/>;
  return children;
}

export default function App() {
  const { init } = useAuthStore();
  useEffect(() => init(), []);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<RequireGuest><Login/></RequireGuest>}/>
        <Route path="/admin" element={<RequireAuth adminOnly><AdminLayout/></RequireAuth>}>
          <Route index          element={<Dashboard/>}/>
          <Route path="payroll"   element={<PayrollRuns/>}/>
          <Route path="employees" element={<Employees/>}/>
          <Route path="reports"   element={<Reports/>}/>
          <Route path="audit"     element={<AuditLogs/>}/>
        </Route>
        <Route path="/ess" element={<RequireAuth><ESSPortal/></RequireAuth>}/>
        <Route path="/"   element={<Navigate to="/login" replace/>}/>
        <Route path="*"   element={<Navigate to="/login" replace/>}/>
      </Routes>
    </BrowserRouter>
  );
}
