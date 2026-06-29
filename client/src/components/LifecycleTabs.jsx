export function LifecycleTabs({ tabs, value, onChange, counts = {}, note = '', className = '' }) {
  return (
    <div className={`lifecycle-tabs-bar ${className}`.trim()}>
      <div className="lifecycle-tabs" role="tablist" aria-label="Lifecycle filter">
        {tabs.map((item) => {
          const selected = value === item.value;
          const count = counts?.[item.value];
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`lifecycle-tab lifecycle-tab-${item.value}${selected ? ' is-active' : ''}`}
              onClick={() => onChange(item.value)}
            >
              <span className="lifecycle-tab-label">{item.label}</span>
              {count !== undefined ? <span className="lifecycle-tab-count">{count}</span> : null}
            </button>
          );
        })}
      </div>
      {note ? <p className="lifecycle-tabs-note">{note}</p> : null}
    </div>
  );
}
