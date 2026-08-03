import { Link } from 'react-router-dom';
import { Wrench, Globe, Heart, Users, Share2 } from 'lucide-react';

const cols = [
  { title: 'For customers', links: ['Post a task', 'How it works', 'Pricing', 'Safety', 'Help center'] },
  { title: 'For workers', links: ['Become a worker', 'Worker app', 'Earnings', 'Community', 'Verification'] },
  { title: 'Company', links: ['About', 'Careers', 'Press', 'Blog', 'Contact'] },
  { title: 'Legal', links: ['Terms', 'Privacy', 'Cookies', 'Trust & safety'] },
];

const socials = [Globe, Heart, Users, Share2];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-ink-950">
      <div className="container-x py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_3fr]">
          <div>
            <a href="#top" className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-ink-950">
                <Wrench className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <span className="font-display text-lg font-700 text-white">
                Home<span className="text-brand-400">Service</span>Hub
              </span>
            </a>
            <p className="mt-4 max-w-xs text-sm text-slate-400">
              The live marketplace where customers post home tasks and trusted workers claim them — with secure,
              direct payment built in.
            </p>
            <div className="mt-6 flex gap-3">
              {socials.map((Icon, i) => (
                <a
                  key={i}
                  href="#top"
                  className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition-colors hover:border-brand-400/50 hover:text-brand-300"
                  aria-label="social link"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {cols.map((c) => (
              <div key={c.title}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{c.title}</h4>
                <ul className="mt-4 space-y-2.5">
                  {c.links.map((l) =>
                    l === 'Safety' ? (
                      <li key={l}>
                        <Link
                          to="/report-worker"
                          className="text-sm text-slate-300 transition-colors hover:text-brand-300"
                        >
                          {l}
                        </Link>
                      </li>
                    ) : (
                      <li key={l}>
                        <a href="#top" className="text-sm text-slate-300 transition-colors hover:text-brand-300">
                          {l}
                        </a>
                      </li>
                    )
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} HomeServiceHub. All rights reserved.</p>
          <p className="text-xs text-slate-500">Built for customers and workers, alike.</p>
        </div>
      </div>
    </footer>
  );
}
