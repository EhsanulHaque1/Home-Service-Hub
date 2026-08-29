import { useMemo, useState, useEffect } from 'react';
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
} from 'lucide-react';
import { apiGet, fetchPaymentSummary } from '@/lib/api';

const tabs = [
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'workers', label: 'Workers', icon: HardHat },
  { id: 'tasks', label: 'Tasks', icon: ClipboardList },
  { id: 'feedback', label: 'Feedback', icon: Star },
  { id: 'payments', label: 'Payments', icon: CreditCard },
];

const customers = [
  { id: 'C-1042', name: 'Sarah Chen', email: 'sarah.chen@email.com', phone: '+1 (415) 555-0142', tasks: 7, spent: '$1,240', status: 'Active', joined: 'Jan 12, 2026' },
  { id: 'C-1043', name: 'Marcus Reed', email: 'marcus.r@email.com', phone: '+1 (628) 555-0198', tasks: 3, spent: '$520', status: 'Active', joined: 'Feb 03, 2026' },
  { id: 'C-1044', name: 'Aisha Bello', email: 'aisha.b@email.com', phone: '+1 (510) 555-0177', tasks: 12, spent: '$2,890', status: 'Active', joined: 'Nov 22, 2025' },
  { id: 'C-1045', name: 'David Kim', email: 'd.kim@email.com', phone: '+1 (408) 555-0123', tasks: 0, spent: '$0', status: 'Inactive', joined: 'Aug 14, 2026' },
  { id: 'C-1046', name: 'Elena Rossi', email: 'elena.rossi@email.com', phone: '+1 (917) 555-0156', tasks: 5, spent: '$870', status: 'Active', joined: 'Mar 30, 2026' },
  { id: 'C-1047', name: 'Tom Walsh', email: 'tom.walsh@email.com', phone: '+1 (718) 555-0189', tasks: 2, spent: '$310', status: 'Suspended', joined: 'Jul 01, 2026' },
];

const workers = [
  { id: 'W-201', name: 'Diego Torres', trade: 'Electrician', rating: 4.8, tasksDone: 142, earned: '$18,450', status: 'Available', joined: 'Oct 05, 2025' },
  { id: 'W-202', name: 'Lena Park', trade: 'Painter', rating: 4.7, tasksDone: 98, earned: '$12,200', status: 'Busy', joined: 'Nov 18, 2025' },
  { id: 'W-203', name: 'James Okafor', trade: 'Plumber', rating: 4.9, tasksDone: 210, earned: '$26,800', status: 'Available', joined: 'Sep 01, 2025' },
  { id: 'W-204', name: 'Priya Nair', trade: 'Cleaner', rating: 5.0, tasksDone: 175, earned: '$15,300', status: 'Available', joined: 'Dec 12, 2025' },
  { id: 'W-205', name: 'Carlos Mendez', trade: 'Carpenter', rating: 4.6, tasksDone: 64, earned: '$9,750', status: 'Offline', joined: 'Feb 20, 2026' },
  { id: 'W-206', name: 'Nina Petrova', trade: 'HVAC', rating: 4.8, tasksDone: 88, earned: '$11,900', status: 'Busy', joined: 'Jan 08, 2026' },
];

const tasks = [
  { id: 'T-5012', title: 'Kitchen sink replacement', customer: 'Sarah Chen', worker: 'James Okafor', status: 'In Progress', priority: 'High', due: 'Aug 29, 2026', price: '$320' },
  { id: 'T-5013', title: 'Living room painting', customer: 'Elena Rossi', worker: 'Lena Park', status: 'Scheduled', priority: 'Medium', due: 'Sep 02, 2026', price: '$580' },
  { id: 'T-5014', title: 'Deep house cleaning', customer: 'Aisha Bello', worker: 'Priya Nair', status: 'Completed', priority: 'Low', due: 'Aug 26, 2026', price: '$240' },
  { id: 'T-5015', title: 'Switchboard upgrade', customer: 'Marcus Reed', worker: 'Diego Torres', status: 'In Progress', priority: 'High', due: 'Aug 28, 2026', price: '$450' },
  { id: 'T-5016', title: 'Cabinet door repair', customer: 'Tom Walsh', worker: 'Carlos Mendez', status: 'Pending', priority: 'Low', due: 'Sep 05, 2026', price: '$190' },
  { id: 'T-5017', title: 'AC unit installation', customer: 'David Kim', worker: 'Nina Petrova', status: 'Cancelled', priority: 'Medium', due: 'Aug 25, 2026', price: '$0' },
  { id: 'T-5018', title: 'Bathroom tile work', customer: 'Aisha Bello', worker: 'Carlos Mendez', status: 'Scheduled', priority: 'Medium', due: 'Sep 08, 2026', price: '$720' },
];

