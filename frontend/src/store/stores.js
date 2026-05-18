import { create } from "zustand";
import { authAPI, payrollAPI, employeeAPI } from "../api/client";

// ── Auth Store ────────────────────────────────────────────────────
export const useAuthStore = create((set, get) => ({
  user: null, loading: false, error: null,
  init() {
    try { const u = localStorage.getItem("px_user"); if (u) set({ user: JSON.parse(u) }); } catch {}
  },
  async login(email, password) {
    set({ loading:true, error:null });
    try {
      const { data } = await authAPI.login({ email, password });
      const { access, refresh, user } = data.data;
      localStorage.setItem("px_access", access);
      localStorage.setItem("px_refresh", refresh);
      localStorage.setItem("px_user", JSON.stringify(user));
      set({ user, loading:false });
      return user;
    } catch(e) {
      const msg = e.response?.data?.message || "Login failed";
      set({ error:msg, loading:false });
      throw new Error(msg);
    }
  },
  async logout() {
    try { await authAPI.logout(); } catch {}
    localStorage.clear();
    set({ user:null });
  },
  can(perm) {
    const L = { SUPER_ADMIN:50, ADMIN:40, HR_MANAGER:30, FINANCE:20, EMPLOYEE:10 };
    const P = { "payroll:run":30,"payroll:view_all":30,"payroll:hold":40,"employee:create":30,"employee:update":30,"salary:revise":40,"report:payroll":20,"report:audit":40 };
    return (L[get().user?.role]||0) >= (P[perm]||999);
  },
  isAdmin() { return ["SUPER_ADMIN","ADMIN","HR_MANAGER"].includes(get().user?.role); },
}));

// ── Payroll Store ─────────────────────────────────────────────────
export const usePayrollStore = create((set, get) => ({
  runs:[], records:[], summary:null, metrics:null, loading:false, currentRunId:null,
  async fetchRuns() {
    set({ loading:true });
    try { const {data}=await payrollAPI.listRuns(); set({ runs:data.data, loading:false }); }
    catch(e) { set({ loading:false }); }
  },
  async fetchRun(id, params) {
    set({ loading:true, currentRunId:id });
    try { const {data}=await payrollAPI.getRun(id,params); set({ summary:data.data.summary, records:data.data.records, loading:false }); }
    catch(e) { set({ loading:false }); }
  },
  async trigger(month, year) {
    set({ loading:true });
    try { const {data}=await payrollAPI.trigger({month,year}); await get().fetchRuns(); return data.data; }
    finally { set({ loading:false }); }
  },
  async fetchMetrics() {
    try { const {data}=await payrollAPI.metrics(); set({ metrics:data.data }); } catch {}
  },
  async retry(employeeId, month, year) {
    await payrollAPI.retry({employeeId,month,year});
    const id = get().currentRunId;
    if (id) await get().fetchRun(id);
  },
}));

// ── Employee Store ────────────────────────────────────────────────
export const useEmployeeStore = create((set) => ({
  employees:[], selected:null, loading:false,
  async fetchAll(params) {
    set({ loading:true });
    try { const {data}=await employeeAPI.list(params); set({ employees:data.data, loading:false }); }
    catch { set({ loading:false }); }
  },
  async fetchOne(id) {
    set({ loading:true });
    try { const {data}=await employeeAPI.get(id); set({ selected:data.data, loading:false }); return data.data; }
    finally { set({ loading:false }); }
  },
}));
