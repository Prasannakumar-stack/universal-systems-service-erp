export function partUsedTypeLabel(part) {
  return part?.inventoryPartId ? 'Inventory Part' : 'Manual Part (outside/local)';
}

export function partRequestDisplayStatus(status) {
  if (status === 'Requested' || status === 'Reserved') return 'Pending';
  if (status === 'Fulfilled') return 'Moved to Parts Used';
  if (status === 'Cancelled') return 'Rejected';
  return status || 'Pending';
}

export function partRequestStatusTone(status) {
  const display = partRequestDisplayStatus(status);
  if (display === 'Pending') return 'bg-amber-500/15 text-amber-100';
  if (display === 'Approved') return 'bg-emerald-500/15 text-emerald-100';
  if (display === 'Rejected') return 'bg-rose-500/15 text-rose-100';
  if (display === 'Moved to Parts Used') return 'bg-sky-500/15 text-sky-100';
  return 'bg-slate-500/15 text-slate-100';
}

export function PartRequestStatusBadge({ status }) {
  const label = partRequestDisplayStatus(status);
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${partRequestStatusTone(status)}`}>{label}</span>;
}

export function partRequestIsPending(status) {
  return ['Pending', 'Requested', 'Reserved'].includes(status);
}

export function partRequestCanMove(status) {
  return status === 'Approved';
}

export function partRequestIsTerminal(status) {
  return ['Rejected', 'Cancelled', 'Moved to Parts Used', 'Fulfilled'].includes(status);
}
