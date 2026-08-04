import { useEffect, useState } from 'react';
import { Star, ArrowRight, Loader2, BadgeCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import PageShell from '@/components/PageShell';
import { apiGet } from '@/lib/api';
import { CATEGORIES, BADGE_STYLES, initials } from '@/lib/marketplace';

export default function Workers() {
  const [trade, setTrade] = useState('');
  const [page, setPage] = useState(1);
  const [workers, setWorkers] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    const params = new URLSearchParams({ page: String(page) });
    if (trade) params.set('trade', trade);

    apiGet(`/workers?${params.toString()}`)
      .then((data) => {
        setWorkers(data.data);
        setMeta(data);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [trade, page]);

  return (
    <PageShell>
      <div className="container-x">
        <div className="max-w-2xl">
          <span className="section-eyebrow">Top workers</span>
          <h1 className="mt-5 font-display text-3xl font-800 tracking-tight text-white sm:text-4xl">
            Rated by neighbors. Vetted by us.
          </h1>
          <p className="mt-4 text-slate-300">
            Every worker is background-checked and rated on every job. Filter by trade to find the right pro.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setTrade('');
              setPage(1);
            }}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              trade === '' ? 'border-brand-400/50 bg-brand-500/15 text-brand-300' : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
            }`}
          >
            All trades
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => {
                setTrade(c);
                setPage(1);
              }}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                trade === c ? 'border-brand-400/50 bg-brand-500/15 text-brand-300' : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-16 flex items-center justify-center gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading workers…
          </div>
        ) : loadError ? (
          <p className="mt-16 text-center text-slate-400">Couldn't load workers. Try again shortly.</p>
        ) : workers.length === 0 ? (
          <p className="mt-16 text-center text-slate-400">No workers match that trade yet.</p>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {workers.map((w) => {
              const b = BADGE_STYLES[w.badge] || BADGE_STYLES.new;
              return (
                <div key={w.id} className="card group p-6 hover:-translate-y-1 hover:border-brand-400/40 hover:shadow-card">
                  <div className="flex items-center justify-between">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 font-display text-lg font-800 text-ink-950">
                      {initials(w.name)}
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${b.cls}`}>{b.label}</span>
                  </div>

                  <h3 className="mt-4 font-display text-lg font-700 text-white">{w.name}</h3>
                  <p className="text-sm text-slate-400">{w.trade}</p>
                  <p className="mt-2 line-clamp-2 text-xs text-slate-500">{w.bio}</p>

                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                    <div className="flex items-center gap-1.5">
                      <Star className="h-4 w-4 fill-brand-400 text-brand-400" />
                      <span className="font-semibold text-white">{w.rating}</span>
                      <span className="text-xs text-slate-500">({w.jobs_completed} jobs)</span>
                    </div>
                    <span className="text-sm font-semibold text-brand-300">${w.hourly_rate}/hr</span>
                  </div>

                  <button className="mt-5 w-full rounded-full border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-white transition-colors group-hover:border-brand-400/50 group-hover:bg-brand-500 group-hover:text-ink-950">
                    <span className="inline-flex items-center gap-1.5">
                      {w.location} <ArrowRight className="h-4 w-4" />
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {!loading && !loadError && meta.last_page > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.current_page <= 1}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-white disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-slate-400">
              Page {meta.current_page} of {meta.last_page}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
              disabled={meta.current_page >= meta.last_page}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-white disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {!loading && !loadError && workers.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-400">
            <BadgeCheck className="h-4 w-4 text-teal-400" />
            Every worker passes ID and background verification before joining.
          </div>
        )}
      </div>
    </PageShell>
  );
}
