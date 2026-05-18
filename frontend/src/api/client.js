import axios from "axios";
const BASE = "https://payaxis.onrender.com/api";

export const api = axios.create({ baseURL:BASE, timeout:30000 });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem("px_access");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  cfg.headers["Cache-Control"] = "no-cache";
  cfg.headers["Pragma"] = "no-cache";
  return cfg;
});

let _refreshing = false, _queue = [];
const flush = (err, token) => { _queue.forEach(p => err ? p.reject(err) : p.resolve(token)); _queue = []; };

api.interceptors.response.use(r => r, async err => {
  const orig = err.config;
  if (err.response?.status === 401 && err.response?.data?.code === "TOKEN_EXPIRED" && !orig._retry) {
    if (_refreshing) return new Promise((res,rej) => _queue.push({ resolve: t => { orig.headers.Authorization=`Bearer ${t}`; res(api(orig)); }, reject:rej }));
    orig._retry = true; _refreshing = true;
    try {
      const { data } = await axios.post(`${BASE}/auth/refresh`, { refreshToken: localStorage.getItem("px_refresh") });
      localStorage.setItem("px_access", data.data.access);
      localStorage.setItem("px_refresh", data.data.refresh);
      flush(null, data.data.access);
      orig.headers.Authorization = `Bearer ${data.data.access}`;
      return api(orig);
    } catch(e) { flush(e,null); localStorage.clear(); window.location.href="/login"; return Promise.reject(e); }
    finally { _refreshing = false; }
  }
  return Promise.reject(err);
});

export const authAPI     = { login:(b)=>api.post("/auth/login",b), logout:()=>api.post("/auth/logout"), refresh:(b)=>api.post("/auth/refresh",b) };
export const employeeAPI = { list:(p)=>api.get("/employees",{params:p}), get:(id)=>api.get(`/employees/${id}`), create:(b)=>api.post("/employees",b), update:(id,b)=>api.patch(`/employees/${id}`,b), revise:(id,b)=>api.post(`/employees/${id}/salary-revision`,b) };
export const payrollAPI  = { listRuns:(p)=>api.get("/payroll/runs",{params:p}), getRun:(id,p)=>api.get(`/payroll/runs/${id}`,{params:p}), trigger:(b)=>api.post("/payroll/runs",b), metrics:()=>api.get("/payroll/queue/metrics"), retry:(b)=>api.post("/payroll/retry",b), hold:(id,b)=>api.patch(`/payroll/records/${id}/hold`,b), deptReport:(p)=>api.get("/payroll/reports/department",{params:p}) };
export const essAPI      = { payslips:()=>api.get("/ess/payslips"), payslip:(m,y)=>api.get(`/ess/payslips/${m}/${y}`), declaration:(fy)=>api.get(`/ess/declarations/${fy}`), saveDecl:(b)=>api.post("/ess/declarations",b) };
export const auditAPI    = { list:(p)=>api.get("/audit",{params:p}) };
