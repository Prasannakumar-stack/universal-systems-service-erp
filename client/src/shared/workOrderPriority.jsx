export const WORK_ORDER_PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];

const PRIORITY_ALIASES = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
  medium: 'Normal',
  critical: 'Urgent'
};

export function normalizeWorkOrderPriority(priority) {
  const raw = String(priority || '').trim();
  if (!raw) return 'Normal';
  if (WORK_ORDER_PRIORITIES.includes(raw)) return raw;
  return PRIORITY_ALIASES[raw.toLowerCase()] || 'Normal';
}

export function workOrderPriorityRank(priority) {
  const normalized = normalizeWorkOrderPriority(priority);
  const ranks = { Urgent: 1, High: 2, Normal: 3, Low: 4 };
  return ranks[normalized] || 3;
}

export function workOrderPriorityTone(priority) {
  const normalized = normalizeWorkOrderPriority(priority);
  if (normalized === 'Low') return 'bg-slate-500/15 text-slate-100';
  if (normalized === 'Normal') return 'bg-emerald-500/15 text-emerald-100';
  if (normalized === 'High') return 'bg-amber-500/15 text-amber-100';
  if (normalized === 'Urgent') return 'bg-rose-500/15 text-rose-100';
  return 'bg-slate-500/15 text-slate-100';
}

export function WorkOrderPriorityBadge({ priority, className = '' }) {
  const label = normalizeWorkOrderPriority(priority);
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${workOrderPriorityTone(label)} ${className}`}>
      {label}
    </span>
  );
}

export function sortWorkOrdersByPriority(orders = []) {
  return [...orders].sort((a, b) => {
    const rankDiff = workOrderPriorityRank(a?.priority) - workOrderPriorityRank(b?.priority);
    if (rankDiff !== 0) return rankDiff;
    return new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
  });
}

export const COMPLETED_WORK_ORDER_STATUSES = ['Completed', 'Delivered', 'Returned'];

export function isActiveWorkOrderStatus(status) {
  return !COMPLETED_WORK_ORDER_STATUSES.includes(status);
}

export function countUrgentActiveJobs(orders = []) {
  return orders.filter(
    (order) => normalizeWorkOrderPriority(order?.priority) === 'Urgent' && isActiveWorkOrderStatus(order?.status)
  ).length;
}
