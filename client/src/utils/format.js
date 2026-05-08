export function currency(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: value.includes(':') ? 'short' : undefined
  });
}

export function statusTone(status) {
  if (status === 'Completed' || status === 'Delivered' || status === 'Paid') return 'bg-emerald-500/15 text-emerald-100';
  if (status === 'Cancelled' || status === 'Returned') return 'bg-rose-500/15 text-rose-100';
  if (status === 'Waiting for Parts' || status === 'Awaiting Parts' || status === 'Pending' || status === 'Partial') return 'bg-amber-500/15 text-amber-100';
  if (status === 'In Progress' || status === 'Converted') return 'bg-blue-500/15 text-blue-100';
  return 'bg-slate-500/15 text-slate-100';
}
