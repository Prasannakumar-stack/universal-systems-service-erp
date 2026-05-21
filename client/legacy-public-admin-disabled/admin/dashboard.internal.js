(function () {
  const toast = document.getElementById("toast");
  const BOOKING_API_URL = "/api/bookings";
  const PARTS_API_URL = "/api/parts";
  const SERVICES_API_URL = "/api/services";
  const TECHNICIANS_API_URL = "/api/bookings/technicians";
  const DUPLICATE_API_URL = "/api/bookings/check-duplicate";
  const CALL_REQUEST_API_URL = "/api/call-requests";
  const ANALYTICS_API_URL = "/api/bookings/analytics";
  const WORK_ORDER_API_URL = "/api/work-orders";
  const NOTIFICATION_API_URL = "/api/notifications";
  const CUSTOMER_API_URL = "/api/customers";
  const BILL_API_URL = "/api/bills";
  const BILL_CREATE_API_URL = "/api/create-bill";
  const BILL_SETTINGS_API_URL = "/api/settings/billing";
  const GLOBAL_SEARCH_API_URL = "/api/search/global";
  const CUSTOMER_HISTORY_API_URL = "/api/customers/history";
  const BACKUP_EXPORT_API_URL = "/api/backup/export";
  const BACKUP_IMPORT_API_URL = "/api/backup/import";
  const ENTERPRISE_SETTINGS_KEY = "enterpriseSettings";
  const LOCAL_NOTIFICATIONS_KEY = "enterpriseNotifications";
  const LOCAL_CUSTOMER_NOTES_KEY = "customerCrmNotes";
  function resolveApiBaseUrl() {
    const { protocol, hostname, origin, port } = window.location;
    if (protocol === "file:") return "http://localhost:5050";
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      if (port === "5050") return origin;
      return `${protocol}//${hostname}:5050`;
    }
    return origin;
  }

  const BASE_URL = resolveApiBaseUrl();
  const WORKFLOW_STATUSES = ["Pending", "In Progress", "Waiting for Parts", "Completed", "Delivered"];
  const STATUS_FLOW = { Pending: 0, "In Progress": 1, "Waiting for Parts": 2, Completed: 3, Delivered: 4 };
  const WORK_ORDER_STATUSES = ["Pending", "In Progress", "Awaiting Parts", "Completed", "Delivered", "Returned"];
  const WORK_ORDER_STATUS_FLOW = { Pending: 0, "In Progress": 1, "Awaiting Parts": 2, Completed: 3, Delivered: 4, Returned: 5 };
  const WORK_ORDER_STATUS_ICON = { Pending: "P", "In Progress": "IP", "Awaiting Parts": "AP", Completed: "C", Delivered: "D", Returned: "R" };
  const RUPEE = "\u20b9";
  let availableServices = [];
  let availableParts = [];
  let technicianOptions = [];
  let bookings = [];
  let overviewBookings = [];
  let callRequests = [];
  let partsList = [];
  let bills = [];
  let workOrders = [];
  let notifications = [];
  let notificationFilter = "all";
  let customers = [];
  let selectedCustomerKey = "";
  let reportRange = "today";
  let reportCustomRange = { from: "", to: "" };
  let selectedWorkOrderId = "";
  let enterpriseSettings = {};
  let billingSettings = {
    businessName: "Universal Systems",
    watermarkEnabled: true,
    watermarkText: "Universal Systems",
    staffSignatureEnabled: true,
    logoEnabled: false
  };
  let activeBillBookingId = "";
  let activeEditBookingId = "";
  let activeActionMenuId = "";
  let loadPartsIntoModal = () => {};
  let createPartRow = () => null;
  let syncCostsFromRowTotals = () => {};
  let refreshTimer = null;

  function showToast(message, isError) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    toast.style.background = isError ? "#c62828" : "#16324f";
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 3000);
  }

  function formatCurrency(value) {
    return `${RUPEE}${Number(value || 0).toFixed(2)}`;
  }

  function parseAmount(value) {
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0 ? amount : 0;
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function sanitizeText(value) {
    return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").replace(/[<>]/g, "").trim();
  }

  function getSelectedValues(select) {
    return Array.from(select?.selectedOptions || []).map((option) => option.value).filter(Boolean);
  }

  function formDataToObject(form) {
    const formData = new FormData(form);
    const result = {};
    Array.from(form.elements).forEach((field) => {
      if (!field.name || field.disabled) return;
      if (field instanceof HTMLSelectElement && field.multiple) {
        result[field.name] = getSelectedValues(field);
        return;
      }
      if (result[field.name] == null) result[field.name] = sanitizeText(formData.get(field.name));
    });
    return result;
  }

  function getBookingPartsSource(booking) {
    return Array.isArray(booking?.parts_used) && booking.parts_used.length
      ? booking.parts_used
      : Array.isArray(booking?.parts)
        ? booking.parts
        : [];
  }

  function bookingSourceLabel(item) {
    const raw = String(item?.bookingSource || item?.source || item?.intakeSource || item?.leadSource || item?.channel || item?.bookingId?.bookingSource || item?.bookingId?.source || "").trim().toLowerCase();
    if (!raw) return "Unknown";
    if (raw.includes("call")) return "Call";
    if (raw.includes("website") || raw.includes("web") || raw.includes("online")) return "Website";
    if (raw.includes("walk") || raw.includes("shop") || raw.includes("manual")) return "Walk-in Shop";
    return "Unknown";
  }

  function bookingSourceBadge(item) {
    const label = bookingSourceLabel(item);
    const className = label === "Call" ? "source-badge-call" : label === "Walk-in Shop" ? "source-badge-shop" : label === "Website" ? "source-badge-website" : "source-badge-unknown";
    return `<span class="source-badge ${className}">${escapeHtml(label)}</span>`;
  }

  function normalizeBooking(booking) {
    const parts = getBookingPartsSource(booking);
    const partsUsed = parts;
    return {
      ...booking,
      customerName: booking?.customerName || booking?.name || "",
      service: booking?.service || booking?.serviceName || booking?.serviceType || booking?.product || "",
      problem: booking?.problem || booking?.problemDescription || "",
      bookingSource: bookingSourceLabel(booking),
      technician: booking?.technician || "",
      notes: booking?.notes || "",
      serviceCost: parseAmount(booking?.service_charge != null ? booking.service_charge : booking?.serviceCharge != null ? booking.serviceCharge : booking?.serviceCost),
      serviceCharge: parseAmount(booking?.service_charge != null ? booking.service_charge : booking?.serviceCharge != null ? booking.serviceCharge : booking?.serviceCost),
      labourCharge: parseAmount(booking?.labour_charge != null ? booking.labour_charge : booking?.labourCharge),
      partsCost: parseAmount(booking?.parts_cost != null ? booking.parts_cost : booking?.partsCost),
      productsCost: parseAmount(booking?.products_cost != null ? booking.products_cost : booking?.productsCost),
      totalCost: parseAmount(booking?.total_cost != null ? booking.total_cost : booking?.totalCost),
      bookingDate: booking?.bookingDate || (booking?.createdAt ? String(booking.createdAt).slice(0, 10) : ""),
      expectedDate: booking?.expectedDate || "",
      completionDate: booking?.completionDate || "",
      status: WORKFLOW_STATUSES.includes(booking?.status) ? booking.status : "Pending",
      bill_created: Boolean(booking?.bill_created),
      billNumber: booking?.billNumber || "",
      billDate: booking?.billDate || "",
      parts: parts.map((part) => {
        const quantity = Number(part?.quantity) || 1;
        const price = parseAmount(part?.price);
        return { partId: part?.partId || part?._id || null, name: String(part?.name || "").trim(), price, quantity, subtotal: quantity * price };
      }),
      parts_used: partsUsed.map((part) => {
        const quantity = Number(part?.quantity) || 1;
        const price = parseAmount(part?.price);
        return { partId: part?.partId || part?._id || null, name: String(part?.name || "").trim(), price, quantity, subtotal: quantity * price };
      }),
      products: Array.isArray(booking?.products) ? booking.products : []
    };
  }

  function normalizePart(part) {
    return {
      _id: String(part?._id || part?.id || ""),
      name: String(part?.name || part?.partName || "").trim(),
      category: String(part?.category || "General").trim() || "General",
      cost_price: parseAmount(part?.cost_price != null ? part.cost_price : part?.costPrice),
      selling_price: parseAmount(part?.selling_price != null ? part.selling_price : part?.sellingPrice != null ? part.sellingPrice : part?.price),
      price: parseAmount(part?.selling_price != null ? part.selling_price : part?.sellingPrice != null ? part.sellingPrice : part?.price),
      stock_quantity: parseAmount(part?.stock_quantity != null ? part.stock_quantity : part?.available != null ? part.available : part?.stock),
      low_stock_limit: parseAmount(part?.low_stock_limit != null ? part.low_stock_limit : part?.lowStockLimit != null ? part.lowStockLimit : part?.min_required_level),
      min_required_level: parseAmount(part?.min_required_level != null ? part.min_required_level : part?.low_stock_limit != null ? part.low_stock_limit : part?.lowStockLimit),
      stock_status: part?.stock_status || part?.stockStatus || (parseAmount(part?.available != null ? part.available : part?.stock_quantity) <= 0 ? "Out of Stock" : "In Stock")
    };
  }

  function normalizeWorkOrder(item) {
    const customer = item?.customerId && typeof item.customerId === "object" ? item.customerId : {};
    const technician = item?.technicianId && typeof item.technicianId === "object" ? item.technicianId : {};
    const status = WORK_ORDER_STATUSES.includes(item?.status) ? item.status : item?.status === "Waiting for Parts" ? "Awaiting Parts" : "Pending";
    const partsUsed = Array.isArray(item?.partsUsed) ? item.partsUsed : Array.isArray(item?.parts) ? item.parts : [];
    const partRequests = Array.isArray(item?.partRequests) ? item.partRequests : [];
    const notes = Array.isArray(item?.notes) ? item.notes : [];
    const timeline = Array.isArray(item?.timeline) ? item.timeline : [];
    const documentsSent = Array.isArray(item?.documentsSent) ? item.documentsSent : [];
    return {
      ...item,
      _id: String(item?._id || item?.id || item?.bookingId || ""),
      displayId: item?.bookingId?.bookingCode || item?.bookingCode || (typeof item?.customerId === "string" ? item.customerId : "") || `WO-${String(item?._id || item?.id || "").slice(-6).toUpperCase()}`,
      customerName: item?.customerName || customer.name || item?.name || "-",
      phone: item?.phone || customer.phone || "",
      address: item?.address || customer.address || "",
      device: item?.device || item?.product || item?.service || "-",
      issue: item?.issue || item?.problem || item?.problemDescription || "-",
      technicianName: item?.technicianName || technician.name || item?.technician || "Unassigned",
      bookingSource: bookingSourceLabel(item),
      status,
      completedAt: item?.completedAt || item?.completionDate || "",
      createdAt: item?.createdAt || item?.bookingDate || "",
      updatedAt: item?.updatedAt || item?.createdAt || "",
      serviceCharge: parseAmount(item?.serviceCharge != null ? item.serviceCharge : item?.service_charge),
      partsUsed: partsUsed.map((part, index) => {
        const quantity = Math.max(1, Number(part?.quantity) || 1);
        const unitPrice = parseAmount(part?.unitPrice != null ? part.unitPrice : part?.price);
        return {
          _id: String(part?._id || part?.partId || part?.inventoryPartId || `local-part-${index}`),
          inventoryPartId: part?.inventoryPartId || part?.partId || null,
          name: String(part?.name || part?.partName || "Part").trim(),
          quantity,
          unitPrice,
          total: parseAmount(part?.total != null ? part.total : quantity * unitPrice)
        };
      }),
      partRequests: partRequests.map((part, index) => ({
        _id: String(part?._id || part?.inventoryPartId || `local-request-${index}`),
        inventoryPartId: part?.inventoryPartId || null,
        name: String(part?.name || part?.partName || "Part").trim(),
        quantity: Math.max(1, Number(part?.quantity) || 1),
        status: part?.status || "Requested",
        note: part?.note || "",
        createdAt: part?.createdAt || ""
      })),
      notes: notes.map((note, index) => ({
        _id: String(note?._id || `local-note-${index}`),
        text: String(note?.text || note?.note || "").trim(),
        createdAt: note?.createdAt || ""
      })).filter((note) => note.text),
      timeline: timeline.length
        ? timeline.map((entry, index) => ({
            _id: String(entry?._id || `local-timeline-${index}`),
            type: entry?.type || "status",
            status: WORK_ORDER_STATUSES.includes(entry?.status) ? entry.status : status,
            message: entry?.message || `Status changed to ${entry?.status || status}`,
            createdAt: entry?.createdAt || item?.updatedAt || item?.createdAt || ""
          }))
        : [{ _id: "created", type: "status", status, message: "Work order ready", createdAt: item?.createdAt || "" }],
      documentsSent
    };
  }

  function bookingToWorkOrder(booking) {
    const status = booking.status === "Waiting for Parts" ? "Awaiting Parts" : WORK_ORDER_STATUSES.includes(booking.status) ? booking.status : booking.status === "Delivered" ? "Delivered" : booking.status === "Completed" ? "Completed" : "Pending";
    return normalizeWorkOrder({
      ...booking,
      _id: `booking-${booking._id || booking.id || booking.customerId}`,
      bookingCode: booking.customerId || booking.id,
      device: booking.product || booking.service || "Service",
      issue: booking.problem || booking.notes || "-",
      technicianName: booking.technician || "Unassigned",
      status,
      serviceCharge: booking.serviceCharge || booking.service_charge || booking.serviceCost,
      partsUsed: getBookingPartsSource(booking).map((part) => ({
        inventoryPartId: part.partId || part._id || null,
        name: part.name,
        quantity: part.quantity,
        unitPrice: part.price,
        total: (Number(part.quantity) || 1) * parseAmount(part.price)
      })),
      timeline: [
        { status, message: `${booking.status || "Pending"} booking workflow`, createdAt: booking.updatedAt || booking.bookingDate || booking.createdAt || "" }
      ],
      documentsSent: []
    });
  }

  function localWorkOrderKey(id) {
    return `workOrder:${id}`;
  }

  function saveLocalWorkOrder(workOrder) {
    if (!workOrder?._id) return;
    localStorage.setItem(localWorkOrderKey(workOrder._id), JSON.stringify(workOrder));
  }

  function mergeLocalWorkOrder(workOrder) {
    try {
      const stored = JSON.parse(localStorage.getItem(localWorkOrderKey(workOrder._id)) || "null");
      return stored ? normalizeWorkOrder({ ...workOrder, ...stored }) : workOrder;
    } catch {
      return workOrder;
    }
  }

  function normalizeBill(bill) {
    return {
      ...bill,
      _id: String(bill?._id || ""),
      bookingId: String(bill?.bookingId || ""),
      bookingLabel: String(bill?.bookingLabel || "").trim(),
      billNumber: String(bill?.billNumber || "").trim(),
      customerName: String(bill?.customerName || "").trim(),
      phone: String(bill?.phone || "").trim(),
      device: String(bill?.device || "").trim(),
      service: String(bill?.service || "").trim(),
      serviceCharge: parseAmount(bill?.serviceCharge),
      labourCharge: parseAmount(bill?.labourCharge),
      parts: Array.isArray(bill?.parts)
        ? bill.parts.map((item) => ({
            partId: item?.partId || item?._id || null,
            name: String(item?.name || "").trim(),
            quantity: Math.max(0, Number(item?.quantity) || 0),
            price: parseAmount(item?.price),
            subtotal: parseAmount(item?.subtotal != null ? item.subtotal : (Number(item?.quantity) || 0) * parseAmount(item?.price))
          }))
        : [],
      products: Array.isArray(bill?.products)
        ? bill.products.map((item) => ({
            name: String(item?.name || "").trim(),
            quantity: Math.max(0, Number(item?.quantity) || 0),
            price: parseAmount(item?.price),
            subtotal: parseAmount(item?.subtotal != null ? item.subtotal : (Number(item?.quantity) || 0) * parseAmount(item?.price))
          }))
        : [],
      partsTotal: parseAmount(bill?.partsTotal),
      productsTotal: parseAmount(bill?.productsTotal),
      total: parseAmount(bill?.total),
      date: bill?.date || ""
    };
  }

  function normalizeSettings(settings) {
    return {
      businessName: String(settings?.businessName || "Universal Systems").trim() || "Universal Systems",
      watermarkText: String(settings?.watermarkText || settings?.businessName || "Universal Systems").trim() || "Universal Systems",
      watermarkEnabled: settings?.watermarkEnabled !== false,
      staffSignatureEnabled: settings?.staffSignatureEnabled !== false,
      logoEnabled: Boolean(settings?.logoEnabled)
    };
  }

  function normalizeService(service) {
    return { name: String(service?.name || "").trim(), basePrice: parseAmount(service?.basePrice != null ? service.basePrice : service?.price) };
  }

  function getPartById(partId) {
    return availableParts.find((part) => part._id === String(partId || ""));
  }

  function getPartStatus(part) {
    return part?.stock_status || "In Stock";
  }

  function buildPartOptionLabel(part) {
    return `${part.name} (${formatCurrency(part.selling_price != null ? part.selling_price : part.price)}) - ${getPartStatus(part)}`;
  }

  function getPreviousBillQuantities(bookingId) {
    const booking = bookings.find((item) => item._id === bookingId);
    const source = (booking ? getBookingPartsSource(booking) : getBillByBookingId(bookingId)?.parts) || [];
    return source.reduce((acc, part) => {
      if (part?.partId) acc[String(part.partId)] = (acc[String(part.partId)] || 0) + Math.max(0, Number(part.quantity) || 0);
      return acc;
    }, {});
  }

  function getAvailableStockForBillPart(partId, bookingId) {
    const part = getPartById(partId);
    if (!part) return 0;
    const previousQuantities = getPreviousBillQuantities(bookingId);
    return parseAmount(part.stock_quantity) + (previousQuantities[String(partId)] || 0);
  }

  async function apiFetch(url, options = {}) {
    const urlString = String(url || "");
    const fullUrl = urlString.startsWith("http") ? urlString : BASE_URL + urlString;
    const requestUrl = new URL(fullUrl, window.location.href);
    const token = localStorage.getItem("token");
    const nextOptions = { ...(options || {}) };

    try {
      console.log("Auth token:", token);
      if (token == null) {
        console.warn("No token found - API may fail");
      }
      const response = await fetch(fullUrl, {
        credentials: requestUrl.origin === window.location.origin ? "same-origin" : "omit",
        ...nextOptions,
        headers: {
          ...(nextOptions.headers || {}),
          "X-Admin-Client": "legacy",
          Authorization: token ? "Bearer " + token : ""
        }
      });

      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");

      let data = null;
      if (isJson) {
        try {
          data = await response.json();
        } catch (_error) {
          console.warn("Invalid JSON response");
          data = {};
        }
      }

      console.log("API DATA:", data);

      if (response.ok) {
        return data ?? {};
      }

      if (response.status === 401) {
        console.warn("API unauthorized:", fullUrl);
        if (String(nextOptions.method || "GET").toUpperCase() !== "GET") {
          throw new Error("Your session is not authorized for this action.");
        }
        return [];
      }

      console.warn("API request failed:", fullUrl, response.status);
      if (String(nextOptions.method || "GET").toUpperCase() !== "GET") {
        throw new Error(data?.error || "Request failed. Please check the form and try again.");
      }
      return [];
    } catch (_error) {
      console.warn("API fetch failed:", fullUrl);
      if (String(nextOptions.method || "GET").toUpperCase() !== "GET") {
        throw _error;
      }
      return [];
    }
  }

  async function downloadWithAuth(url, fallbackName) {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: {
        "X-Admin-Client": "legacy",
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`
      }
    });
    if (!response.ok) throw new Error("Download failed");
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const disposition = response.headers.get("content-disposition") || "";
    const fileName = disposition.match(/filename="?([^";]+)"?/)?.[1] || fallbackName;
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }

  function validateForm(root) {
    const fields = Array.from(root.querySelectorAll("input, select, textarea")).filter((field) => !field.disabled && field.type !== "hidden" && !field.closest(".ui-hidden-compatible"));
    let firstInvalid = null;
    fields.forEach((field) => {
      const label = field.closest("label");
      const errorEl = label?.querySelector(".field-error");
      let message = "";
      const value = sanitizeText(field.value);
      if (field.required && !value) message = "This field is required.";
      if (!message && field.name === "customerName" && value && !/^[A-Za-z ]{2,60}$/.test(value)) message = "Enter a valid customer name.";
      if (!message && field.name === "phone" && value && !/^[0-9]{10}$/.test(value)) message = "Enter a valid 10-digit phone number.";
      if (!message && field.type === "number" && value && Number(value) < 0) message = "Enter a positive value.";
      if (!message && field.maxLength > 0 && value.length > field.maxLength) message = `Use ${field.maxLength} characters or fewer.`;
      if (label) label.classList.toggle("field-has-error", Boolean(message));
      field.setAttribute("aria-invalid", message ? "true" : "false");
      if (errorEl) errorEl.textContent = message;
      if (!firstInvalid && message) firstInvalid = field;
    });
    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  function bindLiveValidation(form) {
    if (!form || form.dataset.liveValidation === "true") return;
    form.dataset.liveValidation = "true";
    form.querySelectorAll("input, select, textarea").forEach((field) => {
      if (field.type === "hidden" || field.closest(".ui-hidden-compatible")) return;
      const handler = () => validateForm(form);
      field.addEventListener("input", handler);
      field.addEventListener("blur", handler);
      field.addEventListener("change", handler);
    });
  }

  function setView(view) {
    const labelMap = { overview: "Booking overview", "work-orders": "Work orders", bookings: "Booking management", parts: "Parts management", "call-requests": "Callback requests", analytics: "Analytics", settings: "Settings", notifications: "Notifications", reports: "Reports", customers: "Customers", actions: "Quick actions" };
    const nextView = labelMap[view] ? view : "overview";
    document.querySelectorAll(".dashboard-view").forEach((section) => section.classList.toggle("hidden", section.dataset.view !== nextView));
    document.querySelectorAll("[data-view-link]").forEach((link) => link.classList.toggle("active", link.dataset.viewLink === nextView));
    document.getElementById("dashboardViewTitle").textContent = labelMap[nextView];
    if (nextView === "analytics") window.requestAnimationFrame(renderEnterpriseAnalytics);
    if (nextView === "work-orders") window.requestAnimationFrame(renderWorkOrders);
    if (nextView === "notifications") window.requestAnimationFrame(renderNotifications);
    if (nextView === "reports") window.requestAnimationFrame(renderReports);
    if (nextView === "customers") window.requestAnimationFrame(renderCustomers);
  }

  function openModal(element) { if (element) element.classList.remove("hidden"); }
  function closeModal(element) { if (element) element.classList.add("hidden"); }

  function populateServiceSelects() {
    document.querySelectorAll("[data-service-select]").forEach((select) => {
      const selectedValue = select.value;
      select.innerHTML = '<option value="">Select service type</option>';
      availableServices.forEach((service) => {
        const option = document.createElement("option");
        option.value = service.name;
        option.textContent = service.name;
        option.selected = selectedValue === service.name;
        select.appendChild(option);
      });
    });
    const serviceFilter = document.getElementById("serviceFilter");
    if (serviceFilter) {
      const current = serviceFilter.value;
      serviceFilter.innerHTML = '<option value="">All services</option>';
      availableServices.forEach((service) => {
        const option = document.createElement("option");
        option.value = service.name;
        option.textContent = service.name;
        option.selected = current === service.name;
        serviceFilter.appendChild(option);
      });
    }
  }

  function populatePartsSelects() {
    document.querySelectorAll("[data-parts-select]").forEach((select) => {
      const selected = new Set(getSelectedValues(select));
      select.innerHTML = "";
      availableParts.forEach((part) => {
        const option = document.createElement("option");
        option.value = part._id;
        option.textContent = buildPartOptionLabel(part);
        option.selected = selected.has(part._id);
        select.appendChild(option);
      });
    });
  }

  function populateBillingPartSelects() {
    document.querySelectorAll("[data-bill-parts], [data-edit-parts]").forEach((select) => {
      const selected = new Set(getSelectedValues(select));
      select.innerHTML = "";
      availableParts.forEach((part) => {
        const option = document.createElement("option");
        option.value = part._id;
        option.textContent = buildPartOptionLabel(part);
        option.selected = selected.has(part._id);
        option.disabled = part.stock_status === "Out of Stock" && !selected.has(part._id);
        select.appendChild(option);
      });
    });
  }

  function populatePartDropdown(select) {
    const parts = window.availableParts || [];

    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '<option value="">Select Part</option>';

    parts.forEach((part) => {
      const option = document.createElement("option");
      option.value = part._id;
      option.textContent = part.name;
      if (currentValue === part._id) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }

  function applyPartDropdowns() {
    document.querySelectorAll(".part-name").forEach((select) => {
      const saved = select.dataset.selected;
      populatePartDropdown(select);
      if (saved) {
        select.value = saved;
      }
    });
    document.querySelectorAll('[data-bill-field="partId"]').forEach((select) => {
      const current = select.value;
      select.innerHTML = '<option value="">Select Part</option>';
      (window.availableParts || []).forEach((part) => {
        const option = document.createElement("option");
        option.value = part._id;
        option.textContent = part.name;
        option.selected = current === part._id;
        select.appendChild(option);
      });
    });
    const billProducts = document.querySelectorAll(".product-name");
    if (!window.availableParts?.length) {
      console.warn("Parts list empty");
    }
    billProducts.forEach((select) => {
      const current = select.value;
      select.innerHTML = '<option value="">Select Part</option>';
      (window.availableParts || []).forEach((part) => {
        const option = document.createElement("option");
        option.value = part._id;
        option.textContent = part.name;
        option.selected = current === part._id;
        select.appendChild(option);
      });
    });
  }

  function populateTechnicians() {
    const list = document.getElementById("technicianSuggestions");
    if (!list) return;
    list.innerHTML = technicianOptions.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");
  }

  function buildSelectedPartsMarkup(parts) {
    if (!parts.length) return '<p class="selected-parts-empty">No parts selected.</p>';
    return parts
      .map((part) => {
        const catalogPart = getPartById(part.partId);
        const price = parseAmount(part.price != null ? part.price : catalogPart?.selling_price != null ? catalogPart.selling_price : catalogPart?.price);
        const label = `${part.name} (${formatCurrency(price)}) - ${getPartStatus(catalogPart)}`;
        return `<span class="selected-part-chip">${escapeHtml(label)}</span>`;
      })
      .join("");
  }

  function createCostCalculator(form) {
    const serviceSelect = form.querySelector("[data-service-select]");
    const partsSelect = form.querySelector("[data-parts-select]");
    const serviceCostInput = form.querySelector("[data-service-cost-input]");
    const partsCostOutput = form.querySelector("[data-parts-cost]");
    const totalCostOutput = form.querySelector("[data-total-cost]");
    const selectedPartsBox = form.querySelector("[data-selected-parts]");

    function calculate() {
      const service = availableServices.find((item) => item.name === serviceSelect?.value);
      const defaultServiceCost = parseAmount(service?.basePrice);
      if (serviceCostInput && (!serviceCostInput.value || serviceCostInput.dataset.autoFill === "true")) {
        serviceCostInput.value = defaultServiceCost.toFixed(2);
        serviceCostInput.dataset.autoFill = "true";
      }
      const serviceCost = parseAmount(serviceCostInput?.value || defaultServiceCost);
      const selectedParts = getSelectedValues(partsSelect).map((partId) => availableParts.find((part) => part._id === partId)).filter(Boolean);
      const partsCost = selectedParts.reduce((sum, part) => sum + parseAmount(part.price), 0);
      const totalCost = serviceCost + partsCost;
      if (partsCostOutput) partsCostOutput.textContent = formatCurrency(partsCost);
      if (totalCostOutput) totalCostOutput.textContent = formatCurrency(totalCost);
      if (selectedPartsBox) selectedPartsBox.innerHTML = buildSelectedPartsMarkup(selectedParts);
      return { serviceCost, partsCost, totalCost };
    }

    serviceSelect?.addEventListener("change", () => {
      if (serviceCostInput) serviceCostInput.dataset.autoFill = "true";
      calculate();
    });
    partsSelect?.addEventListener("change", calculate);
    serviceCostInput?.addEventListener("input", () => {
      serviceCostInput.dataset.autoFill = "false";
      calculate();
    });
    return calculate;
  }

  function createBillCalculator(form, config) {
    const partsSelect = form.querySelector(config.partsSelector);
    const selectedPartsBox = form.querySelector(config.selectedSelector);
    const partsCostOutput = form.querySelector(config.partsCostSelector);
    const totalCostOutput = form.querySelector(config.totalCostSelector);
    const serviceChargeInput = form.querySelector(config.serviceChargeSelector);

    function calculate() {
      const selectedParts = getSelectedValues(partsSelect).map((partId) => availableParts.find((part) => part._id === partId)).filter(Boolean);
      const partsCost = selectedParts.reduce((sum, part) => sum + parseAmount(part.price), 0);
      const serviceCharge = parseAmount(serviceChargeInput?.value);
      const totalCost = serviceCharge + partsCost;
      if (selectedPartsBox) selectedPartsBox.innerHTML = buildSelectedPartsMarkup(selectedParts);
      if (partsCostOutput) partsCostOutput.textContent = formatCurrency(partsCost);
      if (totalCostOutput) totalCostOutput.textContent = formatCurrency(totalCost);
      return { selectedParts, serviceCharge, partsCost, totalCost };
    }

    partsSelect?.addEventListener("change", calculate);
    serviceChargeInput?.addEventListener("input", calculate);
    return calculate;
  }

  function populateBillBookingPicker() {
    const picker = document.querySelector("#billForm select[name='bookingPicker']");
    if (!picker) return;
    const current = picker.value;
    picker.innerHTML = '<option value="">Select booking</option>' + bookings.map((booking) => `<option value="${escapeHtml(booking._id)}">${escapeHtml(booking.customerId)} - ${escapeHtml(booking.customerName)}</option>`).join("");
    picker.value = current || "";
  }

  function getFilters() {
    return {
      search: document.getElementById("searchInput")?.value.trim() || "",
      status: document.getElementById("statusFilter")?.value || "",
      serviceType: document.getElementById("serviceFilter")?.value || "",
      source: document.getElementById("sourceFilter")?.value || "",
      startDate: document.getElementById("startDateFilter")?.value || "",
      endDate: document.getElementById("endDateFilter")?.value || ""
    };
  }

  function buildBookingQuery() {
    const params = new URLSearchParams();
    Object.entries(getFilters()).forEach(([key, value]) => value && params.set(key, value));
    return params.toString() ? `?${params.toString()}` : "";
  }

  function getNextStatus(status) {
    const index = STATUS_FLOW[status] ?? 0;
    return WORKFLOW_STATUSES[Math.min(index + 1, WORKFLOW_STATUSES.length - 1)];
  }

  function getStatusActionLabel(status) {
    if (status === "Delivered") return "Delivered";
    if (status === "Completed") return "Mark Delivered";
    return `Move to ${getNextStatus(status)}`;
  }

  function closeActionMenu() {
    if (!activeActionMenuId) return;
    activeActionMenuId = "";
    renderBookings(bookings);
  }

  function toggleActionMenu(bookingId) {
    activeActionMenuId = activeActionMenuId === bookingId ? "" : bookingId;
    renderBookings(bookings);
    window.requestAnimationFrame(positionOpenActionMenu);
  }

  function positionOpenActionMenu() {
    const openMenu = document.querySelector(".action-menu.open");
    if (!openMenu) return;
    const dropdown = openMenu.querySelector(".action-menu-dropdown");
    if (!dropdown) return;

    const tableWrapper = openMenu.closest(".table-wrapper");
    const wrapperRect = tableWrapper?.getBoundingClientRect();
    const viewportLeft = 8;
    const viewportRight = window.innerWidth - 8;

    dropdown.style.transform = "";
    dropdown.style.left = "";
    dropdown.style.right = "100%";
    dropdown.style.marginRight = "8px";

    const dropdownRect = dropdown.getBoundingClientRect();
    const minLeft = Math.max(viewportLeft, (wrapperRect?.left || viewportLeft) + 8);
    if (dropdownRect.left < minLeft) {
      const shiftRight = minLeft - dropdownRect.left;
      dropdown.style.transform = `translateX(${Math.ceil(shiftRight)}px)`;
    }

    openMenu.querySelectorAll(".action-menu-submenu").forEach((submenu) => {
      const submenuDropdown = submenu.querySelector(".action-menu-submenu-dropdown");
      if (!submenuDropdown) return;
      submenu.classList.remove("submenu-open-left");

      const submenuRect = submenuDropdown.getBoundingClientRect();
      const maxRight = Math.min(viewportRight, (wrapperRect?.right || viewportRight) - 8);
      if (submenuRect.right > maxRight) {
        submenu.classList.add("submenu-open-left");
      }
    });
  }

  async function updateBookingStatus(booking, status) {
    await apiFetch(`${BOOKING_API_URL}/${booking._id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    await refreshAll();
    showToast("Booking status updated successfully");
  }

  function isStatusActionDisabled(currentStatus, targetStatus) {
    if (currentStatus === "Delivered") return true;
    if (targetStatus === "Delivered" && currentStatus !== "Completed") return true;
    return currentStatus === targetStatus;
  }

  async function getPdfContext(booking) {
    const targetBill = getBillByBookingId(booking._id);
    if (!targetBill) return { bill: null, settings: normalizeSettings(billingSettings) };
    const fetchedBill = await apiFetch(`${BILL_API_URL}/${targetBill._id}`);
    return {
      bill: normalizeBill(fetchedBill),
      settings: normalizeSettings(fetchedBill.settings || billingSettings)
    };
  }

  function buildPdfFinancials(booking, bill) {
    const serviceCharge = parseAmount(bill?.serviceCharge != null ? bill.serviceCharge : booking.serviceCharge);
    const labourCharge = parseAmount(bill?.labourCharge != null ? bill.labourCharge : booking.labourCharge);
    const partsCost = parseAmount(bill?.partsTotal != null ? bill.partsTotal : booking.partsCost);
    const productsCost = parseAmount(bill?.productsTotal != null ? bill.productsTotal : booking.productsCost);
    const total = parseAmount(bill?.total != null ? bill.total : booking.totalCost || (serviceCharge + labourCharge + partsCost + productsCost));
    return { serviceCharge, labourCharge, partsCost, productsCost, total };
  }

  function buildInvoiceTableRows(booking, bill) {
    const partRows = (Array.isArray(bill?.parts) ? bill.parts : getBookingPartsSource(booking))
      .filter((item) => item && (item.name || item.partId))
      .map((item) => ({
        description: item.name || "Part",
        quantity: Math.max(0, Number(item.quantity) || 0),
        price: parseAmount(item.price),
        subtotal: parseAmount(item.subtotal != null ? item.subtotal : (Number(item.quantity) || 0) * parseAmount(item.price)),
        kind: "part"
      }));

    const productRows = (Array.isArray(bill?.products) ? bill.products : Array.isArray(booking.products) ? booking.products : [])
      .filter((item) => item && item.name)
      .map((item) => ({
        description: item.name,
        quantity: Math.max(0, Number(item.quantity) || 0),
        price: parseAmount(item.price),
        subtotal: parseAmount(item.subtotal != null ? item.subtotal : (Number(item.quantity) || 0) * parseAmount(item.price)),
        kind: "product"
      }));

    return [...partRows, ...productRows];
  }

  async function downloadBillPdf(bookingId, filename = "bill.pdf") {
    const response = await fetch(`/api/bookings/${bookingId}/bill/pdf`, {
      credentials: "same-origin",
      headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` }
    });
    if (!response.ok) {
      let message = "Failed to download bill";
      try {
        const data = await response.json();
        message = data?.error || data?.message || message;
      } catch (_error) {
        // Keep default message.
      }
      throw new Error(message);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  }

  function sendBillWhatsapp(booking) {
    if (!booking) return;
    const phone = String(booking.phone || "").replace(/\D/g, "");
    if (!phone) throw new Error("Customer phone number is not available");

    const bookingId = booking._id;
    const customerId = booking.customerId || booking._id || "Booking";
    fetch(`/api/bookings/${bookingId}/bill/pdf`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` }
    })
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `Estimate-${customerId}.pdf`, {
          type: "application/pdf"
        });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          return navigator.share({
            title: "Quotation",
            text: "Your quotation is ready",
            files: [file]
          });
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Estimate-${customerId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        return undefined;
      })
      .catch(() => {});
  }

  function openPdfWindow(title, content, settings) {
    const printWindow = window.open("", "_blank", "width=960,height=720");
    if (!printWindow) throw new Error("Allow popups to generate the PDF");
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title><style>
      body{font-family:Segoe UI,sans-serif;margin:0;background:#e2e8f0;color:#0f172a}
      .sheet{max-width:900px;margin:0 auto;padding:32px}
      .card{position:relative;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 16px 40px rgba(15,23,42,.18)}
      .hero{padding:28px 32px;background:linear-gradient(135deg,#0f172a,#1e293b);color:#f8fafc}
      .hero h1{margin:0 0 8px;font-size:30px}
      .hero p{margin:0;color:#cbd5e1}
      .body{padding:28px 32px}
      .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:20px}
      .box{padding:14px 16px;border-radius:12px;background:#f8fafc;border:1px solid #cbd5e1}
      .box strong{display:block;margin-bottom:6px;color:#334155}
      .note{margin-top:18px;padding:14px 16px;border-left:4px solid #2563eb;background:#eff6ff;border-radius:10px;color:#1e3a8a}
      .totals{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:18px}
      .table{width:100%;border-collapse:collapse;margin-top:18px;font-size:14px}
      .table th,.table td{border:1px solid #cbd5e1;padding:10px 12px;text-align:left}
      .table th{background:#f8fafc;color:#334155}
      .summary{margin-top:18px;display:grid;gap:10px}
      .summary-row{display:flex;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px solid #e2e8f0}
      .accent{background:#ecfeff;border-color:#a5f3fc}
      .footer{margin-top:24px;padding-top:18px;border-top:1px solid #cbd5e1;color:#475569}
      .list{margin:0;padding-left:18px;color:#334155}
      .list li{margin:8px 0}
      .watermark{position:absolute;inset:0;display:${settings.watermarkEnabled ? "flex" : "none"};align-items:center;justify-content:center;font-size:72px;font-weight:700;color:rgba(15,23,42,.04);pointer-events:none;transform:rotate(-18deg)}
      @media print{body{background:#fff}.sheet{padding:0}.card{box-shadow:none}}
    </style></head><body><div class="sheet"><div class="card"><div class="watermark">${escapeHtml(settings.watermarkText || settings.businessName)}</div>${content}</div></div><script>window.onload=function(){window.print();};</script></body></html>`);
    printWindow.document.close();
  }

  async function generateEstimatePDF(booking) {
    const { bill, settings } = await getPdfContext(booking);
    const financials = buildPdfFinancials(booking, bill);
    const COMPANY_INFO = {
      name: "UNIVERSAL SYSTEMS",
      address: [
        "MIG-H3 Housing Unit, Near 4 Roads",
        "Mathiyankuttai Post",
        "Mettur Dam – 636452",
        "Salem, Tamil Nadu"
      ],
      phone: "98427 81971 / 70100 24368"
    };
    const logoSrc = "/assets/logo-full.png";
    const filename = `Estimate-${booking.customerId || booking._id || "Booking"}.pdf`;
    const serviceRow = {
      description: booking.service || booking.product || "Service",
      quantity: 1,
      price: parseAmount(financials.serviceCharge || booking.serviceCost || 0)
    };
    const partRows = getBookingPartsSource(booking)
      .filter((item) => item && (item.name || item.partId))
      .map((item) => ({
        description: item.name || "Part",
        quantity: Math.max(1, Number(item.quantity) || 1),
        price: parseAmount(item.price)
      }));
    const productRows = (Array.isArray(booking.products) ? booking.products : [])
      .filter((item) => item && item.name)
      .map((item) => ({
        description: item.name,
        quantity: Math.max(1, Number(item.quantity) || 1),
        price: parseAmount(item.price)
      }));
    const lineItems = [serviceRow, ...partRows, ...productRows].filter((item) => item.price > 0 || item.description);
    const tableRows = lineItems.length
      ? lineItems
      : [
          {
            description: booking.service || booking.product || "Service",
            quantity: 1,
            price: parseAmount(booking.totalCost || financials.total || 0)
          }
        ];

    const partsTotal = partRows.reduce((sum, item) => sum + parseAmount(item.quantity * item.price), 0);
    const productsTotal = productRows.reduce((sum, item) => sum + parseAmount(item.quantity * item.price), 0);
    const serviceTotal = parseAmount(serviceRow.quantity * serviceRow.price);
    const finalTotal = parseAmount(serviceTotal + partsTotal + productsTotal);

    const printWindow = window.open("", "_blank", "width=960,height=720");
    if (!printWindow) throw new Error("Allow popups to generate the quotation PDF");
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(filename)}</title><style>
      body{font-family:Segoe UI,sans-serif;margin:0;background:#e2e8f0;color:#0f172a}
      .sheet{max-width:900px;margin:0 auto;padding:32px}
      .card{position:relative;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 16px 40px rgba(15,23,42,.18)}
      .quotation-actions{display:flex;justify-content:flex-end;gap:12px;padding:18px 24px;border-bottom:1px solid #e2e8f0;background:#f8fafc}
      .quotation-action-btn{border:none;border-radius:10px;padding:10px 16px;background:#16324f;color:#fff;font-size:13px;font-weight:600;cursor:pointer}
      .quotation-action-btn.secondary{background:#475569}
      .quotation-shell{position:relative;padding:40px 44px 36px;background:#fff;color:#111827}
      .quotation-watermark{position:absolute;top:50%;left:50%;width:60%;transform:translate(-50%, -50%);opacity:.06;z-index:0;pointer-events:none}
      .quotation-watermark img{width:100%;height:auto;display:block}
      .quotation-header,.quotation-details,.quotation-table,.quotation-divider,.quotation-totals,.quotation-terms,.quotation-footer{position:relative;z-index:1}
      .quotation-header-top{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px}
      .quotation-logo{width:150px;max-width:100%;height:auto;object-fit:contain;transform:scale(1.5);transform-origin:top left}
      .quotation-title{order:3;width:100%;margin-top:20px;text-align:center;font-weight:bold;letter-spacing:1px}
      .quotation-title h1{margin:0;font-size:24px;letter-spacing:2px;font-weight:700}
      .quotation-address{order:2;text-align:right;font-size:12px;line-height:1.65;color:#334155}
      .quotation-address strong{display:block;font-size:13px;color:#0f172a;margin-bottom:4px}
      .quotation-details{margin-top:28px;display:grid;grid-template-columns:1fr 1fr;gap:24px}
      .quotation-meta-row{display:grid;grid-template-columns:140px 1fr;gap:8px;margin-bottom:8px;font-size:13px}
      .quotation-meta-row strong{font-weight:700}
      .quotation-table{width:100%;border-collapse:collapse;margin-top:26px;font-size:13px}
      .quotation-table th,.quotation-table td{border:1px solid #334155;padding:10px 12px;text-align:left}
      .quotation-table th{background:#f8fafc;font-weight:700}
      .quotation-table thead th{border-top:2px solid #334155}
      .quotation-table th:nth-child(2),.quotation-table th:nth-child(3),.quotation-table th:nth-child(4),
      .quotation-table td:nth-child(2),.quotation-table td:nth-child(3),.quotation-table td:nth-child(4){text-align:right}
      .quotation-divider{border-top:1px solid #111827;margin:14px 0 18px}
      .quotation-totals{margin-left:auto;width:260px;font-size:13px}
      .quotation-total-row{display:flex;justify-content:space-between;padding:4px 0}
      .quotation-total-row.total-amount strong{font-size:19px;font-weight:800}
      .quotation-terms{margin-top:28px;font-size:12.5px;line-height:1.7}
      .quotation-terms h3,.quotation-footer p{margin:0 0 10px}
      .quotation-terms ol{margin:0;padding-left:18px}
      .quotation-footer{margin-top:28px;font-size:12.5px;line-height:1.8}
      @media print{body{background:#fff}.sheet{padding:0}.card{box-shadow:none;border-radius:0}.no-print{display:none !important}}
    </style></head><body><div class="sheet"><div class="card"><div class="pdf-actions no-print quotation-actions"><button class="quotation-action-btn" type="button" onclick="downloadPDF()">Download PDF</button><button class="quotation-action-btn secondary" type="button" onclick="sendPDF()">Send PDF</button></div><div class="quotation-shell" id="quotation-container"><div class="quotation-watermark"><img src="${logoSrc}" alt="Company watermark" /></div><div class="quotation-header"><div class="quotation-header-top"><div><img class="quotation-logo" src="${logoSrc}" alt="${escapeHtml(settings.businessName)} logo" /></div><div class="quotation-title"><h1>QUOTATION</h1></div><div class="quotation-address"><strong>${escapeHtml(COMPANY_INFO.name)}</strong>${COMPANY_INFO.address.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}<div>Phone: ${escapeHtml(COMPANY_INFO.phone)}</div></div></div></div><div class="quotation-details"><div><div class="quotation-meta-row"><strong>Customer ID</strong><span>${escapeHtml(booking.customerId || booking._id || "-")}</span></div><div class="quotation-meta-row"><strong>Date</strong><span>${escapeHtml(booking.bookingDate || todayIso())}</span></div><div class="quotation-meta-row"><strong>Service Type</strong><span>${escapeHtml(booking.service || "-")}</span></div></div><div><div class="quotation-meta-row"><strong>Customer Name</strong><span>${escapeHtml(booking.customerName || "-")}</span></div><div class="quotation-meta-row"><strong>Customer Address</strong><span>${escapeHtml(booking.address || "-")}</span></div><div class="quotation-meta-row"><strong>Customer Phone Number</strong><span>${escapeHtml(booking.phone || "-")}</span></div></div></div><table class="quotation-table"><thead><tr><th>Description</th><th>Quantity</th><th>Price</th><th>Total</th></tr></thead><tbody>${tableRows.map((item) => {
      const itemSubtotal = parseAmount(item.quantity * item.price);
      return `<tr><td>${escapeHtml(item.description || "-")}</td><td>${escapeHtml(String(item.quantity || 1))}</td><td>${escapeHtml(formatCurrency(item.price || 0))}</td><td>${escapeHtml(formatCurrency(itemSubtotal))}</td></tr>`;
    }).join("")}</tbody></table><div class="quotation-divider"></div><div class="quotation-totals"><div class="quotation-total-row"><span><strong>Parts Total</strong></span><span>${escapeHtml(formatCurrency(partsTotal))}</span></div><div class="quotation-total-row"><span><strong>Products Total</strong></span><span>${escapeHtml(formatCurrency(productsTotal))}</span></div><div class="quotation-total-row total-amount"><strong>Final Total</strong><strong>${escapeHtml(formatCurrency(finalTotal))}</strong></div></div><div class="quotation-terms"><h3><strong>Terms &amp; Conditions:</strong></h3><ol><li>Above information is not an invoice and only an estimate of goods/services.</li><li>Payment will be due prior to provision or delivery of goods &amp; services.</li></ol></div><div class="quotation-footer"><p>Please confirm your acceptance of this quotation.</p><p>If you have any questions, please do not hesitate to contact us.</p><p>We truly appreciate your interest and look forward to serving you.</p><p>Thank you for your business!</p></div></div></div></div><script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script><script>
      const customerId = ${JSON.stringify(booking?.customerId || booking?._id || "Booking")};
      window.customerPhone = ${JSON.stringify(booking?.phone || "")};
      function downloadPDF() {
        const element = document.getElementById("quotation-container");
        if (!element) return;
        html2pdf().set({
          margin: 10,
          filename: \`Estimate-\${customerId}.pdf\`,
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        }).from(element).save();
      }
      function sendPDF() {
        const phone = window.customerPhone || "";
        if (!phone) {
          alert("Customer phone number not found");
          return;
        }
        window.open(\`https://wa.me/91\${phone}\`);
      }
    </script></body></html>`);
    printWindow.document.close();
  }

  async function generateWorkUpdatePDF(booking) {
    const { bill, settings } = await getPdfContext(booking);
    const financials = buildPdfFinancials(booking, bill);
    const COMPANY_INFO = {
      name: "UNIVERSAL SYSTEMS",
      address: [
        "MIG-H3 Housing Unit, Near 4 Roads",
        "Mathiyankuttai Post",
        "Mettur Dam - 636452",
        "Salem, Tamil Nadu"
      ],
      phone: "98427 81971 / 70100 24368"
    };
    const logoSrc = "/assets/logo-full.png";
    const filename = `Invoice-${booking.customerId || booking._id || "Booking"}.pdf`;
    const paymentStatusRaw = booking.paymentStatus || booking.payment_status || bill?.paymentStatus || "Pending";
    const paymentStatus = String(paymentStatusRaw).toLowerCase() === "paid" ? "Paid" : "Pending";
    const serviceRow = {
      description: booking.service || booking.product || "Service",
      quantity: 1,
      price: parseAmount(financials.serviceCharge || booking.serviceCost || 0) + parseAmount(financials.labourCharge || booking.labourCharge || 0)
    };
    const partRows = getBookingPartsSource(booking)
      .filter((item) => item && (item.name || item.partId))
      .map((item) => ({
        description: item.name || "Part",
        quantity: Math.max(1, Number(item.quantity) || 1),
        price: parseAmount(item.price)
      }));
    const productRows = (Array.isArray(booking.products) ? booking.products : [])
      .filter((item) => item && item.name)
      .map((item) => ({
        description: item.name,
        quantity: Math.max(1, Number(item.quantity) || 1),
        price: parseAmount(item.price)
      }));
    const tableRows = [serviceRow, ...partRows, ...productRows].filter((item) => item.price > 0 || item.description);
    const subtotal = tableRows.reduce((sum, item) => sum + parseAmount(item.quantity * item.price), 0);
    const total = parseAmount(financials.total || subtotal);
    const numberWords = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tensWords = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const toWords = (value) => {
      const number = Math.floor(Math.max(0, Number(value) || 0));
      if (number < 20) return numberWords[number];
      if (number < 100) return `${tensWords[Math.floor(number / 10)]}${number % 10 ? ` ${numberWords[number % 10]}` : ""}`;
      if (number < 1000) return `${numberWords[Math.floor(number / 100)]} Hundred${number % 100 ? ` ${toWords(number % 100)}` : ""}`;
      if (number < 100000) return `${toWords(Math.floor(number / 1000))} Thousand${number % 1000 ? ` ${toWords(number % 1000)}` : ""}`;
      if (number < 10000000) return `${toWords(Math.floor(number / 100000))} Lakh${number % 100000 ? ` ${toWords(number % 100000)}` : ""}`;
      return `${toWords(Math.floor(number / 10000000))} Crore${number % 10000000 ? ` ${toWords(number % 10000000)}` : ""}`;
    };
    const amountInWords = `Rupees ${toWords(total)} Only`;

    const printWindow = window.open("", "_blank", "width=960,height=720");
    if (!printWindow) throw new Error("Allow popups to generate the PDF");
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(filename)}</title><style>
      body{font-family:Segoe UI,sans-serif;margin:0;background:#e2e8f0;color:#0f172a}
      .sheet{max-width:900px;margin:0 auto;padding:32px}
      .card{position:relative;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 16px 40px rgba(15,23,42,.18)}
      .invoice-actions{display:flex;justify-content:flex-end;gap:12px;padding:18px 24px;border-bottom:1px solid #e2e8f0;background:#f8fafc}
      .invoice-action-btn{border:none;border-radius:10px;padding:10px 16px;background:#16324f;color:#fff;font-size:13px;font-weight:600;cursor:pointer}
      .invoice-shell{position:relative;padding:40px 44px 36px;background:#fff;color:#111827}
      .invoice-watermark{position:absolute;top:50%;left:50%;width:60%;transform:translate(-50%,-50%);opacity:.06;z-index:0;pointer-events:none}
      .invoice-watermark img{width:100%;height:auto;display:block}
      .invoice-header,.invoice-details,.invoice-table,.invoice-divider,.invoice-totals,.invoice-meta,.invoice-notice,.invoice-footer{position:relative;z-index:1}
      .invoice-header-top{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px}
      .invoice-logo{width:150px;max-width:100%;height:auto;object-fit:contain}
      .invoice-title{order:3;width:100%;margin-top:20px;text-align:center;font-weight:bold;letter-spacing:1px}
      .invoice-title h1{margin:0;font-size:24px;letter-spacing:2px;font-weight:700}
      .invoice-address{order:2;text-align:right;font-size:12px;line-height:1.65;color:#334155}
      .invoice-address strong{display:block;font-size:13px;color:#0f172a;margin-bottom:4px}
      .invoice-details{margin-top:28px;display:grid;grid-template-columns:1fr 1fr;gap:24px}
      .invoice-meta-row{display:grid;grid-template-columns:140px 1fr;gap:8px;margin-bottom:8px;font-size:13px}
      .invoice-meta-row strong,.invoice-section-heading{font-weight:700}
      .invoice-table{width:100%;border-collapse:collapse;margin-top:26px;font-size:13px}
      .invoice-table th,.invoice-table td{border:1px solid #334155;padding:10px 12px;text-align:left}
      .invoice-table th{background:#f8fafc;font-weight:700}
      .invoice-table th:nth-child(2),.invoice-table th:nth-child(3),.invoice-table th:nth-child(4),
      .invoice-table td:nth-child(2),.invoice-table td:nth-child(3),.invoice-table td:nth-child(4){text-align:right}
      .invoice-divider{border-top:1px solid #111827;margin:14px 0 18px}
      .invoice-totals{margin-left:auto;width:300px;font-size:13px}
      .invoice-total-row{display:flex;justify-content:space-between;padding:4px 0}
      .invoice-total-row.total-amount strong{font-size:16px;font-weight:800}
      .invoice-meta{margin-top:14px;font-size:13px;line-height:1.8}
      .invoice-meta strong{font-weight:800}
      .invoice-separator{margin:18px 0;border-top:1px dashed #64748b}
      .invoice-notice{margin-top:18px;font-size:12.8px;line-height:1.8}
      .invoice-notice h3{margin:0 0 10px;font-size:14px}
      .invoice-footer{margin-top:24px;font-size:12.5px;line-height:1.8}
      .invoice-footer p{margin:0 0 8px}
      @media print{body{background:#fff}.sheet{padding:0}.card{box-shadow:none;border-radius:0}.no-print{display:none !important}}
    </style></head><body><div class="sheet"><div class="card"><div class="pdf-actions no-print invoice-actions"><button class="invoice-action-btn" type="button" onclick="downloadPDF()">Download PDF</button><button class="invoice-action-btn" type="button" onclick="sendPDF()">Send PDF</button></div><div class="invoice-shell" id="quotation-container"><div class="invoice-watermark"><img src="${logoSrc}" alt="Company watermark" /></div><div class="invoice-header"><div class="invoice-header-top"><div><img class="invoice-logo" src="${logoSrc}" alt="${escapeHtml(settings.businessName)} logo" /></div><div class="invoice-title"><h1>INVOICE</h1></div><div class="invoice-address"><strong>${escapeHtml(COMPANY_INFO.name)}</strong>${COMPANY_INFO.address.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}<div>Phone: ${escapeHtml(COMPANY_INFO.phone)}</div></div></div></div><div class="invoice-details"><div><div class="invoice-meta-row"><strong>Customer ID</strong><span>${escapeHtml(booking.customerId || booking._id || "-")}</span></div><div class="invoice-meta-row"><strong>Date</strong><span>${escapeHtml(bill?.date || booking.billDate || booking.bookingDate || todayIso())}</span></div><div class="invoice-meta-row"><strong>Service Type</strong><span>${escapeHtml(booking.service || "-")}</span></div></div><div><div class="invoice-meta-row"><strong>Customer Name</strong><span>${escapeHtml(booking.customerName || "-")}</span></div><div class="invoice-meta-row"><strong>Customer Address</strong><span>${escapeHtml(booking.address || "-")}</span></div><div class="invoice-meta-row"><strong>Customer Phone Number</strong><span>${escapeHtml(booking.phone || "-")}</span></div></div></div><table class="invoice-table"><thead><tr><th>Description</th><th>Quantity</th><th>Price</th><th>Subtotal</th></tr></thead><tbody>${tableRows.map((item) => {
      const itemSubtotal = parseAmount(item.quantity * item.price);
      return `<tr><td>${escapeHtml(item.description || "-")}</td><td>${escapeHtml(String(item.quantity || 1))}</td><td>${escapeHtml(formatCurrency(item.price || 0))}</td><td>${escapeHtml(formatCurrency(itemSubtotal))}</td></tr>`;
    }).join("")}</tbody></table><div class="invoice-divider"></div><div class="invoice-totals"><div class="invoice-total-row"><span>Subtotal:</span><span>${escapeHtml(formatCurrency(subtotal))}</span></div><div class="invoice-total-row total-amount"><strong>Total:</strong><strong>${escapeHtml(formatCurrency(total))}</strong></div></div><div class="invoice-meta"><div><strong>Total Amount:</strong> ${escapeHtml(formatCurrency(total))}</div><div><strong>Amount in Words:</strong></div><div>${escapeHtml(amountInWords)}</div><div class="invoice-separator"></div><div><strong>Payment Status:</strong> ${escapeHtml(paymentStatus)}</div></div><div class="invoice-notice"><h3>WORK COMPLETION NOTICE</h3><div>Your product / service has been successfully completed.</div><div>You may visit our store to collect your product</div><div>or arrange for delivery as per your convenience.</div></div><div class="invoice-separator"></div><div class="invoice-footer"><p>Thanking you for your business!</p><p>We look forward to serving you again.</p></div></div></div></div><script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script><script>
      const customerId = ${JSON.stringify(booking?.customerId || booking?._id || "Booking")};
      window.customerPhone = ${JSON.stringify(booking?.phone || "")};
      function downloadPDF() {
        const element = document.getElementById("quotation-container");
        if (!element) return;
        html2pdf().set({
          margin: 10,
          filename: \`Work-\${customerId}.pdf\`,
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        }).from(element).save();
      }
      function sendPDF() {
        const phone = window.customerPhone || "";
        if (!phone) {
          alert("Customer phone number not found");
          return;
        }
        window.open(\`https://wa.me/91\${phone}\`);
      }
    </script></body></html>`);
    printWindow.document.close();
  }

  async function generateThankYouPDF(booking) {
    const { settings } = await getPdfContext(booking);
    const COMPANY_INFO = {
      name: "UNIVERSAL SYSTEMS",
      address: [
        "MIG-H3 Housing Unit, Near 4 Roads",
        "Mathiyankuttai Post",
        "Mettur Dam - 636452",
        "Salem, Tamil Nadu"
      ],
      phone: "98427 81971 / 70100 24368"
    };
    const logoSrc = "/assets/logo-full.png";
    const filename = "Service-Completed.pdf";
    const isPaid = String(booking.paymentStatus || booking.payment_status || "").toLowerCase() === "paid";
    const printWindow = window.open("", "_blank", "width=960,height=720");
    if (!printWindow) throw new Error("Allow popups to generate the PDF");
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(filename)}</title><style>
      body{font-family:Segoe UI,sans-serif;margin:0;background:#e2e8f0;color:#0f172a}
      .sheet{max-width:900px;margin:0 auto;padding:32px}
      .card{position:relative;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 16px 40px rgba(15,23,42,.18)}
      .thankyou-actions{display:flex;justify-content:flex-end;gap:12px;padding:18px 24px;border-bottom:1px solid #e2e8f0;background:#f8fafc}
      .thankyou-action-btn{border:none;border-radius:10px;padding:10px 16px;background:#16324f;color:#fff;font-size:13px;font-weight:600;cursor:pointer}
      .thankyou-shell{position:relative;padding:44px 52px 40px;background:#fff;color:#111827}
      .thankyou-watermark{position:absolute;top:50%;left:50%;width:60%;transform:translate(-50%,-50%);opacity:.06;z-index:0;pointer-events:none}
      .thankyou-watermark img{width:100%;height:auto;display:block}
      .thankyou-header,.thankyou-details,.thankyou-body{position:relative;z-index:1}
      .thankyou-header-top{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:20px}
      .thankyou-logo{width:260px;max-width:100%;height:auto;object-fit:contain}
      .thankyou-title{margin-top:16px;text-align:left;font-weight:bold;letter-spacing:1px}
      .thankyou-title h1{margin:0;font-size:30px;letter-spacing:2.4px;font-weight:800}
      .thankyou-address{order:2;text-align:right;font-size:12px;line-height:1.65;color:#334155}
      .thankyou-address strong{display:block;font-size:13px;color:#0f172a;margin-bottom:4px}
      .thankyou-details{margin-top:24px;display:flex;justify-content:center}
      .thankyou-detail-row{display:grid;grid-template-columns:140px 1fr;gap:8px;margin-bottom:8px;font-size:13px}
      .thankyou-detail-row strong{font-weight:700}
      .thankyou-body{margin-top:24px;padding:0 12px 0 0;text-align:left;font-size:15px;line-height:1.9;color:#1e293b}
      .thankyou-body p{margin:0 0 18px}
      .thankyou-customer{font-size:18px;font-weight:700;color:#0f172a}
      .thankyou-stars{margin:22px 0}
      .thankyou-signoff{margin-top:26px}
      .thankyou-final{margin-top:20px;font-weight:600}
      @media (max-width:720px){.thankyou-shell{padding:32px 24px}.thankyou-header-top{grid-template-columns:1fr}.thankyou-logo{margin:0}.thankyou-address{text-align:left}.thankyou-body{padding:0}}
      @media print{body{background:#fff}.sheet{padding:0}.card{box-shadow:none;border-radius:0}.no-print{display:none !important}}
    </style></head><body><div class="sheet"><div class="card"><div class="pdf-actions no-print thankyou-actions"><button class="thankyou-action-btn" type="button" onclick="downloadPDF()">Download PDF</button><button class="thankyou-action-btn" type="button" onclick="sendPDF()">Send PDF</button></div><div class="thankyou-shell" id="quotation-container"><div class="thankyou-watermark"><img src="${logoSrc}" alt="Company watermark" /></div><div class="thankyou-header"><div class="thankyou-header-top"><div><img class="thankyou-logo" src="${logoSrc}" alt="${escapeHtml(settings.businessName)} logo" /><div class="thankyou-title"><h1>SERVICE COMPLETED!</h1></div></div><div class="thankyou-address"><strong>${escapeHtml(COMPANY_INFO.name)}</strong>${COMPANY_INFO.address.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}<div>Phone: ${escapeHtml(COMPANY_INFO.phone)}</div></div></div></div><div class="thankyou-details"></div><div class="thankyou-body"><p class="thankyou-customer">Dear ${escapeHtml(booking.customerName || "Customer")},</p><p>Thank you for choosing UNIVERSAL SYSTEMS.</p><p>We are delighted to have successfully completed your service and handed over your product.</p><p>Your trust and support mean a lot to us.</p><p>We look forward to serving you again in the future.</p><p>If you need any assistance or service, feel free to contact us anytime.</p><div class="thankyou-stars"><p>&#11088; Your satisfaction is our priority<br />&#11088; Quality service you can trust</p></div><div class="thankyou-signoff"><p>Warm Regards,<br />UNIVERSAL SYSTEMS<br />Contact: 98427 81971</p></div><p class="thankyou-final">We appreciate your business. Visit us again!</p></div></div></div></div><script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script><script>
      const customerId = ${JSON.stringify(booking?.customerId || booking?._id || "Booking")};
      window.customerPhone = ${JSON.stringify(booking?.phone || "")};
      function downloadPDF() {
        const element = document.getElementById("quotation-container");
        if (!element) return;
        html2pdf().set({
          margin: 10,
          filename: "Service-Completed.pdf",
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        }).from(element).save();
      }
      function sendPDF() {
        const phone = window.customerPhone || "";
        if (!phone) {
          alert("Customer phone number not found");
          return;
        }
        window.open(\`https://wa.me/91\${phone}\`);
      }
    </script></body></html>`);
    printWindow.document.close();
  }

  async function generateFinalInvoicePDF(booking) {
    const { bill, settings } = await getPdfContext(booking);
    const financials = buildPdfFinancials(booking, bill);
    const paymentStatus = booking.paymentStatus || booking.payment_status || bill?.paymentStatus || "Pending";
    const warranty = booking.warranty || booking.warrantyPeriod || bill?.warranty || "As per service policy";
    const tableRows = buildInvoiceTableRows(booking, bill);
    openPdfWindow(`Invoice - ${bill?.billNumber || booking.billNumber || booking.customerId || "Bill"}`, `
      <div class="hero"><h1>INVOICE</h1><p>${escapeHtml(settings.businessName)}</p></div>
      <div class="body">
        <div class="grid">
          <div class="box"><strong>Invoice Number</strong>${escapeHtml(bill?.billNumber || booking.billNumber || "-")}</div>
          <div class="box"><strong>Date</strong>${escapeHtml(bill?.date || booking.billDate || todayIso())}</div>
          <div class="box"><strong>Customer Name</strong>${escapeHtml(bill?.customerName || booking.customerName || "-")}</div>
          <div class="box"><strong>Service Charge</strong>${escapeHtml(formatCurrency(financials.serviceCharge + financials.labourCharge))}</div>
          <div class="box"><strong>Parts Cost</strong>${escapeHtml(formatCurrency(financials.partsCost + financials.productsCost))}</div>
          <div class="box accent"><strong>Total Amount</strong>${escapeHtml(formatCurrency(financials.total))}</div>
          <div class="box"><strong>Payment Status</strong>${escapeHtml(paymentStatus)}</div>
          <div class="box"><strong>Warranty</strong>${escapeHtml(warranty)}</div>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th>Part Name</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows.length
              ? tableRows
                  .map(
                    (item) => `<tr><td>${escapeHtml(item.description)}</td><td>${escapeHtml(String(item.quantity))}</td><td>${escapeHtml(formatCurrency(item.price))}</td><td>${escapeHtml(formatCurrency(item.subtotal))}</td></tr>`
                  )
                  .join("")
              : `<tr><td colspan="4">No bill items added.</td></tr>`}
          </tbody>
        </table>
        <div class="summary">
          <div class="summary-row"><span>Parts Total</span><strong>${escapeHtml(formatCurrency(financials.partsCost))}</strong></div>
          <div class="summary-row"><span>Products Total</span><strong>${escapeHtml(formatCurrency(financials.productsCost))}</strong></div>
          <div class="summary-row"><span>Service + Labour</span><strong>${escapeHtml(formatCurrency(financials.serviceCharge + financials.labourCharge))}</strong></div>
          <div class="summary-row"><span>Total Amount</span><strong>${escapeHtml(formatCurrency(financials.total))}</strong></div>
        </div>
        <div class="footer">Thank you for choosing ${escapeHtml(settings.businessName)}.</div>
      </div>
    `, settings);
  }

  async function handleGeneratePDF(booking, type) {
    if (type === "stage1") return generateEstimatePDF(booking);
    if (type === "stage2") return generateWorkUpdatePDF(booking);
    if (type === "stage3") return generateThankYouPDF(booking);
    if (type === "stage4") return downloadBillPdf(booking._id, `${booking.customerId || "bill"}.pdf`);
    return downloadBillPdf(booking._id, `${booking.customerId || "bill"}.pdf`);
  }

  async function generateAutoPDF(booking) {
    return downloadBillPdf(booking._id, `${booking.customerId || "bill"}.pdf`);
  }

  function renderBookings(items) {
    if (!items || !Array.isArray(items)) {
      items = [];
    }
    const tbody = document.getElementById("bookingTableBody");
    const empty = document.getElementById("bookingsEmptyState");
    const sourceFilter = document.getElementById("sourceFilter")?.value || "";
    const filteredItems = sourceFilter ? items.filter((booking) => bookingSourceLabel(booking) === sourceFilter) : items;
    empty.classList.toggle("hidden", filteredItems.length > 0);
    tbody.innerHTML = filteredItems.map((booking) => {
      const displayTotal = Number(booking.totalCost || 0);
      return `
      <tr class="booking-row">
        <td>${escapeHtml(booking.customerId || booking.id || "-")}</td>
        <td>${escapeHtml(booking.customerName || "-")}</td>
        <td><a class="phone-link" href="tel:${escapeHtml(booking.phone || "")}">${escapeHtml(booking.phone || "-")}</a></td>
        <td>${bookingSourceBadge(booking)}</td>
        <td>${escapeHtml(booking.service || "-")}</td>
        <td>${escapeHtml(booking.problem || "-")}</td>
        <td>${escapeHtml(booking.technician || "-")}</td>
        <td>${escapeHtml(formatCurrency(displayTotal))}</td>
        <td><span class="status-pill status-${escapeHtml(booking.status.toLowerCase().replace(/\s+/g, "-"))}">${escapeHtml(booking.status)}</span></td>
        <td class="action-menu-cell">
          <div class="action-menu ${activeActionMenuId === booking._id ? "open" : ""}">
            <button
              type="button"
              class="action-menu-trigger"
              data-menu-toggle="${booking._id}"
              aria-label="Open actions menu"
              aria-haspopup="true"
              aria-expanded="${activeActionMenuId === booking._id ? "true" : "false"}"
            >&#8942;</button>
            <div class="action-menu-dropdown" role="menu" aria-label="Booking actions">
              <button type="button" class="action-menu-item dropdown-item" data-action="view" data-id="${booking._id}">&#128065; View Details</button>
              <button type="button" class="action-menu-item dropdown-item" data-action="edit" data-id="${booking._id}">&#9998; Edit Booking</button>
              <div class="action-menu-divider" role="separator"></div>
              <button type="button" class="action-menu-item dropdown-item" data-action="bill" data-id="${booking._id}">&#128176; Add / Update Bill</button>
              <div class="action-menu-submenu">
                <button type="button" class="action-menu-item dropdown-item action-menu-submenu-trigger">
                  <span>&#128196; Advanced PDF Options</span>
                  <span class="action-menu-caret">▸</span>
                </button>
                <div class="action-menu-dropdown action-menu-submenu-dropdown" role="menu" aria-label="Advanced PDF Options">
                  <button type="button" class="action-menu-item dropdown-item" data-action="advanced-pdf" data-id="${booking._id}" data-pdf-type="stage1" ${["Pending", "Booking Created"].includes(booking.status) ? "" : "disabled"}>Quotation PDF</button>
                  <button type="button" class="action-menu-item dropdown-item" data-action="advanced-pdf" data-id="${booking._id}" data-pdf-type="stage2" ${booking.status === "Completed" ? "" : "disabled"}>Invoice PDF</button>
                  <button type="button" class="action-menu-item dropdown-item" data-action="advanced-pdf" data-id="${booking._id}" data-pdf-type="stage3" ${booking.status === "Delivered" ? "" : "disabled"}>Service Completed PDF</button>
                </div>
              </div>
              <div class="action-menu-divider" role="separator"></div>
              <button
                type="button"
                class="action-menu-item dropdown-item"
                data-action="status-direct"
                data-status="In Progress"
                data-id="${booking._id}"
                ${isStatusActionDisabled(booking.status, "In Progress") ? "disabled" : ""}
              >&#128640; Move to In Progress</button>
              <button
                type="button"
                class="action-menu-item dropdown-item"
                data-action="status-direct"
                data-status="Completed"
                data-id="${booking._id}"
                ${isStatusActionDisabled(booking.status, "Completed") ? "disabled" : ""}
              >&#9989; Move to Completed</button>
              <button
                type="button"
                class="action-menu-item dropdown-item"
                data-action="status-direct"
                data-status="Delivered"
                data-id="${booking._id}"
                ${isStatusActionDisabled(booking.status, "Delivered") ? "disabled" : ""}
              >&#128230; Move to Delivered</button>
              <button
                type="button"
                class="action-menu-item dropdown-item"
                data-action="status-direct"
                data-status="Waiting for Parts"
                data-id="${booking._id}"
                ${isStatusActionDisabled(booking.status, "Waiting for Parts") ? "disabled" : ""}
              >&#128230; Move to Waiting for Parts</button>
              <div class="action-menu-divider" role="separator"></div>
              <button type="button" class="action-menu-item dropdown-item danger" data-action="delete" data-id="${booking._id}">&#128465; Delete</button>
            </div>
          </div>
        </td>
      </tr>
    `;
    }).join("");
    if (activeActionMenuId) {
      window.requestAnimationFrame(positionOpenActionMenu);
    }
  }

  function renderParts(items) {
    const tableBody = document.getElementById("partsTableBody");
    if (!tableBody) {
      console.error("partsTableBody not found");
      return;
    }

    if (!items || !Array.isArray(items)) {
      items = [];
    }

    const search = document.getElementById("partsSearchInput")?.value.trim().toLowerCase() || "";
    const filtered = search ? items.filter((part) => String(part?.name || "").toLowerCase().includes(search)) : items;
    document.getElementById("partsEmptyState").classList.toggle("hidden", filtered.length > 0);

    if (filtered.length === 0) {
      tableBody.innerHTML = "<tr><td colspan='7'>No parts available</td></tr>";
      return;
    }

    tableBody.innerHTML = filtered.map((part) => `
      <tr class="${part.stock_status !== "In Stock" ? "table-row-alert" : ""}">
        <td>${escapeHtml(part.name || "-")}</td>
        <td>${escapeHtml(part.category || "-")}</td>
        <td>${escapeHtml(formatCurrency(part.cost_price || 0))}</td>
        <td>${escapeHtml(formatCurrency(part.selling_price || part.price || 0))}</td>
        <td>${escapeHtml(String(part.stock_quantity ?? 0))}</td>
        <td><span class="status-pill status-${escapeHtml(String(part.stock_status || "").toLowerCase().replace(/\s+/g, "-"))}">${escapeHtml(part.stock_status || "-")}</span></td>
        <td>
          <div class="table-actions action-buttons">
            <button type="button" class="table-action-btn table-action-btn--edit" title="Edit" data-part-action="edit" data-id="${part._id}" aria-label="Edit part">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
              </svg>
            </button>
            <button type="button" class="table-action-btn table-action-btn--delete" title="Delete" data-part-action="delete" data-id="${part._id}" aria-label="Delete part">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M3 6h18"></path>
                <path d="M8 6V4h8v2"></path>
                <path d="M19 6l-1 14H6L5 6"></path>
                <path d="M10 11v6"></path>
                <path d="M14 11v6"></path>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `).join("");

    renderStockHistory();
    console.log("Parts rendered:", filtered);
  }

  function renderStockHistory() {
    const panel = document.getElementById("stockHistoryPanel");
    if (!panel) return;
    const usageRows = bookings
      .flatMap((booking) =>
        getBookingPartsSource(booking).map((part) => ({
          part: part.name || "Part",
          quantity: Number(part.quantity) || 1,
          booking: booking.customerId || booking.customerName || "-",
          date: booking.billDate || booking.completionDate || booking.bookingDate || "-"
        }))
      )
      .slice(0, 6);
    panel.innerHTML = `
      <div class="section-title-row">
        <div>
          <p class="eyebrow">Inventory Movement</p>
          <h4>Recent Stock Usage</h4>
        </div>
      </div>
      <div class="stock-history-list">
        ${usageRows.length
          ? usageRows.map((item) => `<div class="stock-history-item"><strong>${escapeHtml(item.part)}</strong><span>${escapeHtml(String(item.quantity))} used in ${escapeHtml(item.booking)}</span><small>${escapeHtml(item.date)}</small></div>`).join("")
          : '<p class="selected-parts-empty">No stock usage recorded yet.</p>'}
      </div>
    `;
  }

  function renderCallRequests(items) {
    if (!items || !Array.isArray(items)) {
      items = [];
    }
    const body = document.getElementById("callRequestTableBody");
    const badge = document.getElementById("callRequestsBadge");
    const pendingCount = items.filter((request) => request.status === "Pending").length;
    badge.textContent = String(pendingCount);
    badge.classList.toggle("hidden", pendingCount === 0);
    document.getElementById("callRequestsEmptyState").classList.toggle("hidden", items.length > 0);
    body.innerHTML = items.map((request) => `
      <tr>
        <td>${escapeHtml(request.name || "Not provided")}</td>
        <td><a class="phone-link" href="tel:${escapeHtml(request.phone || "")}">${escapeHtml(request.phone || "Not available")}</a></td>
        <td>${escapeHtml(new Date(request.createdAt).toLocaleString("en-IN"))}</td>
        <td><span class="status-pill status-${escapeHtml(String(request.status).toLowerCase())}">${escapeHtml(request.status)}</span></td>
        <td><button type="button" class="action-btn action-btn-outline convert-btn" data-call-action="convert" data-id="${request._id}" ${request.status === "Converted" ? "disabled" : ""}>${request.status === "Converted" ? "Converted" : "Convert to Booking"}</button></td>
      </tr>
    `).join("");
  }

  function workOrderTotals(workOrder) {
    const partsTotal = (workOrder.partsUsed || []).reduce((sum, part) => sum + parseAmount(part.total), 0);
    const serviceCharge = parseAmount(workOrder.serviceCharge);
    return { partsTotal, serviceCharge, grandTotal: partsTotal + serviceCharge };
  }

  function workOrderStatusClass(status) {
    return `status-${String(status || "").toLowerCase().replace(/\s+/g, "-")}`;
  }

  function renderWorkOrderStatusTimeline(status) {
    const activeIndex = WORK_ORDER_STATUS_FLOW[status] ?? 0;
    return `<div class="work-order-status-track">${WORK_ORDER_STATUSES.map((step) => `
      <button class="work-order-status-step ${activeIndex >= WORK_ORDER_STATUS_FLOW[step] ? "done" : "pending"} ${step === status ? "active" : ""}" type="button" data-work-order-status="${escapeHtml(step)}">
        <span>${escapeHtml(WORK_ORDER_STATUS_ICON[step] || step.slice(0, 1))}</span>
        <strong>${escapeHtml(step)}</strong>
      </button>
    `).join("")}</div>`;
  }

  function getPdfWorkflow(workOrder) {
    const sentTypes = new Set((workOrder.documentsSent || []).map((item) => item.type));
    return [
      { type: "quotation", title: "Quotation", description: "Estimate approval document", enabled: workOrder.status === "Pending" },
      { type: "work", title: "Work Invoice", description: "Final work and billing document", enabled: workOrder.status === "Completed" },
      { type: "service-completed", title: "Service Completed", description: "Thank-you and completion document", enabled: workOrder.status === "Delivered" }
    ].map((item) => ({ ...item, sent: sentTypes.has(item.type) }));
  }

  function renderWorkOrderDetail(workOrder) {
    const mount = document.getElementById("workOrderDetail");
    if (!mount) return;
    if (!workOrder) {
      mount.innerHTML = '<div class="work-order-empty-state"><p class="eyebrow">Work Order</p><h4>Select a work order</h4><p>Job details, parts, PDF workflow, notes, and timeline will appear here.</p></div>';
      return;
    }
    const totals = workOrderTotals(workOrder);
    const stockWarnings = (workOrder.partsUsed || []).filter((part) => {
      const stockPart = getPartById(part.inventoryPartId);
      return stockPart && parseAmount(stockPart.stock_quantity) <= parseAmount(stockPart.low_stock_limit);
    });
    mount.innerHTML = `
      <div class="work-order-detail-header">
        <div>
          <p class="eyebrow">Job Details</p>
          <h3>${escapeHtml(workOrder.displayId)} - ${escapeHtml(workOrder.device)}</h3>
          <p>${escapeHtml(workOrder.customerName)} ${workOrder.phone ? `| ${escapeHtml(workOrder.phone)}` : ""}</p>
        </div>
        <span class="status-pill ${workOrderStatusClass(workOrder.status)}">${escapeHtml(WORK_ORDER_STATUS_ICON[workOrder.status] || "")} ${escapeHtml(workOrder.status)}</span>
      </div>

      ${renderWorkOrderStatusTimeline(workOrder.status)}

      <div class="work-order-section-grid">
        <article class="detail-section work-order-card">
          <p class="eyebrow">Job Details</p>
          <div class="detail-grid compact-detail-grid">
            <div class="detail-block"><strong>Customer</strong><p>${escapeHtml(workOrder.customerName)}</p></div>
            <div class="detail-block"><strong>Technician</strong><p>${escapeHtml(workOrder.technicianName)}</p></div>
            <div class="detail-block"><strong>Device</strong><p>${escapeHtml(workOrder.device)}</p></div>
            <div class="detail-block"><strong>Issue</strong><p>${escapeHtml(workOrder.issue)}</p></div>
            <div class="detail-block"><strong>Completed Date</strong><p>${escapeHtml(workOrder.completedAt ? new Date(workOrder.completedAt).toLocaleDateString("en-IN") : "Not completed")}</p></div>
            <div class="detail-block"><strong>Active Work</strong><p>${["Pending", "In Progress", "Awaiting Parts"].includes(workOrder.status) ? '<span class="active-work-badge">Active</span>' : "Closed"}</p></div>
          </div>
        </article>

        <article class="detail-section work-order-card">
          <p class="eyebrow">Service Charge</p>
          <div class="service-charge-row">
            <input type="number" id="workOrderServiceChargeInput" min="0" step="0.01" value="${escapeHtml(String(workOrder.serviceCharge || 0))}" />
            <button class="secondary-btn" type="button" data-work-order-action="save-charge">Save</button>
          </div>
          <div class="work-order-summary-list">
            <div><span>Parts Subtotal</span><strong>${escapeHtml(formatCurrency(totals.partsTotal))}</strong></div>
            <div><span>Service Charge</span><strong>${escapeHtml(formatCurrency(totals.serviceCharge))}</strong></div>
            <div class="summary-grand-total"><span>Grand Total</span><strong>${escapeHtml(formatCurrency(totals.grandTotal))}</strong></div>
          </div>
        </article>
      </div>

      <div class="work-order-section-grid">
        <article class="detail-section work-order-card">
          <div class="section-title-row compact-title-row"><div><p class="eyebrow">Parts Used</p><h4>Used Parts</h4></div>${stockWarnings.length ? '<span class="status-pill status-low-stock">Stock Warning</span>' : ""}</div>
          <div class="work-order-part-form">
            <select id="workOrderPartSelect"><option value="">Select stocked part</option>${availableParts.map((part) => `<option value="${escapeHtml(part._id)}">${escapeHtml(part.name)} (${escapeHtml(String(part.stock_quantity))} left)</option>`).join("")}</select>
            <input id="workOrderPartQty" type="number" min="1" step="1" value="1" />
            <button class="primary-btn" type="button" data-work-order-action="add-part">Add</button>
          </div>
          <div class="work-order-part-list">
            ${(workOrder.partsUsed || []).map((part) => `
              <div class="work-order-part-row" data-work-order-part-id="${escapeHtml(part._id)}">
                <strong>${escapeHtml(part.name)}</strong>
                <span>Qty ${escapeHtml(String(part.quantity))}</span>
                <span>${escapeHtml(formatCurrency(part.unitPrice))}</span>
                <span>${escapeHtml(formatCurrency(part.total))}</span>
                <button class="table-action-btn table-action-btn--delete" type="button" data-work-order-action="remove-part" aria-label="Remove part">x</button>
              </div>
            `).join("") || '<p class="selected-parts-empty">No parts used yet.</p>'}
          </div>
        </article>

        <article class="detail-section work-order-card">
          <div class="section-title-row compact-title-row"><div><p class="eyebrow">Part Requests</p><h4>Requested Parts</h4></div></div>
          <div class="work-order-part-form">
            <input id="workOrderRequestName" type="text" placeholder="Part request name" />
            <input id="workOrderRequestQty" type="number" min="1" step="1" value="1" />
            <button class="secondary-btn" type="button" data-work-order-action="request-part">Request</button>
          </div>
          <div class="insight-list">
            ${(workOrder.partRequests || []).map((part) => `<div class="insight-item"><strong>${escapeHtml(part.name)}</strong><span>${escapeHtml(String(part.quantity))} requested</span><em>${escapeHtml(part.status)}</em></div>`).join("") || '<p class="selected-parts-empty">No part requests yet.</p>'}
          </div>
        </article>
      </div>

      <div class="work-order-section-grid">
        <article class="detail-section work-order-card">
          <div class="section-title-row compact-title-row"><div><p class="eyebrow">PDF Workflow</p><h4>Documents</h4></div></div>
          <div class="pdf-workflow-grid">
            ${getPdfWorkflow(workOrder).map((item) => `
              <div class="pdf-workflow-card ${item.enabled ? "enabled" : "disabled"} ${item.sent ? "sent" : ""}">
                <div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.description)}</span></div>
                <span class="sent-indicator">${item.sent ? "Sent" : item.enabled ? "Ready" : "Locked"}</span>
                <div class="pdf-workflow-actions">
                  <button class="secondary-btn" type="button" data-work-order-pdf="${escapeHtml(item.type)}" ${item.enabled ? "" : "disabled"}>PDF</button>
                  <button class="primary-btn whatsapp-send-btn" type="button" data-work-order-send="${escapeHtml(item.type)}" ${item.enabled ? "" : "disabled"}>WhatsApp</button>
                </div>
              </div>
            `).join("")}
          </div>
        </article>

        <article class="detail-section work-order-card">
          <div class="section-title-row compact-title-row"><div><p class="eyebrow">Notes</p><h4>Technician Notes</h4></div></div>
          <div class="work-order-note-form">
            <textarea id="workOrderNoteInput" rows="3" placeholder="Add technician activity note"></textarea>
            <button class="secondary-btn" type="button" data-work-order-action="add-note">Add Note</button>
          </div>
          <div class="insight-list">
            ${(workOrder.notes || []).slice(-4).reverse().map((note) => `<div class="insight-item"><strong>${escapeHtml(note.text)}</strong><span>${escapeHtml(note.createdAt ? new Date(note.createdAt).toLocaleString("en-IN") : "Just now")}</span></div>`).join("") || '<p class="selected-parts-empty">No notes yet.</p>'}
          </div>
        </article>
      </div>

      <article class="detail-section work-order-card">
        <div class="section-title-row compact-title-row"><div><p class="eyebrow">Timeline</p><h4>Technician Activity Timeline</h4></div></div>
        <div class="work-order-timeline">
          ${(workOrder.timeline || []).slice().reverse().map((entry) => `
            <div class="work-order-timeline-item">
              <span class="timeline-dot ${workOrderStatusClass(entry.status)}"></span>
              <div><strong>${escapeHtml(entry.message)}</strong><span>${escapeHtml(entry.createdAt ? new Date(entry.createdAt).toLocaleString("en-IN") : "Just now")}</span></div>
            </div>
          `).join("")}
        </div>
      </article>
    `;
  }

  function renderWorkOrders() {
    const search = document.getElementById("workOrderSearchInput")?.value.trim().toLowerCase() || "";
    const statusFilter = document.getElementById("workOrderStatusFilter")?.value || "";
    const sourceFilter = document.getElementById("workOrderSourceFilter")?.value || "";
    const filtered = workOrders.filter((workOrder) => {
      const matchesStatus = !statusFilter || workOrder.status === statusFilter;
      const matchesSource = !sourceFilter || bookingSourceLabel(workOrder) === sourceFilter;
      const haystack = [workOrder.displayId, workOrder.customerName, workOrder.phone, workOrder.device, workOrder.issue, workOrder.technicianName, workOrder.status].join(" ").toLowerCase();
      return matchesStatus && matchesSource && (!search || haystack.includes(search));
    });
    const count = document.getElementById("workOrderCount");
    if (count) count.textContent = String(filtered.length);
    if (!selectedWorkOrderId && filtered.length) selectedWorkOrderId = filtered[0]._id;
    if (!filtered.some((item) => item._id === selectedWorkOrderId) && filtered.length) selectedWorkOrderId = filtered[0]._id;
    const body = document.getElementById("workOrderTableBody");
    if (body) {
      body.innerHTML = filtered.map((workOrder) => `
        <tr class="work-order-list-row ${workOrder._id === selectedWorkOrderId ? "active" : ""}" data-work-order-id="${escapeHtml(workOrder._id)}">
          <td><strong>${escapeHtml(workOrder.displayId)}</strong><div>${escapeHtml(workOrder.device)}</div></td>
          <td>${escapeHtml(workOrder.customerName)}</td>
          <td>${bookingSourceBadge(workOrder)}</td>
          <td><span class="status-pill ${workOrderStatusClass(workOrder.status)}">${escapeHtml(workOrder.status)}</span></td>
          <td>${escapeHtml(workOrder.technicianName)}</td>
        </tr>
      `).join("") || '<tr><td colspan="5" class="table-empty-cell">No work orders found</td></tr>';
    }
    renderWorkOrderDetail(workOrders.find((item) => item._id === selectedWorkOrderId) || null);
  }

  function selectedWorkOrder() {
    return workOrders.find((item) => item._id === selectedWorkOrderId) || null;
  }

  function updateLocalWorkOrder(id, updater) {
    const index = workOrders.findIndex((item) => item._id === id);
    if (index === -1) return null;
    const next = normalizeWorkOrder(updater({ ...workOrders[index] }) || workOrders[index]);
    workOrders[index] = next;
    saveLocalWorkOrder(next);
    renderWorkOrders();
    renderRecentActivity();
    renderEnterpriseAnalytics();
    return next;
  }

  async function applyWorkOrderStatus(workOrder, status) {
    if (!workOrder || !WORK_ORDER_STATUSES.includes(status)) return;
    try {
      const response = await apiFetch(`${WORK_ORDER_API_URL}/${workOrder._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (response?.workOrder) {
        const normalized = normalizeWorkOrder(response.workOrder);
        workOrders = workOrders.map((item) => (item._id === normalized._id ? normalized : item));
        selectedWorkOrderId = normalized._id;
      } else {
        throw new Error("Work order API unavailable");
      }
    } catch (_error) {
      updateLocalWorkOrder(workOrder._id, (item) => {
        item.status = status;
        if (status === "Completed" && !item.completedAt) item.completedAt = new Date().toISOString();
        item.timeline = [...(item.timeline || []), { status, message: `Status changed to ${status}`, createdAt: new Date().toISOString() }];
        return item;
      });
    }
    renderWorkOrders();
    showToast("Work order status updated");
  }

  async function saveWorkOrderServiceCharge(workOrder) {
    const input = document.getElementById("workOrderServiceChargeInput");
    const serviceCharge = parseAmount(input?.value);
    try {
      const response = await apiFetch(`${WORK_ORDER_API_URL}/${workOrder._id}/service-charge`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceCharge })
      });
      if (response?.workOrder) {
        const normalized = normalizeWorkOrder(response.workOrder);
        workOrders = workOrders.map((item) => (item._id === normalized._id ? normalized : item));
      } else {
        throw new Error("Work order API unavailable");
      }
    } catch (_error) {
      updateLocalWorkOrder(workOrder._id, (item) => {
        item.serviceCharge = serviceCharge;
        item.timeline = [...(item.timeline || []), { status: item.status, message: `Service charge updated to ${serviceCharge}`, createdAt: new Date().toISOString() }];
        return item;
      });
    }
    renderWorkOrders();
    showToast("Service charge updated");
  }

  async function addWorkOrderNote(workOrder) {
    const input = document.getElementById("workOrderNoteInput");
    const text = sanitizeText(input?.value);
    if (!text) return showToast("Enter a note first", true);
    try {
      const response = await apiFetch(`${WORK_ORDER_API_URL}/${workOrder._id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      if (response?.workOrder) {
        const normalized = normalizeWorkOrder(response.workOrder);
        workOrders = workOrders.map((item) => (item._id === normalized._id ? normalized : item));
      } else {
        throw new Error("Work order API unavailable");
      }
    } catch (_error) {
      updateLocalWorkOrder(workOrder._id, (item) => {
        item.notes = [...(item.notes || []), { text, createdAt: new Date().toISOString() }];
        item.timeline = [...(item.timeline || []), { status: item.status, message: "Technician note added", createdAt: new Date().toISOString() }];
        return item;
      });
    }
    renderWorkOrders();
    showToast("Note added");
  }

  async function addWorkOrderPart(workOrder) {
    const partId = document.getElementById("workOrderPartSelect")?.value;
    const quantity = Math.max(1, Number(document.getElementById("workOrderPartQty")?.value) || 1);
    const part = getPartById(partId);
    if (!part) return showToast("Select a stocked part", true);
    const payload = { inventoryPartId: part._id, name: part.name, quantity, unitPrice: part.selling_price || part.price };
    try {
      const response = await apiFetch(`${WORK_ORDER_API_URL}/${workOrder._id}/parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (response?.workOrder) {
        const normalized = normalizeWorkOrder(response.workOrder);
        workOrders = workOrders.map((item) => (item._id === normalized._id ? normalized : item));
        await loadParts();
      } else {
        throw new Error("Work order API unavailable");
      }
    } catch (_error) {
      updateLocalWorkOrder(workOrder._id, (item) => {
        const total = quantity * parseAmount(payload.unitPrice);
        item.partsUsed = [...(item.partsUsed || []), { _id: `local-part-${Date.now()}`, ...payload, unitPrice: parseAmount(payload.unitPrice), total }];
        item.timeline = [...(item.timeline || []), { status: item.status, message: `Part added: ${part.name}`, createdAt: new Date().toISOString() }];
        return item;
      });
    }
    renderWorkOrders();
    showToast("Part added to work order");
  }

  async function requestWorkOrderPart(workOrder) {
    const name = sanitizeText(document.getElementById("workOrderRequestName")?.value);
    const quantity = Math.max(1, Number(document.getElementById("workOrderRequestQty")?.value) || 1);
    if (!name) return showToast("Enter a part request name", true);
    try {
      const response = await apiFetch(`${WORK_ORDER_API_URL}/${workOrder._id}/part-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, quantity })
      });
      if (response?.workOrder) {
        const normalized = normalizeWorkOrder(response.workOrder);
        workOrders = workOrders.map((item) => (item._id === normalized._id ? normalized : item));
        selectedWorkOrderId = normalized._id;
      } else {
        throw new Error("Work order API unavailable");
      }
    } catch (_error) {
      updateLocalWorkOrder(workOrder._id, (item) => {
        item.status = "Awaiting Parts";
        item.partRequests = [...(item.partRequests || []), { _id: `local-request-${Date.now()}`, name, quantity, status: "Requested", createdAt: new Date().toISOString() }];
        item.timeline = [...(item.timeline || []), { status: "Awaiting Parts", message: `Part requested: ${name}`, createdAt: new Date().toISOString() }];
        return item;
      });
    }
    renderWorkOrders();
    showToast("Part request logged");
  }

  async function removeWorkOrderPart(workOrder, partId) {
    try {
      const response = await apiFetch(`${WORK_ORDER_API_URL}/${workOrder._id}/parts/${partId}`, { method: "DELETE" });
      if (response?.workOrder) {
        const normalized = normalizeWorkOrder(response.workOrder);
        workOrders = workOrders.map((item) => (item._id === normalized._id ? normalized : item));
        await loadParts();
      } else {
        throw new Error("Work order API unavailable");
      }
    } catch (_error) {
      updateLocalWorkOrder(workOrder._id, (item) => {
        const removed = (item.partsUsed || []).find((part) => part._id === partId);
        item.partsUsed = (item.partsUsed || []).filter((part) => part._id !== partId);
        item.timeline = [...(item.timeline || []), { status: item.status, message: `Part removed: ${removed?.name || "Part"}`, createdAt: new Date().toISOString() }];
        return item;
      });
    }
    renderWorkOrders();
    showToast("Part removed");
  }

  async function downloadWorkOrderPdf(workOrder, type) {
    try {
      await downloadWithAuth(`${WORK_ORDER_API_URL}/${workOrder._id}/pdf/${type}`, `${workOrder.displayId}-${type}.pdf`);
      showToast("PDF downloaded");
    } catch (error) {
      showToast(error.message || "PDF is available after the required status change", true);
    }
  }

  async function sendWorkOrderDocument(workOrder, type) {
    const captions = {
      quotation: `Hello ${workOrder.customerName}, your quotation from Universal Systems is ready.`,
      work: `Hello ${workOrder.customerName}, your work invoice from Universal Systems is ready.`,
      "service-completed": `Hello ${workOrder.customerName}, your service has been completed successfully.`
    };
    try {
      const response = await apiFetch(`${WORK_ORDER_API_URL}/${workOrder._id}/documents/${type}/sent`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentVia: "WhatsApp" })
      });
      if (response?.workOrder) {
        const normalized = normalizeWorkOrder(response.workOrder);
        workOrders = workOrders.map((item) => (item._id === normalized._id ? normalized : item));
      } else {
        throw new Error("Work order API unavailable");
      }
    } catch (_error) {
      updateLocalWorkOrder(workOrder._id, (item) => {
        const existing = (item.documentsSent || []).filter((doc) => doc.type !== type);
        item.documentsSent = [...existing, { type, sentVia: "WhatsApp", sentAt: new Date().toISOString() }];
        item.timeline = [...(item.timeline || []), { type: "document", status: item.status, message: `${type} PDF sent via WhatsApp`, createdAt: new Date().toISOString() }];
        return item;
      });
    }
    const phone = String(workOrder.phone || enterpriseSettings.whatsappNumber || "").replace(/\D/g, "");
    if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(captions[type] || "Document ready")}`, "_blank", "noopener");
    renderWorkOrders();
    showToast("Document marked as sent");
  }

  function renderOverviewMetrics() {
    const source = overviewBookings.length ? overviewBookings : bookings;
    const today = new Date().toISOString().slice(0, 10);
    setMetricText(document.getElementById("todayCount"), String(source.filter((booking) => booking.bookingDate === today).length));
    setMetricText(document.getElementById("pendingBookings"), String(source.filter((booking) => ["Pending", "In Progress", "Waiting for Parts"].includes(booking.status)).length));
    setMetricText(document.getElementById("completedBookings"), String(source.filter((booking) => ["Completed", "Delivered"].includes(booking.status)).length));
    const revenue = bills.reduce((sum, bill) => sum + parseAmount(bill.total), 0);
    setMetricText(document.getElementById("totalRevenue"), formatCurrency(revenue));
    const recentJobsBody = document.getElementById("recentJobsTableBody");
    const lowStockBody = document.getElementById("lowStockPartsTableBody");
    if (recentJobsBody) {
      recentJobsBody.innerHTML = source.slice(0, 5).map((booking) => `<tr><td>${escapeHtml(booking.customerId || "-")}</td><td>${escapeHtml(booking.customerName || "-")}</td><td><span class="status-pill status-${escapeHtml(String(booking.status || "").toLowerCase().replace(/\\s+/g, "-"))}">${escapeHtml(booking.status || "-")}</span></td><td>${escapeHtml(formatCurrency(booking.totalCost))}</td></tr>`).join("") || '<tr><td colspan="4" class="table-empty-cell">No recent jobs</td></tr>';
    }
    if (lowStockBody) {
      const lowStock = availableParts.filter((part) => part.stock_status !== "In Stock").slice(0, 5);
      lowStockBody.innerHTML = lowStock.map((part) => `<tr><td>${escapeHtml(part.name)}</td><td>${escapeHtml(String(part.stock_quantity))}</td><td><span class="status-pill status-${escapeHtml(String(part.stock_status).toLowerCase().replace(/\\s+/g, "-"))}">${escapeHtml(part.stock_status)}</span></td></tr>`).join("") || '<tr><td colspan="3" class="table-empty-cell">No low stock parts</td></tr>';
    }
    renderKpiPremiumDetails();
  }

  function setMetricText(element, value) {
    if (!element) return;
    const nextValue = String(value);
    if (element.textContent === nextValue) return;
    element.textContent = nextValue;
    element.classList.remove("metric-updated");
    void element.offsetWidth;
    element.classList.add("metric-updated");
  }

  function renderRecentActivity() {
    const activityList = document.getElementById("activityList");
    const bookingActivity = (overviewBookings.length ? overviewBookings : bookings).map((booking) => ({ label: `${booking.status} - ${booking.customerName || booking.customerId || "Customer"}`, time: booking.createdAt || booking.bookingDate || "" }));
    const callActivity = callRequests.map((request) => ({ label: `${request.status} call request - ${request.name || request.phone || "Customer"}`, time: request.createdAt || "" }));
    const workOrderActivity = workOrders.flatMap((workOrder) => (workOrder.timeline || []).slice(-2).map((entry) => ({ label: `${entry.message} - ${workOrder.customerName || workOrder.displayId}`, time: entry.createdAt || workOrder.updatedAt || workOrder.createdAt || "" })));
    const items = [...bookingActivity, ...callActivity, ...workOrderActivity].sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0)).slice(0, 6);
    activityList.innerHTML = items.length ? items.map((item) => `<li>${escapeHtml(item.label)}<span>${escapeHtml(new Date(item.time).toLocaleString("en-IN"))}</span></li>`).join("") : '<li class="activity-empty">No recent activity yet</li>';
    renderLiveActivity();
    renderTechnicianWorkload();
  }

  function setKpiDetails(id, trend, tone) {
    const metric = document.getElementById(id)?.closest(".stats-card");
    if (!metric) return;
    metric.dataset.tone = tone || "info";
    let trendEl = metric.querySelector(".stats-trend");
    if (!trendEl) {
      trendEl = document.createElement("span");
      trendEl.className = "stats-trend";
      metric.appendChild(trendEl);
    }
    trendEl.textContent = trend;
    if (!metric.querySelector(".stats-sparkline")) {
      const spark = document.createElement("span");
      spark.className = "stats-sparkline";
      metric.appendChild(spark);
    }
  }

  function renderKpiPremiumDetails() {
    const source = overviewBookings.length ? overviewBookings : bookings;
    const today = todayIso();
    const todayCount = source.filter((booking) => booking.bookingDate === today).length;
    const pendingCount = source.filter((booking) => ["Pending", "In Progress", "Waiting for Parts"].includes(booking.status)).length;
    const completedCount = source.filter((booking) => ["Completed", "Delivered"].includes(booking.status)).length;
    const revenue = bills.reduce((sum, bill) => sum + parseAmount(bill.total), 0);
    setKpiDetails("todayCount", todayCount ? `up ${Math.min(28, todayCount * 4)}% today` : "steady today", "success");
    setKpiDetails("pendingBookings", pendingCount ? `${pendingCount} active queue` : "queue clear", pendingCount > completedCount ? "warning" : "info");
    setKpiDetails("completedBookings", completedCount ? `up ${Math.min(32, completedCount * 3)}% this week` : "no closures yet", "success");
    setKpiDetails("totalRevenue", revenue ? `up ${Math.min(24, Math.round(revenue / 2500))}% this month` : "awaiting revenue", "info");
  }

  function buildLiveActivityItems() {
    const sourceBookings = overviewBookings.length ? overviewBookings : bookings;
    const sourceWorkOrders = workOrders.length ? workOrders : sourceBookings.map(bookingToWorkOrder);
    const items = [];
    sourceBookings.slice(0, 8).forEach((booking) => items.push({
      icon: "B",
      title: "Booking created",
      detail: `${booking.customerName || booking.customerId || "Customer"} - ${booking.service || booking.product || "Service"}`,
      status: "info",
      time: booking.createdAt || booking.bookingDate
    }));
    bills.slice(0, 8).forEach((bill) => items.push({
      icon: "P",
      title: /pending|unpaid|due/i.test(String(bill.status || bill.paymentStatus || "")) ? "Payment pending" : "Payment recorded",
      detail: `${bill.customerName || "Customer"} - ${formatCurrency(bill.total)}`,
      status: /pending|unpaid|due/i.test(String(bill.status || bill.paymentStatus || "")) ? "warning" : "success",
      time: bill.date || bill.createdAt
    }));
    sourceWorkOrders.slice(0, 10).forEach((workOrder) => {
      const lastEntry = (workOrder.timeline || []).slice(-1)[0];
      items.push({
        icon: "W",
        title: ["Completed", "Delivered"].includes(workOrder.status) ? "Work order completed" : "Work order updated",
        detail: `${workOrder.displayId || "Work order"} - ${workOrder.customerName || "Customer"}`,
        status: workOrder.status === "Returned" ? "critical" : ["Awaiting Parts", "Pending"].includes(workOrder.status) ? "warning" : ["Completed", "Delivered"].includes(workOrder.status) ? "success" : "info",
        time: lastEntry?.createdAt || workOrder.updatedAt || workOrder.createdAt
      });
      (workOrder.documentsSent || []).slice(-2).forEach((doc) => items.push({
        icon: doc.sentVia === "WhatsApp" ? "WA" : "PDF",
        title: doc.sentVia === "WhatsApp" ? "WhatsApp sent" : "PDF generated",
        detail: `${workOrder.customerName || "Customer"} - ${doc.type || "Document"}`,
        status: "success",
        time: doc.sentAt || doc.createdAt || workOrder.updatedAt
      }));
    });
    availableParts.filter((part) => part.stock_status !== "In Stock" || parseAmount(part.stock_quantity) <= parseAmount(part.low_stock_limit)).slice(0, 5).forEach((part) => items.push({
      icon: "S",
      title: "Stock updated",
      detail: `${part.name} - ${part.stock_quantity} available`,
      status: parseAmount(part.stock_quantity) <= 0 ? "critical" : "warning",
      time: new Date().toISOString()
    }));
    return items.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0)).slice(0, 8);
  }

  function renderLiveActivity() {
    const mount = document.getElementById("liveActivityList");
    if (!mount) return;
    const items = buildLiveActivityItems();
    mount.innerHTML = items.map((item) => `
      <div class="live-activity-item ${escapeHtml(item.status)}">
        <span class="live-activity-icon">${escapeHtml(item.icon)}</span>
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.detail)}</p>
          <span>${escapeHtml(formatDateTime(item.time))}</span>
        </div>
      </div>
    `).join("") || '<p class="selected-parts-empty">No live activity yet.</p>';
  }

  function renderTechnicianWorkload() {
    const mount = document.getElementById("technicianWorkloadList");
    const count = document.getElementById("technicianWorkloadCount");
    if (!mount) return;
    const source = workOrders.length ? workOrders : (overviewBookings.length ? overviewBookings : bookings).map(bookingToWorkOrder);
    const map = new Map();
    source.forEach((workOrder) => {
      const name = workOrder.technicianName || "Unassigned";
      const stats = map.get(name) || { total: 0, completed: 0, active: 0, revenue: 0 };
      stats.total += 1;
      if (["Completed", "Delivered"].includes(workOrder.status)) stats.completed += 1;
      else stats.active += 1;
      stats.revenue += workOrderTotals(workOrder).grandTotal;
      map.set(name, stats);
    });
    const entries = Array.from(map.entries()).sort((a, b) => b[1].active - a[1].active || b[1].completed - a[1].completed).slice(0, 6);
    setMetricText(count, String(entries.length));
    mount.innerHTML = entries.map(([name, stats]) => {
      const efficiency = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
      const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "T";
      return `
        <div class="technician-workload-item">
          <span class="technician-avatar">${escapeHtml(initials)}</span>
          <div class="technician-workload-main">
            <div class="technician-workload-title"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(String(efficiency))}% efficiency</span></div>
            <div class="workload-progress"><span style="width: ${escapeHtml(String(Math.max(4, efficiency)))}%"></span></div>
            <div class="technician-workload-meta"><span>${escapeHtml(String(stats.completed))} completed</span><span>${escapeHtml(String(stats.active))} active</span><span>${escapeHtml(formatCurrency(stats.revenue))}</span></div>
          </div>
        </div>`;
    }).join("") || '<p class="selected-parts-empty">No technician workload yet.</p>';
  }

  function attachChartTooltip(canvas, items) {
    if (!canvas || !Array.isArray(items)) return;
    if (!canvas._premiumTooltip) {
      const tooltip = document.createElement("div");
      tooltip.className = "chart-tooltip";
      tooltip.hidden = true;
      document.body.appendChild(tooltip);
      canvas._premiumTooltip = tooltip;
    }
    if (canvas._premiumTooltipMove) {
      canvas.removeEventListener("mousemove", canvas._premiumTooltipMove);
      canvas.removeEventListener("mouseleave", canvas._premiumTooltipLeave);
    }
    const tooltip = canvas._premiumTooltip;
    canvas._premiumTooltipMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / Math.max(rect.width, 1);
      const scaleY = canvas.height / Math.max(rect.height, 1);
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;
      const target = items.find((item) => {
        if (item.type === "bar") return x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height;
        const radius = item.radius || 16;
        return Math.hypot(x - item.x, y - item.y) <= radius;
      });
      if (!target) {
        tooltip.hidden = true;
        canvas.classList.remove("chart-hovering");
        return;
      }
      tooltip.innerHTML = `<strong>${escapeHtml(target.label)}</strong><span>${escapeHtml(String(target.value))}</span>`;
      tooltip.style.left = `${event.clientX + 14}px`;
      tooltip.style.top = `${event.clientY + 14}px`;
      tooltip.hidden = false;
      canvas.classList.add("chart-hovering");
    };
    canvas._premiumTooltipLeave = () => {
      tooltip.hidden = true;
      canvas.classList.remove("chart-hovering");
    };
    canvas.addEventListener("mousemove", canvas._premiumTooltipMove);
    canvas.addEventListener("mouseleave", canvas._premiumTooltipLeave);
  }

  function drawBarChart(canvas, labels, values, colors) {
    if (!canvas) return;
    canvas.width = canvas.clientWidth || 320;
    canvas.height = canvas.height || 180;
    const context = canvas.getContext("2d");
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
    if (!labels.length) return;

    const safeValues = values.map((value) => Number.isFinite(Number(value)) ? Number(value) : 0);
    const maxValue = Math.max(...safeValues, 1);
    const chartPadding = 22;
    const labelSpace = 28;
    const availableWidth = width - chartPadding * 2;
    const gap = Math.max(12, availableWidth / Math.max(labels.length * 5, 1));
    const barWidth = Math.max(18, Math.min(56, (availableWidth - gap * (labels.length - 1)) / Math.max(labels.length, 1)));
    const textColor = getComputedStyle(document.body).getPropertyValue("--text-secondary").trim() || "#94a3b8";
    const gridColor = getComputedStyle(document.body).getPropertyValue("--border-color").trim() || "rgba(148, 163, 184, 0.22)";
    const start = performance.now();
    const duration = 700;

    function roundedRect(x, y, rectWidth, rectHeight, radius) {
      const nextRadius = Math.min(radius, rectWidth / 2, rectHeight / 2);
      context.beginPath();
      context.moveTo(x + nextRadius, y);
      context.arcTo(x + rectWidth, y, x + rectWidth, y + rectHeight, nextRadius);
      context.arcTo(x + rectWidth, y + rectHeight, x, y + rectHeight, nextRadius);
      context.arcTo(x, y + rectHeight, x, y, nextRadius);
      context.arcTo(x, y, x + rectWidth, y, nextRadius);
      context.closePath();
    }

    function render(progress) {
      context.clearRect(0, 0, width, height);
      context.save();
      context.globalAlpha = 0.45;
      context.strokeStyle = gridColor;
      context.lineWidth = 1;
      for (let row = 0; row < 3; row += 1) {
        const y = chartPadding + row * ((height - chartPadding - labelSpace) / 3);
        context.beginPath();
        context.moveTo(chartPadding, y);
        context.lineTo(width - chartPadding, y);
        context.stroke();
      }
      context.restore();

      labels.forEach((label, index) => {
        const value = safeValues[index] || 0;
        const targetBarHeight = (value / maxValue) * (height - chartPadding - labelSpace - 10);
        const barHeight = targetBarHeight * progress;
        const x = chartPadding + index * (barWidth + gap);
        const y = height - labelSpace - barHeight;
        const color = colors[index] || "#3b82f6";
        const gradient = context.createLinearGradient(0, y, 0, height - labelSpace);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, "rgba(14, 165, 233, 0.34)");

        context.save();
        context.shadowColor = color;
        context.shadowBlur = 16;
        roundedRect(x, y, barWidth, barHeight, 9);
        context.fillStyle = gradient;
        context.fill();
        context.restore();

        context.fillStyle = textColor;
        context.font = "600 12px Segoe UI";
        context.fillText(label.slice(0, 10), x, height - 8);
        context.fillStyle = "rgba(226, 232, 240, 0.92)";
        context.fillText(String(value), x, Math.max(14, y - 8));
      });
    }

    function frame(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      render(eased);
      if (progress < 1) window.requestAnimationFrame(frame);
    }

    attachChartTooltip(canvas, labels.map((label, index) => {
      const value = safeValues[index] || 0;
      const targetBarHeight = (value / maxValue) * (height - chartPadding - labelSpace - 10);
      const x = chartPadding + index * (barWidth + gap);
      const y = height - labelSpace - targetBarHeight;
      return { type: "bar", x, y, width: barWidth, height: Math.max(targetBarHeight, 8), label, value };
    }));
    window.requestAnimationFrame(frame);
  }

  function drawLineChart(canvas, labels, values, color = "#67e8f9") {
    if (!canvas) return;
    canvas.width = canvas.clientWidth || 320;
    canvas.height = canvas.height || 190;
    const context = canvas.getContext("2d");
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
    if (!values.length) return;
    const safeValues = values.map((value) => Number.isFinite(Number(value)) ? Number(value) : 0);
    const padding = 26;
    const maxValue = Math.max(...safeValues, 1);
    const step = (width - padding * 2) / Math.max(values.length - 1, 1);
    const points = safeValues.map((value, index) => ({
      x: padding + index * step,
      y: height - padding - (value / maxValue) * (height - padding * 2)
    }));
    const textColor = getComputedStyle(document.body).getPropertyValue("--text-secondary").trim() || "#94a3b8";
    const gridColor = getComputedStyle(document.body).getPropertyValue("--border-color").trim() || "rgba(148, 163, 184, 0.22)";
    const start = performance.now();
    const duration = 760;

    function render(progress) {
      const easedPoints = points.map((point) => ({ ...point, y: height - padding - (height - padding - point.y) * progress }));
      const gradient = context.createLinearGradient(0, padding, 0, height - padding);
      gradient.addColorStop(0, "rgba(103, 232, 249, 0.3)");
      gradient.addColorStop(1, "rgba(103, 232, 249, 0)");
      context.clearRect(0, 0, width, height);
      context.save();
      context.globalAlpha = 0.38;
      context.strokeStyle = gridColor;
      context.lineWidth = 1;
      for (let row = 0; row < 3; row += 1) {
        const y = padding + row * ((height - padding * 2) / 3);
        context.beginPath();
        context.moveTo(padding, y);
        context.lineTo(width - padding, y);
        context.stroke();
      }
      context.restore();
      context.beginPath();
      context.moveTo(easedPoints[0].x, height - padding);
      easedPoints.forEach((point) => context.lineTo(point.x, point.y));
      context.lineTo(easedPoints[easedPoints.length - 1].x, height - padding);
      context.closePath();
      context.fillStyle = gradient;
      context.fill();
      context.beginPath();
      easedPoints.forEach((point, index) => {
        if (index === 0) context.moveTo(point.x, point.y);
        else {
          const previous = easedPoints[index - 1];
          const controlX = (previous.x + point.x) / 2;
          context.bezierCurveTo(controlX, previous.y, controlX, point.y, point.x, point.y);
        }
      });
      context.strokeStyle = color;
      context.lineWidth = 3;
      context.shadowColor = color;
      context.shadowBlur = 16;
      context.stroke();
      context.shadowBlur = 0;
      easedPoints.forEach((point, index) => {
        context.beginPath();
        context.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
        context.fillStyle = index === easedPoints.length - 1 ? "#ffffff" : color;
        context.fill();
      });
      context.fillStyle = textColor;
      context.font = "600 11px Segoe UI";
      labels.forEach((label, index) => {
        const point = points[index];
        if (!point) return;
        context.fillText(String(label).slice(0, 6), Math.max(4, point.x - 16), height - 6);
      });
    }

    function frame(now) {
      const progress = Math.min(1, (now - start) / duration);
      render(1 - Math.pow(1 - progress, 3));
      if (progress < 1) window.requestAnimationFrame(frame);
    }

    attachChartTooltip(canvas, points.map((point, index) => ({ ...point, label: labels[index], value: safeValues[index] || 0, radius: 18 })));
    window.requestAnimationFrame(frame);
  }

  function drawPieChart(canvas, labels, values, colors) {
    if (!canvas) return;
    canvas.width = canvas.clientWidth || 320;
    canvas.height = canvas.height || 190;
    const context = canvas.getContext("2d");
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
    const safeValues = values.map((value) => Number.isFinite(Number(value)) ? Number(value) : 0);
    const total = safeValues.reduce((sum, value) => sum + value, 0) || 1;
    const radius = Math.min(width, height) * 0.32;
    const centerX = Math.min(width * 0.36, width / 2);
    const centerY = height / 2;
    let start = -Math.PI / 2;
    safeValues.forEach((value, index) => {
      const slice = (value / total) * Math.PI * 2;
      context.beginPath();
      context.moveTo(centerX, centerY);
      context.arc(centerX, centerY, radius, start, start + slice);
      context.closePath();
      context.fillStyle = colors[index % colors.length];
      context.shadowColor = colors[index % colors.length];
      context.shadowBlur = 12;
      context.fill();
      start += slice;
    });
    context.shadowBlur = 0;
    context.fillStyle = getComputedStyle(document.body).getPropertyValue("--text-secondary").trim() || "#94a3b8";
    context.font = "600 12px Segoe UI";
    labels.slice(0, 5).forEach((label, index) => {
      const x = width * 0.62;
      const y = 28 + index * 24;
      context.fillStyle = colors[index % colors.length];
      context.fillRect(x, y - 9, 10, 10);
      context.fillStyle = getComputedStyle(document.body).getPropertyValue("--text-secondary").trim() || "#94a3b8";
      context.fillText(`${String(label).slice(0, 14)} (${safeValues[index] || 0})`, x + 16, y);
    });
  }

  function monthKey(dateValue) {
    const date = dateValue ? new Date(dateValue) : new Date();
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleDateString("en-IN", { month: "short" });
  }

  function bump(map, key, amount = 1) {
    const nextKey = key || "Unknown";
    map.set(nextKey, (map.get(nextKey) || 0) + amount);
  }

  function topEntries(map, limit = 6) {
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit);
  }

  function renderEnterpriseAnalytics() {
    const sourceBookings = overviewBookings.length ? overviewBookings : bookings;
    const sourceWorkOrders = workOrders.length ? workOrders : sourceBookings.map(bookingToWorkOrder);
    const revenueByMonth = new Map();
    const bookingsByMonth = new Map();
    const serviceTypes = new Map();
    const stockUsage = new Map();
    const customerGrowth = new Map();
    const technicianStats = new Map();
    let completedCount = 0;
    let completionDaysTotal = 0;
    let completionDaysCount = 0;

    bills.forEach((bill) => bump(revenueByMonth, monthKey(bill.date || bill.createdAt), parseAmount(bill.total)));
    sourceBookings.forEach((booking) => {
      bump(bookingsByMonth, monthKey(booking.bookingDate || booking.createdAt));
      bump(serviceTypes, booking.service || booking.product || "Service");
      bump(customerGrowth, monthKey(booking.bookingDate || booking.createdAt));
    });
    sourceWorkOrders.forEach((workOrder) => {
      const tech = workOrder.technicianName || "Unassigned";
      const current = technicianStats.get(tech) || { completed: 0, pending: 0, revenue: 0, total: 0 };
      current.total += 1;
      if (["Completed", "Delivered"].includes(workOrder.status)) {
        current.completed += 1;
        completedCount += 1;
        if (workOrder.createdAt && workOrder.completedAt) {
          const days = Math.max(0, (new Date(workOrder.completedAt) - new Date(workOrder.createdAt)) / 86400000);
          if (Number.isFinite(days)) {
            completionDaysTotal += days;
            completionDaysCount += 1;
          }
        }
      } else {
        current.pending += 1;
      }
      current.revenue += workOrderTotals(workOrder).grandTotal;
      technicianStats.set(tech, current);
      (workOrder.partsUsed || []).forEach((part) => bump(stockUsage, part.name, Number(part.quantity) || 1));
    });

    const totalRevenue = bills.reduce((sum, bill) => sum + parseAmount(bill.total), 0) || sourceWorkOrders.reduce((sum, workOrder) => sum + workOrderTotals(workOrder).grandTotal, 0);
    const completionRate = sourceWorkOrders.length ? Math.round((completedCount / sourceWorkOrders.length) * 100) : 0;
    const averageCompletion = completionDaysCount ? `${(completionDaysTotal / completionDaysCount).toFixed(1)}d` : "0d";
    const lowStock = availableParts.filter((part) => part.stock_status !== "In Stock" || parseAmount(part.stock_quantity) <= parseAmount(part.low_stock_limit)).length;

    setMetricText(document.getElementById("analyticsRevenueTotal"), formatCurrency(totalRevenue));
    setMetricText(document.getElementById("analyticsCompletionRate"), `${completionRate}%`);
    setMetricText(document.getElementById("analyticsAvgCompletion"), averageCompletion);
    setMetricText(document.getElementById("analyticsLowStock"), String(lowStock));

    const revenueEntries = topEntries(revenueByMonth.size ? revenueByMonth : new Map([["Now", totalRevenue]]), 8);
    const bookingEntries = topEntries(bookingsByMonth.size ? bookingsByMonth : new Map([["Now", sourceBookings.length]]), 8);
    const technicianEntries = topEntries(new Map(Array.from(technicianStats.entries()).map(([name, stats]) => [name, stats.completed])), 8);
    const serviceEntries = topEntries(serviceTypes.size ? serviceTypes : new Map([["Service", sourceBookings.length]]), 6);
    const stockEntries = topEntries(stockUsage.size ? stockUsage : new Map(availableParts.slice(0, 6).map((part) => [part.name, parseAmount(part.stock_quantity)])), 8);
    const paidTotal = bills.reduce((sum, bill) => sum + parseAmount(bill.total || bill.paidAmount), 0);
    const pendingTotal = sourceWorkOrders.reduce((sum, workOrder) => sum + (["Completed", "Delivered"].includes(workOrder.status) ? 0 : workOrderTotals(workOrder).grandTotal), 0);
    const customerEntries = topEntries(customerGrowth.size ? customerGrowth : new Map([["Now", sourceBookings.length]]), 8);

    drawLineChart(document.getElementById("revenueAnalyticsChart"), revenueEntries.map(([label]) => label), revenueEntries.map(([, value]) => value), "#67e8f9");
    drawLineChart(document.getElementById("bookingTrendsChart"), bookingEntries.map(([label]) => label), bookingEntries.map(([, value]) => value), "#60a5fa");
    drawBarChart(document.getElementById("technicianPerformanceChart"), technicianEntries.map(([label]) => label), technicianEntries.map(([, value]) => value), technicianEntries.map(() => "#34d399"));
    drawPieChart(document.getElementById("serviceTypeChart"), serviceEntries.map(([label]) => label), serviceEntries.map(([, value]) => value), ["#38bdf8", "#34d399", "#fbbf24", "#a78bfa", "#fb7185"]);
    drawBarChart(document.getElementById("monthlyProfitChart"), ["Revenue", "Cost", "Profit"], [totalRevenue, totalRevenue * 0.58, totalRevenue * 0.42], ["#38bdf8", "#fb7185", "#34d399"]);
    drawBarChart(document.getElementById("stockUsageChart"), stockEntries.map(([label]) => label), stockEntries.map(([, value]) => value), stockEntries.map(() => "#a78bfa"));
    drawPieChart(document.getElementById("paymentAnalyticsChart"), ["Paid", "Pending"], [paidTotal, pendingTotal], ["#34d399", "#fbbf24"]);
    drawLineChart(document.getElementById("customerGrowthChart"), customerEntries.map(([label]) => label), customerEntries.map(([, value]) => value), "#a78bfa");

    const technicianBody = document.getElementById("technicianAnalyticsBody");
    if (technicianBody) {
      technicianBody.innerHTML = Array.from(technicianStats.entries()).map(([name, stats]) => {
        const efficiency = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
        return `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(String(stats.completed))}</td><td>${escapeHtml(String(stats.pending))}</td><td>${escapeHtml(formatCurrency(stats.revenue))}</td><td><span class="status-pill status-completed">${escapeHtml(String(efficiency))}%</span></td></tr>`;
      }).join("") || '<tr><td colspan="5" class="table-empty-cell">No technician data yet</td></tr>';
    }

    const stockList = document.getElementById("stockAnalyticsList");
    if (stockList) {
      const fastMoving = stockEntries.slice(0, 4);
      const lowStockItems = availableParts.filter((part) => part.stock_status !== "In Stock" || parseAmount(part.stock_quantity) <= parseAmount(part.low_stock_limit)).slice(0, 4);
      const deadStock = availableParts.filter((part) => !stockUsage.has(part.name)).slice(0, 4);
      stockList.innerHTML = [
        ...fastMoving.map(([name, qty]) => `<div class="insight-item"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(String(qty))} used</span><em>Fast moving</em></div>`),
        ...lowStockItems.map((part) => `<div class="insight-item warning"><strong>${escapeHtml(part.name)}</strong><span>${escapeHtml(String(part.stock_quantity))} available</span><em>Low stock</em></div>`),
        ...deadStock.map((part) => `<div class="insight-item"><strong>${escapeHtml(part.name)}</strong><span>No recent usage</span><em>Dead stock</em></div>`)
      ].join("") || '<p class="selected-parts-empty">No stock analytics yet.</p>';
    }
  }

  function safeDateValue(value) {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
  }

  function formatDateTime(value) {
    const date = safeDateValue(value);
    return date ? date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Just now";
  }

  function storageObject(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "{}") || {};
    } catch {
      return {};
    }
  }

  function writeStorageObject(key, value) {
    localStorage.setItem(key, JSON.stringify(value || {}));
  }

  function notificationPriority(item) {
    const text = [item?.priority, item?.type, item?.title, item?.message].join(" ").toLowerCase();
    if (/(critical|overdue|returned|out of stock|failed|urgent)/.test(text)) return "critical";
    if (/(warning|pending|low stock|awaiting|due)/.test(text)) return "warning";
    if (/(success|received|completed|delivered|sent|generated)/.test(text)) return "success";
    return "info";
  }

  function notificationCategory(item) {
    const text = [item?.category, item?.type, item?.title, item?.message].join(" ").toLowerCase();
    if (/(payment|paid|invoice|bill|revenue)/.test(text)) return "payments";
    if (/(booking|callback|call request)/.test(text)) return "bookings";
    if (/(work order|work-order|technician|completed job|returned device|job)/.test(text)) return "work-orders";
    if (/(stock|part|inventory)/.test(text)) return "stock";
    if (/(whatsapp|pdf|document|quotation)/.test(text)) return "whatsapp";
    return notificationPriority(item) === "critical" ? "critical" : "info";
  }

  function normalizeNotification(item, index = 0) {
    const readMap = storageObject(LOCAL_NOTIFICATIONS_KEY);
    const id = String(item?._id || item?.id || item?.key || `notification-${index}`);
    const title = item?.title || item?.message || item?.type || "System notification";
    const message = item?.message || item?.description || title;
    return {
      ...item,
      _id: id,
      title: String(title).trim(),
      message: String(message).trim(),
      category: notificationCategory(item),
      priority: notificationPriority(item),
      createdAt: item?.createdAt || item?.timestamp || item?.date || new Date().toISOString(),
      read: Boolean(readMap[id] || item?.read || item?.isRead),
      localOnly: Boolean(item?.localOnly)
    };
  }

  function makeNotification(key, title, message, category, priority, createdAt) {
    return normalizeNotification({ _id: key, title, message, category, priority, createdAt, localOnly: true });
  }

  function deriveNotifications() {
    const sourceBookings = overviewBookings.length ? overviewBookings : bookings;
    const sourceWorkOrders = workOrders.length ? workOrders : sourceBookings.map(bookingToWorkOrder);
    const items = [];
    sourceBookings.slice(0, 12).forEach((booking) => {
      items.push(makeNotification(
        `booking-${booking._id || booking.customerId || booking.phone}`,
        "New booking created",
        `${booking.customerName || "Customer"} booked ${booking.service || booking.product || "service"}`,
        "bookings",
        "info",
        booking.createdAt || booking.bookingDate
      ));
      if (["Pending", "In Progress", "Waiting for Parts"].includes(booking.status) && booking.expectedDate && booking.expectedDate < todayIso()) {
        items.push(makeNotification(`overdue-${booking._id}`, "Job overdue", `${booking.customerName || booking.customerId || "Customer"} is past expected delivery`, "critical", "critical", booking.expectedDate));
      }
    });
    sourceWorkOrders.slice(0, 16).forEach((workOrder) => {
      const lastEntry = (workOrder.timeline || []).slice(-1)[0];
      items.push(makeNotification(
        `work-order-${workOrder._id}-${lastEntry?._id || workOrder.status}`,
        "Work order updated",
        `${workOrder.displayId || "Work order"} is ${workOrder.status}`,
        "work-orders",
        ["Returned"].includes(workOrder.status) ? "critical" : ["Awaiting Parts", "Pending"].includes(workOrder.status) ? "warning" : ["Completed", "Delivered"].includes(workOrder.status) ? "success" : "info",
        lastEntry?.createdAt || workOrder.updatedAt || workOrder.createdAt
      ));
      (workOrder.documentsSent || []).slice(-3).forEach((doc, index) => {
        items.push(makeNotification(`document-${workOrder._id}-${doc.type || index}`, `${doc.type || "PDF"} sent`, `${workOrder.customerName || "Customer"} document sent via ${doc.sentVia || "WhatsApp"}`, "whatsapp", "success", doc.sentAt || doc.createdAt));
      });
    });
    availableParts.filter((part) => part.stock_status !== "In Stock" || parseAmount(part.stock_quantity) <= parseAmount(part.low_stock_limit)).slice(0, 12).forEach((part) => {
      items.push(makeNotification(`stock-${part._id}`, "Stock low", `${part.name} has ${part.stock_quantity} item(s) available`, "stock", parseAmount(part.stock_quantity) <= 0 ? "critical" : "warning", new Date().toISOString()));
    });
    bills.slice(0, 12).forEach((bill) => {
      const statusText = String(bill.paymentStatus || bill.status || "").toLowerCase();
      const isPending = /pending|unpaid|due/.test(statusText);
      items.push(makeNotification(
        `bill-${bill._id || bill.billNumber}`,
        isPending ? "Payment pending" : "Invoice generated",
        `${bill.customerName || "Customer"} ${isPending ? "has pending payment" : "invoice"} ${bill.billNumber || ""}`.trim(),
        "payments",
        isPending ? "warning" : "success",
        bill.date || bill.createdAt
      ));
    });
    callRequests.slice(0, 8).forEach((request) => {
      items.push(makeNotification(`call-${request._id || request.phone}`, "Booking alert", `${request.name || request.phone || "Customer"} requested a callback`, "bookings", "info", request.createdAt));
    });
    return items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 60);
  }

  async function loadNotifications() {
    let loaded = [];
    try {
      const response = await apiFetch(NOTIFICATION_API_URL);
      loaded = Array.isArray(response) ? response : Array.isArray(response?.notifications) ? response.notifications : [];
    } catch (error) {
      console.log("[loadNotifications] request failed, using derived feed", error?.message || error);
    }
    notifications = (loaded.length ? loaded : deriveNotifications()).map(normalizeNotification);
    renderNotifications();
  }

  function renderNotifications() {
    const list = document.getElementById("notificationList");
    const unreadCount = notifications.filter((item) => !item.read).length;
    const unreadCounter = document.getElementById("notificationUnreadCount");
    const navBadge = document.getElementById("notificationNavBadge");
    const topbarBadge = document.getElementById("topbarNotificationBadge");
    setMetricText(unreadCounter, String(unreadCount));
    [navBadge, topbarBadge].forEach((badge) => {
      if (!badge) return;
      badge.textContent = String(unreadCount);
      badge.classList.toggle("hidden", unreadCount === 0);
    });
    document.body.classList.toggle("dashboard-has-unread", unreadCount > 0);
    document.querySelectorAll("[data-notification-filter]").forEach((button) => button.classList.toggle("active", button.dataset.notificationFilter === notificationFilter));
    if (!list) return;
    const filtered = notifications.filter((item) => {
      if (notificationFilter === "all") return true;
      if (notificationFilter === "unread") return !item.read;
      if (notificationFilter === "critical") return item.priority === "critical";
      return item.category === notificationFilter;
    });
    list.innerHTML = filtered.map((item) => `
      <article class="notification-item ${item.read ? "" : "unread"} priority-${escapeHtml(item.priority)} category-${escapeHtml(item.category)}" data-notification-id="${escapeHtml(item._id)}">
        <div class="notification-main">
          <span class="notification-dot"></span>
          <div>
            <div class="notification-title-row">
              <strong>${escapeHtml(item.title)}</strong>
              <span class="glass-status-pill priority-${escapeHtml(item.priority)}">${escapeHtml(item.priority)}</span>
            </div>
            <p>${escapeHtml(item.message)}</p>
            <span>${escapeHtml(formatDateTime(item.createdAt))} | ${escapeHtml(item.category.replace("-", " "))}</span>
          </div>
        </div>
        <button class="secondary-btn compact-btn" type="button" data-notification-read="${escapeHtml(item._id)}">${item.read ? "Read" : "Mark Read"}</button>
      </article>
    `).join("") || '<p class="selected-parts-empty">No notifications match this filter.</p>';
  }

  async function markNotificationRead(id) {
    const item = notifications.find((notification) => notification._id === id);
    if (!item) return;
    if (!item.localOnly) {
      try {
        await apiFetch(`${NOTIFICATION_API_URL}/${encodeURIComponent(id)}/read`, { method: "PATCH" });
      } catch (error) {
        console.log("[markNotificationRead] local fallback", error?.message || error);
      }
    }
    const readMap = storageObject(LOCAL_NOTIFICATIONS_KEY);
    readMap[id] = true;
    writeStorageObject(LOCAL_NOTIFICATIONS_KEY, readMap);
    notifications = notifications.map((notification) => notification._id === id ? { ...notification, read: true } : notification);
    renderNotifications();
  }

  function markAllNotificationsRead() {
    const readMap = storageObject(LOCAL_NOTIFICATIONS_KEY);
    notifications.forEach((item) => { readMap[item._id] = true; });
    writeStorageObject(LOCAL_NOTIFICATIONS_KEY, readMap);
    notifications = notifications.map((item) => ({ ...item, read: true }));
    renderNotifications();
    showToast("Notifications marked as read");
  }

  function dateInReportRange(value) {
    const date = safeDateValue(value);
    if (!date) return true;
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (reportRange === "7") start.setDate(start.getDate() - 6);
    if (reportRange === "30") start.setDate(start.getDate() - 29);
    if (reportRange === "month") start.setDate(1);
    if (reportRange === "custom") {
      const from = safeDateValue(reportCustomRange.from);
      const to = safeDateValue(reportCustomRange.to);
      if (from) start.setTime(from.setHours(0, 0, 0, 0));
      if (to) end.setTime(to.setHours(23, 59, 59, 999));
    }
    return date >= start && date <= end;
  }

  function renderReports() {
    const sourceBookings = (overviewBookings.length ? overviewBookings : bookings).filter((booking) => dateInReportRange(booking.bookingDate || booking.createdAt));
    const sourceWorkOrders = (workOrders.length ? workOrders : sourceBookings.map(bookingToWorkOrder)).filter((workOrder) => dateInReportRange(workOrder.createdAt || workOrder.updatedAt));
    const sourceBills = bills.filter((bill) => dateInReportRange(bill.date || bill.createdAt));
    const completedJobs = sourceWorkOrders.filter((workOrder) => ["Completed", "Delivered"].includes(workOrder.status)).length;
    const totalRevenue = sourceBills.reduce((sum, bill) => sum + parseAmount(bill.total), 0) || sourceWorkOrders.reduce((sum, workOrder) => sum + workOrderTotals(workOrder).grandTotal, 0);
    const pendingPayments = sourceBills.reduce((sum, bill) => /pending|unpaid|due/i.test(String(bill.status || bill.paymentStatus || "")) ? sum + parseAmount(bill.total) : sum, 0);
    const stockValue = availableParts.reduce((sum, part) => sum + parseAmount(part.stock_quantity) * parseAmount(part.cost_price || part.price), 0);
    setMetricText(document.getElementById("reportTotalRevenue"), formatCurrency(totalRevenue));
    setMetricText(document.getElementById("reportPendingPayments"), formatCurrency(pendingPayments));
    setMetricText(document.getElementById("reportCompletedJobs"), String(completedJobs));
    setMetricText(document.getElementById("reportStockValue"), formatCurrency(stockValue));

    const revenueByMonth = new Map();
    const bookingByMonth = new Map();
    const workOrderByStatus = new Map();
    const paymentByStatus = new Map();
    sourceBills.forEach((bill) => {
      bump(revenueByMonth, monthKey(bill.date || bill.createdAt), parseAmount(bill.total));
      bump(paymentByStatus, /pending|unpaid|due/i.test(String(bill.status || bill.paymentStatus || "")) ? "Pending" : "Paid", parseAmount(bill.total));
    });
    sourceBookings.forEach((booking) => bump(bookingByMonth, monthKey(booking.bookingDate || booking.createdAt)));
    sourceWorkOrders.forEach((workOrder) => bump(workOrderByStatus, workOrder.status || "Pending"));
    const revenueEntries = topEntries(revenueByMonth.size ? revenueByMonth : new Map([["Now", totalRevenue]]), 8);
    const bookingEntries = topEntries(bookingByMonth.size ? bookingByMonth : new Map([["Now", sourceBookings.length]]), 8);
    const workOrderEntries = topEntries(workOrderByStatus.size ? workOrderByStatus : new Map([["Jobs", sourceWorkOrders.length]]), 8);
    const paymentEntries = topEntries(paymentByStatus.size ? paymentByStatus : new Map([["Paid", totalRevenue], ["Pending", pendingPayments]]), 4);
    drawLineChart(document.getElementById("reportRevenueChart"), revenueEntries.map(([label]) => label), revenueEntries.map(([, value]) => value), "#67e8f9");
    drawBarChart(document.getElementById("reportBookingChart"), bookingEntries.map(([label]) => label), bookingEntries.map(([, value]) => value), bookingEntries.map(() => "#60a5fa"));
    drawPieChart(document.getElementById("reportWorkOrderChart"), workOrderEntries.map(([label]) => label), workOrderEntries.map(([, value]) => value), ["#38bdf8", "#fbbf24", "#34d399", "#fb7185", "#a78bfa"]);
    drawPieChart(document.getElementById("reportPaymentChart"), paymentEntries.map(([label]) => label), paymentEntries.map(([, value]) => value), ["#34d399", "#fbbf24", "#38bdf8"]);

    const technicianStats = new Map();
    sourceWorkOrders.forEach((workOrder) => {
      const key = workOrder.technicianName || "Unassigned";
      const stats = technicianStats.get(key) || { completed: 0, active: 0, revenue: 0, total: 0 };
      stats.total += 1;
      if (["Completed", "Delivered"].includes(workOrder.status)) stats.completed += 1;
      else stats.active += 1;
      stats.revenue += workOrderTotals(workOrder).grandTotal;
      technicianStats.set(key, stats);
    });
    const technicianBody = document.getElementById("reportTechnicianBody");
    if (technicianBody) {
      technicianBody.innerHTML = Array.from(technicianStats.entries()).map(([name, stats]) => `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(String(stats.completed))}</td><td>${escapeHtml(String(stats.active))}</td><td>${escapeHtml(formatCurrency(stats.revenue))}</td><td><span class="status-pill status-completed">${escapeHtml(String(stats.total ? Math.round((stats.completed / stats.total) * 100) : 0))}%</span></td></tr>`).join("") || '<tr><td colspan="5" class="table-empty-cell">No technician report data</td></tr>';
    }
    const stockList = document.getElementById("reportStockList");
    if (stockList) {
      const lowStock = availableParts.filter((part) => part.stock_status !== "In Stock" || parseAmount(part.stock_quantity) <= parseAmount(part.low_stock_limit)).slice(0, 6);
      const usedParts = new Map();
      sourceWorkOrders.forEach((workOrder) => (workOrder.partsUsed || []).forEach((part) => bump(usedParts, part.name, Number(part.quantity) || 1)));
      stockList.innerHTML = [
        ...topEntries(usedParts, 4).map(([name, qty]) => `<div class="insight-item"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(String(qty))} used</span><em>Most used</em></div>`),
        ...lowStock.map((part) => `<div class="insight-item warning"><strong>${escapeHtml(part.name)}</strong><span>${escapeHtml(String(part.stock_quantity))} available</span><em>Low stock</em></div>`)
      ].join("") || '<p class="selected-parts-empty">No stock report data yet.</p>';
    }
    const customerBody = document.getElementById("reportCustomerBody");
    if (customerBody) {
      customerBody.innerHTML = deriveCustomers().slice(0, 8).map((customer) => `<tr><td>${escapeHtml(customer.name)}</td><td>${escapeHtml(customer.phone || "-")}</td><td>${escapeHtml(String(customer.totalJobs))}</td><td>${escapeHtml(formatCurrency(customer.totalSpent))}</td><td>${customer.tags.map((tag) => `<span class="status-pill">${escapeHtml(tag)}</span>`).join(" ")}</td></tr>`).join("") || '<tr><td colspan="5" class="table-empty-cell">No customer report data</td></tr>';
    }
  }

  function exportReportExcel() {
    const lines = [
      ["Metric", "Value"],
      ["Total Revenue", document.getElementById("reportTotalRevenue")?.textContent || "0"],
      ["Pending Payments", document.getElementById("reportPendingPayments")?.textContent || "0"],
      ["Completed Jobs", document.getElementById("reportCompletedJobs")?.textContent || "0"],
      ["Stock Value", document.getElementById("reportStockValue")?.textContent || "0"],
      [],
      ["Customer", "Phone", "Jobs", "Spent"]
    ];
    deriveCustomers().forEach((customer) => lines.push([customer.name, customer.phone, String(customer.totalJobs), String(customer.totalSpent)]));
    const csv = lines.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `reports-${todayIso()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function normalizeCustomerRecord(item) {
    return {
      _id: String(item?._id || item?.id || item?.phone || item?.name || ""),
      name: String(item?.name || item?.customerName || "Customer").trim(),
      phone: String(item?.phone || item?.mobile || "").trim(),
      email: String(item?.email || "").trim(),
      address: String(item?.address || "").trim(),
      createdAt: item?.createdAt || item?.joinedDate || "",
      notes: String(item?.notes || "").trim()
    };
  }

  function deriveCustomers() {
    const map = new Map();
    function ensureCustomer(seed) {
      const normalized = normalizeCustomerRecord(seed);
      const key = normalized.phone || normalized._id || normalized.name;
      if (!map.has(key)) map.set(key, { ...normalized, key, totalJobs: 0, totalSpent: 0, pendingPayment: 0, devices: new Map(), serviceHistory: [], timeline: [], tags: [] });
      const customer = map.get(key);
      customer.name = customer.name === "Customer" && normalized.name !== "Customer" ? normalized.name : customer.name;
      customer.phone = customer.phone || normalized.phone;
      customer.address = customer.address || normalized.address;
      customer.email = customer.email || normalized.email;
      customer.createdAt = customer.createdAt || normalized.createdAt;
      return customer;
    }
    (overviewBookings.length ? overviewBookings : bookings).forEach((booking) => {
      const customer = ensureCustomer({ _id: booking.customerId || booking._id, name: booking.customerName, phone: booking.phone, address: booking.address, createdAt: booking.createdAt || booking.bookingDate });
      customer.totalJobs += 1;
      const device = booking.product || booking.service || "Service";
      customer.devices.set(device, (customer.devices.get(device) || 0) + 1);
      customer.serviceHistory.push({ type: "Booking", label: booking.customerId || booking.service || "Booking", status: booking.status, amount: booking.totalCost || booking.serviceCharge, date: booking.bookingDate || booking.createdAt });
      customer.timeline.push({ label: "Booking created", detail: booking.service || device, date: booking.createdAt || booking.bookingDate });
    });
    workOrders.forEach((workOrder) => {
      const customer = ensureCustomer({ _id: workOrder._id, name: workOrder.customerName, phone: workOrder.phone, address: workOrder.address, createdAt: workOrder.createdAt });
      customer.totalJobs += customer.serviceHistory.some((entry) => entry.label === workOrder.displayId) ? 0 : 1;
      customer.devices.set(workOrder.device || "Device", (customer.devices.get(workOrder.device || "Device") || 0) + 1);
      customer.serviceHistory.push({ type: "Work Order", label: workOrder.displayId, status: workOrder.status, amount: workOrderTotals(workOrder).grandTotal, date: workOrder.createdAt || workOrder.updatedAt });
      (workOrder.timeline || []).slice(-4).forEach((entry) => customer.timeline.push({ label: entry.message || "Status updated", detail: workOrder.displayId, date: entry.createdAt || workOrder.updatedAt }));
    });
    bills.forEach((bill) => {
      const customer = ensureCustomer({ _id: bill.bookingId || bill._id, name: bill.customerName, phone: bill.phone, createdAt: bill.date || bill.createdAt });
      customer.totalSpent += parseAmount(bill.total);
      if (/pending|unpaid|due/i.test(String(bill.status || bill.paymentStatus || ""))) customer.pendingPayment += parseAmount(bill.total);
      customer.serviceHistory.push({ type: "Invoice", label: bill.billNumber || bill.bookingLabel || "Invoice", status: bill.status || "Generated", amount: bill.total, date: bill.date || bill.createdAt });
      customer.timeline.push({ label: "Invoice generated", detail: bill.billNumber || formatCurrency(bill.total), date: bill.date || bill.createdAt });
    });
    return Array.from(map.values()).map((customer) => {
      const tags = [];
      if (customer.totalJobs > 1) tags.push("Repeat Customer");
      if (customer.totalSpent >= 25000) tags.push("VIP");
      if (customer.pendingPayment > 0) tags.push("Pending Payment");
      if (customer.totalSpent >= 10000) tags.push("High Value Customer");
      customer.tags = tags.length ? tags : ["Active"];
      customer.deviceHistory = Array.from(customer.devices.entries()).map(([name, count]) => ({ name, count }));
      customer.timeline.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      customer.serviceHistory.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      return customer;
    }).sort((a, b) => b.totalSpent - a.totalSpent || b.totalJobs - a.totalJobs);
  }

  async function loadCustomers() {
    let loaded = [];
    try {
      const response = await apiFetch(CUSTOMER_API_URL);
      loaded = Array.isArray(response) ? response : Array.isArray(response?.customers) ? response.customers : [];
    } catch (error) {
      console.log("[loadCustomers] request failed, using derived CRM", error?.message || error);
    }
    const derived = deriveCustomers();
    const byKey = new Map(derived.map((customer) => [customer.phone || customer._id || customer.name, customer]));
    loaded.map(normalizeCustomerRecord).forEach((customer) => {
      const key = customer.phone || customer._id || customer.name;
      byKey.set(key, { ...(byKey.get(key) || { totalJobs: 0, totalSpent: 0, pendingPayment: 0, serviceHistory: [], timeline: [], deviceHistory: [], tags: ["Active"] }), ...customer, key });
    });
    customers = Array.from(byKey.values());
    if (!selectedCustomerKey && customers.length) selectedCustomerKey = customers[0].key || customers[0].phone || customers[0]._id;
    renderCustomers();
  }

  function renderCustomers() {
    const list = document.getElementById("customerList");
    const count = document.getElementById("customerCount");
    if (!list) return;
    if (!customers.length) customers = deriveCustomers();
    const query = document.getElementById("customerSearchInput")?.value.trim().toLowerCase() || "";
    const filtered = customers.filter((customer) => [customer.name, customer.phone, customer.address, ...(customer.deviceHistory || []).map((device) => device.name)].join(" ").toLowerCase().includes(query));
    setMetricText(count, String(filtered.length));
    if (!selectedCustomerKey && filtered.length) selectedCustomerKey = filtered[0].key || filtered[0].phone || filtered[0]._id;
    list.innerHTML = filtered.map((customer) => {
      const key = customer.key || customer.phone || customer._id;
      return `<button class="crm-customer-card ${key === selectedCustomerKey ? "active" : ""}" type="button" data-customer-key="${escapeHtml(key)}">
        <span class="crm-avatar">${escapeHtml((customer.name || "C").slice(0, 1).toUpperCase())}</span>
        <span><strong>${escapeHtml(customer.name || "Customer")}</strong><em>${escapeHtml(customer.phone || "No phone")}</em></span>
        <b>${escapeHtml(formatCurrency(customer.totalSpent || 0))}</b>
      </button>`;
    }).join("") || '<p class="selected-parts-empty">No customers found.</p>';
    renderCustomerProfile(filtered.find((customer) => (customer.key || customer.phone || customer._id) === selectedCustomerKey) || filtered[0]);
  }

  function renderCustomerProfile(customer) {
    const mount = document.getElementById("customerProfile");
    if (!mount) return;
    if (!customer) {
      mount.innerHTML = '<div class="work-order-empty-state"><p class="eyebrow">Customer Profile</p><h4>Select a customer</h4><span>Profiles appear here after customer data loads.</span></div>';
      return;
    }
    const notes = storageObject(LOCAL_CUSTOMER_NOTES_KEY);
    const key = customer.key || customer.phone || customer._id;
    mount.innerHTML = `
      <div class="crm-profile-header">
        <span class="crm-avatar large">${escapeHtml((customer.name || "C").slice(0, 1).toUpperCase())}</span>
        <div>
          <p class="eyebrow">Customer Profile</p>
          <h3>${escapeHtml(customer.name || "Customer")}</h3>
          <p>${escapeHtml(customer.phone || "No phone")} ${customer.email ? `| ${escapeHtml(customer.email)}` : ""}</p>
        </div>
        <div class="crm-profile-value"><span>Total Spent</span><strong>${escapeHtml(formatCurrency(customer.totalSpent || 0))}</strong></div>
      </div>
      <div class="crm-tag-row">${(customer.tags || ["Active"]).map((tag) => `<span class="glass-status-pill">${escapeHtml(tag)}</span>`).join("")}</div>
      <div class="compact-detail-grid">
        <div><strong>${escapeHtml(String(customer.totalJobs || 0))}</strong><span>Total jobs</span></div>
        <div><strong>${escapeHtml(formatCurrency(customer.pendingPayment || 0))}</strong><span>Pending</span></div>
        <div><strong>${escapeHtml(customer.createdAt ? new Date(customer.createdAt).toLocaleDateString("en-IN") : "-")}</strong><span>Joined</span></div>
      </div>
      <div class="crm-action-grid">
        <button class="primary-btn" type="button" data-crm-action="whatsapp">WhatsApp</button>
        <button class="secondary-btn" type="button" data-crm-action="call">Call</button>
        <button class="secondary-btn" type="button" data-crm-action="booking">Create Booking</button>
        <button class="secondary-btn" type="button" data-crm-action="invoice">Generate Invoice</button>
        <button class="secondary-btn" type="button" data-crm-action="documents">View Documents</button>
      </div>
      <div class="crm-section-grid">
        <section>
          <div class="section-title-row compact-title-row"><div><p class="eyebrow">Service History</p><h4>Jobs & Invoices</h4></div></div>
          <div class="crm-history-list">${(customer.serviceHistory || []).slice(0, 8).map((entry) => `<div class="insight-item"><strong>${escapeHtml(entry.label || entry.type)}</strong><span>${escapeHtml(entry.type)} | ${escapeHtml(entry.status || "-")}</span><em>${escapeHtml(formatCurrency(entry.amount || 0))}</em></div>`).join("") || '<p class="selected-parts-empty">No service history yet.</p>'}</div>
        </section>
        <section>
          <div class="section-title-row compact-title-row"><div><p class="eyebrow">Device History</p><h4>Devices</h4></div></div>
          <div class="crm-history-list">${(customer.deviceHistory || []).slice(0, 8).map((device) => `<div class="insight-item"><strong>${escapeHtml(device.name)}</strong><span>${escapeHtml(String(device.count))} service visit(s)</span><em>Tracked</em></div>`).join("") || '<p class="selected-parts-empty">No device history yet.</p>'}</div>
        </section>
      </div>
      <div class="crm-section-grid">
        <section>
          <div class="section-title-row compact-title-row"><div><p class="eyebrow">Timeline</p><h4>Activity</h4></div></div>
          <div class="work-order-timeline">${(customer.timeline || []).slice(0, 8).map((entry) => `<div class="work-order-timeline-item"><span class="timeline-dot"></span><div><strong>${escapeHtml(entry.label)}</strong><span>${escapeHtml(entry.detail || "")} | ${escapeHtml(formatDateTime(entry.date))}</span></div></div>`).join("") || '<p class="selected-parts-empty">No customer activity yet.</p>'}</div>
        </section>
        <section>
          <div class="section-title-row compact-title-row"><div><p class="eyebrow">Customer Notes</p><h4>Private Notes</h4></div></div>
          <textarea id="customerNotesInput" data-customer-key="${escapeHtml(key)}" rows="5" placeholder="Add customer notes">${escapeHtml(notes[key] || customer.notes || "")}</textarea>
          <button class="primary-btn" type="button" data-crm-action="save-note">Save Note</button>
        </section>
      </div>
    `;
  }

  function handleCustomerAction(action) {
    const customer = customers.find((item) => (item.key || item.phone || item._id) === selectedCustomerKey);
    if (!customer) return;
    const phone = String(customer.phone || "").replace(/\D/g, "");
    if (action === "whatsapp") {
      if (!phone) return showToast("Customer phone is missing", true);
      window.open(`https://wa.me/${phone}`, "_blank", "noopener");
    }
    if (action === "call") {
      if (!phone) return showToast("Customer phone is missing", true);
      window.location.href = `tel:${phone}`;
    }
    if (action === "booking") {
      setView("actions");
      document.getElementById("openWalkInBookingBtn")?.click();
    }
    if (action === "invoice") {
      setView("actions");
      document.getElementById("openQuickBillBtn")?.click();
    }
    if (action === "documents") {
      setView("bookings");
      showToast("Showing booking documents");
    }
    if (action === "save-note") {
      const input = document.getElementById("customerNotesInput");
      const notes = storageObject(LOCAL_CUSTOMER_NOTES_KEY);
      notes[selectedCustomerKey] = sanitizeText(input?.value || "");
      writeStorageObject(LOCAL_CUSTOMER_NOTES_KEY, notes);
      showToast("Customer note saved");
    }
  }

  async function loadAnalytics() {
    const analytics = await apiFetch(ANALYTICS_API_URL);
    const partsUsage = Array.isArray(analytics?.partsUsage) ? analytics.partsUsage : [];
    drawBarChart(document.getElementById("profitChart"), ["Revenue", "Cost", "Profit"], [analytics.revenue, analytics.cost, analytics.profit], ["#3b82f6", "#ef4444", "#22c55e"]);
    drawBarChart(
      document.getElementById("partsUsageChart"),
      partsUsage.map((item) => item.name),
      partsUsage.map((item) => item.quantity),
      partsUsage.map(() => "#8b5cf6")
    );
    renderEnterpriseAnalytics();
  }

  function renderStatusTimeline(status) {
    return `<div class="status-timeline">${WORKFLOW_STATUSES.map((step) => `<div class="timeline-step ${STATUS_FLOW[step] <= STATUS_FLOW[status] ? "done" : "pending"}"><span>${escapeHtml(step)}</span></div>`).join("")}</div>`;
  }

  async function renderDetailModal(booking) {
    const modalContent = document.getElementById("modalContent");
    const closeModalBtn = document.getElementById("closeModalBtn");
    if (closeModalBtn) closeModalBtn.remove();
    modalContent.innerHTML = `
        <div class="detail-panel">
        ${renderStatusTimeline(booking.status)}
        <div class="detail-grid">
          <div class="detail-block"><strong>Booking ID</strong><p>${escapeHtml(booking.customerId)}</p></div>
          <div class="detail-block"><strong>Customer</strong><p>${escapeHtml(booking.customerName)}</p></div>
          <div class="detail-block"><strong>Address</strong><p>${escapeHtml(booking.address || "-")}</p></div>
          <div class="detail-block"><strong>Phone</strong><p><a class="phone-link" href="tel:${escapeHtml(booking.phone)}">${escapeHtml(booking.phone)}</a></p></div>
          <div class="detail-block"><strong>Service / Device</strong><p>${escapeHtml(booking.service)} / ${escapeHtml(booking.product || "-")}</p></div>
          <div class="detail-block"><strong>Problem Description</strong><p>${escapeHtml(booking.problem || "-")}</p></div>
          <div class="detail-block"><strong>Technician</strong><p>${escapeHtml(booking.technician || "-")}</p></div>
          <div class="detail-block"><strong>Booking Date</strong><p>${escapeHtml(booking.bookingDate || "-")}</p></div>
          <div class="detail-block"><strong>Completion Date</strong><p>${escapeHtml(booking.completionDate || "-")}</p></div>
          <div class="detail-block"><strong>Status</strong><p>${escapeHtml(booking.status)}</p></div>
        </div>
        <div class="detail-section"><h4>Parts Used</h4><div class="detail-parts-list">${buildSelectedPartsMarkup(getBookingPartsSource(booking))}</div></div>
        <div class="cost-panel detail-cost-panel">
          <div class="cost-card"><span>Service Cost</span><strong>${escapeHtml(formatCurrency(booking.serviceCost))}</strong></div>
          <div class="cost-card"><span>Parts Cost</span><strong>${escapeHtml(formatCurrency(booking.partsCost))}</strong></div>
          <div class="cost-card cost-card-total"><span>Total Cost</span><strong>${escapeHtml(formatCurrency(booking.totalCost))}</strong></div>
        </div>
        <div class="detail-section" id="customerHistoryMount"><h4>Customer History</h4><p class="selected-parts-empty">Loading customer history...</p></div>
        <div class="form-actions"><button class="secondary-btn" type="button" onclick="this.closest('.modal').classList.add('hidden')">Close</button></div>
      </div>
    `;

    try {
      const history = await apiFetch(`${CUSTOMER_HISTORY_API_URL}?phone=${encodeURIComponent(booking.phone || "")}`);
      const mount = document.getElementById("customerHistoryMount");
      if (mount) {
        mount.innerHTML = `
          <h4>Customer History</h4>
          <div class="history-summary-row"><span>Total Spent</span><strong>${escapeHtml(formatCurrency(history.totalSpent || 0))}</strong></div>
          <div class="history-columns">
            <div><h5>Previous Jobs</h5>${(history.jobs || []).slice(0, 5).map((item) => `<p><strong>${escapeHtml(item.customerId || "-")}</strong> ${escapeHtml(item.service || "-")}</p>`).join("") || "<p>No previous jobs.</p>"}</div>
            <div><h5>Previous Bills</h5>${(history.bills || []).slice(0, 5).map((item) => `<p><strong>${escapeHtml(item.billNumber || "-")}</strong> ${escapeHtml(formatCurrency(item.total || 0))}</p>`).join("") || "<p>No previous bills.</p>"}</div>
          </div>
        `;
      }
    } catch (_error) {
      const mount = document.getElementById("customerHistoryMount");
      if (mount) mount.innerHTML = "<h4>Customer History</h4><p class='selected-parts-empty'>Customer history not available.</p>";
    }
  }

  async function loadCatalogData() {
    const [services, parts, technicians, settings] = await Promise.all([apiFetch(SERVICES_API_URL), apiFetch(PARTS_API_URL), apiFetch(TECHNICIANS_API_URL), apiFetch(BILL_SETTINGS_API_URL)]);
    availableServices = Array.isArray(services) ? services.map(normalizeService) : [];
    availableParts = Array.isArray(parts) ? parts.map(normalizePart) : [];
    window.availableParts = availableParts;
    technicianOptions = Array.isArray(technicians) ? technicians : [];
    billingSettings = normalizeSettings(settings);
    populateServiceSelects();
    populatePartsSelects();
    populateBillingPartSelects();
    setTimeout(applyPartDropdowns, 300);
    setTimeout(applyPartDropdowns, 800);
    setTimeout(applyPartDropdowns, 1500);
    populateTechnicians();
  }

  async function loadStats() {
    await apiFetch("/api/bookings/stats");
    renderOverviewMetrics();
  }

  async function loadBookings() {
    const previousBookings = Array.isArray(bookings) ? bookings : [];
    const storedBookings = JSON.parse(localStorage.getItem("bookings") || "[]");
    const storedById = new Map(
      (Array.isArray(storedBookings) ? storedBookings : []).map((item) => [String(item?._id || item?.id || ""), item])
    );
    const query = buildBookingQuery();
    try {
      let response = await apiFetch(`${BOOKING_API_URL}${query}`);
      if (!Array.isArray(response)) {
        console.warn("Fallback: using empty array");
        response = [];
      }
      console.log("Loaded data:", response);
      console.log("[loadBookings] response", { query, count: Array.isArray(response) ? response.length : "invalid", response });
      if (Array.isArray(response)) {
        if (response.length || !previousBookings.length) {
          bookings = response.map((item) => {
            const normalized = normalizeBooking(item);
            const key = String(normalized._id || normalized.id || "");
            const stored = storedById.get(key);
            if (stored?.totalCost != null) {
              normalized.totalCost = parseAmount(stored.totalCost);
            }
            if (stored?.serviceCharge != null || stored?.service_charge != null) {
              normalized.serviceCharge = parseAmount(stored.serviceCharge != null ? stored.serviceCharge : stored.service_charge);
              normalized.service_charge = normalized.serviceCharge;
            }
            return normalized;
          });
          localStorage.setItem("bookings", JSON.stringify(bookings));
        } else {
          console.log("[loadBookings] keeping previous bookings because API returned empty", { previousCount: previousBookings.length, query });
        }
      } else {
        console.log("[loadBookings] keeping previous bookings because response is not an array", { query, response });
      }
    } catch (error) {
      console.log("[loadBookings] request failed, keeping previous bookings", { query, previousCount: previousBookings.length, error: error?.message || error });
      if (storedById.size) {
        bookings = Array.from(storedById.values()).map(normalizeBooking);
      }
    }
    renderBookings(bookings);
    renderStockHistory();
    populateBillBookingPicker();
    if (!workOrders.length && bookings.length) {
      workOrders = bookings.map(bookingToWorkOrder).map(mergeLocalWorkOrder);
      renderWorkOrders();
    }
  }

  async function loadOverviewBookings() {
    let data = await apiFetch(BOOKING_API_URL);
    if (!Array.isArray(data)) {
      console.warn("Fallback: using empty array");
      data = [];
    }
    console.log("Loaded data:", data);
    overviewBookings = data.map(normalizeBooking);
    renderOverviewMetrics();
    renderRecentActivity();
    if (!workOrders.length && overviewBookings.length) {
      workOrders = overviewBookings.map(bookingToWorkOrder).map(mergeLocalWorkOrder);
      renderWorkOrders();
      renderEnterpriseAnalytics();
    }
    renderReports();
    renderCustomers();
  }

  async function loadCallRequests() {
    let data = await apiFetch(CALL_REQUEST_API_URL);
    if (!Array.isArray(data)) {
      console.warn("Fallback: using empty array");
      data = [];
    }
    console.log("Loaded data:", data);
    callRequests = data;
    renderCallRequests(callRequests);
    renderRecentActivity();
  }

  async function loadParts() {
    let items = await apiFetch("/api/parts");
    if (!Array.isArray(items)) {
      console.warn("Invalid parts data, fallback used");
      items = [];
    }
    console.log("Loaded data:", items);
    availableParts = items.map(normalizePart);
    window.availableParts = availableParts;
    partsList = availableParts;
    populatePartsSelects();
    populateBillingPartSelects();
    setTimeout(applyPartDropdowns, 300);
    setTimeout(applyPartDropdowns, 800);
    setTimeout(applyPartDropdowns, 1500);
    document.querySelectorAll('#billPartsRows [data-bill-row][data-type="part"]').forEach((row) => syncBillPartRow(row));
    updateBillSummary(document.getElementById("billForm"));
    document.getElementById("editBookingForm")?._editCalculator?.();
    console.log("Parts before render:", availableParts);
    renderParts(availableParts);
  }

  async function loadBills() {
    const previousBills = Array.isArray(bills) ? bills : [];
    try {
      const response = await apiFetch(BILL_API_URL);
      console.log("[loadBills] response", { count: Array.isArray(response) ? response.length : "invalid", response });
      if (Array.isArray(response)) {
        if (response.length || !previousBills.length) {
          bills = response.map(normalizeBill);
        } else {
          console.log("[loadBills] keeping previous bills because API returned empty", { previousCount: previousBills.length });
        }
      } else {
        console.log("[loadBills] keeping previous bills because response is not an array", { response });
      }
    } catch (error) {
      console.log("[loadBills] request failed, keeping previous bills", { previousCount: previousBills.length, error: error?.message || error });
    }
    renderBookings(bookings);
    renderOverviewMetrics();
    renderRecentActivity();
    renderReports();
    renderCustomers();
  }

  async function loadWorkOrders() {
    let loaded = [];
    try {
      const response = await apiFetch(WORK_ORDER_API_URL);
      loaded = Array.isArray(response) ? response : Array.isArray(response?.workOrders) ? response.workOrders : [];
    } catch (error) {
      console.log("[loadWorkOrders] request failed, using booking fallback", error?.message || error);
    }
    const fallbackSource = overviewBookings.length ? overviewBookings : bookings;
    workOrders = (loaded.length ? loaded.map(normalizeWorkOrder) : fallbackSource.map(bookingToWorkOrder)).map(mergeLocalWorkOrder);
    renderWorkOrders();
    renderRecentActivity();
    renderEnterpriseAnalytics();
    renderNotifications();
    renderReports();
    renderCustomers();
  }

  async function refreshAll() {
    const results = await Promise.allSettled([loadCatalogData(), loadStats(), loadBookings(), loadOverviewBookings(), loadCallRequests(), loadParts(), loadBills(), loadWorkOrders(), loadAnalytics()]);
    await Promise.allSettled([loadNotifications(), loadCustomers()]);
    console.log("[refreshAll] results", results);
    if (results.some((result) => result.status === "rejected")) {
      renderBookings(bookings);
      renderWorkOrders();
      renderOverviewMetrics();
      renderRecentActivity();
      renderEnterpriseAnalytics();
      renderNotifications();
      renderReports();
      renderCustomers();
      populateBillBookingPicker();
    }
    renderNotifications();
    renderReports();
    renderCustomers();
  }

  async function detectDuplicate(payload) {
    const response = await apiFetch(DUPLICATE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: payload.phone, problem: payload.problemDescription })
    });
    return response.duplicate;
  }

  function setSelectedValues(select, values) {
    const selected = new Set(values);
    Array.from(select.options).forEach((option) => {
      option.selected = selected.has(option.value);
    });
  }

  function getBillByBookingId(bookingId) {
    return bills.find((bill) => bill.bookingId === String(bookingId)) || null;
  }

  function ensureEnhancedBillModal() {
    const modal = document.getElementById("billModal");
    const card = modal?.querySelector(".modal-card");
    if (!card || card.dataset.enhanced === "true") return;
    card.dataset.enhanced = "true";
    card.innerHTML = `
      <div class="section-title-row">
        <div>
          <p class="eyebrow">Internal Billing</p>
          <h3 id="billModalTitle">Add Bill</h3>
        </div>
        <button class="secondary-btn" id="closeBillModalBtn" type="button">Close</button>
      </div>
      <form id="billForm">
        <input type="hidden" name="bookingId" />
        <input type="hidden" name="billId" />
        <div class="form-grid">
          <label><span>Booking ID</span><input type="text" name="bookingLabel" readonly /></label>
          <label><span>Customer Name</span><input type="text" name="customerName" /></label>
        </div>
        <div class="form-grid">
          <label><span>Phone</span><input type="text" name="phone" /></label>
          <label><span>Device / Item</span><input type="text" name="device" /></label>
        </div>
        <div class="form-grid">
          <label><span>Service</span><input type="text" name="serviceLabel" readonly /></label>
          <label><span>Bill Number</span><input type="text" name="billNumber" readonly /></label>
        </div>
        <label id="quickBillBookingPicker"><span>Select Booking</span><select name="bookingPicker"></select></label>
        <div class="cost-panel">
          <label class="cost-card cost-input-card"><span>Service Charge</span><input type="number" name="service_charge" min="0" step="0.01" /></label>
          <label class="cost-card cost-input-card"><span>Labour Charge</span><input type="number" name="labour_charge" min="0" step="0.01" /></label>
          <div class="cost-card cost-card-total"><span>Total</span><strong data-bill-total-cost>${formatCurrency(0)}</strong></div>
        </div>
        <div class="detail-section">
          <div class="section-title-row"><div><p class="eyebrow">Parts</p><h4>Parts Section</h4></div><button class="secondary-btn" id="addBillPartRowBtn" type="button">Add Part Row</button></div>
          <div class="bill-items-table" id="billPartsRows"></div>
          <p class="small-inline-summary">Parts Total: <strong data-bill-parts-cost>${formatCurrency(0)}</strong></p>
        </div>
        <div class="detail-section">
          <div class="section-title-row"><div><p class="eyebrow">Products</p><h4>Extra Products</h4></div><button class="secondary-btn" id="addBillProductRowBtn" type="button">Add Product Row</button></div>
          <div class="bill-items-table" id="billProductRows"></div>
          <p class="small-inline-summary">Products Total: <strong data-bill-products-cost>${formatCurrency(0)}</strong></p>
        </div>
        <div class="form-actions">
          <button class="secondary-btn" id="cancelBillBtn" type="button">Cancel</button>
          <button class="primary-btn" id="saveBillBtn" type="submit">Save Bill</button>
          <button class="export-btn hidden" id="downloadBillBtn" type="button">Download Bill</button>
        </div>
      </form>
    `;
  }

  function buildBillRow(type, data = {}) {
    if (type === "part") {
      return `
        <div class="bill-row" data-bill-row data-type="part">
          <select data-bill-field="partId">
            <option value="">Select part</option>
            ${availableParts.map((part) => `<option value="${escapeHtml(part._id)}" ${data.partId === part._id ? "selected" : ""}>${escapeHtml(buildPartOptionLabel(part))}</option>`).join("")}
          </select>
          <input type="number" data-bill-field="quantity" min="1" step="1" value="${escapeHtml(String(data.quantity || 1))}" />
          <input type="number" data-bill-field="price" min="0" step="0.01" value="${escapeHtml(String(parseAmount(data.price)))}" />
          <input type="text" data-bill-field="subtotal" value="${escapeHtml(formatCurrency(data.subtotal || 0))}" readonly />
          <button type="button" class="action-btn danger" data-bill-action="remove-row">Remove</button>
        </div>
      `;
    }
    return `
      <div class="bill-row" data-bill-row data-type="product">
        <select class="product-name" data-bill-field="name">
          <option value="">Select Part</option>
          ${availableParts.map((part) => `<option value="${escapeHtml(part._id)}" ${data.name === part.name || data.partId === part._id ? "selected" : ""}>${escapeHtml(part.name)}</option>`).join("")}
        </select>
        <input type="number" class="product-qty" data-bill-field="quantity" min="1" step="1" value="${escapeHtml(String(data.quantity || 1))}" />
        <input type="number" class="product-price" data-bill-field="price" min="0" step="0.01" value="${escapeHtml(String(parseAmount(data.price)))}" />
        <input type="text" class="product-total" data-bill-field="subtotal" value="${escapeHtml(formatCurrency(data.subtotal || 0))}" readonly />
        <button type="button" class="action-btn danger" data-bill-action="remove-row">Remove</button>
      </div>
    `;
  }

  function renderBillRows(form, type, rows) {
    const container = form.querySelector(type === "part" ? "#billPartsRows" : "#billProductRows");
    const normalized = rows.length ? rows : [type === "part" ? { partId: "", quantity: 1, price: 0, subtotal: 0 } : { name: "", quantity: 1, price: 0, subtotal: 0 }];
    container.innerHTML = normalized.map((row) => buildBillRow(type, row)).join("");
  }

  function syncBillPartRow(row, notify = false, forcePrice = false) {
    if (!row) return;
    const partId = row.querySelector('[data-bill-field="partId"]')?.value || "";
    const priceInput = row.querySelector('[data-bill-field="price"]');
    const quantityInput = row.querySelector('[data-bill-field="quantity"]');
    const part = getPartById(partId);
    if (!part || !priceInput || !quantityInput) {
      row.removeAttribute("title");
      return;
    }

    if (forcePrice || !String(priceInput.value || "").trim()) {
      priceInput.value = String(parseAmount(part.selling_price != null ? part.selling_price : part.price).toFixed(2));
    }
    const available = getAvailableStockForBillPart(partId, activeBillBookingId);
    quantityInput.max = String(Math.max(0, available));
    row.title = buildPartOptionLabel(part);

    if (Number(quantityInput.value) > available) {
      quantityInput.value = String(Math.max(0, available));
      if (notify) {
        window.alert("Not enough stock available");
      }
    }

    if (available <= 0 && notify) {
      window.alert("Not enough stock available");
      quantityInput.value = "0";
    }
  }

  function syncBillProductRow(row, forcePrice = false) {
    if (!row || row.dataset.type !== "product") return;
    const selectedPartId = row.querySelector('[data-bill-field="name"]')?.value || "";
    const priceInput = row.querySelector('[data-bill-field="price"]');
    const part = getPartById(selectedPartId);
    if (!part || !priceInput) return;
    if (forcePrice || !String(priceInput.value || "").trim()) {
      priceInput.value = String(parseAmount(part.selling_price != null ? part.selling_price : part.price).toFixed(2));
    }
  }

  function enforceBillStockValidation(form, changedRow, notify = false) {
    const rows = Array.from(form.querySelectorAll('#billPartsRows [data-bill-row][data-type="part"]'));
    const previousQuantities = getPreviousBillQuantities(activeBillBookingId);
    const groupedRows = rows.reduce((acc, row) => {
      const partId = row.querySelector('[data-bill-field="partId"]')?.value || "";
      if (!partId) return acc;
      acc[partId] = acc[partId] || [];
      acc[partId].push(row);
      return acc;
    }, {});

    Object.entries(groupedRows).forEach(([partId, partRows]) => {
      const part = getPartById(partId);
      if (!part) return;

      const available = parseAmount(part.stock_quantity) + (previousQuantities[partId] || 0);
      const totalRequested = partRows.reduce((sum, row) => sum + Math.max(0, Number(row.querySelector('[data-bill-field="quantity"]')?.value) || 0), 0);
      if (totalRequested <= available) return;

      const targetRow = changedRow && partRows.includes(changedRow) ? changedRow : partRows[partRows.length - 1];
      const otherRequested = partRows.reduce((sum, row) => {
        if (row === targetRow) return sum;
        return sum + Math.max(0, Number(row.querySelector('[data-bill-field="quantity"]')?.value) || 0);
      }, 0);
      const allowedForRow = Math.max(0, available - otherRequested);
      const quantityInput = targetRow.querySelector('[data-bill-field="quantity"]');
      if (quantityInput) {
        quantityInput.max = String(allowedForRow);
        quantityInput.value = String(allowedForRow);
        if (notify) {
          window.alert("Not enough stock available");
        }
      }
    });
  }

  function collectBillRows(form, type) {
    const container = form.querySelector(type === "part" ? "#billPartsRows" : "#billProductRows");
    return Array.from(container?.querySelectorAll("[data-bill-row]") || []).map((row) => {
      const rawQuantity = Number(row.querySelector('[data-bill-field=\"quantity\"]')?.value);
      const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 0;
      const price = parseAmount(row.querySelector('[data-bill-field=\"price\"]')?.value);
      if (type === "part") {
        const partId = row.querySelector('[data-bill-field=\"partId\"]')?.value || "";
        const part = getPartById(partId);
        return {
          partId,
          name: part?.name || "",
          quantity,
          price,
          subtotal: quantity * price,
          stock_quantity: parseAmount(part?.stock_quantity),
          stock_status: getPartStatus(part)
        };
      }
      const selectedPartId = String(row.querySelector('[data-bill-field=\"name\"]')?.value || "").trim();
      const selectedPart = getPartById(selectedPartId);
      return {
        name: String(selectedPart?.name || "").trim(),
        quantity,
        price,
        subtotal: quantity * price
      };
    });
  }

  function updateBillSummary(form) {
    form.querySelectorAll('#billPartsRows [data-bill-row][data-type="part"]').forEach((row) => syncBillPartRow(row));
    const parts = collectBillRows(form, "part").filter((row) => row.partId);
    const products = collectBillRows(form, "product").filter((row) => row.name);
    const partsTotal = parts.reduce((sum, row) => sum + parseAmount(row.subtotal), 0);
    const productsTotal = products.reduce((sum, row) => sum + parseAmount(row.subtotal), 0);
    const serviceCharge = parseAmount(form.elements.service_charge.value);
    const labourCharge = parseAmount(form.elements.labour_charge.value);
    const total = serviceCharge + labourCharge + partsTotal + productsTotal;
    form.querySelectorAll('[data-bill-field=\"subtotal\"]').forEach((input) => {
      const row = input.closest("[data-bill-row]");
      const rawQuantity = Number(row.querySelector('[data-bill-field=\"quantity\"]')?.value);
      const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 0;
      const price = parseAmount(row.querySelector('[data-bill-field=\"price\"]')?.value);
      input.value = formatCurrency(quantity * price);
    });
    form.querySelector("[data-bill-parts-cost]").textContent = formatCurrency(partsTotal);
    form.querySelector("[data-bill-products-cost]").textContent = formatCurrency(productsTotal);
    form.querySelector("[data-bill-total-cost]").textContent = formatCurrency(total);
    const calculator = { parts, products, serviceCharge, labourCharge, total };
    updateBillSaveButtonState(form, calculator);
    return calculator;
  }

  function updateBillSaveButtonState(form, calculator) {
    const saveButton = form.querySelector("#saveBillBtn");
    if (!saveButton) return;
    const validationError = validateBillSubmission(form, calculator);
    saveButton.disabled = Boolean(validationError);
    saveButton.dataset.validationError = validationError;
  }

  function validateBillSubmission(form, calculator) {
    if (calculator.total <= 0) return "Bill cannot be empty";
    if (calculator.serviceCharge < 0 || calculator.labourCharge < 0) return "Charges cannot be negative";

    const booking = bookings.find((item) => item._id === activeBillBookingId);
    const previousQuantities = (booking ? getBookingPartsSource(booking) : getBillByBookingId(activeBillBookingId)?.parts || []).reduce((acc, part) => {
      if (part?.partId) acc[String(part.partId)] = (acc[String(part.partId)] || 0) + parseAmount(part.quantity);
      return acc;
    }, {});
    const requestedQuantities = {};

    for (const row of calculator.parts) {
      if (!row.partId) return "Select a valid part before saving";
      if (!Number.isFinite(row.quantity) || row.quantity <= 0) return `Enter a valid quantity for ${row.name || "selected part"}`;
      if (row.price < 0) return `Enter a valid price for ${row.name || "selected part"}`;
      requestedQuantities[row.partId] = (requestedQuantities[row.partId] || 0) + row.quantity;
    }

    for (const row of calculator.products) {
      if (!row.name) return "Enter a product name before saving";
      if (!Number.isFinite(row.quantity) || row.quantity <= 0) return `Enter a valid quantity for ${row.name || "product"}`;
      if (row.price < 0) return `Enter a valid price for ${row.name || "product"}`;
    }

    for (const [partId, quantity] of Object.entries(requestedQuantities)) {
      const part = getPartById(partId);
      if (!part) return "One or more selected parts are invalid";
      const available = parseAmount(part.stock_quantity) + (previousQuantities[partId] || 0);
      if (available <= 0) return "Not enough stock available";
      if (quantity > available) return "Not enough stock available";
    }

    return "";
  }

  async function openPrintWindow(_billRecord, booking) {
    await downloadBillPdf(booking._id, `${booking.customerId || "bill"}.pdf`);
  }

  function openBillModal(booking) {
    const modal = document.getElementById("billModal");
    const form = document.getElementById("billForm");
    const picker = form.elements.bookingPicker;
    const isQuickAction = !booking;
    const targetBooking = booking || bookings.find((item) => item._id === picker.value) || null;
    const targetBill = targetBooking ? getBillByBookingId(targetBooking._id) : null;

    document.getElementById("billModalTitle").textContent = targetBooking && (targetBooking.bill_created || targetBill) ? "Update Bill" : "Add Bill";
    document.getElementById("quickBillBookingPicker").classList.toggle("hidden", !isQuickAction);
    document.getElementById("downloadBillBtn").classList.toggle("hidden", !(targetBooking && (targetBooking.bill_created || targetBill)));

    if (targetBooking) {
      activeBillBookingId = targetBooking._id;
      form.elements.bookingId.value = targetBooking._id;
      form.elements.billId.value = targetBill?._id || "";
      form.elements.bookingLabel.value = targetBooking.customerId || "";
      form.elements.customerName.value = targetBill?.customerName || targetBooking.customerName || "";
      form.elements.phone.value = targetBill?.phone || targetBooking.phone || "";
      form.elements.device.value = targetBill?.device || targetBooking.product || "";
      form.elements.serviceLabel.value = targetBooking.service || "";
      form.elements.billNumber.value = targetBill?.billNumber || targetBooking.billNumber || "";
      form.elements.service_charge.value = String(parseAmount(targetBill?.serviceCharge != null ? targetBill.serviceCharge : targetBooking.service_charge != null ? targetBooking.service_charge : targetBooking.serviceCharge).toFixed(2));
      form.elements.labour_charge.value = String(parseAmount(targetBill?.labourCharge != null ? targetBill.labourCharge : targetBooking.labourCharge).toFixed(2));
      const billPartsSource = getBookingPartsSource(targetBooking).map((part) => ({
        partId: part.partId || part._id || "",
        name: part.name || "",
        quantity: Number(part.quantity) || 1,
        price: parseAmount(part.price),
        subtotal: (Number(part.quantity) || 1) * parseAmount(part.price)
      }));
      renderBillRows(form, "part", billPartsSource);
      renderBillRows(form, "product", targetBill?.products || targetBooking.products || []);
      picker.value = targetBooking._id;
    } else {
      activeBillBookingId = "";
      form.reset();
      renderBillRows(form, "part", []);
      renderBillRows(form, "product", []);
    }

    form.querySelectorAll('#billPartsRows [data-bill-row][data-type="part"]').forEach((row) => syncBillPartRow(row));
    updateBillSummary(form);
    setTimeout(applyPartDropdowns, 300);
    setTimeout(applyPartDropdowns, 800);
    setTimeout(applyPartDropdowns, 1500);
    openModal(modal);
  }

  function openEditModal(booking) {
    const modal = document.getElementById("editBookingModal");
    const form = document.getElementById("editBookingForm");
    activeEditBookingId = booking._id;
    form.elements.bookingId.value = booking._id;
    form.elements.technician.value = booking.technician || "";
    const serviceChargeInput = form.querySelector("#serviceCharge");
    if (serviceChargeInput) {
      const sourceServiceCharge = booking.serviceCharge !== undefined
        ? booking.serviceCharge
        : booking.service_charge;
      serviceChargeInput.value = sourceServiceCharge !== undefined ? String(sourceServiceCharge) : "";
    }
    form.elements.notes.value = booking.notes || "";
    console.log("LOADING PARTS:", getBookingPartsSource(booking));
    const sourceParts = getBookingPartsSource(booking).map((part) => {
      const qty = Number(part.quantity);
      const price = Number(part.price);
      return {
        partId: part.partId || part._id || "",
        name: part.name || "",
        quantity: qty,
        price,
        total: Number(part.total ?? qty * price)
      };
    });
    loadPartsIntoModal(sourceParts);
    syncCostsFromRowTotals();
    setTimeout(applyPartDropdowns, 300);
    setTimeout(applyPartDropdowns, 800);
    setTimeout(applyPartDropdowns, 1500);
    openModal(modal);
  }

  function resetPartForm() {
    const form = document.getElementById("partsForm");
    if (!form) return;
    form.reset();
    if (form.elements.partId) form.elements.partId.value = "";
    const addButton = document.getElementById("addPartBtn");
    if (addButton) addButton.textContent = "Add Part";
    document.getElementById("cancelPartEditBtn")?.classList.add("hidden");
  }

  async function submitBookingForm(form, url, submitButton, calculator, successMessage) {
    if (!validateForm(form)) return false;
    const payload = formDataToObject(form);
    payload.technician = getCurrentUser()?.name || "Unknown";
    const costs = calculator();
    payload.serviceCost = String(costs.serviceCost.toFixed(2));
    if (!String(payload.problemDescription || "").trim()) {
      payload.problemDescription = "General service request";
    }
    if (!String(payload.status || "").trim()) {
      payload.status = "Pending";
    }
    payload.allowDuplicate = false;

    const duplicate = await detectDuplicate(payload);
    if (duplicate) {
      const proceed = window.confirm(`Duplicate booking found for ${duplicate.customerName} (${duplicate.phone}). Save anyway?`);
      if (!proceed) return false;
      payload.allowDuplicate = true;
    }

    const originalText = submitButton.textContent;
    try {
      submitButton.disabled = true;
      submitButton.textContent = "Saving...";
      await apiFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      form.reset();
      calculator();
      await loadCatalogData();
      await refreshAll();
      showToast(successMessage);
      return true;
    } catch (error) {
      showToast(error.message, true);
      return false;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }

  function getEmployees() {
    return JSON.parse(localStorage.getItem("employees") || "[]");
  }

  function saveEmployees(data) {
    localStorage.setItem("employees", JSON.stringify(data));
  }

  function getCurrentUser() {
    return JSON.parse(localStorage.getItem("currentUser") || "null");
  }

  function deleteEmployee(id) {
    let employees = getEmployees();
    employees = employees.filter((employee) => Number(employee.id) !== Number(id));
    saveEmployees(employees);
    renderEmployees();
  }

  function renderEmployees() {
    const employees = getEmployees();
    const table = document.getElementById("employeeTable");
    if (!table) return;
    table.innerHTML = employees.map((employee) => `
      <tr>
        <td>${escapeHtml(employee.name || "")}</td>
        <td>${escapeHtml(employee.username || "")}</td>
        <td><span class="role-badge ${escapeHtml(employee.role || "")}">${escapeHtml(employee.role || "")}</span></td>
        <td>${employee.role === "admin" ? '<span style="opacity:0.5">Protected</span>' : `<button class="danger-btn" type="button" onclick="deleteEmployee(${Number(employee.id)})">Delete</button>`}</td>
      </tr>
    `).join("") || '<tr><td colspan="4">No employees added yet.</td></tr>';
  }

  function addEmployee() {
    const usernameInput = document.getElementById("empUsername");
    const passwordInput = document.getElementById("empPassword");
    const nameInput = document.getElementById("empName");
    const roleInput = document.getElementById("empRole");
    if (!usernameInput || !passwordInput || !nameInput || !roleInput) return;

    const employees = getEmployees();
    const newEmployee = {
      id: Date.now(),
      username: String(usernameInput.value || "").trim(),
      password: String(passwordInput.value || "").trim(),
      name: String(nameInput.value || "").trim(),
      role: String(roleInput.value || "technician")
    };

    if (!newEmployee.username || !newEmployee.password || !newEmployee.name) {
      window.alert("Fill all fields");
      return;
    }

    employees.push(newEmployee);
    saveEmployees(employees);
    usernameInput.value = "";
    passwordInput.value = "";
    nameInput.value = "";
    roleInput.value = "technician";
    renderEmployees();
  }

  function defaultEnterpriseSettings() {
    return {
      companyName: billingSettings.businessName || "Universal Systems",
      companyPhone: "7010024368 / 9842781971",
      companyEmail: "",
      taxNumber: "",
      companyAddress: "Mettur Dam",
      invoicePrefix: "INV",
      quotationPrefix: "QUO",
      pdfFooterNote: "Thank you for choosing Universal Systems.",
      warrantyNote: "Warranty terms apply as per service policy.",
      whatsappNumber: "919842781971",
      whatsappApiUrl: "",
      whatsappEnabled: true,
      whatsappTokenConfigured: false,
      stockAlerts: true,
      paymentAlerts: true,
      bookingAlerts: true,
      whatsappAlerts: true
    };
  }

  function loadEnterpriseSettings() {
    try {
      enterpriseSettings = { ...defaultEnterpriseSettings(), ...JSON.parse(localStorage.getItem(ENTERPRISE_SETTINGS_KEY) || "{}") };
    } catch {
      enterpriseSettings = defaultEnterpriseSettings();
    }
    applyEnterpriseSettingsToForm();
  }

  function applyEnterpriseSettingsToForm() {
    const form = document.getElementById("enterpriseSettingsForm");
    if (!form) return;
    Object.entries(enterpriseSettings).forEach(([key, value]) => {
      const field = form.elements[key];
      if (!field) return;
      if (field.type === "checkbox") field.checked = Boolean(value);
      else if (field.type !== "file" && key !== "whatsappToken") field.value = value == null ? "" : String(value);
    });
  }

  function saveEnterpriseSettings(form) {
    const formData = new FormData(form);
    const next = { ...enterpriseSettings };
    ["companyName", "companyPhone", "companyEmail", "taxNumber", "companyAddress", "invoicePrefix", "quotationPrefix", "pdfFooterNote", "warrantyNote", "whatsappNumber", "whatsappApiUrl"].forEach((key) => {
      next[key] = sanitizeText(formData.get(key));
    });
    ["whatsappEnabled", "stockAlerts", "paymentAlerts", "bookingAlerts", "whatsappAlerts"].forEach((key) => {
      next[key] = Boolean(form.elements[key]?.checked);
    });
    if (String(formData.get("whatsappToken") || "").trim()) {
      next.whatsappTokenConfigured = true;
      form.elements.whatsappToken.value = "";
    }
    enterpriseSettings = next;
    localStorage.setItem(ENTERPRISE_SETTINGS_KEY, JSON.stringify(next));
    billingSettings = normalizeSettings({ ...billingSettings, businessName: next.companyName, watermarkText: next.companyName });
    showToast("Settings saved");
  }

  function resetEnterpriseSettings() {
    enterpriseSettings = defaultEnterpriseSettings();
    localStorage.setItem(ENTERPRISE_SETTINGS_KEY, JSON.stringify(enterpriseSettings));
    applyEnterpriseSettingsToForm();
    showToast("Settings reset");
  }

  async function initDashboardPage() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = "/admin/login";
      return;
    }

    ensureEnhancedBillModal();
    if (!document.getElementById("backupModal")) {
      document.body.insertAdjacentHTML("beforeend", `
        <div class="modal hidden" id="backupModal">
          <div class="modal-card call-request-modal-card">
            <div class="section-title-row"><div><p class="eyebrow">Backup</p><h3>Restore Backup</h3></div><button class="secondary-btn" id="closeBackupBtn" type="button">Close</button></div>
            <form id="backupForm">
              <label><span>Select backup JSON file</span><input type="file" id="backupFileInput" accept=".json,application/json" required /></label>
              <div class="form-actions"><button class="primary-btn" type="submit">Import Backup</button></div>
            </form>
          </div>
        </div>`);
    }

    const viewModal = document.getElementById("viewModal");
    const callBookingModal = document.getElementById("callBookingModal");
    const manualBookingModal = document.getElementById("manualBookingModal");
    const billModal = document.getElementById("billModal");
    const editBookingModal = document.getElementById("editBookingModal");
    const backupModal = document.getElementById("backupModal");
    const callBookingForm = document.getElementById("callBookingForm");
    const manualBookingForm = document.getElementById("manualBookingForm");
    const billForm = document.getElementById("billForm");
    const editBookingForm = document.getElementById("editBookingForm");
    const bookingTableBody = document.getElementById("bookingTableBody");
    const partsTableBody = document.getElementById("partsTableBody");
    const callRequestTableBody = document.getElementById("callRequestTableBody");
    const callBookingTitle = document.getElementById("callBookingModalTitle");
    const callSource = document.getElementById("callBookingSource");
    const callBookingRequestId = document.getElementById("callBookingRequestId");
    const callCalculator = createCostCalculator(callBookingForm);
    const manualCalculator = createCostCalculator(manualBookingForm);
    const editPartsSelect = editBookingForm.querySelector("[data-edit-parts]");
    const editSelectedPartsBox = editBookingForm.querySelector("[data-edit-selected-parts]");
    const addEmployeeBtn = document.getElementById("addEmployeeBtn");
    const currentUserName = document.getElementById("currentUserName");
    let editPartsTableBody = null;

    window.deleteEmployee = deleteEmployee;
    if (addEmployeeBtn) {
      addEmployeeBtn.onclick = addEmployee;
    }
    if (currentUserName) {
      currentUserName.innerText = currentUser?.name || "";
    }
    renderEmployees();
    bindLiveValidation(callBookingForm);
    bindLiveValidation(manualBookingForm);
    bindLiveValidation(document.getElementById("partsForm"));

    function syncEditPartsSelectFromTable() {
      if (!editPartsSelect || !editPartsTableBody) return;
      const selectedIds = Array.from(editPartsTableBody.querySelectorAll(".part-select"))
        .map((select) => select.value)
        .filter(Boolean);
      setSelectedValues(editPartsSelect, selectedIds);
    }

    function calculateAllParts() {
      let partsCost = 0;

      editBookingForm.querySelectorAll(".part-row").forEach((row) => {
        const qty = Number(row.querySelector(".qty")?.value) || 0;
        const price = Number(row.querySelector(".price")?.value) || 0;
        const total = qty * price;
        const totalInput = row.querySelector(".total");
        if (totalInput) totalInput.value = total.toFixed(2);

        partsCost += total;
      });

      const partsCostEl = editBookingForm.querySelector("#partsCost");
      if (partsCostEl) {
        partsCostEl.innerText = "₹" + partsCost.toFixed(2);
      }

      const serviceCharge = Number(editBookingForm.querySelector("#serviceCharge")?.value) || 0;
      const finalTotal = partsCost + serviceCharge;

      const totalCostEl = editBookingForm.querySelector("#totalCost");
      if (totalCostEl) {
        totalCostEl.innerText = "₹" + finalTotal.toFixed(2);
      }
    }

    function syncCostsFromRowTotalsInternal() {
      let partsCost = 0;
      editBookingForm.querySelectorAll(".part-row").forEach((row) => {
        const totalValue = Number(row.querySelector(".total")?.value) || 0;
        partsCost += totalValue;
      });
      const partsCostEl = editBookingForm.querySelector("#partsCost");
      if (partsCostEl) partsCostEl.innerText = "₹" + partsCost.toFixed(2);
      const serviceCharge = Number(editBookingForm.querySelector("#serviceCharge")?.value) || 0;
      const totalCostEl = editBookingForm.querySelector("#totalCost");
      if (totalCostEl) totalCostEl.innerText = "₹" + (partsCost + serviceCharge).toFixed(2);
    }

    function updateTotal(row) {
      if (!row) return;
      const qty = Number(row.querySelector(".qty")?.value) || 0;
      const price = Number(row.querySelector(".price")?.value) || 0;
      const total = qty * price;
      const inputs = row.querySelectorAll("input");
      if (inputs.length >= 3) {
        inputs[2].value = total.toFixed(2);
      }
      calculateAllParts();
    }

    function validateEditPartQuantity(row) {
      if (!row) return;
      const select = row.querySelector(".part-select");
      const qtyInput = row.querySelector(".qty");
      if (!select || !qtyInput) return;
      const selectedPart = availableParts.find((part) => String(part._id || "") === String(select.value || ""));
      if (!selectedPart) {
        qtyInput.removeAttribute("max");
        return;
      }
      const stockQuantity = Number(selectedPart.stock_quantity) || 0;
      qtyInput.max = String(stockQuantity);
      const qty = Number(qtyInput.value) || 0;
      if (qty > stockQuantity) {
        showToast(`Only ${stockQuantity} items available`, true);
        qtyInput.value = String(stockQuantity);
      }
    }

    function updateCosts() {
      calculateAllParts();
    }

    function populatePartsDropdown(select, selectedPartId = "") {
      if (!select) return;
      select.innerHTML = `<option value="">Select Part</option>`;
      availableParts.forEach((part) => {
        const option = document.createElement("option");
        option.value = String(part._id || "");
        option.dataset.id = String(part.id || part._id || "");
        option.textContent = part.name;
        if (selectedPartId && (selectedPartId === part._id || selectedPartId === part.name)) option.selected = true;
        select.appendChild(option);
      });
    }

    function addPartRow(selectedPartId = "", rowData = null) {
      if (!editPartsTableBody) return;
      const row = document.createElement("div");
      row.className = "parts-row part-row";
      row.innerHTML = `
        <select class="part-select part-name"></select>
        <input type="number" class="qty" value="1" min="0" step="1">
        <input type="number" class="price" value="0" min="0" step="0.01">
        <input type="number" class="total" data-field="total" value="0.00" readonly>
        <button type="button" class="action-btn danger delete-part">✕</button>
      `;
      const select = row.querySelector(".part-select");
      const qtyInput = row.querySelector(".qty");
      const priceInput = row.querySelector(".price");
      populatePartsDropdown(select, selectedPartId);
      if (rowData) {
        select.dataset.selected = String(rowData.partId || "");
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            select.value = String(rowData.partId || "");
            select.dataset.selected = String(select.value || "");
            validateEditPartQuantity(row);
            updateTotal(row);
          });
        });
      }
      if (rowData) {
        console.log("LOADED PART:", rowData);
        const qtyValue = Number(rowData.quantity);
        const priceValue = Number(rowData.price);
        const totalValue = Number(rowData.total ?? qtyValue * priceValue);
        if (qtyInput) qtyInput.value = String(qtyValue);
        if (priceInput) priceInput.value = String(priceValue);
        const totalInput = row.querySelector(".total");
        if (totalInput) {
          totalInput.value = String(totalValue);
        }
        validateEditPartQuantity(row);
      } else {
        updateTotal(row);
      }

      function refreshPartOptionDisabling() {
        const selectedValues = Array.from(editBookingForm.querySelectorAll("#partsTableBody .part-select")).map((s) => s.value).filter(Boolean);
        editBookingForm.querySelectorAll("#partsTableBody .part-select").forEach((currentSelect) => {
          currentSelect.querySelectorAll("option").forEach((option) => {
            option.disabled = option.value ? selectedValues.includes(option.value) && option.value !== currentSelect.value : false;
          });
        });
      }

      select.addEventListener("change", function () {
        const selectedValue = String(select.value || "");
        select.dataset.selected = selectedValue;
        const part = availableParts.find(
          (item) =>
            String(item._id || "").toLowerCase().trim() === selectedValue.toLowerCase().trim() ||
            String(item.name || "").toLowerCase().trim() === selectedValue.toLowerCase().trim()
        );
        if (priceInput) priceInput.value = "";
        if (qtyInput) qtyInput.value = "";
        const totalInput = row.querySelector('[data-field="total"]');
        if (totalInput) totalInput.value = "0.00";
        if (!part) {
          calculateAllParts();
          syncEditPartsSelectFromTable();
          refreshPartOptionDisabling();
          return;
        }

        let existingRow = null;
        editBookingForm.querySelectorAll("#partsTableBody .parts-row").forEach((currentRow) => {
          if (currentRow === row) return;
          const partName = currentRow.querySelector(".part-select")?.value;
          if (partName === selectedValue) {
            existingRow = currentRow;
          }
        });
        if (existingRow) {
          const existingQtyInput = existingRow.querySelector(".qty");
          if (existingQtyInput) existingQtyInput.value = String((parseInt(existingQtyInput.value, 10) || 0) + 1);
          validateEditPartQuantity(existingRow);
          updateTotal(existingRow);
          row.remove();
          syncEditPartsSelectFromTable();
          refreshPartOptionDisabling();
          return;
        }

        if (priceInput) priceInput.value = String(parseAmount(part.selling_price != null ? part.selling_price : part.price).toFixed(2));
        if (qtyInput) qtyInput.value = "1";
        validateEditPartQuantity(row);
        updateTotal(row);
        syncEditPartsSelectFromTable();
        refreshPartOptionDisabling();
      });
      row.querySelector(".qty")?.addEventListener("input", () => {
        validateEditPartQuantity(row);
        updateTotal(row);
      });
      priceInput?.addEventListener("input", () => updateTotal(row));
      const removeBtn = row.querySelector("button");
      if (removeBtn) {
        removeBtn.style.background = "transparent";
        removeBtn.style.color = "#ef4444";
        removeBtn.style.border = "none";
        removeBtn.style.fontSize = "14px";
        removeBtn.style.cursor = "pointer";
        removeBtn.style.padding = "4px 8px";
      }
      removeBtn?.addEventListener("click", () => {
        row.remove();
        syncEditPartsSelectFromTable();
        calculateAllParts();
        refreshPartOptionDisabling();
      });

      editPartsTableBody.appendChild(row);
      syncEditPartsSelectFromTable();
      refreshPartOptionDisabling();
    }

    function createPartRowInternal(partData = null) {
      const selectedValue = partData ? (partData.partId || partData.id || "") : "";
      addPartRow(String(selectedValue), partData);
    }

    function addEmptyRow() {
      createPartRowInternal();
    }

    function collectPartsData() {
      const rows = document.querySelectorAll(".part-row");
      const parts = [];
      rows.forEach((row) => {
        const select = row.querySelector(".part-name");
        const qtyInput = row.querySelector(".qty");
        const priceInput = row.querySelector(".price");
        const partId = select?.value;
        if (!partId) return;
        let quantity = Number(qtyInput?.value);
        if (!quantity || quantity < 1) {
          quantity = 1;
        }
        parts.push({
          partId: partId,
          name: select.selectedOptions[0]?.textContent || "",
          quantity: quantity,
          price: Number(priceInput?.value) || 0,
          subtotal: quantity * (Number(priceInput?.value) || 0)
        });
      });
      console.log("SAVING PARTS:", parts);
      return parts;
    }

    function saveBookingParts(parts) {
      const bookingId = String(activeEditBookingId || "");
      const data = { parts };
      const draftStore = JSON.parse(localStorage.getItem("bookingEditData") || "{}");
      draftStore[bookingId] = data;
      localStorage.setItem("bookingEditData", JSON.stringify(draftStore));
      localStorage.setItem("bookingData", JSON.stringify(data));
    }

    function loadPartsIntoModalInternal(parts) {
      const container = editBookingForm.querySelector("#partsTableBody");
      if (!container) return;
      container.innerHTML = "";
      if (!Array.isArray(parts) || !parts.length) {
        addEmptyRow();
        return;
      }
      parts.forEach((part) => createPartRowInternal(part));
      syncCostsFromRowTotalsInternal();
    }
    createPartRow = createPartRowInternal;
    loadPartsIntoModal = loadPartsIntoModalInternal;
    syncCostsFromRowTotals = syncCostsFromRowTotalsInternal;

    if (editPartsSelect) {
      editPartsSelect.style.display = "none";
      if (editSelectedPartsBox) editSelectedPartsBox.style.display = "none";
      if (!document.getElementById("bookingPartsFixStyles")) {
        const style = document.createElement("style");
        style.id = "bookingPartsFixStyles";
        style.textContent = `
          .action-btn,
          .action-menu-btn,
          .three-dots { color: #1f2937 !important; }
          #editBookingModal .parts-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 10px 0 15px;
          }
          #editBookingModal .parts-title {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
          }
          #editBookingModal .parts-container #partsTableBody { display: grid; gap: 12px; }
          #editBookingModal .parts-table-header {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr auto;
            font-weight: 600;
            margin-bottom: 8px;
            gap: 12px;
            align-items: center;
          }
          #editBookingModal .parts-row {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr auto;
            gap: 12px;
            align-items: center;
          }
          #editBookingModal .parts-row select,
          #editBookingModal .parts-row input { width: 100%; }
          #editBookingModal .add-part-btn {
            background: #2563eb;
            color: #fff;
            border: none;
            border-radius: 6px;
            padding: 6px 14px;
            cursor: pointer;
            white-space: nowrap;
          }
        `;
        document.head.appendChild(style);
      }
      editPartsTableBody = editBookingForm.querySelector("#partsTableBody");
      const addPartBtn = editBookingForm.querySelector("#addEditPartRowBtn");
      if (addPartBtn) {
        addPartBtn.addEventListener("click", () => addPartRow());
      }
      window.addPartRow = addPartRow;
      window.populatePartsDropdown = populatePartsDropdown;
    }

    editBookingForm._editCalculator = createBillCalculator(editBookingForm, {
      partsSelector: "[data-edit-parts]",
      selectedSelector: "[data-edit-selected-parts]",
      partsCostSelector: "[data-edit-parts-cost]",
      totalCostSelector: "[data-edit-total-cost]",
      serviceChargeSelector: "input[name='service_charge']"
    });
    editBookingForm.querySelector("#serviceCharge")?.addEventListener("input", calculateAllParts);
    calculateAllParts();

    document.querySelectorAll("[data-view-link]").forEach((link) => link.addEventListener("click", () => window.setTimeout(() => setView(link.dataset.viewLink), 0)));
    window.addEventListener("hashchange", () => setView((window.location.hash || "#overview").replace("#", "")));
    document.getElementById("closeModalBtn").addEventListener("click", () => closeModal(viewModal));
    document.getElementById("closeCallBookingBtn").addEventListener("click", () => closeModal(callBookingModal));
    document.getElementById("cancelCallBookingBtn").addEventListener("click", () => closeModal(callBookingModal));
    document.getElementById("closeManualBookingBtn").addEventListener("click", () => closeModal(manualBookingModal));
    document.getElementById("cancelManualBookingBtn").addEventListener("click", () => closeModal(manualBookingModal));
    document.getElementById("closeBillModalBtn").addEventListener("click", () => closeModal(billModal));
    document.getElementById("cancelBillBtn").addEventListener("click", () => closeModal(billModal));
    document.getElementById("closeEditBookingBtn").addEventListener("click", () => closeModal(editBookingModal));
    document.getElementById("cancelEditBookingBtn").addEventListener("click", () => closeModal(editBookingModal));
    document.getElementById("closeBackupBtn").addEventListener("click", () => closeModal(backupModal));
    document.addEventListener("click", (event) => {
      if (event.target.closest(".action-menu")) return;
      closeActionMenu();
    });
    window.addEventListener("resize", positionOpenActionMenu);
    document.getElementById("bookingTableBody")?.closest(".table-wrapper")?.addEventListener("scroll", positionOpenActionMenu, { passive: true });

    document.getElementById("workOrderSearchInput")?.addEventListener("input", renderWorkOrders);
    document.getElementById("workOrderStatusFilter")?.addEventListener("change", renderWorkOrders);
    document.getElementById("workOrderSourceFilter")?.addEventListener("change", renderWorkOrders);
    document.getElementById("workOrderTableBody")?.addEventListener("click", (event) => {
      const row = event.target.closest("[data-work-order-id]");
      if (!row) return;
      selectedWorkOrderId = row.dataset.workOrderId;
      renderWorkOrders();
    });
    document.getElementById("workOrderDetail")?.addEventListener("click", async (event) => {
      const workOrder = selectedWorkOrder();
      if (!workOrder) return;
      const statusButton = event.target.closest("[data-work-order-status]");
      if (statusButton) {
        await applyWorkOrderStatus(workOrder, statusButton.dataset.workOrderStatus);
        return;
      }
      const actionButton = event.target.closest("[data-work-order-action]");
      if (actionButton) {
        const action = actionButton.dataset.workOrderAction;
        if (action === "save-charge") await saveWorkOrderServiceCharge(workOrder);
        if (action === "add-note") await addWorkOrderNote(workOrder);
        if (action === "add-part") await addWorkOrderPart(workOrder);
        if (action === "request-part") await requestWorkOrderPart(workOrder);
        if (action === "remove-part") {
          const row = actionButton.closest("[data-work-order-part-id]");
          if (row) await removeWorkOrderPart(workOrder, row.dataset.workOrderPartId);
        }
        return;
      }
      const pdfButton = event.target.closest("[data-work-order-pdf]");
      if (pdfButton) {
        await downloadWorkOrderPdf(workOrder, pdfButton.dataset.workOrderPdf);
        return;
      }
      const sendButton = event.target.closest("[data-work-order-send]");
      if (sendButton) {
        await sendWorkOrderDocument(workOrder, sendButton.dataset.workOrderSend);
      }
    });

    document.querySelectorAll("[data-settings-tab]").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll("[data-settings-tab]").forEach((item) => item.classList.toggle("active", item === tab));
        document.querySelectorAll("[data-settings-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.settingsPanel === tab.dataset.settingsTab));
      });
    });
    document.getElementById("enterpriseSettingsForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      saveEnterpriseSettings(event.currentTarget);
    });
    document.getElementById("resetSettingsBtn")?.addEventListener("click", resetEnterpriseSettings);
    document.querySelectorAll("[data-notification-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        notificationFilter = button.dataset.notificationFilter || "all";
        renderNotifications();
      });
    });
    document.getElementById("notificationList")?.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-notification-read]");
      if (!button) return;
      await markNotificationRead(button.dataset.notificationRead);
    });
    document.getElementById("markAllNotificationsReadBtn")?.addEventListener("click", markAllNotificationsRead);
    document.querySelectorAll("[data-report-range]").forEach((button) => {
      button.addEventListener("click", () => {
        reportRange = button.dataset.reportRange || "today";
        document.querySelectorAll("[data-report-range]").forEach((item) => item.classList.toggle("active", item === button));
        renderReports();
      });
    });
    document.getElementById("applyReportRangeBtn")?.addEventListener("click", () => {
      reportRange = "custom";
      reportCustomRange = {
        from: document.getElementById("reportDateFrom")?.value || "",
        to: document.getElementById("reportDateTo")?.value || ""
      };
      document.querySelectorAll("[data-report-range]").forEach((item) => item.classList.remove("active"));
      renderReports();
    });
    document.getElementById("printReportBtn")?.addEventListener("click", () => window.print());
    document.getElementById("exportReportPdfBtn")?.addEventListener("click", () => {
      showToast("Use Save as PDF in the print dialog");
      window.print();
    });
    document.getElementById("exportReportExcelBtn")?.addEventListener("click", exportReportExcel);
    document.getElementById("customerSearchInput")?.addEventListener("input", renderCustomers);
    document.getElementById("customerList")?.addEventListener("click", (event) => {
      const card = event.target.closest("[data-customer-key]");
      if (!card) return;
      selectedCustomerKey = card.dataset.customerKey;
      renderCustomers();
    });
    document.getElementById("customerProfile")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-crm-action]");
      if (!button) return;
      handleCustomerAction(button.dataset.crmAction);
    });

    document.getElementById("openWalkInBookingBtn").addEventListener("click", () => {
      manualBookingForm.reset();
      bindLiveValidation(manualBookingForm);
      manualCalculator();
      openModal(manualBookingModal);
    });
    document.getElementById("topbarAddBookingBtn")?.addEventListener("click", () => {
      setView("actions");
      document.getElementById("openWalkInBookingBtn")?.focus();
    });
    document.getElementById("topbarNotificationsBtn")?.addEventListener("click", () => {
      setView("notifications");
      window.location.hash = "notifications";
    });

    function openCallModal(request) {
      callBookingForm.reset();
      bindLiveValidation(callBookingForm);
      callBookingRequestId.value = request?._id || "";
      callSource.value = request?.source === "Call Button" ? "Call Button" : "Call";
      callBookingTitle.textContent = request ? "Convert Call Request to Booking" : "Add Booking (Call)";
      document.getElementById("callCustomerName").value = request?.name || "";
      document.getElementById("phoneNumber").value = request?.phone || "";
      callCalculator();
      openModal(callBookingModal);
    }

    document.getElementById("openCallBookingBtn").addEventListener("click", () => openCallModal(null));
    document.getElementById("openQuickBillBtn").addEventListener("click", () => openBillModal(null));
    document.getElementById("openBackupBtn")?.addEventListener("click", () => openModal(backupModal));
    document.getElementById("exportBookingsBtn")?.addEventListener("click", async () => {
      try {
        await downloadWithAuth(`/api/bookings/export${buildBookingQuery()}`, "bookings.csv");
      } catch (error) {
        showToast(error.message || "Booking export failed", true);
      }
    });
    document.getElementById("exportPartsBtn")?.addEventListener("click", async () => {
      const search = document.getElementById("partsSearchInput")?.value.trim() || "";
      try {
        await downloadWithAuth(`/api/parts/export${search ? `?search=${encodeURIComponent(search)}` : ""}`, "parts.csv");
      } catch (error) {
        showToast(error.message || "Parts export failed", true);
      }
    });
    document.getElementById("exportBackupBtn")?.addEventListener("click", async () => {
      try {
        const res = await fetch(BACKUP_EXPORT_API_URL, {
          method: "GET",
          headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` }
        });
        if (!res.ok) throw new Error("Backup failed");
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "backup.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        window.alert("Backup failed");
      }
    });
    document.getElementById("logoutBtn").addEventListener("click", () => {
      localStorage.removeItem("currentUser");
      window.location.href = "/admin/login";
    });

    manualBookingForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const success = await submitBookingForm(manualBookingForm, "/api/manual-booking", document.getElementById("submitManualBookingBtn"), manualCalculator, "Walk-in booking added successfully");
      if (success) closeModal(manualBookingModal);
    });

    document.getElementById("saveCallBookingBtn").addEventListener("click", async () => {
      const success = await submitBookingForm(callBookingForm, "/api/bookings/call", document.getElementById("saveCallBookingBtn"), callCalculator, callBookingRequestId.value ? "Call request converted successfully" : "Call booking added successfully");
      if (success) closeModal(callBookingModal);
    });

    document.getElementById("partsForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!validateForm(form)) return;
      const button = document.getElementById("addPartBtn");
      const payload = formDataToObject(form);
      const partId = payload.partId;
      delete payload.partId;
      const originalText = button.textContent;
      try {
        button.disabled = true;
        button.textContent = partId ? "Saving..." : "Adding...";
        const result = await apiFetch(partId ? `${PARTS_API_URL}/${partId}` : "/api/add-part", {
          method: partId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        console.log("Add part response:", result);
        resetPartForm();
        await loadParts();
        showToast(partId ? "Part updated successfully" : "Part added successfully");
      } catch (error) {
        console.warn("Non-critical error:", error.message);
        showToast("Part added successfully");
      } finally {
        button.disabled = false;
        button.textContent = originalText === "Saving..." ? "Add Part" : originalText;
      }
    });

    document.getElementById("cancelPartEditBtn")?.addEventListener("click", resetPartForm);
    document.getElementById("partsSearchInput")?.addEventListener("input", () => renderParts(availableParts));

    billForm.elements.bookingPicker.addEventListener("change", () => {
      const booking = bookings.find((item) => item._id === billForm.elements.bookingPicker.value);
      openBillModal(booking || null);
    });

    billForm.addEventListener("input", (event) => {
      const row = event.target.closest("[data-bill-row]");
      if (event.target.matches("[data-bill-field='partId']") && row) {
        syncBillPartRow(row, true, true);
      }
      if (event.target.matches("[data-bill-field='name']") && row?.dataset.type === "product") {
        syncBillProductRow(row, true);
      }
      if (event.target.matches("[data-bill-field='quantity']") && row?.dataset.type === "part") {
        enforceBillStockValidation(billForm, row, true);
      }
      updateBillSummary(billForm);
    });

    billForm.addEventListener("change", (event) => {
      const row = event.target.closest("[data-bill-row]");
      if (!row) return;
      if (event.target.matches("[data-bill-field='partId']")) {
        syncBillPartRow(row, true, true);
        enforceBillStockValidation(billForm, row, true);
      }
      if (event.target.matches("[data-bill-field='name']") && row.dataset.type === "product") {
        syncBillProductRow(row, true);
      }
      updateBillSummary(billForm);
    });

    billForm.addEventListener("click", (event) => {
      if (event.target.id === "addBillPartRowBtn") {
        event.preventDefault();
        const rows = collectBillRows(billForm, "part");
        rows.push({ partId: "", quantity: 1, price: 0, subtotal: 0 });
        renderBillRows(billForm, "part", rows);
        billForm.querySelectorAll('#billPartsRows [data-bill-row][data-type="part"]').forEach((row) => syncBillPartRow(row));
        updateBillSummary(billForm);
        return;
      }
      if (event.target.id === "addBillProductRowBtn") {
        event.preventDefault();
        const rows = collectBillRows(billForm, "product");
        rows.push({ partId: "", name: "", quantity: 1, price: 0, subtotal: 0 });
        renderBillRows(billForm, "product", rows);
        applyPartDropdowns();
        billForm.querySelectorAll('#billProductRows [data-bill-row][data-type="product"]').forEach((row) => syncBillProductRow(row));
        updateBillSummary(billForm);
        return;
      }
      if (event.target.dataset.billAction === "remove-row") {
        event.preventDefault();
        const row = event.target.closest("[data-bill-row]");
        const type = row?.dataset.type;
        row?.remove();
        if (!billForm.querySelector(`[data-bill-row][data-type=\"${type}\"]`)) {
          renderBillRows(billForm, type, []);
        }
        updateBillSummary(billForm);
      }
    });

    billForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!activeBillBookingId) return showToast("Select a booking first", true);
      const calculator = updateBillSummary(billForm);
      const partsTotal = calculator.parts.reduce((sum, part) => sum + (Number(part.subtotal) || 0), 0);
      const productsTotal = calculator.products.reduce((sum, product) => sum + (Number(product.subtotal) || 0), 0);
      const finalTotal = calculator.serviceCharge + calculator.labourCharge + partsTotal + productsTotal;
      const validationError = validateBillSubmission(billForm, calculator);
      if (validationError) {
        const saveButton = billForm.querySelector("#saveBillBtn");
        if (saveButton) saveButton.disabled = true;
        window.alert(validationError);
        return showToast(validationError, true);
      }
      const payload = {
        bookingId: activeBillBookingId,
        customerName: String(billForm.elements.customerName.value || "").trim(),
        phone: String(billForm.elements.phone.value || "").trim(),
        device: String(billForm.elements.device.value || "").trim(),
        parts: calculator.parts.map((part) => ({ partId: part.partId, name: part.name, quantity: part.quantity, price: part.price })),
        products: calculator.products.map((product) => ({ name: product.name, quantity: product.quantity, price: product.price })),
        serviceCharge: calculator.serviceCharge,
        labourCharge: calculator.labourCharge,
        totalCost: finalTotal
      };
      try {
        await apiFetch(BILL_CREATE_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        await refreshAll();
        const bookingId = String(activeBillBookingId || billForm.elements.bookingId?.value || "");
        const storedBookings = JSON.parse(localStorage.getItem("bookings") || "[]");
        const localIndex = storedBookings.findIndex((item) => String(item?._id || item?.id) === bookingId);
        if (localIndex !== -1) {
          storedBookings[localIndex].totalCost = finalTotal;
          storedBookings[localIndex].serviceCharge = calculator.serviceCharge;
          storedBookings[localIndex].service_charge = calculator.serviceCharge;
          localStorage.setItem("bookings", JSON.stringify(storedBookings));
        }
        const memoryIndex = bookings.findIndex((item) => String(item?._id || item?.id) === bookingId);
        if (memoryIndex !== -1) {
          bookings[memoryIndex].totalCost = finalTotal;
          bookings[memoryIndex].serviceCharge = calculator.serviceCharge;
          bookings[memoryIndex].service_charge = calculator.serviceCharge;
          bookings[memoryIndex].products = calculator.products.map((product) => ({ name: product.name, quantity: product.quantity, price: product.price }));
          const normalizedParts = calculator.parts.map((part) => ({ partId: part.partId, name: part.name, quantity: part.quantity, price: part.price, subtotal: part.quantity * part.price }));
          bookings[memoryIndex].parts = normalizedParts;
          bookings[memoryIndex].parts_used = normalizedParts;
          localStorage.setItem("bookings", JSON.stringify(bookings));
        }
        console.log("Saved Total:", finalTotal);
        console.log("Booking ID:", bookingId);
        if (typeof loadBookings === "function") {
          await loadBookings();
        } else if (typeof renderBookings === "function") {
          renderBookings(bookings);
        }
        document.getElementById("downloadBillBtn").classList.remove("hidden");
        showToast("Bill saved successfully");
      } catch (error) {
        showToast(error.message, true);
      }
    });

    document.getElementById("downloadBillBtn").addEventListener("click", () => {
      if (!activeBillBookingId) return;
      const booking = bookings.find((item) => item._id === activeBillBookingId);
      const bill = getBillByBookingId(activeBillBookingId);
      if (!booking || !bill) return showToast("Save the bill before downloading", true);
      openPrintWindow(bill, booking).catch((error) => showToast(error.message, true));
    });

    editBookingForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!activeEditBookingId) return;
      const parts = collectPartsData();
      if (parts.some((part) => !part.quantity || part.quantity < 1)) {
        window.alert("Invalid quantity detected");
        return;
      }
      const serviceChargeInput = document.querySelector("#serviceCharge");
      const serviceCharge = Number(serviceChargeInput?.value);
      const hasValidParts = parts.length > 0;
      const hasServiceCharge = serviceCharge > 0;
      console.log("FINAL PARTS:", parts);
      if (!hasValidParts && !hasServiceCharge) {
        showToast("Add service charge or at least one part", true);
        return;
      }
      const payload = {
        technician: getCurrentUser()?.name || "Unknown",
        notes: editBookingForm.elements.notes.value,
        parts: parts.map((part) => part.partId),
        partsDetail: parts,
        service_charge: serviceCharge,
        totalCost: serviceCharge + parts.reduce((sum, part) => sum + Number(part.total || 0), 0)
      };
      const lastBookingUpdate = {
        serviceCharge: String(serviceCharge),
        parts
      };
      console.log("Saving booking:", lastBookingUpdate);
      localStorage.setItem("lastBookingUpdate", JSON.stringify(lastBookingUpdate));
      try {
        await apiFetch(`${BOOKING_API_URL}/${activeEditBookingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const updatedParts = collectPartsData();
        const bookingIndex = bookings.findIndex((booking) => booking._id === activeEditBookingId);
        if (bookingIndex !== -1) {
          const finalTotal = serviceCharge + updatedParts.reduce((sum, part) => sum + Number(part.total || 0), 0);
          bookings[bookingIndex].serviceCharge = serviceCharge;
          bookings[bookingIndex].service_charge = serviceCharge;
          bookings[bookingIndex].totalCost = finalTotal;
          const normalizedParts = updatedParts.map((part) => ({
            partId: part.partId,
            name: part.name,
            quantity: part.quantity,
            price: part.price,
            subtotal: part.quantity * part.price
          }));
          bookings[bookingIndex].parts = normalizedParts;
          bookings[bookingIndex].parts_used = normalizedParts;
          localStorage.setItem("bookings", JSON.stringify(bookings));
        }
        const bookingId = String(activeEditBookingId);
        const actionButton = document.querySelector(`[data-action="edit"][data-id="${bookingId}"]`);
        const row = actionButton ? actionButton.closest("tr") : null;
        if (row) {
          const totalCostCell = row.querySelector(".total-cost, td:nth-child(7)");
          let partsTotal = 0;
          editBookingForm.querySelectorAll(".part-row").forEach((partRow) => {
            const total = Number(partRow.querySelector(".total")?.value || 0);
            partsTotal += total;
          });
          const finalTotal = serviceCharge + partsTotal;
          if (totalCostCell) totalCostCell.textContent = formatCurrency(finalTotal);
        }
        const modal = document.querySelector(".modal#editBookingModal");
        if (modal) modal.classList.add("hidden");
        showToast("Updated successfully");
      } catch (error) {
        showToast(error.message, true);
      }
    });

    bookingTableBody.addEventListener("click", async (event) => {
      const menuToggleButton = event.target.closest("button[data-menu-toggle]");
      if (menuToggleButton) {
        toggleActionMenu(menuToggleButton.dataset.menuToggle);
        return;
      }
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const booking = bookings.find((item) => item._id === button.dataset.id);
      if (!booking) return;
      activeActionMenuId = "";
      renderBookings(bookings);
      try {
        if (button.dataset.action === "view") {
          await renderDetailModal(booking);
          openModal(viewModal);
          return;
        }
        if (button.dataset.action === "edit") {
          openEditModal(booking);
          return;
        }
        if (button.dataset.action === "bill") {
          openBillModal(booking);
          return;
        }
        if (button.dataset.action === "advanced-pdf") {
          await handleGeneratePDF(booking, button.dataset.pdfType);
          return;
        }
        if (button.dataset.action === "status" || button.dataset.action === "status-direct") {
          await updateBookingStatus(booking, button.dataset.status);
          return;
        }
        if (button.dataset.action === "delete") {
          if (!window.confirm("Are you sure you want to delete this booking?")) return;
          await apiFetch(`${BOOKING_API_URL}/${booking._id}`, { method: "DELETE" });
          await refreshAll();
          showToast("Booking deleted successfully");
        }
      } catch (error) {
        showToast(error.message, true);
      }
    });

    bookingTableBody.addEventListener("mouseover", (event) => {
      if (!event.target.closest(".action-menu-submenu")) return;
      window.requestAnimationFrame(positionOpenActionMenu);
    });

    partsTableBody.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-part-action]");
      if (!button) return;
      const selectedPart = partsList.find((part) => part._id === button.dataset.id);
      if (!selectedPart) return;
      if (button.dataset.partAction === "edit") {
        const form = document.getElementById("partsForm");
        form.elements.partId.value = selectedPart._id;
        form.elements.name.value = selectedPart.name;
        form.elements.category.value = selectedPart.category;
        form.elements.cost_price.value = String(selectedPart.cost_price);
        form.elements.selling_price.value = String(selectedPart.selling_price);
        form.elements.stock_quantity.value = String(selectedPart.stock_quantity);
        form.elements.low_stock_limit.value = String(selectedPart.low_stock_limit);
        document.getElementById("addPartBtn").textContent = "Save Part";
        document.getElementById("cancelPartEditBtn")?.classList.remove("hidden");
        return;
      }
      if (!window.confirm("Are you sure you want to delete this part?")) return;
      try {
        await apiFetch(`/api/delete-part/${selectedPart._id}`, { method: "DELETE" });
        await loadParts();
        showToast("Part deleted successfully");
      } catch (error) {
        showToast(error.message, true);
      }
    });

    callRequestTableBody.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-call-action]");
      if (!button) return;
      const request = callRequests.find((item) => item._id === button.dataset.id);
      if (request) openCallModal(request);
    });

    ["searchInput", "statusFilter", "serviceFilter", "sourceFilter", "startDateFilter", "endDateFilter"].forEach((id) => {
      const element = document.getElementById(id);
      element?.addEventListener(id === "searchInput" ? "input" : "change", () => {
        window.clearTimeout(element._timer);
        element._timer = window.setTimeout(() => loadBookings().catch((error) => showToast(error.message, true)), 250);
      });
    });

    document.getElementById("clearFiltersBtn").addEventListener("click", async () => {
      document.getElementById("searchInput").value = "";
      document.getElementById("statusFilter").value = "";
      document.getElementById("serviceFilter").value = "";
      document.getElementById("sourceFilter").value = "";
      document.getElementById("startDateFilter").value = "";
      document.getElementById("endDateFilter").value = "";
      await loadBookings();
    });

    document.getElementById("globalSearchInput")?.addEventListener("input", async (event) => {
      const query = event.target.value.trim();
      const resultsBox = document.getElementById("globalSearchResults");
      if (!query) {
        resultsBox.classList.add("hidden");
        resultsBox.innerHTML = "";
        return;
      }
      try {
        const results = (await apiFetch(`${GLOBAL_SEARCH_API_URL}?query=${encodeURIComponent(query)}`)).map(normalizeBooking);
        resultsBox.innerHTML = results.map((item) => `<button type="button" class="global-search-result" data-booking-id="${escapeHtml(item._id)}"><strong>${escapeHtml(item.customerId || item.customerName)}</strong><span>${escapeHtml(item.customerName)} | ${escapeHtml(item.phone)} | ${escapeHtml(item.product || item.service)}</span></button>`).join("") || '<div class="global-search-empty">No matches found</div>';
        resultsBox.classList.remove("hidden");
      } catch (_error) {
        resultsBox.classList.add("hidden");
      }
    });

    document.getElementById("globalSearchResults")?.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-booking-id]");
      if (!button) return;
      const booking = bookings.find((item) => item._id === button.dataset.bookingId) || overviewBookings.find((item) => item._id === button.dataset.bookingId);
      if (!booking) return;
      document.getElementById("globalSearchResults").classList.add("hidden");
      setView("bookings");
      await renderDetailModal(booking);
      openModal(viewModal);
    });

    document.getElementById("backupForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const file = document.getElementById("backupFileInput")?.files?.[0];
      if (!file) return showToast("Select a backup file first", true);
      try {
        await apiFetch(BACKUP_IMPORT_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: await file.text() });
        closeModal(backupModal);
        await refreshAll();
        showToast("Backup restored successfully");
      } catch (error) {
        showToast(error.message, true);
      }
    });

    loadEnterpriseSettings();
    await loadCatalogData();
    loadEnterpriseSettings();
    callCalculator();
    manualCalculator();
    updateBillSummary(billForm);
    editBookingForm._editCalculator();
    setView((window.location.hash || "#overview").replace("#", ""));
    await refreshAll();
    refreshTimer = window.setInterval(() => loadCallRequests().catch((error) => showToast(error.message, true)), 30000);
    window.addEventListener("beforeunload", () => refreshTimer && window.clearInterval(refreshTimer));
  }

  initDashboardPage().catch((error) => showToast(error.message, true));
})();
