(function () {
  const page = document.body.dataset.page;
  const isCustomerSite = document.body.dataset.site === "customer";
  const toast = document.getElementById("toast");
  const BOOKING_API_URL = "/api/bookings";
  const CALL_REQUEST_API_URL = "/api/call-request";
  const SERVICES_API_URL = "/api/services";
  const PARTS_API_URL = "/api/parts";
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
  const RUPEE = "\u20b9";
  const DEFAULT_EMPLOYEES = [{ username: "admin", password: "admin123", name: "Admin", role: "admin" }];
  let EMPLOYEES = [];
  let availableServices = [];
  let availableParts = [];
  let loggedInUser = null;

  function showToast(message, isError = false) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("success", "error", "show");
    toast.classList.add(isError ? "error" : "success");
    if (isCustomerSite) {
      toast.style.removeProperty("background");
    } else {
      toast.style.background = isError ? "#c62828" : "#16324f";
    }
    window.requestAnimationFrame(() => toast.classList.add("show"));
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 3400);
  }

  function formatCurrency(value) {
    return `${RUPEE}${Number(value || 0).toFixed(2)}`;
  }

  function loadEmployees() {
    try {
      const storedEmployees = JSON.parse(localStorage.getItem("employees"));
      if (Array.isArray(storedEmployees) && storedEmployees.length > 0) {
        return storedEmployees;
      }
    } catch (_error) {
      // Fall back to defaults below.
    }

    localStorage.setItem("employees", JSON.stringify(DEFAULT_EMPLOYEES));
    return [...DEFAULT_EMPLOYEES];
  }

  function refreshEmployees() {
    EMPLOYEES = loadEmployees();
    return EMPLOYEES;
  }

  function persistEmployees() {
    localStorage.setItem("employees", JSON.stringify(EMPLOYEES));
  }

  function findEmployee(username, password) {
    refreshEmployees();
    return EMPLOYEES.find((employee) => employee.username === username && employee.password === password) || null;
  }

  function renderEmployees() {
    const container = document.getElementById("employeeList");
    if (!container) return;

    refreshEmployees();
    container.innerHTML = "";

    EMPLOYEES.forEach((employee) => {
      const div = document.createElement("div");
      div.innerText = `${employee.name} (${employee.role || "technician"})`;
      container.appendChild(div);
    });
  }

  function addEmployee() {
    refreshEmployees();

    const usernameInput = document.getElementById("empUsername");
    const passwordInput = document.getElementById("empPassword");
    const nameInput = document.getElementById("empName");
    const roleInput = document.getElementById("empRole");

    if (!usernameInput || !passwordInput || !nameInput || !roleInput) return;

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const name = nameInput.value.trim();
    const role = roleInput.value;

    if (!username || !password || !name) {
      window.alert("All fields required");
      return;
    }

    const exists = EMPLOYEES.find((employee) => employee.username === username);
    if (exists) {
      window.alert("Username already exists");
      return;
    }

    EMPLOYEES.push({ username, password, name, role });
    persistEmployees();
    renderEmployees();
    window.alert("Employee added successfully");

    usernameInput.value = "";
    passwordInput.value = "";
    nameInput.value = "";
  }

  function getCurrentUser() {
    try {
      const user = JSON.parse(localStorage.getItem("currentUser"));
      return user && user.username ? user : null;
    } catch (_error) {
      return null;
    }
  }

  function setLoggedInUser(user) {
    loggedInUser = user || null;
    if (user) {
      localStorage.setItem("currentUser", JSON.stringify(user));
      return;
    }

    localStorage.removeItem("currentUser");
  }

  function syncLoggedInUserFromStorage() {
    loggedInUser = getCurrentUser();
    return loggedInUser;
  }

  async function login(username, password) {
    try {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success !== true || !data.user) {
        window.alert(data.message || data.error || "Invalid credentials");
        return false;
      }

      localStorage.setItem("currentUser", JSON.stringify(data.user));
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      window.location.href = "/admin/dashboard";
      return true;
    } catch (_error) {
      window.alert("Login failed. Please check that the server is running.");
      return false;
    }
  }

  function logout() {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");
    window.location.href = "/admin/login";
  }

  function togglePassword() {
    const input = document.getElementById("password");
    const icon = document.querySelector(".toggle-password");
    if (!input || !icon) return;
    if (input.type === "password") {
      input.type = "text";
      icon.textContent = "🙈";
    } else {
      input.type = "password";
      icon.textContent = "👁";
    }
  }

  function applyTechnicianToForm(form, user = loggedInUser) {
    if (!form) return;
    const technicianInput = form.querySelector('input[name="technician"]');
    if (!technicianInput) return;

    technicianInput.value = user && user.name ? user.name : "";
    technicianInput.setAttribute("readonly", "true");
  }

  window.addEmployee = addEmployee;
  window.renderEmployees = renderEmployees;

  function getSelectedValues(select) {
    if (!select) return [];
    return Array.from(select.selectedOptions || []).map((option) => option.value).filter(Boolean);
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

      if (result[field.name] == null) {
        result[field.name] = formData.get(field.name);
      }
    });

    return result;
  }

  function normalizeService(service) {
    return {
      ...service,
      name: String((service && service.name) || "").trim(),
      basePrice: Number(service && (service.basePrice != null ? service.basePrice : service.price)) || 0
    };
  }

  function normalizePart(part) {
    return {
      ...part,
      _id: String((part && (part._id || part.id)) || ""),
      name: String((part && part.name) || "").trim(),
      price: Number((part && part.price) || 0)
    };
  }

  function normalizeBooking(booking) {
    const parts =
      Array.isArray(booking && booking.parts_used) && booking.parts_used.length
        ? booking.parts_used
        : Array.isArray(booking && booking.parts)
          ? booking.parts
          : [];
    return {
      ...booking,
      customerName: (booking && (booking.customerName || booking.name)) || "",
      service: (booking && (booking.service || booking.serviceName || booking.serviceType || booking.product)) || "",
      technician: (booking && booking.technician) || "",
      duplicate: Boolean(booking && booking.duplicate),
      duplicateOf: String((booking && booking.duplicateOf) || ""),
      serviceCost:
        Number(booking && (booking.serviceCost != null ? booking.serviceCost : booking.servicePrice != null ? booking.servicePrice : booking.serviceCharge)) || 0,
      partsCost: Number((booking && booking.partsCost) || 0),
      totalCost:
        Number(booking && (booking.totalCost != null ? booking.totalCost : booking.totalAmount != null ? booking.totalAmount : booking.estimate)) || 0,
      parts: parts.map((part) =>
        typeof part === "object"
          ? {
              ...part,
              name: String(part.name || "").trim(),
              price: Number(part.price || 0),
              quantity: Number(part.quantity) || 1,
              subtotal: (Number(part.quantity) || 1) * (Number(part.price) || 0)
            }
          : { name: String(part || "").trim(), price: 0 }
      )
    };
  }

  function populateServiceSelects() {
    document.querySelectorAll("[data-service-select]").forEach((select) => {
      const selectedValue = select.value || select.dataset.selected || "";
      select.innerHTML = '<option value="">Select service type</option>';
      availableServices.forEach((service) => {
        const option = document.createElement("option");
        option.value = service.name;
        option.textContent = service.name;
        if (selectedValue === service.name) option.selected = true;
        select.appendChild(option);
      });
    });
  }

  function populatePartsSelects() {
    document.querySelectorAll("[data-parts-select]").forEach((select) => {
      const selectedValues = new Set(getSelectedValues(select));
      select.innerHTML = "";
      availableParts.forEach((part) => {
        const option = document.createElement("option");
        option.value = part._id;
        option.textContent = `${part.name} (${formatCurrency(part.price)})`;
        option.selected = selectedValues.has(part._id);
        select.appendChild(option);
      });
    });
  }

  async function loadCatalogData() {
    const [services, parts] = await Promise.all([apiFetch(SERVICES_API_URL), apiFetch(PARTS_API_URL)]);
    availableServices = Array.isArray(services) ? services.map(normalizeService) : [];
    availableParts = Array.isArray(parts) ? parts.map(normalizePart) : [];
    populateServiceSelects();
    populatePartsSelects();
  }

  function initBillingCalculator(options) {
    const serviceSelect = options.serviceSelect;
    const partsSelect = options.partsSelect;
    const totalOutput = options.totalOutput;
    const serviceOutput = options.serviceOutput;
    const partsOutput = options.partsOutput;
    if (!serviceSelect) {
      return () => ({ serviceCost: 0, partsCost: 0, totalCost: 0 });
    }

    const calculate = () => {
      const service = availableServices.find((item) => item.name === serviceSelect.value);
      const servicePrice = Number(service ? service.basePrice : 0);
      const partsPrice = getSelectedValues(partsSelect || []).reduce((sum, partId) => {
        const part = availableParts.find((item) => item._id === partId);
        return sum + Number(part ? part.price : 0);
      }, 0);
      const total = servicePrice + partsPrice;

      if (serviceOutput) serviceOutput.textContent = formatCurrency(servicePrice);
      if (partsOutput) partsOutput.textContent = formatCurrency(partsPrice);
      if (totalOutput) totalOutput.textContent = formatCurrency(total);
      return { serviceCost: servicePrice, partsCost: partsPrice, totalCost: total };
    };

    serviceSelect.addEventListener("change", calculate);
    partsSelect?.addEventListener("change", calculate);
    calculate();
    return calculate;
  }

  function enableDarkMode() {
    document.body.classList.add("dark");
    document.body.classList.remove("dark-mode");
    document.documentElement.classList.remove("dark-mode");
    localStorage.setItem("theme", "dark");
  }

  function enableLightMode() {
    document.body.classList.remove("dark");
    document.body.classList.remove("dark-mode");
    document.documentElement.classList.remove("dark-mode");
    localStorage.setItem("theme", "light");
  }

  function applyTheme(theme) {
    if (isCustomerSite) {
      document.body.classList.remove("dark");
      document.body.classList.remove("dark-mode");
      document.documentElement.classList.remove("dark-mode");
      return;
    }

    document.body.classList.toggle("dark", theme === "dark");
    document.body.classList.remove("dark-mode");
    document.documentElement.classList.remove("dark-mode");
    const toggle = page === "booking" ? document.getElementById("themeToggle") : null;
    if (toggle) toggle.textContent = theme === "dark" ? "Light mode" : "Dark mode";
  }

  function initTheme() {
    if (isCustomerSite) {
      const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
      const syncSystemTheme = () => {
        const theme = media && media.matches ? "dark" : "light";
        document.documentElement.dataset.theme = theme;
        document.body.dataset.theme = theme;
        applyTheme(theme);
      };

      syncSystemTheme();
      if (media && typeof media.addEventListener === "function") {
        media.addEventListener("change", syncSystemTheme);
      } else if (media && typeof media.addListener === "function") {
        media.addListener(syncSystemTheme);
      }
      return;
    }

    const savedTheme = localStorage.getItem("theme") || "light";
    applyTheme(savedTheme);

    if (page !== "booking") return;
    const toggle = document.getElementById("themeToggle");
    if (!toggle) return;
    toggle.addEventListener("click", () => {
      if (document.body.classList.contains("dark")) {
        enableLightMode();
        applyTheme("light");
        return;
      }

      enableDarkMode();
      applyTheme("dark");
    });
  }

  function initCustomerNavbar() {
    const navbar = document.querySelector(".site-navbar");
    if (!navbar) return;

    const syncNavbar = () => {
      navbar.classList.toggle("is-scrolled", window.scrollY > 8);
    };

    syncNavbar();
    window.addEventListener("scroll", syncNavbar, { passive: true });
  }

  function initCustomerReveal() {
    const elements = Array.from(
      document.querySelectorAll(
        "main > section, .highlight-card, .service-card, .about-feature-card, .choice-item, .contact-detail-card"
      )
    );

    if (!elements.length) return;

    elements.forEach((element, index) => {
      element.classList.add("js-reveal");
      element.style.transitionDelay = `${Math.min(index * 30, 180)}ms`;
      if (index === 0) element.classList.add("is-visible");
    });

    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.14 }
    );

    elements.forEach((element) => observer.observe(element));
  }

  function initCustomerRipples() {
    document.addEventListener("click", (event) => {
      const target = event.target.closest(
        ".primary-btn, .secondary-btn, .nav-cta, .service-book-link, button"
      );

      if (!target || !document.body.contains(target) || target.disabled) return;

      const rect = target.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "button-ripple";
      ripple.style.left = `${event.clientX - rect.left}px`;
      ripple.style.top = `${event.clientY - rect.top}px`;
      target.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 650);
    });
  }

  function initCustomerFloatingLabels() {
    const fields = Array.from(document.querySelectorAll("label input, label select, label textarea"));
    if (!fields.length) return;

    const syncField = (field) => {
      const label = field.closest("label");
      if (!label) return;
      const isSelect = field instanceof HTMLSelectElement;
      const hasValue = isSelect || String(field.value || "").trim().length > 0;
      label.classList.toggle("field-is-filled", hasValue);
    };

    fields.forEach((field) => {
      syncField(field);
      ["input", "change", "blur"].forEach((eventName) => {
        field.addEventListener(eventName, () => syncField(field));
      });
    });

    document.querySelectorAll("form").forEach((form) => {
      form.addEventListener("reset", () => {
        window.setTimeout(() => fields.forEach(syncField), 0);
      });
    });
  }

  function initCustomerEnhancements() {
    if (!isCustomerSite) return;
    initCustomerNavbar();
    initCustomerReveal();
    initCustomerRipples();
    initCustomerFloatingLabels();
  }

  function formatTime(date) {
    return new Date(date).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  }

  function buildDateTime(date, time) {
    if (!date || !time) return "";
    if (/^\d{4}-\d{2}-\d{2}T/.test(time)) return time;

    const match = String(time).trim().match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
    if (!match) return `${date}T00:00:00`;

    let hours = Number(match[1]);
    const minutes = match[2];
    const period = match[3].toUpperCase();

    if (period === "AM" && hours === 12) hours = 0;
    if (period === "PM" && hours !== 12) hours += 12;

    return `${date}T${String(hours).padStart(2, "0")}:${minutes}:00`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => {
      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };
      return map[char];
    });
  }

  function isTodayDate(value) {
    if (!value) return false;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return String(value).slice(0, 10) === `${yyyy}-${mm}-${dd}`;
  }

  function confirmDelete() {
    return window.confirm("Are you sure you want to delete?");
  }

  function ensureDuplicateConfirmModal() {
    let modal = document.getElementById("duplicateBookingModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "duplicateBookingModal";
    modal.className = "modal hidden";
    modal.innerHTML = `
      <div class="modal-card call-request-modal-card">
        <div class="section-title-row">
          <div>
            <p class="booking-eyebrow">DUPLICATE CHECK</p>
            <h3>Confirm Booking</h3>
          </div>
        </div>
        <p id="duplicateBookingMessage">This looks like an existing booking. Continue?</p>
        <div class="form-actions">
          <button class="secondary-btn" id="cancelDuplicateBookingBtn" type="button">Cancel</button>
          <button class="primary-btn" id="continueDuplicateBookingBtn" type="button">Continue Anyway</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  }

  function confirmDuplicateBooking() {
    const modal = ensureDuplicateConfirmModal();
    const cancelBtn = modal.querySelector("#cancelDuplicateBookingBtn");
    const continueBtn = modal.querySelector("#continueDuplicateBookingBtn");

    return new Promise((resolve) => {
      const cleanup = () => {
        cancelBtn.removeEventListener("click", handleCancel);
        continueBtn.removeEventListener("click", handleContinue);
        modal.removeEventListener("click", handleBackdrop);
        modal.classList.add("hidden");
      };

      const handleCancel = () => {
        cleanup();
        resolve(false);
      };

      const handleContinue = () => {
        cleanup();
        resolve(true);
      };

      const handleBackdrop = (event) => {
        if (event.target === modal) {
          handleCancel();
        }
      };

      cancelBtn.addEventListener("click", handleCancel);
      continueBtn.addEventListener("click", handleContinue);
      modal.addEventListener("click", handleBackdrop);
      modal.classList.remove("hidden");
    });
  }

  function isDuplicateConflict(error) {
    return error && error.status === 409 && error.data && error.data.duplicate;
  }

  async function apiFetch(url, options = {}) {
    const fullUrl = String(url || "").startsWith("http") ? url : BASE_URL + url;
    const looksLikeListApi = /\/api\/(bookings|parts|services|bills|call-requests)(\/|$)/.test(String(url || ""));
    const token = localStorage.getItem("token");

    let response;
    try {
      console.log("Auth token:", token);
      if (token == null) {
        console.warn("No token found - API may fail");
      }
      console.log("Fetching URL:", fullUrl);
      response = await fetch(fullUrl, {
        credentials: String(fullUrl).startsWith("http") ? "omit" : "same-origin",
        ...options,
        headers: {
          ...(options.headers || {}),
          "X-Admin-Client": "legacy",
          Authorization: token ? "Bearer " + token : ""
        }
      });
    } catch (_error) {
      console.warn("API fetch failed:", fullUrl);
      window.alert("Backend not reachable. Please check that the server is running.");
      return looksLikeListApi ? [] : {};
    }

    console.log("Response status:", response.status);

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

    console.log("Response data:", data);
    console.log("API DATA:", data);

    if (response.ok) {
      return data ?? (looksLikeListApi ? [] : {});
    }

    console.warn("API request failed:", fullUrl, response.status);
    return looksLikeListApi ? [] : {};
  }

  function initTimeSelects() {
    const selects = document.querySelectorAll("[data-time-select]");
    const times = [];

    for (let hour = 8; hour <= 20; hour += 1) {
      for (let minute = 0; minute < 60; minute += 30) {
        const value = formatTime(`2000-01-01T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`);
        times.push(value);
      }
    }

    selects.forEach((select) => {
      const selected = select.dataset.selected || select.value;
      select.innerHTML = '<option value="">Select time</option>';
      times.forEach((time) => {
        const option = document.createElement("option");
        option.value = time;
        option.textContent = time;
        if (selected === time) option.selected = true;
        select.appendChild(option);
      });
    });
  }

  function validateForm(root) {
    const fields = Array.from(root.querySelectorAll("input, select, textarea")).filter(
      (field) => field.type !== "file" && !field.disabled && !field.readOnly
    );

    let firstInvalid = null;

    fields.forEach((field) => {
      const label = field.closest("label");
      const errorEl = label ? label.querySelector(".field-error") : null;
      let message = "";
      const value = String(field.value || "").trim();

      if (field.required && !value) message = "This field is required.";
      if (!message && field.multiple && field.required && getSelectedValues(field).length === 0) {
        message = "Please select at least one option.";
      }
      if (!message && field.name === "customerName" && !/^[A-Za-z ]{2,60}$/.test(value)) {
        message = "Enter a valid customer name.";
      }
      if (!message && root.id === "partsForm" && field.name === "name" && !/^[A-Za-z0-9 .,&()/-]{2,60}$/.test(value)) {
        message = "Enter a valid part name.";
      }
      if (!message && field.name === "phone" && !/^[0-9]{10}$/.test(value)) {
        message = "Enter a valid 10-digit phone number.";
      }

      if (label) label.classList.toggle("field-has-error", Boolean(message));
      if (errorEl) errorEl.textContent = message;
      if (!firstInvalid && message) firstInvalid = field;
    });

    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  function setView(view) {
    const views = document.querySelectorAll(".dashboard-view");
    const links = document.querySelectorAll("[data-view-link]");
    const title = document.getElementById("dashboardViewTitle");
    const labelMap = {
      overview: "Booking overview",
      bookings: "Booking management",
      parts: "Parts management",
      "call-requests": "Callback requests",
      actions: "Quick actions"
    };
    const nextView = labelMap[view] ? view : "overview";

    views.forEach((section) => {
      section.classList.toggle("hidden", section.dataset.view !== nextView);
    });
    links.forEach((link) => {
      link.classList.toggle("active", link.dataset.viewLink === nextView);
    });
    if (title) title.textContent = labelMap[nextView];
  }

  async function initBookingPage() {
    const form = document.getElementById("bookingForm");
    if (!form) return;

    const steps = Array.from(document.querySelectorAll(".form-step"));
    const stepCounter = document.getElementById("stepCounter");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const submitBtn = document.getElementById("submitBtn");
    const successBanner = document.getElementById("bookingSuccessMessage");
    const confirmationSummary = document.getElementById("confirmationSummary");
    const stepDots = Array.from(document.querySelectorAll("[data-step-dot]"));
    const callRequestModal = document.getElementById("callRequestModal");
    const callRequestForm = document.getElementById("callRequestForm");
    const openCallRequestModalBtn = document.getElementById("openCallRequestModalBtn");
    const closeCallRequestModalBtn = document.getElementById("closeCallRequestModalBtn");
    const cancelCallRequestBtn = document.getElementById("cancelCallRequestBtn");
    const submitCallRequestBtn = document.getElementById("submitCallRequestBtn");
    const bookingBillingRefresh = initBillingCalculator({
      serviceSelect: document.getElementById("serviceSelect"),
      partsSelect: document.getElementById("partsSelect"),
      totalOutput: document.getElementById("totalAmount"),
      serviceOutput: form.querySelector("[data-service-cost]"),
      partsOutput: form.querySelector("[data-parts-cost]")
    });
    let currentStep = 1;

    function updateProgress(step) {
      const progressBar = document.getElementById("progressBar");
      if (!progressBar) return;

      const percent = ((step - 1) / 2) * 100;
      progressBar.style.width = percent + "%";
      stepDots.forEach((dot) => {
        const dotStep = Number(dot.dataset.stepDot);
        dot.classList.toggle("active", dotStep === step);
        dot.classList.toggle("completed", dotStep < step);
      });
    }

    function buildBookingFormData(includeDuplicate = false) {
      const payload = new FormData(form);
      const problemDescription = String(payload.get("problemDescription") || "").trim();

      payload.delete("parts");
      payload.delete("serviceDate");
      payload.delete("serviceTime");
      payload.delete("image");

      if (!problemDescription) {
        payload.set("problemDescription", "General service request");
      }

      if (includeDuplicate) {
        payload.set("allowDuplicate", "true");
      } else {
        payload.delete("allowDuplicate");
      }

      return payload;
    }

    function openModal(element) {
      if (!element) return;
      element.classList.remove("hidden");
    }

    function closeModal(element) {
      if (!element) return;
      element.classList.add("hidden");
    }

    if (openCallRequestModalBtn && callRequestModal) {
      openCallRequestModalBtn.addEventListener("click", () => openModal(callRequestModal));
    }

    [closeCallRequestModalBtn, cancelCallRequestBtn].forEach((button) => {
      if (!button) return;
      button.addEventListener("click", () => closeModal(callRequestModal));
    });

    if (callRequestForm) {
      callRequestForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!validateForm(callRequestForm)) return;

        try {
          submitCallRequestBtn.disabled = true;
          submitCallRequestBtn.textContent = "Submitting...";
          const formData = new FormData(callRequestForm);
          const payload = {
            name: String(formData.get("name") || "").trim(),
            phone: String(formData.get("phone") || "").trim()
          };

          if (!payload.name) throw new Error("Name is required");
          if (!/^[0-9]{10}$/.test(payload.phone)) throw new Error("Phone must be 10 digits");

          const response = await fetch(CALL_REQUEST_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

          const result = await response.json().catch(() => null);
          if (!response.ok || !result || !result.success) {
            throw new Error((result && result.error) || "Request failed");
          }

          callRequestForm.reset();
          closeModal(callRequestModal);
          showToast("Call request submitted successfully");
        } catch (error) {
          showToast(error.message || "Request failed", true);
        } finally {
          submitCallRequestBtn.disabled = false;
          submitCallRequestBtn.textContent = "Submit";
        }
      });
    }

    const bookServiceBtn = document.querySelector(".book-service-btn");
    if (bookServiceBtn) {
      bookServiceBtn.onclick = function (e) {
        e.preventDefault();
        form.scrollIntoView({ behavior: "smooth", block: "start" });
        const input = document.querySelector("input[name='customerName']");
        if (input) window.setTimeout(() => input.focus(), 320);
      };
    }

    function updateStepUI() {
      steps.forEach((step) => {
        step.classList.toggle("active", Number(step.dataset.step) === currentStep);
      });
      updateProgress(currentStep);
      stepCounter.textContent = `Step ${currentStep} of 3`;
      prevBtn.classList.toggle("hidden", currentStep === 1);
      nextBtn.classList.toggle("hidden", currentStep === steps.length);
      submitBtn.classList.toggle("hidden", currentStep !== steps.length);
      if (currentStep === steps.length) {
        const data = new FormData(form);
        const items = [
          ["Customer Name", data.get("customerName")],
          ["Phone Number", data.get("phone")],
          ["Address", data.get("address")],
          ["Service Type", data.get("serviceName")],
          ["Problem", data.get("problemDescription") || "Not provided"]
        ];

        confirmationSummary.innerHTML = items
          .map(([label, value]) => `<div class="summary-row"><span>${label}</span><strong>${escapeHtml(value || "-")}</strong></div>`)
          .join("");
      }
    }

    nextBtn.addEventListener("click", () => {
      if (!validateForm(steps[currentStep - 1])) return;
      currentStep += 1;
      updateStepUI();
    });

    prevBtn.addEventListener("click", () => {
      currentStep -= 1;
      updateStepUI();
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!validateForm(form)) return;

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";
        bookingBillingRefresh();
        let result;
        try {
          result = await apiFetch(BOOKING_API_URL, {
            method: "POST",
            body: buildBookingFormData()
          });
        } catch (error) {
          if (!isDuplicateConflict(error)) throw error;
          const proceed = await confirmDuplicateBooking();
          if (!proceed) return;
          result = await apiFetch(BOOKING_API_URL, {
            method: "POST",
            body: buildBookingFormData(true)
          });
        }
        form.reset();
        bookingBillingRefresh();
        currentStep = 1;
        updateStepUI();
        successBanner.innerHTML = `<strong>Booking submitted successfully.</strong><div>Customer ID: ${escapeHtml(result.booking.customerId)}</div>`;
        successBanner.classList.remove("hidden");
        showToast("Booking submitted successfully");
      } catch (error) {
        showToast(error.message, true);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Booking";
      }
    });

    await loadCatalogData();
    bookingBillingRefresh();
    updateStepUI();
  }

  function initContactPage() {
    const form = document.getElementById("contactEnquiryForm");
    if (!form) return;

    const submitBtn = document.getElementById("contactSubmitBtn") || form.querySelector("button[type='submit']");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!validateForm(form)) return;

      const formData = new FormData(form);
      const payload = {
        name: String(formData.get("name") || "").trim(),
        phone: String(formData.get("phone") || "").trim()
      };

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Submitting...";
        }

        const response = await fetch(CALL_REQUEST_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => null);
        if (!response.ok || !result || !result.success) {
          throw new Error((result && result.error) || "Request failed");
        }

        form.reset();
        showToast("Enquiry submitted successfully");
      } catch (error) {
        showToast(error.message || "Request failed", true);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Submit Enquiry";
        }
      }
    });
  }

  function initLoginPage() {
    const form = document.getElementById("loginForm");
    if (!form) return;
    refreshEmployees();

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const credentials = Object.fromEntries(new FormData(form).entries());
      const username = String(credentials.username || "").trim();
      const password = String(credentials.password || "");
      await login(username, password);
    });
  }

  async function initDashboardPage() {
    refreshEmployees();
    const storedUser = syncLoggedInUserFromStorage();
    if (!storedUser) {
      setLoggedInUser(null);
      window.location.href = "/admin/login";
      return;
    }
    loggedInUser = { ...(storedUser || {}) };
    setLoggedInUser(loggedInUser);

    const totalBookings = document.getElementById("totalBookings");
    const pendingBookings = document.getElementById("pendingBookings");
    const completedBookings = document.getElementById("completedBookings");
    const todayCount = document.getElementById("todayCount");
    const activityList = document.getElementById("activityList");
    const bookingTableBody = document.getElementById("bookingTableBody");
    const bookingsEmptyState = document.getElementById("bookingsEmptyState");
    const callRequestTableBody = document.getElementById("callRequestTableBody");
    const callRequestsEmptyState = document.getElementById("callRequestsEmptyState");
    const partsForm = document.getElementById("partsForm");
    const partsTableBody = document.getElementById("partsTableBody");
    const partsEmptyState = document.getElementById("partsEmptyState");
    const searchInput = document.getElementById("searchInput");
    const viewModal = document.getElementById("viewModal");
    const modalContent = document.getElementById("modalContent");
    const callBookingModal = document.getElementById("callBookingModal");
    const manualBookingModal = document.getElementById("manualBookingModal");
    const callBookingForm = document.getElementById("callBookingForm");
    const manualBookingForm = document.getElementById("manualBookingForm");
    const employeeSection = document.getElementById("employeeSection");
    const callBookingTitle = document.getElementById("callBookingModalTitle");
    const callBookingSource = document.getElementById("callBookingSource");
    const callRequestsBadge = document.getElementById("callRequestsBadge");
    const callBillingRefresh = initBillingCalculator({
      serviceSelect: document.getElementById("serviceType"),
      partsSelect: document.getElementById("callPartsSelect"),
      totalOutput: document.getElementById("callTotalAmount"),
      serviceOutput: document.getElementById("callServiceAmount"),
      partsOutput: document.getElementById("callPartsAmount")
    });
    const manualBillingRefresh = initBillingCalculator({
      serviceSelect: manualBookingForm ? manualBookingForm.querySelector("[data-service-select]") : null,
      partsSelect: manualBookingForm ? manualBookingForm.querySelector("[data-parts-select]") : null,
      totalOutput: manualBookingForm ? manualBookingForm.querySelector("[data-total-cost]") : null,
      serviceOutput: manualBookingForm ? manualBookingForm.querySelector("[data-service-cost]") : null,
      partsOutput: manualBookingForm ? manualBookingForm.querySelector("[data-parts-cost]") : null
    });
    let refreshTimer = null;
    let bookings = [];
    let overviewBookings = [];
    let callRequests = [];
    let partsList = [];

    if (employeeSection && loggedInUser && loggedInUser.role !== "admin") {
      employeeSection.style.display = "none";
    }
    renderEmployees();

    function openModal(element) {
      if (!element) return;
      element.classList.remove("hidden");
    }

    function closeModal(element) {
      if (!element) return;
      element.classList.add("hidden");
    }

    function renderBookings(items) {
      try {
        const safeItems = (Array.isArray(items) ? items : []).map(normalizeBooking);
        console.log("Bookings received for table render:", safeItems);

        if (bookingsEmptyState) bookingsEmptyState.classList.toggle("hidden", safeItems.length > 0);
        if (!safeItems.length) {
          bookingTableBody.innerHTML = "";
          return;
        }

        const rows = safeItems
          .map((booking) => {
            try {
              const scheduleDate =
                booking && booking.serviceDate && booking.serviceTime
                  ? buildDateTime(booking.serviceDate, booking.serviceTime)
                  : "";
              const statusValue = booking && booking.status ? booking.status : "Pending";
              const statusClass = `status-${String(statusValue).toLowerCase()}`;
              const partNames = Array.isArray(booking && booking.parts)
                ? booking.parts
                    .map((part) => {
                      if (part && typeof part === "object") return part.name || "";
                      return String(part || "");
                    })
                    .filter(Boolean)
                    .join(", ")
                : booking && booking.parts
                  ? String(booking.parts)
                  : "-";
              const totalAmount = booking && booking.totalCost != null ? booking.totalCost : 0;
              const serviceLabel = (booking && booking.service) || "-";
              const technicianName = (booking && booking.technician) || "-";
              const bookingId = (booking && booking._id) || "";
              const repeatedLabel = booking && booking.duplicate ? '<div><span class="booking-repeat-label">🔁 Repeated</span></div>' : "";

              return `
                <tr>
                  <td>${escapeHtml((booking && booking.customerId) || "-")}</td>
                  <td>${escapeHtml((booking && booking.customerName) || "-")}</td>
                  <td>${escapeHtml((booking && booking.phone) || "-")}</td>
                  <td>${escapeHtml(serviceLabel)}${repeatedLabel}</td>
                  <td>${escapeHtml(partNames || "-")}</td>
                  <td>${escapeHtml(technicianName)}</td>
                  <td>${escapeHtml(formatCurrency(totalAmount || 0))}</td>
                  <td><span class="status-pill ${statusClass}">${escapeHtml(statusValue)}</span></td>
                  <td>
                    <div class="table-actions action-buttons">
                      <button type="button" class="action-btn" data-action="view" data-id="${bookingId}">View</button>
                      <button type="button" class="action-btn" data-action="complete" data-id="${bookingId}">Complete</button>
                      <button type="button" class="action-btn danger" data-action="delete" data-id="${bookingId}">Delete</button>
                    </div>
                  </td>
                </tr>
              `;
            } catch (error) {
              console.error("Failed to render booking row:", booking, error);
              return "";
            }
          })
          .join("");

        bookingTableBody.innerHTML = rows;
      } catch (error) {
        console.error("Failed to render bookings table:", error, items);
        bookingTableBody.innerHTML = "";
        if (bookingsEmptyState) bookingsEmptyState.classList.remove("hidden");
      }
    }

    function renderCallRequests(items) {
      const pendingCount = items.filter((request) => String(request.status).toLowerCase() === "pending").length;
      if (callRequestsBadge) {
        callRequestsBadge.textContent = String(pendingCount);
        callRequestsBadge.classList.toggle("hidden", pendingCount === 0);
      }
      if (callRequestsEmptyState) callRequestsEmptyState.classList.toggle("hidden", items.length > 0);

      if (!items.length) {
        callRequestTableBody.innerHTML = "";
        return;
      }

      callRequestTableBody.innerHTML = items
        .map((request) => {
          const isConverted = String(request.status) === "Converted";
          return `
            <tr>
              <td>${escapeHtml(request.name || "Not provided")}</td>
              <td>${escapeHtml(request.phone || "Not available")}</td>
              <td>${escapeHtml(new Date(request.createdAt).toLocaleString("en-IN"))}</td>
              <td><span class="status-pill status-${String(request.status).toLowerCase()}">${escapeHtml(request.status)}</span></td>
              <td>
                <button type="button" class="action-btn" data-call-action="convert" data-id="${request._id}" ${isConverted ? "disabled" : ""}>
                  ${isConverted ? "Converted" : "Convert to Booking"}
                </button>
              </td>
            </tr>
          `;
        })
        .join("");
    }

  function renderOverviewMetrics() {
    if (todayCount) {
      const source = overviewBookings.length ? overviewBookings : bookings;
      todayCount.textContent = String(
        source.filter((booking) => {
          const bookingDate = booking && (booking.createdAt || booking.serviceDate);
          if (!bookingDate) return false;

          const normalizedBookingDate = booking.createdAt
            ? new Date(bookingDate).toLocaleDateString("en-CA")
            : String(bookingDate).slice(0, 10);
          const normalizedToday = new Date().toLocaleDateString("en-CA");

          return normalizedBookingDate === normalizedToday;
        }).length
      );
    }
  }

    function renderParts(items) {
      partsList = items;
      if (partsEmptyState) partsEmptyState.classList.toggle("hidden", items.length > 0);
      if (!partsTableBody) return;
      if (!items.length) {
        partsTableBody.innerHTML = "";
        return;
      }

      partsTableBody.innerHTML = items
        .map(
          (part) => `
            <tr>
              <td>${escapeHtml(part.name)}</td>
              <td>${escapeHtml(formatCurrency(part.price))}</td>
              <td>
                <div class="table-actions action-buttons">
                  <button type="button" class="action-btn danger" data-part-action="delete" data-id="${part._id}">Delete</button>
                </div>
              </td>
            </tr>
          `
        )
        .join("");
    }

    function renderRecentActivity() {
      if (!activityList) return;

      const sourceBookings = overviewBookings.length ? overviewBookings : bookings;
      const bookingActivity = sourceBookings.map((booking) => ({
        label:
          String(booking.status).toLowerCase() === "completed"
            ? `Booking completed - ${booking.name || booking.customerId || "Customer"}`
            : `Booking created - ${booking.name || booking.customerId || "Customer"}`,
        time: booking.createdAt || buildDateTime(booking.serviceDate, booking.serviceTime) || ""
      }));

      const callActivity = callRequests.map((request) => ({
        label:
          String(request.status).toLowerCase() === "converted"
            ? `Call request converted - ${request.name || request.phone || "Customer"}`
            : `Call request pending - ${request.name || request.phone || "Customer"}`,
        time: request.createdAt || ""
      }));

      const items = [...bookingActivity, ...callActivity]
        .sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime())
        .slice(0, 6);

      if (!items.length) {
        activityList.innerHTML = '<li class="activity-empty">No recent activity yet</li>';
        return;
      }

      activityList.innerHTML = items
        .map((item) => `<li>${escapeHtml(item.label)}<span>${escapeHtml(new Date(item.time).toLocaleString("en-IN"))}</span></li>`)
        .join("");
    }

    function openCallBookingModal(request = null) {
      if (!callBookingForm) return;
      callBookingForm.reset();
      document.getElementById("callBookingRequestId").value = request ? request._id : "";
      document.getElementById("callCustomerName").value = request ? request.name || "" : "";
      document.getElementById("phoneNumber").value = request ? request.phone || "" : "";
      document.getElementById("device").value = "";
      document.getElementById("serviceType").value = "";
      document.getElementById("callPartsSelect").selectedIndex = -1;
      document.getElementById("problem").value = "";
      document.getElementById("callBookingStatus").value = "Pending";
      if (callBookingSource) {
        callBookingSource.value = request && request.source === "Call Button" ? "Call Button" : "Call";
      }
      if (callBookingTitle) {
        callBookingTitle.textContent = request ? "Convert Call Request to Booking" : "Add Booking (Call)";
      }
      applyTechnicianToForm(callBookingForm);
      callBillingRefresh();
      openModal(callBookingModal);
    }

    async function handleCallBooking(button) {
      if (!callBookingForm || !validateForm(callBookingForm)) return;

      const originalText = button.textContent;
      try {
        button.disabled = true;
        button.textContent = "Saving...";
        applyTechnicianToForm(callBookingForm);
        const payload = formDataToObject(callBookingForm);

        try {
          await apiFetch("/api/bookings/call", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
        } catch (error) {
          if (!isDuplicateConflict(error)) throw error;
          const proceed = await confirmDuplicateBooking();
          if (!proceed) return;
          await apiFetch("/api/bookings/call", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, allowDuplicate: true })
          });
        }
        callBookingForm.reset();
        callBillingRefresh();
        closeModal(callBookingModal);
        await refreshAll();
        showToast(payload.callRequestId ? "Call request converted successfully" : "Call booking added successfully");
      } catch (error) {
        showToast(error.message, true);
      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
    }

    async function loadStats() {
    const stats = await apiFetch("/api/bookings/stats");
      totalBookings.textContent = stats.total;
      pendingBookings.textContent = stats.pending;
      completedBookings.textContent = stats.completed;
    }

    async function loadBookings(search = "") {
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      bookings = (await apiFetch(`/api/bookings${query}`)).map(normalizeBooking);
      console.log("Bookings API response from /api/bookings:", bookings);
      renderBookings(bookings);
    }

    async function loadOverviewBookings() {
      overviewBookings = (await apiFetch("/api/bookings")).map(normalizeBooking);
      renderOverviewMetrics();
      renderRecentActivity();
    }

    async function loadCallRequests() {
      callRequests = await apiFetch("/api/call-requests");
      renderCallRequests(callRequests);
      renderRecentActivity();
    }

    async function loadParts() {
      const items = await apiFetch(PARTS_API_URL);
      availableParts = Array.isArray(items) ? items.map(normalizePart) : [];
      populatePartsSelects();
      if (manualBillingRefresh) manualBillingRefresh();
      if (callBillingRefresh) callBillingRefresh();
      renderParts(availableParts);
    }

    async function refreshAll(search = searchInput.value.trim()) {
      await Promise.all([loadStats(), loadBookings(search), loadOverviewBookings(), loadCallRequests(), loadParts()]);
    }

    bookingTableBody.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const booking = bookings.find((item) => item._id === button.dataset.id);
      if (!booking) return;

      try {
        if (button.dataset.action === "view") {
          const normalizedBooking = normalizeBooking(booking);
          modalContent.innerHTML = `
            <div class="modal-grid">
              <div><strong>Customer ID</strong><p>${escapeHtml(normalizedBooking.customerId || "-")}</p></div>
              <div><strong>Customer Name</strong><p>${escapeHtml(normalizedBooking.customerName || "-")}</p></div>
              <div><strong>Phone</strong><p>${escapeHtml(normalizedBooking.phone || "-")}</p></div>
              <div><strong>Service</strong><p>${escapeHtml(normalizedBooking.service || "-")}</p></div>
              <div><strong>Technician</strong><p>${escapeHtml(normalizedBooking.technician || "-")}</p></div>
              <div><strong>Parts</strong><p>${escapeHtml((normalizedBooking.parts || []).map((part) => part.name).join(", ") || "-")}</p></div>
              <div><strong>Service Cost</strong><p>${escapeHtml(formatCurrency(normalizedBooking.serviceCost || 0))}</p></div>
              <div><strong>Parts Cost</strong><p>${escapeHtml(formatCurrency(normalizedBooking.partsCost || 0))}</p></div>
              <div><strong>Total Cost</strong><p>${escapeHtml(formatCurrency(normalizedBooking.totalCost || 0))}</p></div>
              <div><strong>Status</strong><p>${escapeHtml(normalizedBooking.status || "Pending")}</p></div>
              <div><strong>Created At</strong><p>${escapeHtml(normalizedBooking.createdAt ? new Date(normalizedBooking.createdAt).toLocaleString("en-IN") : "-")}</p></div>
            </div>
          `;
          openModal(viewModal);
          return;
        }

        if (button.dataset.action === "complete") {
          button.disabled = true;
          button.textContent = "Completing...";
          await apiFetch(`/api/bookings/${booking._id}/complete`, { method: "PUT" });
        }

        if (button.dataset.action === "delete") {
          if (!confirmDelete()) return;
          await apiFetch(`/api/bookings/${booking._id}`, { method: "DELETE" });
        }

        await refreshAll();
      } catch (error) {
        showToast(error.message, true);
      }
    });

    if (partsTableBody) {
      partsTableBody.addEventListener("click", async (event) => {
        const button = event.target.closest("button[data-part-action]");
        if (!button) return;

        const selectedPart = partsList.find((part) => part._id === button.dataset.id);
        if (!selectedPart) return;

        try {
          if (button.dataset.partAction === "delete") {
            if (!confirmDelete()) return;
            await apiFetch(`/api/delete-part/${selectedPart._id}`, { method: "DELETE" });
            await loadParts();
            showToast("Part deleted successfully");
            return;
          }
        } catch (error) {
          showToast(error.message, true);
        }
      });
    }

    callRequestTableBody.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-call-action]");
      if (!button) return;
      const request = callRequests.find((item) => item._id === button.dataset.id);
      if (!request || button.disabled) return;

      button.disabled = true;
      button.textContent = "Converting...";
      openCallBookingModal(request);
      button.disabled = false;
      button.textContent = "Convert to Booking";
    });

    searchInput.addEventListener("input", () => {
      window.clearTimeout(searchInput.timer);
      searchInput.timer = window.setTimeout(() => {
        loadBookings(searchInput.value.trim()).catch((error) => showToast(error.message, true));
      }, 250);
    });

    const openWalkInBookingBtn = document.getElementById("openWalkInBookingBtn");
    const openCallBookingBtn = document.getElementById("openCallBookingBtn");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const closeCallBookingBtn = document.getElementById("closeCallBookingBtn");
    const cancelCallBookingBtn = document.getElementById("cancelCallBookingBtn");
    const saveCallBookingBtn = document.getElementById("saveCallBookingBtn");
    const closeManualBookingBtn = document.getElementById("closeManualBookingBtn");
    const cancelManualBookingBtn = document.getElementById("cancelManualBookingBtn");
    const submitManualBookingBtn = document.getElementById("submitManualBookingBtn");
    const exportQuickActionsBtn = document.getElementById("exportQuickActionsBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if (openWalkInBookingBtn) {
      openWalkInBookingBtn.addEventListener("click", () => {
        applyTechnicianToForm(manualBookingForm);
        openModal(manualBookingModal);
      });
    }
    if (openCallBookingBtn) {
      openCallBookingBtn.addEventListener("click", () => openCallBookingModal());
    }
    if (exportQuickActionsBtn) {
      exportQuickActionsBtn.addEventListener("click", () => {
        window.location.href = "/api/bookings/export";
      });
    }
    if (closeModalBtn) {
      closeModalBtn.addEventListener("click", () => closeModal(viewModal));
    }
    if (closeCallBookingBtn) {
      closeCallBookingBtn.addEventListener("click", () => closeModal(callBookingModal));
    }
    if (cancelCallBookingBtn) {
      cancelCallBookingBtn.addEventListener("click", () => closeModal(callBookingModal));
    }
    if (saveCallBookingBtn) {
      saveCallBookingBtn.addEventListener("click", () => handleCallBooking(saveCallBookingBtn));
    }
    if (closeManualBookingBtn) {
      closeManualBookingBtn.addEventListener("click", () => closeModal(manualBookingModal));
    }
    if (cancelManualBookingBtn) {
      cancelManualBookingBtn.addEventListener("click", () => closeModal(manualBookingModal));
    }
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => logout());
    }

    if (manualBookingForm) {
      manualBookingForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!validateForm(manualBookingForm)) return;

        const originalText = submitManualBookingBtn ? submitManualBookingBtn.textContent : "Save Walk-in Booking";
        try {
        if (submitManualBookingBtn) {
          submitManualBookingBtn.disabled = true;
          submitManualBookingBtn.textContent = "Saving...";
        }
        applyTechnicianToForm(manualBookingForm);
        const payload = formDataToObject(manualBookingForm);
        try {
          await apiFetch("/api/manual-booking", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
        } catch (error) {
          if (!isDuplicateConflict(error)) throw error;
          const proceed = await confirmDuplicateBooking();
          if (!proceed) return;
          await apiFetch("/api/manual-booking", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, allowDuplicate: true })
          });
        }
        manualBookingForm.reset();
        manualBillingRefresh();
        closeModal(manualBookingModal);
        await refreshAll();
        showToast("Walk-in booking added successfully");
        } catch (error) {
          showToast(error.message, true);
        } finally {
          if (submitManualBookingBtn) {
            submitManualBookingBtn.disabled = false;
            submitManualBookingBtn.textContent = originalText;
          }
        }
      });
    }

    if (partsForm) {
      partsForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!validateForm(partsForm)) return;

        const addPartBtn = document.getElementById("addPartBtn");
        const originalText = addPartBtn ? addPartBtn.textContent : "Add Part";
        try {
          if (addPartBtn) {
            addPartBtn.disabled = true;
            addPartBtn.textContent = "Adding...";
          }

          await apiFetch("/api/add-part", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formDataToObject(partsForm))
          });
          partsForm.reset();
          await loadParts();
          showToast("Part added successfully");
        } catch (error) {
          showToast(error.message, true);
        } finally {
          if (addPartBtn) {
            addPartBtn.disabled = false;
            addPartBtn.textContent = originalText;
          }
        }
      });
    }

    document.querySelectorAll("[data-view-link]").forEach((link) => {
      link.addEventListener("click", () => {
        window.setTimeout(() => setView(link.dataset.viewLink), 0);
      });
    });

    window.addEventListener("hashchange", () => {
      setView((window.location.hash || "#overview").replace("#", ""));
    });

    initTimeSelects();
    await loadCatalogData();
    applyTechnicianToForm(callBookingForm);
    applyTechnicianToForm(manualBookingForm);
    if (manualBillingRefresh) manualBillingRefresh();
    if (callBillingRefresh) callBillingRefresh();
    setView((window.location.hash || "#overview").replace("#", ""));
    await refreshAll();
    refreshTimer = window.setInterval(() => {
      loadCallRequests().catch((error) => showToast(error.message, true));
    }, 30000);
    window.addEventListener("beforeunload", () => {
      if (refreshTimer) window.clearInterval(refreshTimer);
    });
  }

  initTheme();
  initTimeSelects();
  refreshEmployees();
  window.getCurrentUser = getCurrentUser;
  window.login = login;
  window.logout = logout;
  window.togglePassword = togglePassword;
  initCustomerEnhancements();

  if (page === "booking") {
    initBookingPage().catch((error) => showToast(error.message, true));
  }
  if (page === "contact") initContactPage();
  if (page === "login") initLoginPage();
  if (page === "dashboard") {
    initDashboardPage().catch((error) => showToast(error.message, true));
  }
})();
// ===== FORCE PART DROPDOWN FIX (WORKING) =====

(function () {
  function getPartsList() {
    return (
      window.parts ||
      window.allParts ||
      window.partsList ||
      []
    );
  }

  function populateDropdown(select) {
    const partsList = getPartsList();

    if (!select) return;

    // Clear existing
    select.innerHTML = '<option value="">Select Part</option>';

    // If no parts → stop
    if (!partsList || !partsList.length) {
      console.warn("⚠ No parts data found");
      return;
    }

    // Add options
    partsList.forEach(part => {
      const name = part.name || part.partName || "";

      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;

      select.appendChild(option);
    });
  }

  // Run multiple times to ensure it works
  function applyDropdownFix() {
    const selects = document.querySelectorAll(".part-name");

    selects.forEach(select => {
      if (select.dataset.loaded === "true") return;

      populateDropdown(select);
      select.dataset.loaded = "true";
    });
  }

  // Run after UI loads
  setTimeout(applyDropdownFix, 200);
  setTimeout(applyDropdownFix, 500);
  setTimeout(applyDropdownFix, 1000);

})();
