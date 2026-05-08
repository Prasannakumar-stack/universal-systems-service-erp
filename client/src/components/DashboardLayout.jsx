import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  BookOpenCheck,
  Boxes,
  CalendarClock,
  ClipboardList,
  CreditCard,
  FileCheck2,
  History,
  FileText,
  Activity,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  PackageCheck,
  Phone,
  ReceiptText,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  Wrench,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { company } from '../utils/constants.js';

const adminGroups = [
  {
    title: '',
    links: [{ to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard }]
  },
  {
    title: 'Operations',
    links: [
      { to: '/admin/bookings', label: 'Requests / Bookings', icon: BookOpenCheck },
      { to: '/admin/work-orders', label: 'Repair & Service Jobs', icon: Wrench },
      { to: '/admin/work-orders?view=dispatch', label: 'Dispatch Board', icon: ClipboardList },
      { to: '/admin/work-orders?view=technicians', label: 'Technician Tasks', icon: UserRound }
    ]
  },
  {
    title: 'Customers',
    links: [
      { to: '/admin/customers', label: 'Customers', icon: Users },
      { to: '/admin/customers', label: 'Customer 360', icon: ShieldCheck },
      { to: '/admin/customers', label: 'Devices / Assets', icon: PackageCheck },
      { to: '/admin/customers', label: 'Service History', icon: History }
    ]
  },
  {
    title: 'AMC & Contracts',
    links: [
      { to: '/admin/amc-contracts', label: 'AMC Contracts', icon: FileCheck2 },
      { to: '/admin/amc-schedule', label: 'AMC Schedule', icon: CalendarClock },
      { to: '/admin/amc-renewals', label: 'Renewals', icon: AlertTriangle },
      { to: '/admin/warranties', label: 'Warranties', icon: ShieldCheck }
    ]
  },
  {
    title: 'Inventory',
    links: [
      { to: '/admin/parts', label: 'Products / Parts', icon: Boxes },
      { to: '/admin/parts', label: 'Stock Management', icon: PackageCheck },
      { to: '/admin/stock-movements', label: 'Stock Movements', icon: History }
    ]
  },
  {
    title: 'Sales & Billing',
    links: [
      { to: '/admin/documents?type=quotation', label: 'Quotations', icon: FileCheck2 },
      { to: '/admin/invoices', label: 'Invoices', icon: ReceiptText },
      { to: '/admin/payments', label: 'Payments', icon: CreditCard },
      { to: '/admin/documents', label: 'Documents / PDFs', icon: FileText }
    ]
  },
  {
    title: 'Reports',
    links: [
      { to: '/admin/dashboard', label: 'Business Reports', icon: Activity },
      { to: '/admin/work-orders', label: 'Technician Reports', icon: UserRound },
      { to: '/admin/parts', label: 'Inventory Reports', icon: Boxes },
      { to: '/admin/payments', label: 'Payment Reports', icon: CreditCard }
    ]
  },
  {
    title: 'System',
    links: [
      { to: '/admin/audit-logs', label: 'Audit Logs', icon: Activity }
    ]
  }
];

const technicianLinks = [
  { to: '/tech/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tech/work-orders', label: 'My Jobs', icon: BookOpenCheck },
  { to: '/technician/profile', label: 'My Profile', icon: UserRound }
];

