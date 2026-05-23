import { AlertCircle, Search } from 'lucide-react';

export function PageHeader({ title, eyebrow, action, children }) {
  return (
    <div className="page-header mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--brand)]">{eyebrow}</p> : null}
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
        {children ? <p className="mt-2 max-w-3xl text-sm leading-6 muted">{children}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title = 'No records yet', message = 'Items will appear here once available.', icon: Icon = AlertCircle, action = null }) {
  return (
    <div className="surface empty-state grid place-items-center px-6 py-10 text-center">
      <Icon className="mb-3 h-9 w-9 text-[var(--brand)]" />
      <h3 className="font-bold">{title}</h3>
      <p className="mt-1 text-sm muted">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search' }) {
  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 muted" />
      <input
        type="search"
        className="input pl-9"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault();
        }}
        placeholder={placeholder}
      />
    </label>
  );
}

export function StatCard({ icon: Icon, label, value, tone = 'brand' }) {
  const color = tone === 'green' ? 'var(--accent)' : tone === 'yellow' ? 'var(--warning)' : tone === 'red' ? 'var(--danger)' : 'var(--brand-2)';
  return (
    <div className="surface stat-card p-5">
      <div className="mb-4 inline-grid h-10 w-10 place-items-center rounded-card" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-sm muted">{label}</p>
    </div>
  );
}

export function ConfirmModal({ title, message, onCancel, onConfirm, confirmLabel = 'Confirm' }) {
  const destructivePattern = /delete|remove|reject|deny|void/i;
  const isDestructive = destructivePattern.test(`${title} ${confirmLabel}`);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4">
      <div className="surface w-full max-w-md p-5">
        <h2 className="text-lg font-black">{title}</h2>
        <p className="mt-2 text-sm leading-6 muted">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className={`btn ${isDestructive ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
