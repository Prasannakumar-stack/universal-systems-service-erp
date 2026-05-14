import {
  AlertTriangle,
  amcContractTypes,
  amcFrequencies,
  AmcStatusBadge,
  amcWhatsappHref,
  apiBase,
  assetBase,
  averageHours,
  Bar,
  BarChart,
  Bell,
  bookingLabel,
  BookingSourceBadge,
  bookingSources,
  bookingSourceValue,
  BookOpenCheck,
  Boxes,
  buildSevenDaySeries,
  CalendarClock,
  callHref,
  CartesianGrid,
  CheckCircle2,
  ClipboardList,
  company,
  completionHours,
  ConfirmModal,
  CreditCard,
  csvCell,
  currency,
  customerCode,
  customerFromOrder,
  customerPhone,
  customerTabs,
  customerTypeLabel,
  customerWhatsAppHref,
  DashboardChart,
  dateInputValue,
  dateInRange,
  deviceCategory,
  deviceTypes,
  Download,
  downloadCsv,
  DueStatusBadge,
  Edit3,
  EmptyState,
  endOfDay,
  ErrorBlock,
  FileText,
  filterByRange,
  findInvoice,
  formatDate,
  getPdfLabel,
  inventoryCategories,
  InventoryStatusBadge,
  inventoryStockStatus,
  invoiceDueAmount,
  isActiveJob,
  isCompletedJob,
  isSameDay,
  isTechnicianOverdueJob,
  isTechnicianTodayJob,
  isToday,
  jobPriority,
  jobScheduleLabel,
  KeyRound,
  latestDate,
  Line,
  LineChart,
  Link,
  Loader2,
  LoadingBlock,
  monthKey,
  MovementTypeBadge,
  normalizeReportSection,
  NotificationsPanel,
  PackagePlus,
  PageHeader,
  pdfAllowed,
  pdfLockedReason,
  percentage,
  PhoneCallIcon,
  Plus,
  preserveScroll,
  quickStockSources,
  ReceiptText,
  recordId,
  RemindersPanel,
  ReportBar,
  reportRangeBounds,
  reportRangeOptions,
  reportSections,
  ReportsNavigation,
  ReportsRangeBar,
  ResponsiveContainer,
  Save,
  SearchBox,
  Send,
  serviceTypeBucket,
  serviceTypes,
  ShieldCheck,
  SmartMetricCard,
  startOfDay,
  StatCard,
  StatusBadge,
  statusTone,
  Table,
  technicianAllowedStatuses,
  TechnicianJobCard,
  technicianJobFilters,
  TechnicianJobsView,
  TechnicianLoadingCards,
  technicianWhatsAppHref,
  technicianWorkOrderTabs,
  timelineIcon,
  Tooltip,
  Trash2,
  uploadedAssetUrl,
  useAuth,
  useCallback,
  useEffect,
  useLocation,
  useMemo,
  useNavigate,
  useParams,
  useRef,
  useResource,
  UserRound,
  Users,
  useState,
  useToast,
  WorkflowTracker,
  workOrderDetailStatuses,
  workOrderPdfFlows,
  workOrderTabs,
  workStatuses,
  Wrench,
  X,
  XAxis,
  YAxis
} from '../../shared/phase1Shared.jsx';