function SidebarItem({ link, close }) {
  const Icon = link.icon;

  if (link.disabled) {
    return (
      <div className="enterprise-sidebar-item enterprise-sidebar-item-disabled" aria-disabled="true">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="min-w-0 truncate">{link.label}</span>
        <span className="ml-auto rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-black uppercase text-slate-400">Soon</span>
      </div>
    );
  }

  return (
    <NavLink
      to={link.to}
      end={link.to === '/admin/dashboard'}
      onClick={close}
      className={({ isActive }) => `enterprise-sidebar-item ${isActive ? 'enterprise-sidebar-item-active' : ''}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 truncate">{link.label}</span>
    </NavLink>
  );
}

function AdminSidebar({ close }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  return (
    <aside className="enterprise-sidebar">
      <div className="border-b border-white/10 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-card border border-sky-300/25 bg-sky-400/15">
            <Wrench className="h-5 w-5 text-[var(--brand)]" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-black leading-tight">Universal Systems</h2>
            <p className="text-sm font-bold text-sky-100">Service ERP</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 rounded-card border border-white/10 bg-white/[0.045] p-3 text-xs text-slate-300">
          <span className="inline-flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-[var(--brand)]" />Mettur Dam</span>
          <span className="inline-flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-[var(--brand)]" />{company.phones.join(' / ')}</span>
          <span className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-[var(--brand)]" />Sales, service, AMC & billing</span>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {adminGroups.map((group) => (
          <div key={group.title || 'dashboard'}>
            {group.title ? <p className="px-3 pb-2 text-[11px] font-black uppercase text-slate-500">{group.title}</p> : null}
            <div className="space-y-1">
              {group.links.map((link) => <SidebarItem key={`${group.title}-${link.label}`} link={link} close={close} />)}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-3 flex items-center gap-3 rounded-card bg-white/[0.045] p-3">
          <div className="grid h-9 w-9 place-items-center rounded-card bg-sky-400/15 text-sm font-black text-sky-100">
            {user?.name?.slice(0, 1) || 'A'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{user?.name || 'Admin User'}</p>
            <p className="truncate text-xs muted">Administrator</p>
          </div>
        </div>
        <button className="btn btn-secondary w-full justify-start" onClick={handleLogout}>
          <LogOut className="h-4 w-4 shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  );
}

function TechnicianSidebar({ close }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/technician/login');
  }

  return (
    <aside className="flex h-full flex-col border-r border-[var(--line)] bg-[var(--surface)]">
      <div className="border-b border-[var(--line)] p-4">
        <span className="inline-flex rounded-card bg-white px-2 py-1 shadow-sm">
          <img src="/logo-full.png" alt="Universal Systems" className="h-10 max-w-[185px] object-contain" />
        </span>
        <div className="mt-3 flex items-center gap-2 rounded-card bg-[var(--surface-2)] p-3">
          <div className="grid h-9 w-9 place-items-center rounded-card bg-[var(--brand)] text-sm font-bold text-white">
            {user?.name?.slice(0, 1) || 'U'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{user?.name}</p>
            <p className="truncate text-xs muted">Technician</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {technicianLinks.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/tech/dashboard'}
              onClick={close}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-card px-3 py-2.5 text-sm font-semibold transition ${
                  isActive ? 'bg-[var(--surface-2)] text-[var(--brand)]' : 'muted hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-[var(--line)] p-3">
        <button className="btn btn-secondary w-full justify-start" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

function GlobalSearch({ role }) {
  const { request } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2 || role !== 'admin') {
      setResults([]);
      setLoading(false);
      return undefined;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      const needle = value.toLowerCase();
      const includes = (text) => String(text || '').toLowerCase().includes(needle);
      try {
        const [customers, bookings, invoices, inventory] = await Promise.all([
          request(`/customers?search=${encodeURIComponent(value)}`).catch(() => ({ customers: [] })),
          request('/bookings').catch(() => ({ bookings: [] })),
          request('/invoices').catch(() => ({ invoices: [] })),
          request('/inventory').catch(() => ({ parts: [] }))
        ]);
        const customerResults = (customers.customers || []).map((customer) => ({
          type: 'Customer',
          title: customer.name,
          meta: customer.phone || 'Customer profile',
          to: `/admin/customers/${customer.id}`
        }));
        const bookingResults = (bookings.bookings || [])
          .filter((booking) => includes(booking.bookingCode) || includes(booking.customerName) || includes(booking.phone))
          .map((booking) => ({
            type: 'Booking',
            title: booking.bookingCode,
            meta: `${booking.customerName || 'Customer'} - ${booking.device || 'Service'}`,
            to: '/admin/bookings'
          }));
        const invoiceResults = (invoices.invoices || [])
          .filter((invoice) => includes(invoice.invoiceNumber) || includes(invoice.customerId?.name))
          .map((invoice) => ({
            type: 'Invoice',
            title: invoice.invoiceNumber,
            meta: invoice.customerId?.name || 'Billing',
            to: '/admin/invoices'
          }));
        const partResults = (inventory.parts || [])
          .filter((part) => includes(part.partName) || includes(part.category))
          .map((part) => ({
            type: 'Part',
            title: part.partName,
            meta: `${part.available || 0} available`,
            to: '/admin/parts'
          }));
        setResults([...customerResults, ...bookingResults, ...invoiceResults, ...partResults].slice(0, 8));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, request, role]);

  function openResult(result) {
    setQuery('');
    setResults([]);
    navigate(result.to);
  }

  return (
    <div className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 muted" />
      <input
        className="input h-11 pl-9 pr-10"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search customers, phone, invoice, booking, parts"
      />
      {loading ? <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--brand)]" /> : null}
      {query.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-card border border-[var(--line)] bg-[#071426] shadow-2xl">
          {results.length ? results.map((result) => (
            <button key={`${result.type}-${result.title}-${result.to}`} className="block w-full px-4 py-3 text-left transition hover:bg-sky-400/10" onClick={() => openResult(result)}>
              <span className="text-xs font-black uppercase text-[var(--brand)]">{result.type}</span>
              <span className="mt-1 block font-bold">{result.title}</span>
              <span className="block text-sm muted">{result.meta}</span>
            </button>
          )) : !loading ? <p className="px-4 py-3 text-sm muted">No matching records found.</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function priorityForNotification(item) {
  const text = `${item?.type || ''} ${item?.title || ''} ${item?.message || ''}`.toLowerCase();
  if (text.includes('low_stock') || text.includes('low stock') || text.includes('overdue')) return 'Critical';
  if (text.includes('payment') || text.includes('work order')) return 'High';
  return 'Normal';
}

function NotificationCenter({ role }) {
  const { request } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  async function loadNotifications() {
    if (role !== 'admin') return;
    setLoading(true);
    try {
      const data = await request('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 30000);
    return () => clearInterval(timer);
  }, [request, role]);

  async function markAllRead() {
    const unread = notifications.filter((item) => !item.read);
    await Promise.all(unread.map((item) => request(`/notifications/${item.id}/read`, { method: 'PATCH' }).catch(() => null)));
    loadNotifications();
  }

  return (
    <div className="relative">
      <button className="icon-button enterprise-top-icon relative h-11 w-11" onClick={() => setOpen((value) => !value)} aria-label="Open notifications">
        <Bell className="h-5 w-5" />
        {unreadCount ? <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">{unreadCount}</span> : null}
      </button>
      {open ? (
        <div className="notification-drawer">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
            <div>
              <h2 className="text-base font-black">Notification Center</h2>
              <p className="mt-1 text-xs muted">Low stock, bookings, payments, service jobs, and reminders.</p>
            </div>
            <button className="btn btn-secondary px-3 py-2 text-xs" onClick={markAllRead} disabled={!unreadCount}>Mark all read</button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-3">
            {loading ? (
              <div className="grid min-h-28 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[var(--brand)]" /></div>
            ) : notifications.length ? notifications.map((item) => {
              const priority = priorityForNotification(item);
              return (
                <div key={item.id} className={`mb-3 rounded-card border p-3 ${item.read ? 'border-white/10 bg-white/[0.035]' : 'border-sky-300/25 bg-sky-400/10'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">{item.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${priority === 'Critical' ? 'bg-rose-500/20 text-rose-100' : priority === 'High' ? 'bg-amber-400/20 text-amber-100' : 'bg-sky-400/15 text-sky-100'}`}>{priority}</span>
                  </div>
                  <p className="mt-1 text-sm muted">{item.message}</p>
                </div>
              );
            }) : (
              <div className="grid min-h-32 place-items-center text-center">
                <div>
                  <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-[var(--brand)]" />
                  <p className="font-bold">No notifications</p>
                  <p className="mt-1 text-sm muted">New operational alerts will appear here.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AdminTopBar({ role, openSidebar }) {
  const { user } = useAuth();

  return (
    <header className="enterprise-topbar">
      <div className="flex min-h-16 flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="flex items-center gap-3">
          <button className="icon-button enterprise-top-icon h-11 w-11 xl:hidden" onClick={openSidebar} aria-label="Open admin menu">
            <Menu className="h-5 w-5" />
          </button>
          <GlobalSearch role={role} />
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <NavLink className="btn btn-primary glow-action" to="/admin/bookings"><BookOpenCheck className="h-4 w-4" />Booking</NavLink>
          <NavLink className="btn btn-secondary" to="/admin/work-orders"><Wrench className="h-4 w-4" />Service Job</NavLink>
          <NavLink className="btn btn-secondary" to="/admin/payments"><CreditCard className="h-4 w-4" />Payment</NavLink>
          <NotificationCenter role={role} />
          <div className="hidden items-center gap-3 rounded-card border border-white/10 bg-white/[0.045] px-3 py-2.5 sm:flex">
            <div className="grid h-8 w-8 place-items-center rounded-card bg-sky-400/15 text-xs font-black text-sky-100">{user?.name?.slice(0, 1) || 'A'}</div>
            <div className="min-w-0">
              <p className="max-w-36 truncate text-sm font-bold">{user?.name || 'Admin User'}</p>
              <p className="text-xs muted">Universal Systems</p>
            </div>
          </div>
          <a href="/" className="btn btn-secondary sm:shrink-0">
            <Wrench className="h-4 w-4" />
            Website
          </a>
        </div>
      </div>
    </header>
  );
}

export default function DashboardLayout({ role }) {
  const [open, setOpen] = useState(false);

  if (role === 'admin') {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <div className="fixed inset-y-0 left-0 z-40 hidden w-[292px] xl:block">
          <AdminSidebar />
        </div>
        <AdminTopBar role={role} openSidebar={() => setOpen(true)} />
        {open ? (
          <div className="fixed inset-0 z-[70] bg-black/55 xl:hidden" onClick={() => setOpen(false)}>
            <div className="h-full w-[292px] max-w-[88vw]" onClick={(event) => event.stopPropagation()}>
              <AdminSidebar close={() => setOpen(false)} />
              <button className="absolute right-4 top-4 icon-button h-9 w-9 bg-[var(--surface)]" onClick={() => setOpen(false)} aria-label="Close admin menu">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : null}
        <main className="enterprise-main p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">
        <TechnicianSidebar />
      </div>
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] backdrop-blur-xl lg:ml-72">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <button className="icon-button h-10 w-10 lg:hidden" onClick={() => setOpen(true)} aria-label="Open dashboard menu">
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-sm font-bold">{role === 'admin' ? 'Admin Panel' : 'Technician Panel'}</p>
            <p className="text-xs muted">Universal Systems service workspace</p>
          </div>
          <a href="/" className="btn btn-secondary hidden sm:inline-flex">
            <Wrench className="h-4 w-4" />
            Website
          </a>
        </div>
      </header>
      {open ? (
        <div className="fixed inset-0 z-[70] bg-black/45 lg:hidden" onClick={() => setOpen(false)}>
          <div className="h-full w-80 max-w-[88vw]" onClick={(event) => event.stopPropagation()}>
            <TechnicianSidebar close={() => setOpen(false)} />
            <button className="absolute right-4 top-4 icon-button h-9 w-9 bg-[var(--surface)]" onClick={() => setOpen(false)} aria-label="Close dashboard menu">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : null}
      <main className="p-4 sm:p-6 lg:ml-72">
        <Outlet />
      </main>
    </div>
  );
}
