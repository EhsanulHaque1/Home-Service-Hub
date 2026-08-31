import { useMemo, useState, useEffect } from "react";
import {
  Users,
  HardHat,
  ClipboardList,
  Star,
  CreditCard,
  Search,
  ArrowLeft,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Clock,
  Wrench,
  Menu,
  X,
  ChevronDown,
  MoreVertical,
  Download,
} from "lucide-react";
import { apiGet, fetchPaymentSummary } from "@/lib/api";

const tabs = [
  { id: 'all_users', label: 'Total Users', icon: Users },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'workers', label: 'Workers', icon: HardHat },
  { id: 'tasks', label: 'Tasks', icon: ClipboardList },
  { id: 'feedback', label: 'Feedback', icon: Star },
  { id: 'payments', label: 'Payments', icon: CreditCard },
];

const customers = [];

const workers = [];

const tasks = [];

const feedback = [];

const statusStyles = {
  Active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Inactive: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  Suspended: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  Available: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Busy: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Offline: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  "In Progress": "bg-sky-500/15 text-sky-300 border-sky-500/30",
  Scheduled: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  Completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Cancelled: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  Paid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Refunded: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  Failed: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  Complete: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  successfull: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  failed: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

const priorityStyles = {
  High: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  Medium: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Low: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

function Badge({ children, variant }) {
  const cls =
    statusStyles[variant] ||
    "bg-slate-500/15 text-slate-400 border-slate-500/30";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {children}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span
          className={`grid h-10 w-10 place-items-center rounded-xl ${accent}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-2xl font-700 text-white">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function StarRating({ rating }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= rating ? "fill-brand-400 text-brand-400" : "text-slate-600"}`}
        />
      ))}
      <span className="ml-1 text-xs text-slate-400">{rating.toFixed(1)}</span>
    </span>
  );
}

function Th({ children, className }) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 ${className || ""}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className }) {
  return (
    <td className={`px-4 py-3.5 text-sm text-slate-200 ${className || ""}`}>
      {children}
    </td>
  );
}

