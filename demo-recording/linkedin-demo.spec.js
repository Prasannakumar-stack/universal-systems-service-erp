const { test, chromium, request: playwrightRequest } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

const baseUrl = (process.env.DEMO_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
const apiUrl = (process.env.DEMO_API_URL || 'http://localhost:5050/api').replace(/\/$/, '');
const outputDir = path.join(__dirname, 'output');
const finalVideoPath = path.join(outputDir, 'linkedin-demo.webm');

const viewport = { width: 1440, height: 900 };
const safeBooking = {
  customerName: 'Demo Customer',
  phone: '9000000000',
  address: 'Demo Area',
  serviceType: 'PC / Laptop Service',
  device: 'Laptop',
  deviceBrand: 'HP',
  deviceModel: 'HP Pavilion 15',
  problemDescription: 'Laptop is not turning on and needs diagnosis.'
};

test.setTimeout(180000);

test('record clean LinkedIn demo flow', async () => {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.rm(finalVideoPath, { force: true });
  await cleanupRawVideos();

  const browser = await chromium.launch({
    headless: false,
    args: ['--window-size=1440,900'],
    slowMo: Number(process.env.DEMO_SLOWMO_MS || 80)
  });
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    recordVideo: { dir: outputDir, size: viewport }
  });
  const page = await context.newPage();
  const video = page.video();

  const api = await playwrightRequest.newContext({ baseURL: apiUrl });
  const accounts = await loadDemoAccounts();

  try {
    await runSection('Public Home', () => showPublicHome(page), 16000);
    await runSection('Book Service', () => showBookingFlow(page), 17000);

    const adminAuth = await login(api, accounts.admin, 'admin');
    await setSession(page, adminAuth);
    await runSection('Admin Dashboard', () => showAppPage(page, '/app/admin/dashboard', 4600), 14000);
    await runSection('Work Orders', () => showAppPage(page, '/app/admin/work-orders', 4400), 14000);

    const adminWorkOrderId = await findSafeWorkOrderId(api, adminAuth.token);
    if (adminWorkOrderId) {
      await runSection('Admin Work Order Detail', () => showAppPage(page, `/app/admin/work-orders/${adminWorkOrderId}`, 5200), 15000);
    }

    await runSection('Inventory Parts', () => showAppPage(page, '/app/admin/parts', 4300), 14000);

    const techAuth = await login(api, accounts.technician, 'technician');
    await setSession(page, techAuth);
    await runSection('Technician Dashboard', () => showAppPage(page, '/app/tech/dashboard', 4600), 14000);

    const techWorkOrderId = await findSafeWorkOrderId(api, techAuth.token);
    if (techWorkOrderId) {
      await runSection('Technician Work Order Detail', () => showAppPage(page, `/app/tech/work-orders/${techWorkOrderId}`, 5000), 15000);
    }

    await setSession(page, adminAuth);
    await runSection('Invoices', () => showAppPage(page, '/app/admin/invoices', 5200), 15000);
  } finally {
    await api.dispose();
    await context.close();
    if (video) await video.saveAs(finalVideoPath);
    await cleanupRawVideos();
    await browser.close();
  }
});

async function showPublicHome(page) {
  await goto(page, '/');
  await settleAtTop(page);
  await smoothScroll(page, [0.28, 0.62, 0]);
  await page.waitForTimeout(1200);
}

async function showBookingFlow(page) {
  await goto(page, '/book-service');
  await settleAtTop(page);
  await safeWait(page, 3000);
  await safeFill(page, '#booking-customer-name', safeBooking.customerName);
  await safeWait(page, 350);
  await safeFill(page, '#booking-phone', safeBooking.phone);
  await safeWait(page, 350);
  await safeFill(page, '#booking-address', safeBooking.address);
  await safeWait(page, 500);
  await safeClick(page, page.getByRole('button', { name: /continue/i }));
  await safeWait(page, 900);
  await settleAtTop(page);

  const serviceSelect = page.locator('#booking-service-type');
  await safeSelect(page, serviceSelect, safeBooking.serviceType);
  await safeFill(page, '#booking-device', safeBooking.device);
  await safeWait(page, 250);
  await safeFill(page, '#booking-device-brand', safeBooking.deviceBrand);
  await safeWait(page, 250);
  await safeFill(page, '#booking-device-model', safeBooking.deviceModel);
  await safeWait(page, 250);
  await safeFill(page, '#booking-problem', safeBooking.problemDescription);
  await safeWait(page, 2600);
}