export function WorkOrderDetailsPage({ role = 'admin' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { request, token } = useAuth();
  const { push } = useToast();
  const [note, setNote] = useState('');
  const [part, setPart] = useState({ partName: '', quantity: 1, unitPrice: 0 });
  const [partRequest, setPartRequest] = useState({ inventoryPartId: '', partName: '', quantity: 1, note: '' });
  const [inventoryParts, setInventoryParts] = useState([]);
  const [serviceCharge, setServiceCharge] = useState(0);
  const [labourCharge, setLabourCharge] = useState(0);
  const [pdfBusy, setPdfBusy] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [photoFiles, setPhotoFiles] = useState([]);
  const { data, loading, error, reload } = useResource(() => request(`/work-orders/${id}`), [request, id]);
  const order = data?.workOrder;

  useEffect(() => {
    if (!order) return;
    setServiceCharge(order.serviceCharge || 0);
    setLabourCharge(order.serviceCharge || 0);
  }, [order?.id, order?.serviceCharge]);

  useEffect(() => {
    request('/inventory').then((result) => setInventoryParts(result.parts || [])).catch(() => {});
  }, [request]);

  async function saveStatus(nextStatus) {
    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) });
        push('Status updated');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function addNote(event) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/notes`, { method: 'POST', body: JSON.stringify({ text: note }) });
        setNote('');
        push('Note added');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  function handlePartSelect(value) {
    const selected = inventoryParts.find((item) => item.id === value);
    setPart((current) => ({
      ...current,
      inventoryPartId: value,
      partName: selected?.partName || '',
      unitPrice: selected?.sellingPrice || current.unitPrice,
      quantity: current.quantity || 1
    }));
  }

  function handlePartQuantityChange(value) {
    let quantity = Number(value);
    if (!quantity || quantity < 1) quantity = 1;
    setPart((current) => ({ ...current, quantity }));
  }

  async function addPart(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (!part.inventoryPartId && !String(part.partName || '').trim()) {
      push('Please select a part', 'error');
      return;
    }
    if (selectedPartOutOfStock) {
      push('Out of stock — choose another part for demo', 'error');
      return;
    }

    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/parts`, { method: 'POST', body: JSON.stringify(part) });
        setPart({ partName: '', quantity: 1, unitPrice: 0 });
        push('Part added');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function removePart(partId, event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/parts/${partId}`, { method: 'DELETE' });
        push('Part removed');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function requestPart(event) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/part-requests`, { method: 'POST', body: JSON.stringify(partRequest) });
        setPartRequest({ inventoryPartId: '', partName: '', quantity: 1, note: '' });
        push('Part requested');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function generateInvoice(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    try {
      await preserveScroll(async () => {
        await request('/invoices', { method: 'POST', body: JSON.stringify({ workOrderId: id, labourCharge: serviceCharge || labourCharge }) });
        push('Invoice generated');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function saveServiceCharge(event) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/service-charge`, {
          method: 'PATCH',
          body: JSON.stringify({ serviceCharge })
        });
        push('Service charge updated');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function autoAssignDetail(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/auto-assign`, { method: 'POST' });
        push('Service job auto-assigned');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function downloadPdfFile(type, fallbackFilename) {
    const response = await fetch(`${apiBase}/work-orders/${id}/pdf/${type}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'PDF download failed');
    }
    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition') || '';
    const filename = disposition.match(/filename="?([^"]+)"?/i)?.[1] || fallbackFilename;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadWorkflowPdf(flow) {
    try {
      await preserveScroll(async () => {
        setPdfBusy(`download-${flow.type}`);
        await downloadPdfFile(flow.type, flow.filename);
        push(`${flow.title} generated`);
      });
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setPdfBusy('');
    }
  }

  async function previewWorkflowPdf(flow) {
    try {
      await preserveScroll(async () => {
        const authToken = token || localStorage.getItem('us_token') || localStorage.getItem('adminToken') || localStorage.getItem('token');
        const response = await fetch(`${apiBase}/work-orders/${id}/pdf/${flow.type}?preview=true`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        });
        if (!response.ok) throw new Error('PDF preview failed');
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      });
    } catch (err) {
      console.error('PDF preview error:', err);
      push('PDF preview failed. Please login again.', 'error');
    }
  }

  async function sendWorkflowPdf(flow) {
    const phone = order.customerId?.phone || '';
    if (!phone) {
      push('Customer phone number not available', 'error');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const whatsappPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    const message =
      `Hello ${order.customerId?.name || 'Customer'},\n\n` +
      `Your ${getPdfLabel(flow.type)} from Universal Systems is ready.\n\n` +
      `Service: ${order.serviceType || order.service || '-'}\n` +
      `Device: ${order.device || '-'}\n` +
      `Total: ${currency(totalAmount || 0)}\n\n` +
      `Please contact Universal Systems to receive the PDF.\n\n` +
      `Please review and reply with:\n` +
      `APPROVE\n` +
      `DENY\n\n` +
      `Thank you,\nUniversal Systems`;

    window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');

    try {
      await preserveScroll(async () => {
        setPdfBusy(`send-${flow.type}`);
        await request(`/work-orders/${id}/documents/${flow.type}/sent`, {
          method: 'PATCH',
          body: JSON.stringify({
            sentVia: 'WhatsApp',
            sentAt: new Date().toISOString()
          })
        });
        push('WhatsApp opened and marked as sent');
        reload({ silent: true });
      });
    } catch (err) {
      push('WhatsApp opened, but status not saved', 'error');
    } finally {
      setPdfBusy('');
    }
  }

  async function handleApproval(approvalStatus) {
    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/approval`, {
          method: 'PATCH',
          body: JSON.stringify({ approvalStatus })
        });
        push(approvalStatus === 'approved' ? 'Marked as Approved' : 'Marked as Denied');
        reload({ silent: true });
      });
    } catch (err) {
      push('Failed to update approval', 'error');
    }
  }

  async function uploadPhotos(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!photoFiles.length) {
      push('Select at least one photo', 'error');
      return;
    }

    const formData = new FormData();
    photoFiles.forEach((file) => formData.append('images', file));

    try {
      await preserveScroll(async () => {
        const response = await fetch(`${apiBase}/work-orders/${id}/images`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || 'Photo upload failed');
        setPhotoFiles([]);
        push('Photo uploaded');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  const partsTotal = (order.partsUsed || []).reduce((sum, item) => sum + Number(item.total || 0), 0);
  const savedServiceCharge = Number(order.serviceCharge || 0);
  const currentServiceCharge = Number(serviceCharge || 0);
  const totalAmount = partsTotal + currentServiceCharge;
  const imageItems = (order.images?.length ? order.images : order.bookingId?.problemImage?.url ? [order.bookingId.problemImage] : []) || [];
  const rawCustomerId = recordId(order.customerId) || recordId(order.bookingId) || order.id || order._id || '';
  const customerId = `US-${String(rawCustomerId).slice(-4).toUpperCase()}`;
  const livePartTotal = Number(part.unitPrice || 0) * Number(part.quantity || 1);
  const selectedInventoryPart = inventoryParts.find((item) => item.id === part.inventoryPartId);
  const selectedPartAvailable = Number(selectedInventoryPart?.available || 0);
  const selectedPartOutOfStock = Boolean(selectedInventoryPart && selectedPartAvailable <= 0);
  const contentTabs = ['parts', 'partRequests', 'billing', 'notes'];
  const sideTabs = ['documents', 'timeline'];
  const phone = customerPhone(order);

  if (role === 'technician') {
    return (
      <div className="work-order-detail pb-28 sm:pb-0">
        <PageHeader
          title="Technician Job"
          eyebrow={bookingLabel(order)}
          action={(
            <div className="flex flex-wrap gap-2">
              <a className={`btn btn-secondary ${phone ? '' : 'pointer-events-none opacity-50'}`} href={callHref(phone)}><PhoneCallIcon className="h-4 w-4" />Call</a>
              <a className={`btn btn-primary ${phone ? '' : 'pointer-events-none opacity-50'}`} href={technicianWhatsAppHref(order)} target="_blank" rel="noreferrer"><Send className="h-4 w-4" />WhatsApp</a>
            </div>
          )}
        >
          {order.customerId?.name || 'Customer'} - {order.device || 'Service job'}
        </PageHeader>

        <div className="surface mb-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Assigned Repair & Service Job</p>
              <h2 className="mt-1 text-2xl font-black">{bookingLabel(order)}</h2>
              <p className="mt-1 text-sm muted">{order.issue || 'No issue captured'}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Customer', order.customerId?.name || '-'],
              ['Phone', phone || '-'],
              ['Service Type', order.serviceType || order.service || '-'],
              ['Device', order.device || '-'],
              ['Priority', jobPriority(order)],
              ['Scheduled', jobScheduleLabel(order)],
              ['Technician', order.technicianId?.name || 'Assigned technician'],
              ['Created', formatDate(order.createdAt)]
            ].map(([label, value]) => (
              <div key={label} className="rounded-card bg-[var(--surface-2)] p-3">
                <p className="label">{label}</p>
                <p className="mt-1 text-sm font-bold">{value}</p>
              </div>
            ))}
          </div>
          {order.customerId?.address ? (
            <div className="mt-3 rounded-card bg-[var(--surface-2)] p-3">
              <p className="label">Address</p>
              <p className="mt-1 text-sm font-bold leading-6">{order.customerId.address}</p>
            </div>
          ) : null}
        </div>

        <div className="surface sticky top-20 z-20 mb-4 p-3">
          <div className="tabs-list">
            {technicianWorkOrderTabs.map((tab) => (
              <button key={tab.id} type="button" className={`tab-button ${activeTab === tab.id ? 'tab-button-active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' ? (
          <div className="grid gap-4 xl:grid-cols-[1fr_.8fr]">
            <div className="surface p-4">
              <h2 className="text-xl font-black">Overview</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ['Work Order ID', bookingLabel(order)],
                  ['Customer ID', customerId],
                  ['Customer name', order.customerId?.name || '-'],
                  ['Phone', phone || '-'],
                  ['Service', order.serviceType || order.service || '-'],
                  ['Device', order.device || '-'],
                  ['Problem / Issue', order.issue || '-'],
                  ['Booking Source', bookingSourceValue(order)],
                  ['Status', <StatusBadge status={order.status} />],
                  ['Completed Date', order.completedAt ? formatDate(order.completedAt) : 'Not completed']
                ].map(([label, value]) => (
                  <div key={label} className="rounded-card bg-[var(--surface-2)] p-3">
                    <p className="label">{label}</p>
                    <div className="mt-1 text-sm font-bold leading-5">{value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="surface p-4">
              <h2 className="text-xl font-black">Quick Contact</h2>
              <div className="mt-4 grid gap-3">
                <a className={`btn btn-secondary btn-lg ${phone ? '' : 'pointer-events-none opacity-50'}`} href={callHref(phone)}><PhoneCallIcon className="h-4 w-4" />Call Customer</a>
                <a className={`btn btn-primary btn-lg ${phone ? '' : 'pointer-events-none opacity-50'}`} href={technicianWhatsAppHref(order)} target="_blank" rel="noreferrer"><Send className="h-4 w-4" />Open WhatsApp</a>
                <Link className="btn btn-secondary btn-lg" to="/tech/work-orders">Back to My Jobs</Link>
              </div>
            </div>
            <WorkflowTracker status={order.status} />
          </div>
        ) : null}

        {activeTab === 'workUpdate' ? (
          <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
            <div className="surface p-4">
              <h2 className="text-xl font-black">Status Update</h2>
              <p className="mt-1 text-sm muted">Use the existing service job status workflow.</p>
              <div className="mt-4 grid gap-2">
                {technicianAllowedStatuses.map((status) => (
                  <button key={status} type="button" className={`btn ${order.status === status ? 'btn-primary' : 'btn-secondary'} justify-start`} onClick={() => saveStatus(status)}>
                    <CheckCircle2 className="h-4 w-4" />{status}
                  </button>
                ))}
              </div>
            </div>
            <form className="surface p-4" onSubmit={addNote}>
              <h2 className="text-xl font-black">Checklist / Work Update</h2>
              <p className="mt-1 text-sm muted">Add diagnosis, work done, customer instructions, or follow-up notes.</p>
              <textarea className="input mt-4 min-h-36" placeholder="Diagnosis / work update / follow-up needed" value={note} onChange={(event) => setNote(event.target.value)} />
              <button type="submit" className="btn btn-primary mt-3 w-full sm:w-auto">Add Work Update</button>
            </form>
          </div>
        ) : null}

        {activeTab === 'parts' ? (
          <div className="grid gap-4">
            <div className="surface p-4">
              <h2 className="text-xl font-black">Parts Used</h2>
              <div className="mt-4 grid gap-3">
                {order.partsUsed?.length ? order.partsUsed.map((item) => (
                  <div key={item._id || item.createdAt} className="rounded-card bg-[var(--surface-2)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-black">{item.name}</p>
                      <span className="status-badge">Qty {item.quantity}</span>
                    </div>
                    <p className="mt-1 text-sm muted">Unit: {currency(item.unitPrice)} - Total: {currency(item.total)}</p>
                  </div>
                )) : <EmptyState title="No parts added yet." message="Parts used for this service job will appear here." />}
              </div>
            </div>
            <div className="surface p-4">
              <h2 className="text-xl font-black">Add Part</h2>
              <form className="mt-4 grid gap-3 md:grid-cols-[1fr_120px_auto_auto]" onSubmit={addPart}>
                <select className="input" value={part.inventoryPartId || ''} onChange={(event) => handlePartSelect(event.target.value)}>
                  <option value="">Manual part</option>
                  {inventoryParts.map((item) => <option key={item.id} value={item.id}>{item.partName} - {item.available} available</option>)}
                </select>
                <input className="input" type="number" min="1" value={part.quantity} onChange={(event) => handlePartQuantityChange(event.target.value)} />
                <div className="rounded-card bg-[var(--surface-2)] px-3 py-2">
                  <p className="text-xs muted">Line Total</p>
                  <p className="text-sm font-black">{currency(livePartTotal)}</p>
                </div>
                <button type="submit" className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={selectedPartOutOfStock}><PackagePlus className="h-4 w-4" />Add Part</button>
              </form>
              {!part.inventoryPartId ? <input className="input mt-3" placeholder="Manual part name" value={part.partName} onChange={(event) => setPart((current) => ({ ...current, partName: event.target.value }))} /> : null}
              {selectedInventoryPart ? <p className="mt-3 text-sm muted">Using inventory price: {currency(part.unitPrice)}. Stock will be handled by the backend ledger.</p> : null}
              {selectedPartOutOfStock ? <p className="mt-2 text-sm font-semibold text-rose-100">Out of stock — choose another part for demo</p> : null}
              {selectedInventoryPart && selectedPartAvailable > 0 && Number(part.quantity || 0) > selectedPartAvailable ? <p className="mt-2 text-sm font-semibold text-amber-100">Stock warning: only {selectedPartAvailable} available. Backend stock rules will validate this when saved.</p> : null}
              <div className="mt-4 rounded-card bg-emerald-400/10 p-3 text-emerald-100">
                <p className="text-sm font-bold">Parts total: {currency(partsTotal)}</p>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'partRequests' ? (
          <div className="grid gap-4">
            <div className="surface p-4">
              <h2 className="text-xl font-black">Part Requests</h2>
              <div className="mt-4 grid gap-3">
                {order.partRequests?.length ? order.partRequests.map((item) => (
                  <div key={item._id || item.createdAt} className="rounded-card bg-[var(--surface-2)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-black">{item.name} x {item.quantity}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-1 text-sm muted">{item.note || 'No request note'}</p>
                    <p className="mt-1 text-xs muted">Requested by {item.userId?.name || item.userId?.username || 'Team'} - {formatDate(item.createdAt)}</p>
                  </div>
                )) : <EmptyState title="No part requests yet." message="Request parts when inventory or approval is needed." />}
              </div>
            </div>
            <form className="surface p-4" onSubmit={requestPart}>
              <h2 className="text-xl font-black">Request Part</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_110px_auto]">
                <select className="input" value={partRequest.inventoryPartId} onChange={(event) => {
                  const selected = inventoryParts.find((item) => item.id === event.target.value);
                  setPartRequest((current) => ({ ...current, inventoryPartId: event.target.value, partName: selected?.partName || '' }));
                }}>
                  <option value="">Manual request</option>
                  {inventoryParts.map((item) => <option key={item.id} value={item.id}>{item.partName} - {item.available} available</option>)}
                </select>
                <input className="input" type="number" min="1" value={partRequest.quantity} onChange={(event) => setPartRequest((current) => ({ ...current, quantity: event.target.value }))} />
                <button type="submit" className="btn btn-primary"><PackagePlus className="h-4 w-4" />Request</button>
              </div>
              {!partRequest.inventoryPartId ? <input className="input mt-3" placeholder="Requested part name" value={partRequest.partName} onChange={(event) => setPartRequest((current) => ({ ...current, partName: event.target.value }))} /> : null}
              <textarea className="input mt-3 min-h-24" placeholder="Reason / note" value={partRequest.note} onChange={(event) => setPartRequest((current) => ({ ...current, note: event.target.value }))} />
            </form>
          </div>
        ) : null}

        {activeTab === 'notes' ? (
          <div className="grid gap-4">
            <form className="surface p-4" onSubmit={addNote}>
              <h2 className="text-xl font-black">Technician Notes</h2>
              <textarea className="input mt-4 min-h-28" placeholder="Diagnosis, work done, customer instruction, follow-up needed" value={note} onChange={(event) => setNote(event.target.value)} />
              <button type="submit" className="btn btn-primary mt-3">Add Note</button>
            </form>
            <div className="surface p-4">
              <div className="grid gap-3">
                {order.notes?.length ? order.notes.map((item) => <div key={item._id || item.createdAt} className="rounded-card bg-[var(--surface-2)] p-3"><p>{item.text}</p><p className="mt-1 text-xs muted">{item.userId?.name || item.userId?.username || 'Team'} - {formatDate(item.createdAt)}</p></div>) : <EmptyState title="No technician notes yet." message="Add diagnosis, customer instruction, or work completion notes." />}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'photos' ? (
          <div className="grid gap-4">
            <div className="surface p-4">
              <h2 className="text-xl font-black">Photos / Problem Image</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {imageItems.length ? imageItems.map((image, index) => (
                  <a key={image.url || image.filename || index} className="rounded-card border border-[var(--line)] bg-[var(--surface-2)] p-4 transition hover:border-sky-300/60" href={uploadedAssetUrl(image.url)} target="_blank" rel="noreferrer">
                    <FileText className="mb-3 h-5 w-5 text-[var(--brand)]" />
                    <p className="font-black">{index === 0 ? 'Customer problem image' : `Service photo ${index}`}</p>
                    <p className="mt-1 text-sm muted">{image.originalName || image.filename || `Image ${index + 1}`}</p>
                  </a>
                )) : <EmptyState title="No image uploaded" message="Customer problem images and technician photos will appear here." />}
              </div>
            </div>
            <form className="surface p-4" onSubmit={uploadPhotos}>
              <h2 className="text-xl font-black">Upload Technician Photos</h2>
              <p className="mt-1 text-sm muted">Before service, after service, or other job attachments.</p>
              <input className="input mt-4" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => setPhotoFiles(Array.from(event.target.files || []))} />
              <button type="submit" className="btn btn-primary mt-3"><PackagePlus className="h-4 w-4" />Upload Photos</button>
            </form>
          </div>
        ) : null}

        {activeTab === 'documents' ? (
          <div className="surface p-4">
            <h2 className="text-xl font-black">Documents</h2>
            <p className="mt-1 text-sm muted">Technicians can view or download allowed PDFs. Billing and payment edits stay in admin.</p>
            <div className="mt-4 grid gap-3">
              {workOrderPdfFlows.map((flow) => {
                const enabled = pdfAllowed(flow, order);
                const downloading = pdfBusy === `download-${flow.type}`;
                return (
                  <div key={flow.type} className={`rounded-card border border-[var(--line)] bg-[var(--surface-2)] p-4 ${enabled ? '' : 'opacity-70'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black">{flow.title}</h3>
                        <p className="mt-1 text-xs font-semibold muted">Status requirement: {flow.statusText}</p>
                      </div>
                      <span className={`rounded px-2 py-1 text-xs font-bold ${enabled ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-100'}`}>{enabled ? 'Ready' : 'Locked'}</span>
                    </div>
                    <p className="mt-2 text-sm muted">{enabled ? flow.readyText : pdfLockedReason(flow, order)}</p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <button type="button" className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50" disabled={!enabled || Boolean(pdfBusy)} onClick={() => previewWorkflowPdf(flow)}><FileText className="h-4 w-4" />Preview PDF</button>
                      <button type="button" className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50" disabled={!enabled || Boolean(pdfBusy)} onClick={() => downloadWorkflowPdf(flow)}>{downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Download PDF</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sky-300/20 bg-[#061426]/95 p-3 shadow-2xl backdrop-blur sm:hidden">
          <div className="grid grid-cols-3 gap-2">
            <a className={`btn btn-secondary px-2 ${phone ? '' : 'pointer-events-none opacity-50'}`} href={callHref(phone)}><PhoneCallIcon className="h-4 w-4" />Call</a>
            <a className={`btn btn-secondary px-2 ${phone ? '' : 'pointer-events-none opacity-50'}`} href={technicianWhatsAppHref(order)} target="_blank" rel="noreferrer"><Send className="h-4 w-4" />WhatsApp</a>
            <button type="button" className="btn btn-primary px-2" onClick={() => saveStatus(order.status === 'Completed' ? 'Returned' : 'Completed')}><CheckCircle2 className="h-4 w-4" />Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="work-order-detail">
      <PageHeader title={bookingLabel(order)} eyebrow="Repair & Service Job Details">
        {order.customerId?.name || 'Customer'} - {order.device || 'Service job'}
      </PageHeader>

      <div className="surface mb-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Repair & Service Job</p>
            <h2 className="mt-1 text-2xl font-black">{bookingLabel(order)}</h2>
            <p className="mt-1 text-sm muted">{order.customerId?.name || 'Customer'} - {order.issue || 'No issue captured'}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Work Order ID', bookingLabel(order)],
            ['Customer', order.customerId?.name || '-'],
            ['Phone', order.customerId?.phone || '-'],
            ['Service Type', order.serviceType || order.service || '-'],
            ['Device', order.device || '-'],
            ['Status', <StatusBadge status={order.status} />],
            ['Priority', order.priority || (order.status === 'Awaiting Parts' ? 'High' : 'Normal')],
            ['Technician', order.technicianId?.name || 'Unassigned'],
            ['Created', formatDate(order.createdAt)],
            ['Completed', order.completedAt ? formatDate(order.completedAt) : 'Not completed']
          ].map(([label, value]) => (
            <div key={label} className="rounded-card bg-[var(--surface-2)] p-3">
              <p className="label">{label}</p>
              <p className="mt-1 text-sm font-bold">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="surface sticky top-20 z-20 mb-4 p-3">
        <div className="tabs-list">
          {workOrderTabs.map((tab) => (
            <button key={tab.id} type="button" className={`tab-button ${activeTab === tab.id ? 'tab-button-active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' ? <div className="grid gap-4">
      <div className="surface p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Overview</h2>
            <p className="mt-1 text-sm muted">Customer, device, issue, assignment, and status controls.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ['Customer ID', customerId],
            ['Service', order.serviceType || order.service || order.device || '-'],
            ['Customer Name', order.customerId?.name || '-'],
            ['Device', order.device || '-'],
            ['Phone', order.customerId?.phone || '-'],
            ['Problem', order.issue || '-'],
            ['Image', imageItems.length ? imageItems.map((image, index) => (
              <a key={image.url || image.filename || index} className="block text-sky-100 hover:text-[var(--brand)]" href={uploadedAssetUrl(image.url)} target="_blank" rel="noreferrer">
                {image.originalName || image.filename || `Image ${index + 1}`}
              </a>
            )) : 'No image uploaded'],
            ['Priority', order.priority || (order.status === 'Awaiting Parts' ? 'High' : 'Normal')],
            ['Technician', order.technicianId?.name || 'Unassigned'],
            ['Status', <StatusBadge status={order.status} />],
            ['Created Date', formatDate(order.createdAt)],
            ['Completed Date', order.completedAt ? formatDate(order.completedAt) : 'Not completed'],
            ['Booking Source', bookingSourceValue(order)]
          ].map(([label, value]) => (
            <div key={label} className="rounded-card bg-[var(--surface-2)] p-3">
              <p className="label">{label}</p>
              <div className="mt-1 text-sm font-bold leading-5">{value}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3">
          <div>
            <span className="label">Status Buttons</span>
            <div className="flex flex-wrap gap-2">
              {workOrderDetailStatuses.map((item) => (
                <button key={item} type="button" className={`btn ${order.status === item ? 'bg-blue-500 text-white shadow-lg ring-1 ring-blue-200/50 hover:bg-blue-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} px-4 py-2.5 text-sm font-semibold rounded-card`} onClick={() => saveStatus(item)}>
                  {item}
                </button>
              ))}
              {role === 'admin' && !order.technicianId ? <button type="button" className="btn btn-secondary" onClick={autoAssignDetail}>Auto Assign Technician</button> : null}
            </div>
          </div>
        </div>
      </div>
      <WorkflowTracker status={order.status} />
      </div> : null}

      {activeTab !== 'overview' ? <div className={`grid gap-4 ${sideTabs.includes(activeTab) ? '' : 'xl:grid-cols-[minmax(0,1fr)]'}`}>
        <div className={contentTabs.includes(activeTab) ? 'grid gap-4' : 'hidden'}>
          <div className={activeTab === 'parts' ? 'surface p-4' : 'hidden'}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black">Parts Used</h2>
            </div>
            <div className="mt-4 table-wrap bg-[var(--surface)]">
              <table className="data-table">
                <thead><tr><th>Part Name</th><th>Quantity</th><th>Unit Price</th><th>Total</th><th>Delete</th></tr></thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {order.partsUsed?.length ? order.partsUsed.map((item) => (
                    <tr key={item._id || item.createdAt}>
                      <td className="font-bold">{item.name}</td><td>{item.quantity}</td><td>{currency(item.unitPrice)}</td><td className="font-black">{currency(item.total)}</td>
                      <td><button type="button" className="icon-button h-9 w-9" onClick={(event) => removePart(item._id, event)} aria-label={`Delete ${item.name}`}><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  )) : <tr><td colSpan="5" className="muted">No parts added yet.</td></tr>}
                  <tr>
                    <td colSpan="5">
                      <form className="flex flex-col gap-3 md:flex-row md:items-center" onSubmit={(event) => event.preventDefault()}>
                        <select className="input flex-1" value={part.inventoryPartId || ''} onChange={(event) => handlePartSelect(event.target.value)}>
                          <option value="">Manual part</option>
                          {inventoryParts.map((item) => <option key={item.id} value={item.id}>{item.partName} - {item.available} available</option>)}
                        </select>
                        <input className="input md:w-20" type="number" min="1" value={part.quantity} onChange={(event) => handlePartQuantityChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addPart(event); }} />
                        <input className="input md:w-28" type="number" min="0" value={part.unitPrice} onChange={(event) => setPart((current) => ({ ...current, unitPrice: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter') addPart(event); }} />
                        <div className="rounded-card bg-[var(--surface-2)] px-3 py-2 text-right md:w-28">
                          <p className="text-xs muted">Line Total</p>
                          <p className="text-sm font-black">{currency(livePartTotal)}</p>
                        </div>
                        <button type="button" className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={selectedPartOutOfStock} onClick={addPart}><PackagePlus className="h-4 w-4" />+ Add Part</button>
                      </form>
                      {!part.inventoryPartId ? <input className="input mt-3" placeholder="Manual part name" value={part.partName} onChange={(event) => setPart((current) => ({ ...current, partName: event.target.value }))} /> : null}
                      {selectedPartOutOfStock ? <p className="mt-3 text-sm font-semibold text-rose-100">Out of stock — choose another part for demo</p> : null}
                      {selectedInventoryPart && selectedPartAvailable > 0 && Number(part.quantity || 0) > selectedPartAvailable ? <p className="mt-3 text-sm font-semibold text-amber-100">Stock warning: only {selectedPartAvailable} available. Backend stock rules will validate this when saved.</p> : null}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mt-4 pt-4 border-t border-gray-700">
              <div className="text-right">
                <p className="text-sm text-gray-400">Total Amount</p>
                <p className="text-2xl font-bold text-green-400">
                  {currency(partsTotal)}
                </p>
              </div>
            </div>
          </div>

          <div className={activeTab === 'partRequests' ? 'surface p-4' : 'hidden'}>
            <h2 className="text-xl font-black">Part Requests</h2>
            <div className="mt-4 grid gap-2">
              {order.partRequests?.length ? order.partRequests.map((item) => (
                <div key={item._id || item.createdAt} className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-[var(--surface-2)] p-3">
                  <span className="font-bold">
                    {item.name} x {item.quantity}
                    <span className="block text-xs font-normal muted">{item.note || 'No note'}</span>
                    <span className="block text-xs font-normal muted">Requested by {item.userId?.name || item.userId?.username || (item.userId ? 'Recorded user' : '-')} - {formatDate(item.createdAt)}</span>
                  </span>
                  <StatusBadge status={item.status} />
                </div>
              )) : <p className="text-sm muted">No part requests yet.</p>}
            </div>
            <form className="mt-4 grid gap-3 md:grid-cols-[1fr_110px_auto]" onSubmit={requestPart}>
              <select className="input" value={partRequest.inventoryPartId} onChange={(event) => {
                const selected = inventoryParts.find((item) => item.id === event.target.value);
                setPartRequest((current) => ({ ...current, inventoryPartId: event.target.value, partName: selected?.partName || '' }));
              }}>
                <option value="">Manual request</option>
                {inventoryParts.map((item) => <option key={item.id} value={item.id}>{item.partName} - {item.available} available</option>)}
              </select>
              <input className="input" type="number" min="1" value={partRequest.quantity} onChange={(event) => setPartRequest((current) => ({ ...current, quantity: event.target.value }))} />
              <button type="submit" className="btn btn-secondary"><PackagePlus className="h-4 w-4" />Request Part</button>
            </form>
            {!partRequest.inventoryPartId ? <input className="input mt-3" placeholder="Requested part name" value={partRequest.partName} onChange={(event) => setPartRequest((current) => ({ ...current, partName: event.target.value }))} /> : null}
            <input className="input mt-3" placeholder="Request note" value={partRequest.note} onChange={(event) => setPartRequest((current) => ({ ...current, note: event.target.value }))} />
          </div>

          <form className={activeTab === 'billing' ? 'surface p-4' : 'hidden'} onSubmit={saveServiceCharge}>
            <h2 className="text-xl font-black">Service Charge</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input className="input" type="number" min="0" step="0.01" value={serviceCharge} onChange={(event) => setServiceCharge(event.target.value)} />
              <button type="submit" className="btn btn-primary"><Save className="h-4 w-4" />Save Charge</button>
            </div>
            {savedServiceCharge !== currentServiceCharge ? <p className="mt-2 text-xs font-semibold text-amber-100">Unsaved service charge will update the saved total after saving.</p> : null}
          </form>

          <div className={activeTab === 'billing' ? 'surface p-4' : 'hidden'}>
            <h2 className="text-xl font-black">Summary</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-card bg-[var(--surface-2)] p-4"><p className="text-sm muted">Parts Total</p><p className="mt-2 text-xl font-black">{currency(partsTotal)}</p></div>
              <div className="rounded-card bg-[var(--surface-2)] p-4"><p className="text-sm muted">Service Charge</p><p className="mt-2 text-xl font-black">{currency(currentServiceCharge)}</p></div>
              <div className="rounded-card border border-green-500 bg-green-900/30 p-4 text-emerald-50"><p className="text-sm text-gray-400">Total Amount</p><p className="mt-2 text-2xl font-bold text-green-400">{currency(totalAmount)}</p></div>
            </div>
            <div className="mt-5 rounded-card bg-[var(--surface-2)] p-4">
              <h3 className="font-black">Invoice</h3>
              {order.invoiceId ? (
                <div className="mt-3">
                  <p className="font-bold">{order.invoiceId.invoiceNumber}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-card bg-[var(--surface)] p-3">
                      <p className="text-xs font-bold muted">Invoice Status</p>
                      <div className="mt-2"><StatusBadge status={order.invoiceId.status} /></div>
                    </div>
                    <div className="rounded-card bg-emerald-500/10 p-3 text-emerald-100">
                      <p className="text-xs font-bold text-emerald-200/80">Paid Amount</p>
                      <p className="mt-2 text-lg font-black">{currency(order.invoiceId.paidAmount)}</p>
                    </div>
                    <div className={`rounded-card p-3 ${Number(order.invoiceId.balance || 0) > 0 ? 'bg-amber-500/10 text-amber-100' : 'bg-emerald-500/10 text-emerald-100'}`}>
                      <p className="text-xs font-bold opacity-80">Balance Amount</p>
                      <p className="mt-2 text-lg font-black">{currency(order.invoiceId.balance)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {role === 'admin' ? <button type="button" className="btn btn-secondary py-2" onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const invoice = order.invoiceId;
                      const targetInvoiceId = invoice.id || invoice._id || invoice.invoiceId || invoice.number;
                      if (!targetInvoiceId) {
                        alert('Invoice not found. Please generate invoice first.');
                        return;
                      }
                      navigate(`/admin/payments?invoiceId=${encodeURIComponent(targetInvoiceId)}`);
                    }}>Go to Payments</button> : null}
                  </div>
                </div>
              ) : role === 'admin' ? (
                <button type="button" className="btn btn-primary mt-3" onClick={generateInvoice}><ReceiptText className="h-4 w-4" />Generate Invoice</button>
              ) : <p className="mt-3 text-sm muted">Invoice not generated yet.</p>}
            </div>
          </div>

          <div className={activeTab === 'notes' ? 'surface p-4' : 'hidden'}>
            <h2 className="text-xl font-black">Notes</h2>
            <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={addNote}>
              <input className="input" placeholder="Add technician note" value={note} onChange={(event) => setNote(event.target.value)} />
              <button type="submit" className="btn btn-primary">Add Note</button>
            </form>
            <div className="mt-4 grid gap-3">{order.notes?.length ? order.notes.map((item) => <div key={item._id || item.createdAt} className="rounded-card bg-[var(--surface-2)] p-3"><p>{item.text}</p><p className="mt-1 text-xs muted">{item.userId?.name || item.userId?.username || (item.userId ? 'Recorded user' : 'Team')} - {formatDate(item.createdAt)}</p></div>) : <p className="text-sm muted">No notes yet.</p>}</div>
          </div>
        </div>
        <div className={sideTabs.includes(activeTab) ? 'grid content-start gap-4' : 'hidden'}>
          <div className={activeTab === 'documents' ? 'surface p-4' : 'hidden'}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black">PDF Workflow</h2>
              {role === 'admin' ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold muted">Approval: {order.approvalStatus || 'pending'}</span>
                  <button type="button" className="rounded bg-green-600 px-3 py-1 text-sm font-bold text-white" onClick={() => handleApproval('approved')}>Approve</button>
                  <button type="button" className="rounded bg-red-600 px-3 py-1 text-sm font-bold text-white" onClick={() => handleApproval('denied')}>Deny</button>
                </div>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3">
              {workOrderPdfFlows.map((flow) => {
                const enabled = pdfAllowed(flow, order);
                const downloading = pdfBusy === `download-${flow.type}`;
                const sending = pdfBusy === `send-${flow.type}`;
                return (
                  <div key={flow.type} className={`rounded-card border border-[var(--line)] bg-[var(--surface-2)] p-4 ${enabled ? '' : 'opacity-70'}`}>
                    <div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{flow.title}</h3><p className="mt-1 text-xs font-semibold muted">Status requirement: {flow.statusText}</p></div><FileText className="h-5 w-5 shrink-0 text-[var(--brand)]" /></div>
                    <span className={`mt-3 inline-flex rounded px-2 py-1 text-xs font-bold ${enabled ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-100'}`}>
                      {enabled ? 'Ready' : 'Locked'}
                    </span>
                    <p className="mt-2 text-sm muted">{enabled ? flow.readyText : pdfLockedReason(flow, order)}</p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <button type="button" className="btn btn-secondary px-3 disabled:cursor-not-allowed disabled:opacity-50" disabled={!enabled || Boolean(pdfBusy)} onClick={() => previewWorkflowPdf(flow)}><FileText className="h-4 w-4" />Preview PDF</button>
                      <button type="button" className="btn btn-secondary px-3 disabled:cursor-not-allowed disabled:opacity-50" disabled={!enabled || Boolean(pdfBusy)} onClick={() => downloadWorkflowPdf(flow)}>{downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Download PDF</button>
                      <button type="button" className="btn btn-primary px-3 disabled:cursor-not-allowed disabled:opacity-50" disabled={!enabled || Boolean(pdfBusy)} onClick={() => sendWorkflowPdf(flow)}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}WhatsApp</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={activeTab === 'timeline' ? 'surface p-4' : 'hidden'}>
            <h2 className="text-xl font-black">Timeline</h2>
            <div className="mt-4 grid gap-3">{order.timeline?.length ? order.timeline.map((item) => <div key={item.createdAt} className="rounded-card border border-[var(--line)] p-3"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-sky-400/15 px-2.5 py-1 text-xs font-black text-sky-100">{timelineIcon(item)}</span><StatusBadge status={item.status} /></div><p className="mt-2 text-sm">{item.message}</p><p className="mt-1 text-xs muted">{formatDate(item.createdAt)}</p></div>) : <p className="text-sm muted">No timeline entries yet.</p>}</div>
          </div>
        </div>
      </div> : null}
    </div>
  );
}