const feedback = [
  { id: 'F-301', customer: 'Sarah Chen', worker: 'James Okafor', task: 'Kitchen sink replacement', rating: 5, comment: 'Fast, professional, and cleaned up afterward. Highly recommend!', date: 'Aug 27, 2026' },
  { id: 'F-302', customer: 'Elena Rossi', worker: 'Lena Park', task: 'Bedroom painting', rating: 4, comment: 'Great color matching, took a bit longer than expected but quality is solid.', date: 'Aug 24, 2026' },
  { id: 'F-303', customer: 'Aisha Bello', worker: 'Priya Nair', task: 'Deep house cleaning', rating: 5, comment: 'Spotless. Every corner was covered. Will book again.', date: 'Aug 26, 2026' },
  { id: 'F-304', customer: 'Marcus Reed', worker: 'Diego Torres', task: 'Switchboard upgrade', rating: 5, comment: 'Explained everything clearly. Very knowledgeable.', date: 'Aug 28, 2026' },
  { id: 'F-305', customer: 'Tom Walsh', worker: 'Carlos Mendez', task: 'Shelf installation', rating: 3, comment: 'Job was okay but arrived 45 minutes late without notice.', date: 'Aug 20, 2026' },
];



const statusStyles = {
  Active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Inactive: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  Suspended: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  Available: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Busy: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Offline: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  'In Progress': 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Scheduled: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  Completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Cancelled: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  Paid: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Refunded: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  Failed: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  Complete: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  successfull: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  failed: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

const priorityStyles = {
  High: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  Medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Low: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

function Badge({ children, variant }) {
  const cls = statusStyles[variant] || statusStyles[variant] || 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${accent}`}>
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
          className={`h-3.5 w-3.5 ${n <= rating ? 'fill-brand-400 text-brand-400' : 'text-slate-600'}`}
        />
      ))}
      <span className="ml-1 text-xs text-slate-400">{rating.toFixed(1)}</span>
    </span>
  );
}

function Th({ children, className }) {
  return (
    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 ${className || ''}`}>
      {children}
    </th>
  );
}

function Td({ children, className }) {
  return <td className={`px-4 py-3.5 text-sm text-slate-200 ${className || ''}`}>{children}</td>;
}

