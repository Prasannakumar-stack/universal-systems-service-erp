import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArchiveRestore,
  Boxes,
  CalendarClock,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Loader2,
  PackagePlus,
  PhoneCall,
  Plus,
  ReceiptText,
  Save,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Wrench
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { apiBase, pdfTypes, serviceTypes, statuses } from '../utils/constants.js';
import { currency, formatDate, statusTone } from '../utils/format.js';
import { ADMIN_ASSIGNMENT_LABEL } from '../utils/assignment.js';
import { ConfirmModal, EmptyState, PageHeader, SearchBox, StatCard } from '../components/Ui.jsx';

function useResource(load, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await load());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload, setData };
}

function LoadingBlock() {
  return (
    <div className="grid gap-4">
      <div className="surface animate-pulse p-5">
        <div className="h-4 w-36 rounded bg-white/10" />
        <div className="mt-4 h-8 w-64 max-w-full rounded bg-white/10" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="surface animate-pulse p-5">
            <div className="h-10 w-10 rounded-card bg-white/10" />
            <div className="mt-4 h-7 w-20 rounded bg-white/10" />
            <div className="mt-3 h-3 w-28 rounded bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorBlock({ message }) {
  return <EmptyState title="Unable to load this view" message={message ? 'Please retry or check your access permission.' : 'Please retry or check your access permission.'} />;
}

function AdminOverviewPanel() {
  const { request } = useAuth();
  const { data, loading, error } = useResource(() => request('/reports/summary'), [request]);
  const totals = data?.totals || {};

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <>
      <PageHeader title="Dashboard Overview" eyebrow="Admin">
        View service volume, pending work, revenue, call requests, and technician workload.
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Wrench} label="Total Bookings" value={totals.totalBookings || 0} />
        <StatCard icon={CalendarClock} label="Pending" value={totals.pending || 0} tone="yellow" />
        <StatCard icon={CheckCircle2} label="Completed / Delivered" value={(totals.completed || 0) + (totals.delivered || 0)} tone="green" />
        <StatCard icon={ReceiptText} label="Revenue" value={currency(totals.revenue)} />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="surface p-5">
          <h2 className="text-xl font-black">Technician Work</h2>
          <div className="mt-4 grid gap-3">
            {data.technicians?.map((tech) => (
              <div key={tech.name} className="flex items-center justify-between rounded-card bg-[var(--surface-2)] p-3">
                <div>
                  <p className="font-bold">{tech.name}</p>
                  <p className="text-sm muted">{tech.jobs || 0} assigned jobs</p>
                </div>
                <p className="font-black">{currency(tech.revenue)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="surface p-5">
          <h2 className="text-xl font-black">Service Breakdown</h2>
          <div className="mt-4 grid gap-3">
            {data.serviceBreakdown?.length ? (
              data.serviceBreakdown.map((service) => (
                <div key={service.service_type} className="flex items-center justify-between rounded-card bg-[var(--surface-2)] p-3">
                  <span className="font-bold">{service.service_type}</span>
                  <span className="status-badge">{service.count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm muted">No bookings yet.</p>
            )}
          </div>
          <div className="mt-4 rounded-card bg-[var(--surface-2)] p-3 text-sm font-bold">
            Open call requests: {data.callRequests || 0}
          </div>
        </div>
      </div>
    </>
  );
}

function AdminQuickActionsPanel({ setActiveTab }) {
  return (
    <>
      <PageHeader title="Quick Actions" eyebrow="Admin">
        Jump into common admin flows without changing any of the existing data logic underneath.
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          {
            title: 'Open bookings',
            text: 'Review service requests, assign technicians, and inspect booking details.',
            tab: 'Bookings',
            icon: Wrench
          },
          {
            title: 'Manage parts',
            text: 'Add inventory items, update pricing, and keep stock tidy.',
            tab: 'Manage Parts',
            icon: Boxes
          },
          {
            title: 'Handle callbacks',
            text: 'Follow up on incoming requests and convert them into bookings.',
            tab: 'Call Requests',
            icon: PhoneCall
          }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="surface p-5">
              <div className="flex items-start gap-3">
                <div className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-card bg-[var(--surface-2)] text-[var(--brand)]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-[var(--text)]">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 muted">{item.text}</p>
                  <button type="button" className="btn btn-primary mt-4" onClick={() => setActiveTab(item.tab)}>
                    Open
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function AdminQuickActionsPage() {
  const navigate = useNavigate();

  function openTab(tab) {
    switch (tab) {
      case 'Bookings':
        navigate('/app/admin/bookings');
        break;
      case 'Manage Parts':
        navigate('/app/admin/parts');
        break;
      case 'Call Requests':
        navigate('/app/admin/call-requests');
        break;
      case 'Quick Actions':
      default:
        navigate('/app/admin/billing');
        break;
    }
  }

  return <AdminQuickActionsPanel setActiveTab={openTab} />;
}

export function AdminDashboard() {
  return <AdminOverviewPanel />;
}
export function TechnicianDashboard() {
  const { request, user } = useAuth();
  const { data, loading, error } = useResource(() => request('/bookings'), [request]);
  const bookings = data?.bookings || [];
  const pending = bookings.filter((booking) => booking.status === 'Pending' || booking.status === 'In Progress').length;
  const completed = bookings.filter((booking) => booking.status === 'Completed' || booking.status === 'Delivered').length;

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <>
      <PageHeader title={`Welcome, ${user?.name || 'Technician'}`} eyebrow="Technician">
        Your panel shows only work assigned to your employee account.
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Wrench} label="Assigned Jobs" value={bookings.length} />
        <StatCard icon={CalendarClock} label="Active Jobs" value={pending} tone="yellow" />
        <StatCard icon={CheckCircle2} label="Completed" value={completed} tone="green" />
      </div>
      <div className="mt-6 surface p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black">Recent Assigned Bookings</h2>
          <Link className="btn btn-secondary" to="/app/tech/bookings">
            View All
          </Link>
        </div>
        <BookingTable bookings={bookings.slice(0, 5)} role="technician" />
      </div>
    </>
  );
}

export function BookingsPage({ role = 'admin', mode = 'bookings' }) {
  const { request } = useAuth();
  const { push } = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [users, setUsers] = useState([]);
  const [manualOpen, setManualOpen] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    return params.toString() ? `?${params}` : '';
  }, [search, status]);

  const { data, loading, error, reload } = useResource(() => request(`/bookings${query}`), [request, query]);

  useEffect(() => {
    if (role === 'admin') request('/users').then((result) => setUsers(result.users.filter((user) => user.role === 'technician' && user.active))).catch(() => {});
  }, [request, role]);

  async function assign(id, technicianId) {
    if (!technicianId) return;
    try {
      await request(`/bookings/${id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ technicianId })
      });
      push('Technician assigned');
      reload();
    } catch (error) {
      push(error.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <>
      <PageHeader
        title={role === 'admin' ? (mode === 'billing' ? 'Add / Update Bill' : 'Bookings') : 'My Bookings'}
        eyebrow={role === 'admin' ? 'Admin' : 'Technician'}
        action={
          role === 'admin' && mode !== 'billing' ? (
            <button type="button" className="btn btn-primary" onClick={() => setManualOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Booking
            </button>
          ) : null
        }
      >
        {role === 'admin' ? 'Search, filter, assign technicians, and open booking details.' : 'Only bookings assigned to your account are shown here.'}
      </PageHeader>

      <div className="surface mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_220px]">
        <SearchBox value={search} onChange={setSearch} placeholder="Search booking, customer, phone, service" />
        <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {statuses.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>

      <BookingTable bookings={data.bookings || []} role={role} technicians={users} onAssign={assign} />
      {manualOpen ? <ManualBookingModal onClose={() => setManualOpen(false)} onSaved={reload} /> : null}
    </>
  );
}

function BookingTable({ bookings, role, technicians = [], onAssign }) {
  if (!bookings.length) return <EmptyState title="No bookings found" message="Bookings will appear here after customers submit service requests." />;
  const base = role === 'admin' ? '/app/admin/bookings' : '/app/tech/bookings';
  return (
    <div className="table-wrap bg-[var(--surface)]">
      <table className="data-table">
        <thead>
          <tr>
            <th>Booking ID</th>
            <th>Customer Name</th>
            <th>Phone</th>
            <th>Service</th>
            <th>Problem</th>
            <th>Assigned Technician</th>
            <th>Total Cost</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">
          {bookings.map((booking) => (
            <tr key={booking.id}>
              <td className="font-bold">{booking.booking_code}</td>
              <td>{booking.customer_name}</td>
              <td>{booking.phone}</td>
              <td>{booking.service_type}</td>
              <td className="max-w-xs truncate">{booking.problem_description}</td>
              <td>
                {role === 'admin' ? (
                  <select className="input min-w-40 py-2" value={booking.assigned_to || ''} onChange={(event) => onAssign?.(booking.id, event.target.value)}>
                    {/* Admin maps to an empty assignment for compatibility with older bookings. */}
                    <option value="">{ADMIN_ASSIGNMENT_LABEL}</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  booking.technician_name || 'Assigned to you'
                )}
              </td>
              <td className="font-bold">{currency(booking.total_cost)}</td>
              <td>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusTone(booking.status)}`}>{booking.status}</span>
              </td>
              <td>
                <Link className="btn btn-secondary whitespace-nowrap py-2" to={`${base}/${booking.id}`}>
                  <Eye className="h-4 w-4" />
                  Details
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ManualBookingModal({ onClose, onSaved }) {
  const { request } = useAuth();
  const { push } = useToast();
  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    address: '',
    serviceType: 'General Service',
    problemDescription: '',
    preferredDateTime: '',
    assignedTo: ''
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    request('/users').then((result) => setUsers(result.users.filter((user) => user.role === 'technician' && user.active))).catch(() => {});
  }, [request]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await request('/bookings', { method: 'POST', body: JSON.stringify(form) });
      push('Manual booking created');
      onSaved();
      onClose();
    } catch (error) {
      push(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4">
      <form className="surface max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5" onSubmit={submit}>
        <h2 className="text-xl font-black">Add Manual Booking</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <input className="input" placeholder="Customer name" value={form.customerName} onChange={(event) => update('customerName', event.target.value)} />
          <input className="input" placeholder="Phone" value={form.phone} onChange={(event) => update('phone', event.target.value)} />
          <select className="input" value={form.serviceType} onChange={(event) => update('serviceType', event.target.value)}>
            {serviceTypes.map((service) => (
              <option key={service}>{service}</option>
            ))}
          </select>
          <textarea className="input min-h-24 sm:col-span-2" placeholder="Address" value={form.address} onChange={(event) => update('address', event.target.value)} />
          <textarea
            className="input min-h-24 sm:col-span-2"
            placeholder="Problem description"
            value={form.problemDescription}
            onChange={(event) => update('problemDescription', event.target.value)}
          />
          <input className="input" type="datetime-local" value={form.preferredDateTime} onChange={(event) => update('preferredDateTime', event.target.value)} />
          <select className="input" value={form.assignedTo} onChange={(event) => update('assignedTo', event.target.value)}>
            {/* Admin maps to an empty assignment for compatibility with older bookings. */}
            <option value="">{ADMIN_ASSIGNMENT_LABEL}</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Save className="h-4 w-4" />
            Save Booking
          </button>
        </div>
      </form>
    </div>
  );
}

export function BookingDetailPage({ role = 'admin' }) {
  const { id } = useParams();
  const { request, token, user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [partForm, setPartForm] = useState({ partName: '', quantity: 1, unitPrice: 0 });
  const [removePartCandidate, setRemovePartCandidate] = useState(null);
  const [progress, setProgress] = useState({ status: '', note: '' });
  const [bill, setBill] = useState({ serviceCharge: 0, discount: 0, paymentStatus: 'Unpaid', billNotes: '' });

  const { data, loading, error, reload } = useResource(() => request(`/bookings/${id}`), [request, id]);
  const booking = data?.booking;

  useEffect(() => {
    if (!booking) return;
    setBill({
      serviceCharge: booking.service_charge || 0,
      discount: booking.discount || 0,
      paymentStatus: booking.payment_status || 'Unpaid',
      billNotes: booking.bill_notes || ''
    });
  }, [booking?.id]);

  const loadImage = useCallback(async () => {
    if (!booking?.image_filename || !token) return;
    setImageLoading(true);
    try {
      const response = await fetch(`${apiBase}/bookings/${booking.id}/image`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Unable to load image');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setImageUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return url;
      });
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setImageLoading(false);
    }
  }, [booking?.id, booking?.image_filename, push, token]);

  useEffect(() => {
    loadImage();
    return () => {
      setImageUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return '';
      });
    };
  }, [loadImage]);

  async function blobDownload(path, fallbackName) {
    const response = await fetch(`${apiBase}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await response.blob();
    if (!response.ok) {
      const text = await blob.text();
      throw new Error(text || 'Download failed');
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fallbackName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function openImage() {
    if (!imageUrl) await loadImage();
    if (imageUrl) window.open(imageUrl, '_blank', 'noopener,noreferrer');
  }

  async function downloadImage() {
    try {
      await blobDownload(`/bookings/${booking.id}/image/download`, booking.image_original_name || 'problem-image');
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function saveProgress(event) {
    event.preventDefault();
    try {
      await request(`/bookings/${booking.id}/progress`, {
        method: 'PATCH',
        body: JSON.stringify(progress)
      });
      setProgress({ status: '', note: '' });
      push('Service progress updated');
      reload();
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function addPart(event) {
    event.preventDefault();
    try {
      await request(`/bookings/${booking.id}/parts`, {
        method: 'POST',
        body: JSON.stringify(partForm)
      });
      setPartForm({ partName: '', quantity: 1, unitPrice: 0 });
      push('Part added');
      reload();
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function removePart(partId) {
    try {
      await request(`/bookings/${booking.id}/parts/${partId}`, { method: 'DELETE' });
      push('Part removed');
      setRemovePartCandidate(null);
      reload();
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function saveBill(event) {
    event.preventDefault();
    try {
      await request(`/bookings/${booking.id}/bill`, {
        method: 'POST',
        body: JSON.stringify(bill)
      });
      push('Bill updated');
      reload();
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function generate(type) {
    try {
      const result = await request(`/bookings/${booking.id}/pdfs/${type}`, { method: 'POST', body: JSON.stringify({}) });
      push('PDF generated');
      await reload();
      await blobDownload(`/pdfs/${result.pdf.id}/download`, result.pdf.filename);
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function downloadPdf(pdf) {
    try {
      await blobDownload(`/pdfs/${pdf.id}/download`, pdf.filename);
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;
  if (!booking) return <EmptyState title="Booking not found" />;

  const detailBase = role === 'admin' ? '/app/admin/bookings' : '/app/tech/bookings';

  return (
    <>
      <PageHeader
        title={booking.booking_code}
        eyebrow={role === 'admin' ? 'Booking Details' : 'My Booking Details'}
        action={
          <button type="button" className="btn btn-secondary" onClick={() => navigate(detailBase)}>
            Back
          </button>
        }
      >
        {booking.customer_name} Â· {booking.service_type} Â· Handled dashboard user: {user?.name}
      </PageHeader>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-5">
          <div className="surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black">Customer & Service</h2>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusTone(booking.status)}`}>{booking.status}</span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                ['Customer', booking.customer_name],
                ['Phone', booking.phone],
                ['Address', booking.address],
                ['Service Type', booking.service_type],
                ['Problem', booking.problem_description],
                ['Preferred Date/Time', booking.preferred_datetime ? formatDate(booking.preferred_datetime) : 'Not specified'],
                ['Assigned Technician', booking.technician_name || ADMIN_ASSIGNMENT_LABEL],
                ['Total Cost', currency(booking.total_cost)]
              ].map(([label, value]) => (
                <div key={label} className="rounded-card bg-[var(--surface-2)] p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--brand)]">{label}</p>
                  <p className="mt-1 text-sm leading-6">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="surface p-5">
            <h2 className="text-xl font-black">{role === 'admin' ? 'Customer uploaded image' : 'Problem image'}</h2>
            {booking.image_filename ? (
              <div className="mt-4">
                {imageLoading ? (
                  <div className="grid h-56 place-items-center rounded-card bg-[var(--surface-2)]">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : imageUrl ? (
                  <img src={imageUrl} alt="Customer issue" className="max-h-96 w-full rounded-card object-contain bg-[var(--surface-2)]" />
                ) : (
                  <div className="grid h-56 place-items-center rounded-card bg-[var(--surface-2)] text-sm muted">Image available</div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="btn btn-secondary" onClick={openImage}>
                    <Eye className="h-4 w-4" />
                    Open Full Image
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={downloadImage}>
                    <Download className="h-4 w-4" />
                    Download Image
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-card bg-[var(--surface-2)] p-5 text-sm font-semibold muted">No image selected</div>
            )}
          </div>

          <div className="surface p-5">
            <h2 className="text-xl font-black">Service Progress</h2>
            <form className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_auto]" onSubmit={saveProgress}>
              <select className="input" value={progress.status} onChange={(event) => setProgress((current) => ({ ...current, status: event.target.value }))}>
                <option value="">Keep current status</option>
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
              <input className="input" placeholder="Work progress note" value={progress.note} onChange={(event) => setProgress((current) => ({ ...current, note: event.target.value }))} />
              <button type="submit" className="btn btn-primary">
                <Save className="h-4 w-4" />
                Update
              </button>
            </form>
            <div className="mt-5 grid gap-3">
              {data.updates?.length ? (
                data.updates.map((update) => (
                  <div key={update.id} className="rounded-card border border-[var(--line)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold">{update.user_name}</p>
                      <span className="text-xs muted">{formatDate(update.created_at)}</span>
                    </div>
                    <p className="mt-1 text-sm muted">{update.status ? `${update.status}: ` : ''}{update.note}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm muted">No progress updates yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          <div className="surface p-5">
            <h2 className="text-xl font-black">Add Parts Used</h2>
            <form className="mt-4 grid gap-3" onSubmit={addPart}>
              <input className="input" placeholder="Part name" value={partForm.partName} onChange={(event) => setPartForm((current) => ({ ...current, partName: event.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Quantity"
                  value={partForm.quantity}
                  onChange={(event) => setPartForm((current) => ({ ...current, quantity: event.target.value }))}
                />
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Unit price"
                  value={partForm.unitPrice}
                  onChange={(event) => setPartForm((current) => ({ ...current, unitPrice: event.target.value }))}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                <PackagePlus className="h-4 w-4" />
                Add Part
              </button>
            </form>
            <div className="mt-4 grid gap-2">
              {data.parts?.length ? (
                data.parts.map((part) => (
                  <div key={part.id} className="flex items-center justify-between gap-3 rounded-card bg-[var(--surface-2)] p-3 text-sm">
                    <div>
                      <p className="font-bold">{part.part_name}</p>
                      <p className="muted">{part.quantity} Ã— {currency(part.unit_price)} Â· {part.added_by_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-black">{currency(part.total)}</p>
                      <button type="button" className="icon-button h-8 w-8" onClick={() => setRemovePartCandidate(part)} aria-label="Remove part">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm muted">No parts added yet.</p>
              )}
            </div>
          </div>

          <form className="surface p-5" onSubmit={saveBill}>
            <h2 className="text-xl font-black">Create Bill / Generate PDF</h2>
            <div className="mt-4 grid gap-3">
              <label>
                <span className="label">Service charge</span>
                <input className="input" type="number" min="0" step="0.01" value={bill.serviceCharge} onChange={(event) => setBill((current) => ({ ...current, serviceCharge: event.target.value }))} />
              </label>
              <label>
                <span className="label">Discount</span>
                <input className="input" type="number" min="0" step="0.01" value={bill.discount} onChange={(event) => setBill((current) => ({ ...current, discount: event.target.value }))} />
              </label>
              <label>
                <span className="label">Payment status</span>
                <select className="input" value={bill.paymentStatus} onChange={(event) => setBill((current) => ({ ...current, paymentStatus: event.target.value }))}>
                  <option>Unpaid</option>
                  <option>Partially Paid</option>
                  <option>Paid</option>
                </select>
              </label>
              <label>
                <span className="label">Bill notes</span>
                <textarea className="input min-h-24" value={bill.billNotes} onChange={(event) => setBill((current) => ({ ...current, billNotes: event.target.value }))} />
              </label>
              <button type="submit" className="btn btn-primary">
                <Save className="h-4 w-4" />
                Save Bill
              </button>
            </div>
          </form>

          <div className="surface p-5">
            <h2 className="text-xl font-black">PDF Documents</h2>
            <div className="mt-4 grid gap-2">
              {pdfTypes.map((type) => (
                <button key={type.value} type="button" className="btn btn-secondary justify-start" onClick={() => generate(type.value)}>
                  <FileText className="h-4 w-4" />
                  Generate {type.label}
                </button>
              ))}
            </div>
            <div className="mt-5 grid gap-2">
              {data.pdfs?.length ? (
                data.pdfs.map((pdf) => (
                  <button key={pdf.id} type="button" className="flex items-center justify-between gap-3 rounded-card bg-[var(--surface-2)] p-3 text-left text-sm" onClick={() => downloadPdf(pdf)}>
                    <span>
                      <span className="font-bold">{pdf.type}</span>
                      <span className="block muted">{formatDate(pdf.created_at)} Â· {pdf.generated_by_name}</span>
                    </span>
                    <Download className="h-4 w-4 shrink-0" />
                  </button>
                ))
              ) : (
                <p className="text-sm muted">No PDFs generated yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      {removePartCandidate ? (
        <ConfirmModal
          title="Remove part from booking?"
          message={`Remove ${removePartCandidate.part_name} from this booking's parts list.`}
          confirmLabel="Remove Part"
          onCancel={() => setRemovePartCandidate(null)}
          onConfirm={() => removePart(removePartCandidate.id)}
        />
      ) : null}
    </>
  );
}

export function CallRequestsPage() {
  const { request } = useAuth();
  const { push } = useToast();
  const { data, loading, error, reload } = useResource(() => request('/call-requests'), [request]);

  async function convert(item) {
    try {
      await request(`/call-requests/${item.id}/convert`, {
        method: 'POST',
        body: JSON.stringify({
          serviceType: item.service_interest || 'General Service',
          address: 'Address to be updated'
        })
      });
      push('Call request converted to booking');
      reload();
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function updateStatus(id, status) {
    try {
      await request(`/call-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      push('Call request updated');
      reload();
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <>
      <PageHeader title="Call Requests" eyebrow="Admin">
        Contact form submissions are stored here and can be converted to bookings.
      </PageHeader>
      {!data.requests?.length ? (
        <EmptyState title="No call requests" />
      ) : (
        <div className="grid gap-4">
          {data.requests.map((item) => (
            <div key={item.id} className="surface p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-black">{item.name}</h2>
                  <p className="mt-1 text-sm muted">{item.phone}</p>
                  <p className="mt-2 text-sm font-semibold">{item.service_interest || 'General enquiry'}</p>
                  <p className="mt-2 text-sm leading-6 muted">{item.message || 'No message provided.'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select className="input w-40 py-2" value={item.status} onChange={(event) => updateStatus(item.id, event.target.value)}>
                    {['New', 'Contacted', 'Converted', 'Closed'].map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-primary" onClick={() => convert(item)} disabled={item.status === 'Converted'}>
                    Convert
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function PartsPage() {
  const { request } = useAuth();
  const { push } = useToast();
  const [confirm, setConfirm] = useState(null);
  const [form, setForm] = useState({ partName: '', category: '', costPrice: 0, sellingPrice: 0, availableStock: 0, lowStockLimit: 0 });
  const { data, loading, error, reload } = useResource(() => request('/inventory'), [request]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    try {
      await request('/inventory', { method: 'POST', body: JSON.stringify(form) });
      push('Inventory part saved');
      setForm({ partName: '', category: '', costPrice: 0, sellingPrice: 0, availableStock: 0, lowStockLimit: 0 });
      reload();
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function deletePart() {
    try {
      await request(`/inventory/${confirm.id}`, { method: 'DELETE' });
      push('Inventory part deleted');
      setConfirm(null);
      reload();
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <>
      <PageHeader title="Manage Parts" eyebrow="Admin">
        Inventory is optional. Billing can still use manual parts that are not listed here.
      </PageHeader>
      <form className="surface mb-5 grid gap-3 p-5 md:grid-cols-3" onSubmit={submit}>
        <input className="input" placeholder="Part name" value={form.partName} onChange={(event) => update('partName', event.target.value)} />
        <input className="input" placeholder="Category" value={form.category} onChange={(event) => update('category', event.target.value)} />
        <input className="input" type="number" min="0" step="0.01" placeholder="Cost price" value={form.costPrice} onChange={(event) => update('costPrice', event.target.value)} />
        <input className="input" type="number" min="0" step="0.01" placeholder="Selling price" value={form.sellingPrice} onChange={(event) => update('sellingPrice', event.target.value)} />
        <input className="input" type="number" min="0" step="0.01" placeholder="Available stock" value={form.availableStock} onChange={(event) => update('availableStock', event.target.value)} />
        <input className="input" type="number" min="0" step="0.01" placeholder="Low stock limit" value={form.lowStockLimit} onChange={(event) => update('lowStockLimit', event.target.value)} />
        <button type="submit" className="btn btn-primary md:col-span-3">
          <Boxes className="h-4 w-4" />
          Save Part
        </button>
      </form>
      {!data.parts?.length ? (
        <EmptyState title="No inventory parts" />
      ) : (
        <div className="table-wrap bg-[var(--surface)]">
          <table className="data-table">
            <thead>
              <tr>
                <th>Part Name</th>
                <th>Category</th>
                <th>Cost</th>
                <th>Selling</th>
                <th>Stock</th>
                <th>Low Limit</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {data.parts.map((part) => (
                <tr key={part.id}>
                  <td className="font-bold">{part.part_name}</td>
                  <td>{part.category || '-'}</td>
                  <td>{currency(part.cost_price)}</td>
                  <td>{currency(part.selling_price)}</td>
                  <td>{part.available_stock}</td>
                  <td>{part.low_stock_limit}</td>
                  <td>
                    <button type="button" className="icon-button h-9 w-9" onClick={() => setConfirm(part)} aria-label="Delete part">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {confirm ? (
        <ConfirmModal
          title="Delete inventory part permanently?"
          message={`Delete ${confirm.part_name} from inventory only if it is unused. Linked records are protected.`}
          onCancel={() => setConfirm(null)}
          onConfirm={deletePart}
          confirmLabel="Delete Permanently"
        />
      ) : null}
    </>
  );
}

export function EmployeesPage() {
  const { request } = useAuth();
  const { push } = useToast();
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'technician', phone: '' });
  const { data, loading, error, reload } = useResource(() => request('/users'), [request]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    try {
      await request('/users', { method: 'POST', body: JSON.stringify(form) });
      push('Employee created');
      setForm({ username: '', password: '', name: '', role: 'technician', phone: '' });
      reload();
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function toggle(user) {
    try {
      await request(`/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ active: !user.active }) });
      push('Employee updated');
      reload();
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <>
      <PageHeader title="Employee Management" eyebrow="Admin">
        Manage admin and technician accounts used for role-based access.
      </PageHeader>
      <form className="surface mb-5 grid gap-3 p-5 md:grid-cols-3" onSubmit={submit}>
        <input className="input" placeholder="Username" value={form.username} onChange={(event) => update('username', event.target.value)} />
        <input className="input" placeholder="Password" value={form.password} onChange={(event) => update('password', event.target.value)} />
        <input className="input" placeholder="Employee name" value={form.name} onChange={(event) => update('name', event.target.value)} />
        <select className="input" value={form.role} onChange={(event) => update('role', event.target.value)}>
          <option value="technician">Technician</option>
          <option value="admin">Admin</option>
        </select>
        <input className="input" placeholder="Phone" value={form.phone} onChange={(event) => update('phone', event.target.value)} />
        <button type="submit" className="btn btn-primary md:col-span-3">
          <UserPlus className="h-4 w-4" />
          Create Employee
        </button>
      </form>

      <div className="table-wrap bg-[var(--surface)]">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {data.users.map((item) => (
              <tr key={item.id}>
                <td className="font-bold">{item.name}</td>
                <td>{item.username}</td>
                <td>{item.role}</td>
                <td>{item.phone || '-'}</td>
                <td>{item.active ? 'Active' : 'Inactive'}</td>
                <td>
                  <button type="button" className="btn btn-secondary py-2" onClick={() => toggle(item)}>
                    {item.active ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function PdfManagementPage() {
  const { request, token } = useAuth();
  const { push } = useToast();
  const { data, loading, error } = useResource(() => request('/pdfs'), [request]);

  async function download(pdf) {
    try {
      const response = await fetch(`${apiBase}/pdfs/${pdf.id}/download`, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await response.blob();
      if (!response.ok) throw new Error('PDF download failed');
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = pdf.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <>
      <PageHeader title="PDF Management" eyebrow="Admin">
        View and download generated quotations, invoices, and service completed documents.
      </PageHeader>
      {!data.pdfs?.length ? (
        <EmptyState title="No PDFs generated" />
      ) : (
        <div className="table-wrap bg-[var(--surface)]">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Booking</th>
                <th>Customer</th>
                <th>Generated By</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {data.pdfs.map((pdf) => (
                <tr key={pdf.id}>
                  <td className="font-bold">{pdf.type}</td>
                  <td>{pdf.booking_code}</td>
                  <td>{pdf.customer_name}</td>
                  <td>{pdf.generated_by_name}</td>
                  <td>{formatDate(pdf.created_at)}</td>
                  <td>
                    <button type="button" className="btn btn-secondary py-2" onClick={() => download(pdf)}>
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function ReportsPage() {
  return <AdminDashboard />;
}

export function SettingsPage() {
  const { request, token } = useAuth();
  const { push } = useToast();
  const [restoreText, setRestoreText] = useState('');
  const { data, loading, error, reload } = useResource(() => request('/settings'), [request]);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    if (data?.settings) setSettings(data.settings);
  }, [data]);

  async function save(event) {
    event.preventDefault();
    try {
      await request('/settings', { method: 'PATCH', body: JSON.stringify(settings) });
      push('Settings saved');
      reload();
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function exportBackup() {
    try {
      const response = await fetch(`${apiBase}/backup/export`, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await response.blob();
      if (!response.ok) throw new Error('Backup export failed');
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `universal-systems-backup-${Date.now()}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function restoreBackup() {
    try {
      const payload = JSON.parse(restoreText);
      await request('/backup/restore', { method: 'POST', body: JSON.stringify(payload) });
      push('Backup restored');
      setRestoreText('');
      reload();
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <>
      <PageHeader title="Settings" eyebrow="Admin">
        Store simple settings, export backup, and restore backup data.
      </PageHeader>
      <div className="grid gap-5 lg:grid-cols-2">
        <form className="surface p-5" onSubmit={save}>
          <h2 className="text-xl font-black">System Settings</h2>
          <div className="mt-4 grid gap-3">
            {Object.entries(settings).map(([key, value]) => (
              <label key={key}>
                <span className="label">{key}</span>
                <input className="input" value={value} onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.value }))} />
              </label>
            ))}
          </div>
          <button type="submit" className="btn btn-primary mt-4">
            <Save className="h-4 w-4" />
            Save Settings
          </button>
        </form>
        <div className="surface p-5">
          <h2 className="text-xl font-black">Backup & Restore</h2>
          <button type="button" className="btn btn-primary mt-4" onClick={exportBackup}>
            <Download className="h-4 w-4" />
            Export Backup
          </button>
          <label className="mt-5 block">
            <span className="label">Restore backup JSON</span>
            <textarea className="input min-h-44" value={restoreText} onChange={(event) => setRestoreText(event.target.value)} />
          </label>
          <button type="button" className="btn btn-secondary mt-3" onClick={restoreBackup} disabled={!restoreText.trim()}>
            <ArchiveRestore className="h-4 w-4" />
            Restore Backup
          </button>
        </div>
      </div>
    </>
  );
}

export function TechnicianProfilePage() {
  const { request, user, setUser } = useAuth();
  const { push } = useToast();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', password: '' });

  async function submit(event) {
    event.preventDefault();
    try {
      const result = await request('/auth/profile', { method: 'PATCH', body: JSON.stringify(form) });
      setUser(result.user);
      setForm((current) => ({ ...current, password: '' }));
      push('Profile updated');
    } catch (err) {
      push(err.message, 'error');
    }
  }

  return (
    <>
      <PageHeader title="My Profile" eyebrow="Technician">
        Update your employee profile and password.
      </PageHeader>
      <form className="surface max-w-2xl p-5" onSubmit={submit}>
        <div className="grid gap-4">
          <label>
            <span className="label">Name</span>
            <input className="input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label>
            <span className="label">Phone</span>
            <input className="input" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          </label>
          <label>
            <span className="label">New password</span>
            <input className="input" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
          </label>
        </div>
        <button type="submit" className="btn btn-primary mt-5">
          <Save className="h-4 w-4" />
          Save Profile
        </button>
      </form>
    </>
  );
}
