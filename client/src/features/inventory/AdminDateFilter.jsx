import { CalendarClock } from 'lucide-react';

function formatAdminDate(value) {
  const [year, month, day] = String(value || '').split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function AdminDateFilter({ value, onChange, placeholder, ariaLabel, className = '' }) {
  const displayValue = value ? formatAdminDate(value) : placeholder;

  function openPicker(event) {
    event.currentTarget.showPicker?.();
  }

  return (
    <label className={`admin-date-filter ${value ? 'has-value' : ''} ${className}`.trim()}>
      <span className="admin-date-filter-text">{displayValue}</span>
      <CalendarClock className="admin-date-filter-icon" aria-hidden="true" />
      <input
        className="admin-date-filter-native"
        type="date"
        aria-label={ariaLabel || placeholder}
        value={value}
        onClick={openPicker}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