export default function AdminPanel({ onBack }) {
  const [tab, setTab] = useState('customers');
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [summary, setSummary] = useState({ totalRevenue: 0, pendingPayments: 0 });
  const [rank, setRank] = useState('none');

  useEffect(() => {
    let active = true;
    setPaymentsLoading(true);
    Promise.all([apiGet(`/payments?rank=${rank}`), fetchPaymentSummary()])
      .then(([data, sum]) => {
        if (!active) return;
        setPayments(Array.isArray(data) ? data : []);
        const revenue = parseFloat(sum?.total_revenue ?? sum?.totalRevenue ?? 0) || 0;
        const pending = parseInt(sum?.pending_payments ?? sum?.pendingPayments ?? 0, 10) || 0;
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

  const stats = useMemo(() => {
  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
  const activeTasks = tasks.filter((t) => t.status === 'In Progress' || t.status === 'Scheduled').length;
  return {
    completedTasks,
    activeTasks,
    avgRating: (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1),
  };
  }, []);

  const filter = (rows, fields) =>
    rows.filter((r) =>
      fields.some((f) => String(r[f] ?? '').toLowerCase().includes(search.toLowerCase())),
    );

  const customerRows = filter(customers, ['id', 'name', 'email', 'status']);
  const workerRows = filter(workers, ['id', 'name', 'trade', 'status']);
  const taskRows = filter(tasks, ['id', 'title', 'customer', 'worker', 'status']);
  const feedbackRows = filter(feedback, ['id', 'customer', 'worker', 'task', 'comment']);
  const paymentRows = filter(payments, ['paymentid', 'customer_name', 'worker_name', 'task_title', 'status']);

  return (
    <div className="flex min-h-screen bg-ink-950 text-slate-200">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
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
                  setSearch('');
                }}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'border border-brand-400/30 bg-brand-500/10 text-white'
                    : 'border border-transparent text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-brand-400' : ''}`} />
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
                {tab === 'customers' && `${customerRows.length} customers`}
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
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={DollarSign} label="Total Revenue" value={`$${Number(summary.totalRevenue || 0).toLocaleString()}`} sub="From paid invoices" accent="bg-emerald-500/15 text-emerald-300" />
            <StatCard icon={Clock} label="Pending Payments" value={summary.pendingPayments ?? 0} sub="Awaiting clearance" accent="bg-amber-500/15 text-amber-300" />
            <StatCard icon={CheckCircle2} label="Completed Tasks" value={stats.completedTasks} sub={`${stats.activeTasks} active now`} accent="bg-sky-500/15 text-sky-300" />
            <StatCard icon={TrendingUp} label="Avg. Rating" value={stats.avgRating} sub="Across all reviews" accent="bg-brand-500/15 text-brand-300" />
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
            <div className="overflow-x-auto">
              {tab === 'customers' && (
                <table className="w-full min-w-[640px]">
                  <thead className="border-b border-white/10 bg-white/5">
                    <tr>
                      <Th>Customer</Th><Th>Contact</Th><Th>Tasks</Th><Th>Spent</Th><Th>Status</Th><Th>Joined</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {customerRows.map((c) => (
                      <tr key={c.id} className="transition-colors hover:bg-white/5">
                        <Td>
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-sky-700 text-xs font-bold text-ink-950">
                              {c.name.split(' ').map((n) => n[0]).join('')}
                            </span>
                            <div>
                              <p className="font-medium text-white">{c.name}</p>
                              <p className="text-xs text-slate-500">{c.id}</p>
                            </div>
                          </div>
                        </Td>
                        <Td>
                          <p className="text-slate-300">{c.email}</p>
                          <p className="text-xs text-slate-500">{c.phone}</p>
                        </Td>
                        <Td>{c.tasks}</Td>
                        <Td className="font-semibold text-white">{c.spent}</Td>
                        <Td><Badge variant={c.status}>{c.status}</Badge></Td>
                        <Td className="text-slate-400">{c.joined}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === 'workers' && (
                <table className="w-full min-w-[640px]">
                  <thead className="border-b border-white/10 bg-white/5">
                    <tr>
                      <Th>Worker</Th><Th>Trade</Th><Th>Rating</Th><Th>Tasks Done</Th><Th>Earned</Th><Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {workerRows.map((w) => (
                      <tr key={w.id} className="transition-colors hover:bg-white/5">
                        <Td>
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-xs font-bold text-ink-950">
                              {w.name.split(' ').map((n) => n[0]).join('')}
                            </span>
                            <div>
                              <p className="font-medium text-white">{w.name}</p>
                              <p className="text-xs text-slate-500">{w.id}</p>
                            </div>
                          </div>
                        </Td>
                        <Td className="text-slate-300">{w.trade}</Td>
                        <Td><StarRating rating={w.rating} /></Td>
                        <Td>{w.tasksDone}</Td>
                        <Td className="font-semibold text-white">{w.earned}</Td>
                        <Td><Badge variant={w.status}>{w.status}</Badge></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === 'tasks' && (
                <table className="w-full min-w-[720px]">
                  <thead className="border-b border-white/10 bg-white/5">
                    <tr>
                      <Th>Task</Th><Th>Customer</Th><Th>Worker</Th><Th>Priority</Th><Th>Status</Th><Th>Due</Th><Th>Price</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {taskRows.map((t) => (
                      <tr key={t.id} className="transition-colors hover:bg-white/5">
                        <Td>
                          <p className="font-medium text-white">{t.title}</p>
                          <p className="text-xs text-slate-500">{t.id}</p>
                        </Td>
                        <Td className="text-slate-300">{t.customer}</Td>
                        <Td className="text-slate-300">{t.worker}</Td>
                        <Td>
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${priorityStyles[t.priority]}`}>
                            {t.priority}
                          </span>
                        </Td>
                        <Td><Badge variant={t.status}>{t.status}</Badge></Td>
                        <Td className="text-slate-400">{t.due}</Td>
                        <Td className="font-semibold text-white">{t.price}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === 'feedback' && (
                <table className="w-full min-w-[640px]">
                  <thead className="border-b border-white/10 bg-white/5">
                    <tr>
                      <Th>Review</Th><Th>Customer</Th><Th>Worker</Th><Th>Rating</Th><Th>Date</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {feedbackRows.map((f) => (
                      <tr key={f.id} className="transition-colors hover:bg-white/5">
                        <Td>
                          <p className="max-w-xs text-slate-300">{f.comment}</p>
                          <p className="mt-1 text-xs text-slate-500">{f.task} · {f.id}</p>
                        </Td>
                        <Td className="text-slate-300">{f.customer}</Td>
                        <Td className="text-slate-300">{f.worker}</Td>
                        <Td><StarRating rating={f.rating} /></Td>
                        <Td className="text-slate-400">{f.date}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === 'payments' && (
                <>
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Top by amount:</span>
                  {['none', '1st', '2nd', '3rd'].map((r) => (
                    <label
                      key={r}
                      className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        rank === r
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
              Showing {tab === 'customers' ? customerRows.length : tab === 'workers' ? workerRows.length : tab === 'tasks' ? taskRows.length : tab === 'feedback' ? feedbackRows.length : paymentRows.length} records
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