export default function AdminPanel({ onBack }) {
  const [tab, setTab] = useState('all_users');
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [summary, setSummary] = useState({ totalRevenue: 0, pendingPayments: 0 });
  const [rank, setRank] = useState('none');
  const [userRank, setUserRank] = useState('none');
  const [clientRank, setClientRank] = useState('none');
  const [workerRank, setWorkerRank] = useState('none');

  const [dbAllUsers, setDbAllUsers] = useState([]);
  const [dbClients, setDbClients] = useState([]);
  const [dbWorkers, setDbWorkers] = useState([]);
  const [userSummary, setUserSummary] = useState({ total_users: 0, total_clients: 0, total_workers: 0 });

  useEffect(() => {
    let active = true;
    setPaymentsLoading(true);
    Promise.all([apiGet(`/payments?rank=${rank}`), fetchPaymentSummary()])
      .then(([data, sum]) => {
        if (!active) return;
        setPayments(Array.isArray(data) ? data : []);
        const revenue =
          parseFloat(sum?.total_revenue ?? sum?.totalRevenue ?? 0) || 0;
        const pending =
          parseInt(sum?.pending_payments ?? sum?.pendingPayments ?? 0, 10) || 0;
        setSummary({ totalRevenue: revenue, pendingPayments: pending });
      })
      .catch(() => {
        if (active) {
          setPayments([]);
          setSummary({ totalRevenue: 0, pendingPayments: 0 });
        }
      })
      .finally(() => {
        if (active) setPaymentsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [rank]);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiGet(`/admin/users/all?rank=${userRank}`),
      apiGet(`/admin/users/clients?rank=${clientRank}`),
      apiGet(`/admin/users/workers?rank=${workerRank}`),
      apiGet('/admin/users/summary'),
    ])
      .then(([allData, clientData, workerData, sumData]) => {
        if (!active) return;
        setDbAllUsers(Array.isArray(allData) ? allData : []);
        setDbClients(Array.isArray(clientData) ? clientData : []);
        setDbWorkers(Array.isArray(workerData) ? workerData : []);
        if (sumData) {
          setUserSummary({
            total_users: sumData.total_users ?? 0,
            total_clients: sumData.total_clients ?? sumData.total_customers ?? 0,
            total_workers: sumData.total_workers ?? 0,
            tasks_given_users: sumData.tasks_given_users ?? 0,
            tasks_done_workers: sumData.tasks_done_workers ?? 0,
            completed_tasks: sumData.completed_tasks ?? 0,
          });
        }
      })
      .catch((err) => {
        console.error('Error fetching user stats:', err);
      });
    return () => {
      active = false;
    };
  }, [userRank, clientRank, workerRank]);

  const stats = useMemo(() => {
    const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
    const activeTasks = tasks.filter((t) => t.status === 'In Progress' || t.status === 'Scheduled').length;
    return {
      completedTasks,
      activeTasks,
      avgRating: (feedback.length > 0 ? feedback.reduce((s, f) => s + f.rating, 0) / feedback.length : 0).toFixed(1),
    };
  }, []);

  const filter = (rows, fields) =>
    rows.filter((r) =>
      fields.some((f) =>
        String(r[f] ?? "")
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    );

  const allUserRows = filter(dbAllUsers, ['id', 'name', 'email', 'phone', 'location', 'role', 'trade']);
  const clientRows = filter(dbClients, ['id', 'name', 'email', 'phone', 'location', 'role']);
  const workerRows = filter(dbWorkers, ['id', 'name', 'trade', 'phone', 'location']);
  const taskRows = filter(tasks, ['id', 'title', 'customer', 'worker', 'status']);
  const feedbackRows = filter(feedback, ['id', 'customer', 'worker', 'task', 'comment']);
  const paymentRows = filter(payments, ['paymentid', 'customer_name', 'worker_name', 'task_title', 'status']);

  return (
    <div className="flex min-h-screen bg-ink-950 text-slate-200">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed inset-y-0 left-0 z-50 w-64 border-r border-white/10 bg-ink-900/95 backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-ink-950">
              <Wrench className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span className="font-display text-sm font-700 text-white">
              Admin<span className="text-brand-400">Hub</span>
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  setSidebarOpen(false);
                  setSearch("");
                }}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active
                  ? 'border border-brand-400/30 bg-brand-500/10 text-white'
                  : 'border border-transparent text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-brand-400" : ""}`} />
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto p-3">
          <button
            onClick={onBack}
            className="flex w-full items-center gap-3 rounded-xl border border-white/10 px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:border-brand-400/40 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to site
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-white/10 bg-ink-900/60 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <h1 className="font-display text-lg font-700 capitalize text-white">
                {tabs.find((t) => t.id === tab)?.label}
              </h1>
              <p className="text-xs text-slate-500">
                {tab === 'all_users' && `${allUserRows.length} total users`}
                {tab === 'clients' && `${clientRows.length} clients`}
                {tab === 'workers' && `${workerRows.length} workers`}
                {tab === 'tasks' && `${taskRows.length} tasks`}
                {tab === 'feedback' && `${feedbackRows.length} reviews`}
                {tab === 'payments' && `${paymentRows.length} transactions`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-ink-850 px-3 py-2 sm:flex">
              <Search className="h-4 w-4 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-40 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-ink-950">
                AD
              </span>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-white">Admin</p>
                <p className="text-xs text-slate-500">Super user</p>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-slate-500 sm:block" />
            </div>
          </div>
        </header>

        {/* Scrollable area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Stats row */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
            <StatCard icon={Users} label="Total Users" value={userSummary.total_users ?? 0} sub="All accounts" accent="bg-indigo-500/15 text-indigo-300" />
            <StatCard icon={Users} label="Clients" value={userSummary.total_clients ?? 0} sub="Client accounts" accent="bg-sky-500/15 text-sky-300" />
            <StatCard icon={HardHat} label="Workers" value={userSummary.total_workers ?? 0} sub="Service providers" accent="bg-teal-500/15 text-teal-300" />
            <StatCard icon={ClipboardList} label="Tasks Given" value={userSummary.tasks_given_users ?? 0} sub="By clients" accent="bg-amber-500/15 text-amber-300" />
            <StatCard icon={CheckCircle2} label="Tasks Done" value={userSummary.tasks_done_workers ?? 0} sub="By workers" accent="bg-emerald-500/15 text-emerald-300" />
            <StatCard icon={DollarSign} label="Total Revenue" value={`$${Number(summary.totalRevenue || 0).toLocaleString()}`} sub="From paid invoices" accent="bg-brand-500/15 text-brand-300" />
          </div>

          {/* Mobile search */}
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-ink-850 px-3 py-2.5 sm:hidden">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
            />
          </div>

          {/* Tables */}
          <div className="card overflow-hidden">
            {tab === 'all_users' && (
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/5">
                <span className="text-sm font-semibold text-white">Total Users Directory</span>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400">Rank Filter:</label>
                  <select
                    value={userRank}
                    onChange={(e) => setUserRank(e.target.value)}
                    className="rounded-lg border border-white/10 bg-ink-900 px-2 py-1 text-xs text-white outline-none"
                  >
                    <option value="none">All</option>
                    <option value="1st">1st (Top Latest)</option>
                    <option value="2nd">2nd</option>
                    <option value="3rd">3rd</option>
                  </select>
                </div>
              </div>
            )}

            {tab === 'clients' && (
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/5">
                <span className="text-sm font-semibold text-white">Clients Directory</span>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400">Top Spent Rank:</label>
                  <select
                    value={clientRank}
                    onChange={(e) => setClientRank(e.target.value)}
                    className="rounded-lg border border-white/10 bg-ink-900 px-2 py-1 text-xs text-white outline-none"
                  >
                    <option value="none">All Clients</option>
                    <option value="1st">1st (Highest Spent)</option>
                    <option value="2nd">2nd (Highest Spent)</option>
                    <option value="3rd">3rd (Highest Spent)</option>
                  </select>
                </div>
              </div>
            )}

            {tab === 'workers' && (
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/5">
                <span className="text-sm font-semibold text-white">Workers Directory</span>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400">Top Earned Rank:</label>
                  <select
                    value={workerRank}
                    onChange={(e) => setWorkerRank(e.target.value)}
                    className="rounded-lg border border-white/10 bg-ink-900 px-2 py-1 text-xs text-white outline-none"
                  >
                    <option value="none">All Workers</option>
                    <option value="1st">1st (Highest Earned)</option>
                    <option value="2nd">2nd (Highest Earned)</option>
                    <option value="3rd">3rd (Highest Earned)</option>
                  </select>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              {tab === 'all_users' && (
                <table className="w-full min-w-[760px]">
                  <thead className="border-b border-white/10 bg-white/5">
                    <tr>
                      <Th>User</Th><Th>Role</Th><Th>Contact</Th><Th>Location</Th><Th>Trade / Skill</Th><Th>Tasks</Th><Th>Volume</Th><Th>Joined</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {allUserRows.map((u) => (
                      <tr key={u.id} className="transition-colors hover:bg-white/5">
                        <Td>
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-bold text-ink-950">
                              {u.name ? u.name.split(' ').map((n) => n[0]).join('') : 'U'}
                            </span>
                            <div>
                              <p className="font-medium text-white">{u.name}</p>
                              <p className="text-xs text-slate-500">#{u.id}</p>
                            </div>
                          </div>
                        </Td>
                        <Td>
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${u.role === 'admin'
                            ? 'border-purple-500/30 bg-purple-500/15 text-purple-300'
                            : u.role === 'worker'
                              ? 'border-teal-500/30 bg-teal-500/15 text-teal-300'
                              : 'border-sky-500/30 bg-sky-500/15 text-sky-300'
                            }`}>
                            {u.role || 'client'}
                          </span>
                        </Td>
                        <Td>
                          <p className="text-slate-300">{u.email}</p>
                          <p className="text-xs text-slate-500">{u.phone || 'N/A'}</p>
                        </Td>
                        <Td>{u.location || 'N/A'}</Td>
                        <Td className="text-slate-300">{u.trade || '—'}</Td>
                        <Td>
                          <span className="text-xs text-slate-300">
                            {u.role === 'worker' ? `${u.total_tasks_done || 0} Done` : `${u.total_tasks_given || 0} Given`}
                          </span>
                        </Td>
                        <Td className="font-semibold text-white">
                          ${Number(u.role === 'worker' ? (u.total_earned || 0) : (u.total_spent || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Td>
                        <Td className="text-slate-400">{u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === 'clients' && (
                <table className="w-full min-w-[700px]">
                  <thead className="border-b border-white/10 bg-white/5">
                    <tr>
                      <Th>Client</Th><Th>Contact</Th><Th>Location</Th><Th>Tasks Given</Th><Th>Total Spent</Th><Th>Joined</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {clientRows.map((c) => (
                      <tr key={c.id} className="transition-colors hover:bg-white/5">
                        <Td>
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-sky-700 text-xs font-bold text-ink-950">
                              {c.name ? c.name.split(' ').map((n) => n[0]).join('') : 'U'}
                            </span>
                            <div>
                              <p className="font-medium text-white">{c.name}</p>
                              <p className="text-xs text-slate-500">#{c.id}</p>
                            </div>
                          </div>
                        </Td>
                        <Td>
                          <p className="text-slate-300">{c.email}</p>
                          <p className="text-xs text-slate-500">{c.phone || 'N/A'}</p>
                        </Td>
                        <Td>{c.location || 'N/A'}</Td>
                        <Td>
                          <span className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/15 px-2.5 py-0.5 text-xs font-medium text-sky-300">
                            {c.total_tasks_given || 0} Tasks
                          </span>
                        </Td>
                        <Td className="font-semibold text-white">
                          ${Number(c.total_spent || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Td>
                        <Td className="text-slate-400">{c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === 'workers' && (
                <table className="w-full min-w-[720px]">
                  <thead className="border-b border-white/10 bg-white/5">
                    <tr>
                      <Th>Worker</Th><Th>Trade / Skill</Th><Th>Contact</Th><Th>Location</Th><Th>Tasks Done</Th><Th>Total Earned</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {workerRows.map((w) => (
                      <tr
                        key={w.id}
                        className="transition-colors hover:bg-white/5"
                      >
                        <Td>
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-xs font-bold text-ink-950">
                              {w.name ? w.name.split(' ').map((n) => n[0]).join('') : 'W'}
                            </span>
                            <div>
                              <p className="font-medium text-white">{w.name}</p>
                              <p className="text-xs text-slate-500">#{w.id}</p>
                            </div>
                          </div>
                        </Td>
                        <Td className="text-slate-300">
                          <span className="inline-flex items-center rounded-full border border-teal-500/30 bg-teal-500/15 px-2.5 py-0.5 text-xs font-medium text-teal-300">
                            {w.trade || 'Worker'}
                          </span>
                        </Td>
                        <Td>
                          <p className="text-slate-300">{w.email}</p>
                          <p className="text-xs text-slate-500">{w.phone || 'N/A'}</p>
                        </Td>
                        <Td>{w.location || 'N/A'}</Td>
                        <Td>
                          <span className="inline-flex items-center rounded-full border border-teal-500/30 bg-teal-500/15 px-2.5 py-0.5 text-xs font-medium text-teal-300">
                            {w.total_tasks_done || 0} Done
                          </span>
                        </Td>
                        <Td className="font-semibold text-emerald-400">
                          ${Number(w.total_earned || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === "tasks" && (
                <table className="w-full min-w-[720px]">
                  <thead className="border-b border-white/10 bg-white/5">
                    <tr>
                      <Th>Task</Th>
                      <Th>Customer</Th>
                      <Th>Worker</Th>
                      <Th>Priority</Th>
                      <Th>Status</Th>
                      <Th>Due</Th>
                      <Th>Price</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {taskRows.map((t) => (
                      <tr
                        key={t.id}
                        className="transition-colors hover:bg-white/5"
                      >
                        <Td>
                          <p className="font-medium text-white">{t.title}</p>
                          <p className="text-xs text-slate-500">{t.id}</p>
                        </Td>
                        <Td className="text-slate-300">{t.customer}</Td>
                        <Td className="text-slate-300">{t.worker}</Td>
                        <Td>
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${priorityStyles[t.priority]}`}
                          >
                            {t.priority}
                          </span>
                        </Td>
                        <Td>
                          <Badge variant={t.status}>{t.status}</Badge>
                        </Td>
                        <Td className="text-slate-400">{t.due}</Td>
                        <Td className="font-semibold text-white">{t.price}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === "feedback" && (
                <table className="w-full min-w-[640px]">
                  <thead className="border-b border-white/10 bg-white/5">
                    <tr>
                      <Th>Review</Th>
                      <Th>Customer</Th>
                      <Th>Worker</Th>
                      <Th>Rating</Th>
                      <Th>Date</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {feedbackRows.map((f) => (
                      <tr
                        key={f.id}
                        className="transition-colors hover:bg-white/5"
                      >
                        <Td>
                          <p className="max-w-xs text-slate-300">{f.comment}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {f.task} · {f.id}
                          </p>
                        </Td>
                        <Td className="text-slate-300">{f.customer}</Td>
                        <Td className="text-slate-300">{f.worker}</Td>
                        <Td>
                          <StarRating rating={f.rating} />
                        </Td>
                        <Td className="text-slate-400">{f.date}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === "payments" && (
                <>
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Top by amount:</span>
                    {['none', '1st', '2nd', '3rd'].map((r) => (
                      <label
                        key={r}
                        className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${rank === r
                          ? 'border-brand-400/50 bg-brand-500/15 text-brand-300'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                          }`}
                      >
                        <input
                          type="radio"
                          name="payment-rank"
                          value={r}
                          checked={rank === r}
                          onChange={() => setRank(r)}
                          className="h-3.5 w-3.5 accent-brand-500"
                        />
                        {r === 'none' ? 'None' : r.toUpperCase()}
                      </label>
                    ))}
                  </div>

                  <table className="w-full min-w-[760px]">
                    <thead className="border-b border-white/10 bg-white/5">
                      <tr>
                        <Th>Payment</Th><Th>Customer</Th><Th>Worker</Th><Th>Task</Th><Th>Amount</Th><Th>Status</Th><Th>Date</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {paymentsLoading ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                            Loading payments…
                          </td>
                        </tr>
                      ) : paymentRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                            No payments yet.
                          </td>
                        </tr>
                      ) : (
                        paymentRows.map((p) => (
                          <tr key={p.paymentid} className="transition-colors hover:bg-white/5">
                            <Td>
                              <p className="font-medium text-white">#{p.paymentid}</p>
                            </Td>
                            <Td className="text-slate-300">{p.customer_name || '—'}</Td>
                            <Td className="text-slate-300">{p.worker_name || '—'}</Td>
                            <Td className="text-slate-300">{p.task_title || '—'}</Td>
                            <Td className="font-semibold text-white">
                              ${Number(p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Td>
                            <Td><Badge variant={p.status}>{p.status}</Badge></Td>
                            <Td className="text-slate-400">
                              {p.paymentdate ? new Date(p.paymentdate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </Td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>

          {/* Export bar */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing{" "}
              {tab === "all_users"
                ? allUserRows.length
                : tab === "clients"
                  ? clientRows.length
                  : tab === "workers"
                    ? workerRows.length
                    : tab === "tasks"
                      ? taskRows.length
                      : tab === "feedback"
                        ? feedbackRows.length
                        : paymentRows.length}{" "}
              records
            </p>
            <button className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-brand-400/40 hover:text-white">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
