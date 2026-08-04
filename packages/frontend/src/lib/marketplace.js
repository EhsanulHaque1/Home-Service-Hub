export const CATEGORIES = ['Plumbing', 'Cleaning', 'Electrical', 'Carpentry', 'Painting', 'Appliance repair'];

export const STATUS_STYLES = {
  open: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  matching: 'bg-brand-500/15 text-brand-300 border-brand-500/20',
  completed: 'bg-slate-500/15 text-slate-300 border-slate-500/20',
};

export const STATUS_LABELS = {
  open: 'Open',
  matching: 'Matching',
  completed: 'Completed',
};

export const BADGE_STYLES = {
  top: { label: 'Top rated', cls: 'bg-brand-500/15 text-brand-300 border-brand-500/20' },
  verified: { label: 'Verified', cls: 'bg-teal-500/15 text-teal-300 border-teal-500/20' },
  new: { label: 'New', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/20' },
};

export function formatRelativeTime(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function initials(name) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}