async function showAppPage(page, route, holdMs) {
  await goto(page, route);
  await settleAtTop(page);
  await page.waitForTimeout(900);
  await smoothScroll(page, [0.2, 0.48, 0.08]);
  await page.waitForTimeout(holdMs);
}

async function goto(page, route) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
}

async function smoothScroll(page, stops) {
  for (const stop of stops) {
    await page.evaluate((position) => {
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({ top: maxScroll * position, behavior: 'smooth' });
    }, stop);
    await page.waitForTimeout(900);
  }
}

async function cleanupRawVideos() {
  const files = await fs.readdir(outputDir).catch(() => []);
  await Promise.all(files
    .filter((file) => /^page@.*\.webm$/i.test(file))
    .map((file) => fs.rm(path.join(outputDir, file), { force: true }).catch(() => {})));
}

async function runSection(label, action, timeoutMs) {
  let timeoutId;
  const timeout = new Promise((resolve) => {
    timeoutId = setTimeout(resolve, timeoutMs);
  });
  try {
    await Promise.race([action(), timeout]);
  } catch {
    // Keep the recorder moving. This is a demo capture, not a strict test.
  } finally {
    clearTimeout(timeoutId);
  }
}

async function settleAtTop(page) {
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => {});
  await page.waitForTimeout(900);
}

async function safeClick(page, target, timeout = 1500) {
  try {
    const locator = typeof target === 'string' ? page.locator(target) : target;
    await locator.first().click({ timeout });
    return true;
  } catch {
    return false;
  }
}

async function safeFill(page, selector, value, timeout = 1500) {
  try {
    await page.locator(selector).first().fill(value, { timeout });
    return true;
  } catch {
    return false;
  }
}

async function safeWait(page, ms) {
  try {
    await page.waitForTimeout(ms);
    return true;
  } catch {
    return false;
  }
}

async function safeSelect(page, locator, preferredLabel, timeout = 1500) {
  try {
    if (!await locator.first().isVisible({ timeout }).catch(() => false)) return false;
    await locator.first().selectOption({ label: preferredLabel }, { timeout });
    return true;
  } catch {
    try {
      const firstValue = await locator.first().locator('option').nth(1).getAttribute('value', { timeout });
      if (!firstValue) return false;
      await locator.first().selectOption(firstValue, { timeout });
      return true;
    } catch {
      return false;
    }
  }
}

async function login(api, credentials, label) {
  const response = await api.post('/auth/login', { data: credentials });
  if (!response.ok()) {
    throw new Error(`Demo ${label} login failed. Start the app and seed demo data before recording.`);
  }
  const data = await response.json();
  if (!data?.token || !data?.user) throw new Error(`Demo ${label} login did not return a session.`);
  return { token: data.token, user: data.user };
}

async function loadDemoAccounts() {
  return {
    admin: {
      username: process.env.DEMO_ADMIN_USER || 'admin',
      password: process.env.DEMO_ADMIN_PASSWORD || await readSeedPassword('admin')
    },
    technician: {
      username: process.env.DEMO_TECH_USER || 'emp1',
      password: process.env.DEMO_TECH_PASSWORD || await readSeedPassword('emp1')
    }
  };
}

async function readSeedPassword(username) {
  const seedPath = path.join(__dirname, '..', 'server', 'src', 'seed', 'seedDemo.js');
  const source = await fs.readFile(seedPath, 'utf8').catch(() => '');
  const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`username:\\s*['"]${escapedUsername}['"][\\s\\S]*?password:\\s*['"]([^'"]+)['"]`));
  return match?.[1] || '';
}

async function setSession(page, auth) {
  await goto(page, '/');
  await page.evaluate(({ token, user }) => {
    window.localStorage.removeItem('us_token');
    window.localStorage.removeItem('us_user');
    window.localStorage.removeItem('adminToken');
    window.localStorage.removeItem('token');
    window.sessionStorage.setItem('us_token', token);
    window.sessionStorage.setItem('us_user', JSON.stringify(user));
  }, auth);
}

async function findSafeWorkOrderId(api, token) {
  const response = await api.get('/work-orders?limit=20&lifecycle=active', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok()) return '';
  const data = await response.json();
  const rows = Array.isArray(data?.workOrders) ? data.workOrders : Array.isArray(data?.data) ? data.data : [];
  const safeRow = rows.find((order) => {
    const customer = order.customerId || {};
    return /^Demo\b/i.test(customer.name || '') || /^DEMO-/i.test(customer.phone || '') || /^US-BK-/i.test(order.bookingId?.bookingCode || '');
  });
  return safeRow?.id || safeRow?._id || '';
}
