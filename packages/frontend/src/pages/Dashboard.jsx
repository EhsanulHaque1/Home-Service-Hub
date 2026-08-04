import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Users, CheckCircle2, Star, MapPin, ArrowRight, Loader2 } from 'lucide-react';
import PageShell from '@/components/PageShell';
import { apiGet } from '@/lib/api';
import { STATUS_STYLES, STATUS_LABELS, BADGE_STYLES, initials } from '@/lib/marketplace';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [openTasks, setOpenTasks] = useState([]);
  const [openTotal, setOpenTotal] = useState(0);
  const [completedTotal, setCompletedTotal] = useState(0);
  const [topWorkers, setTopWorkers] = useState([]);
  const [workerTotal, setWorkerTotal] = useState(0);

  useEffect(() => {
    Promise.all([apiGet('/tasks?status=open'), apiGet('/tasks?status=completed'), apiGet('/workers')])
      .then(([open, completed, workers]) => {
        setOpenTasks(open.data.slice(0, 5));
        setOpenTotal(open.total);
        setCompletedTotal(completed.total);
        setTopWorkers(workers.data.slice(0, 4));
        setWorkerTotal(workers.total);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const avgRating = topWorkers.length
    ? (topWorkers.reduce((sum, w) => sum + w.rating, 0) / topWorkers.length).toFixed(1)
    : '—';

  const stats = [
    { label: 'Open tasks', value: openTotal, icon: ClipboardList },
    { label: 'Completed tasks', value: completedTotal, icon: CheckCircle2 },
    { label: 'Active workers', value: workerTotal, icon: Users },
    { label: 'Avg. top-worker rating', value: avgRating, icon: Star },
  ];

  return (
    <PageShell>
      <div className="container-x">
        <span className="section-eyebrow">Overview</span>
        <h1 className="mt-5 font-display text-3xl font-800 tracking-tight text-white sm:text-4xl">Dashboard</h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          A live snapshot of what's happening across the marketplace right now.
        </p>

        {loading ? (
          <div className="mt-16 flex items-center justify-center gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading dashboard…
          </div>
        ) : loadError ? (
          <p className="mt-16 text-center text-slate-400">Couldn't load dashboard data. Try again shortly.</p>
        ) : (
          <>
            <div className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="card p-6">
                  <s.icon className="h-5 w-5 text-brand-400" />
                  <p className="mt-4 font-display text-3xl font-800 text-white">{s.value}</p>
                  <p className="mt-1 text-sm text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-700 text-white">Recent open tasks</h2>
                  <Link to="/tasks" className="flex items-center gap-1 text-sm font-semibold text-brand-300 hover:text-brand-200">
                    Browse all <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-ink-850/60 backdrop-blur">
                  {openTasks.length === 0 ? (
                    <p className="px-6 py-10 text-center text-slate-400">No open tasks right now.</p>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {openTasks.map((t) => (
                        <div key={t.id} className="flex items-center justify-between gap-4 px-6 py-4">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">{t.title}</p>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                              <MapPin className="h-3 w-3" /> {t.location} · {t.category}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[t.status]}`}>
                              {STATUS_LABELS[t.status]}
                            </span>
                            <span className="font-display text-sm font-700 text-white">${t.budget}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-700 text-white">Top workers</h2>
                  <Link to="/workers" className="flex items-center gap-1 text-sm font-semibold text-brand-300 hover:text-brand-200">
                    View all <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-5 space-y-3">
                  {topWorkers.map((w) => {
                    const b = BADGE_STYLES[w.badge] || BADGE_STYLES.new;
                    return (
                      <div key={w.id} className="card flex items-center gap-3 p-4">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-ink-950">
                          {initials(w.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{w.name}</p>
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Star className="h-3 w-3 fill-brand-400 text-brand-400" /> {w.rating} · {w.trade}
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium ${b.cls}`}>{b.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <p className="mt-10 text-xs text-slate-500">
              This overview isn't tied to a specific account yet — a personalized dashboard is coming once sign-in is
              fully wired up.
            </p>
          </>
        )}
      </div>
    </PageShell>
  );
}
