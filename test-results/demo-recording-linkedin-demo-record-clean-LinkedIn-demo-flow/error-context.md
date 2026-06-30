# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: demo-recording\linkedin-demo.spec.js >> record clean LinkedIn demo flow
- Location: demo-recording\linkedin-demo.spec.js:24:1

# Error details

```
Error: Demo admin login failed. Start the app and seed demo data before recording.
```

# Test source

```ts
  112 | }
  113 | 
  114 | async function showAppPage(page, route, holdMs) {
  115 |   await goto(page, route);
  116 |   await settleAtTop(page);
  117 |   await page.waitForTimeout(900);
  118 |   await smoothScroll(page, [0.2, 0.48, 0.08]);
  119 |   await page.waitForTimeout(holdMs);
  120 | }
  121 | 
  122 | async function goto(page, route) {
  123 |   await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
  124 |   await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  125 | }
  126 | 
  127 | async function smoothScroll(page, stops) {
  128 |   for (const stop of stops) {
  129 |     await page.evaluate((position) => {
  130 |       const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  131 |       window.scrollTo({ top: maxScroll * position, behavior: 'smooth' });
  132 |     }, stop);
  133 |     await page.waitForTimeout(900);
  134 |   }
  135 | }
  136 | 
  137 | async function cleanupRawVideos() {
  138 |   const files = await fs.readdir(outputDir).catch(() => []);
  139 |   await Promise.all(files
  140 |     .filter((file) => /^page@.*\.webm$/i.test(file))
  141 |     .map((file) => fs.rm(path.join(outputDir, file), { force: true }).catch(() => {})));
  142 | }
  143 | 
  144 | async function runSection(label, action, timeoutMs) {
  145 |   let timeoutId;
  146 |   const timeout = new Promise((resolve) => {
  147 |     timeoutId = setTimeout(resolve, timeoutMs);
  148 |   });
  149 |   try {
  150 |     await Promise.race([action(), timeout]);
  151 |   } catch {
  152 |     // Keep the recorder moving. This is a demo capture, not a strict test.
  153 |   } finally {
  154 |     clearTimeout(timeoutId);
  155 |   }
  156 | }
  157 | 
  158 | async function settleAtTop(page) {
  159 |   await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })).catch(() => {});
  160 |   await page.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => {});
  161 |   await page.waitForTimeout(900);
  162 | }
  163 | 
  164 | async function safeClick(page, target, timeout = 1500) {
  165 |   try {
  166 |     const locator = typeof target === 'string' ? page.locator(target) : target;
  167 |     await locator.first().click({ timeout });
  168 |     return true;
  169 |   } catch {
  170 |     return false;
  171 |   }
  172 | }
  173 | 
  174 | async function safeFill(page, selector, value, timeout = 1500) {
  175 |   try {
  176 |     await page.locator(selector).first().fill(value, { timeout });
  177 |     return true;
  178 |   } catch {
  179 |     return false;
  180 |   }
  181 | }
  182 | 
  183 | async function safeWait(page, ms) {
  184 |   try {
  185 |     await page.waitForTimeout(ms);
  186 |     return true;
  187 |   } catch {
  188 |     return false;
  189 |   }
  190 | }
  191 | 
  192 | async function safeSelect(page, locator, preferredLabel, timeout = 1500) {
  193 |   try {
  194 |     if (!await locator.first().isVisible({ timeout }).catch(() => false)) return false;
  195 |     await locator.first().selectOption({ label: preferredLabel }, { timeout });
  196 |     return true;
  197 |   } catch {
  198 |     try {
  199 |       const firstValue = await locator.first().locator('option').nth(1).getAttribute('value', { timeout });
  200 |       if (!firstValue) return false;
  201 |       await locator.first().selectOption(firstValue, { timeout });
  202 |       return true;
  203 |     } catch {
  204 |       return false;
  205 |     }
  206 |   }
  207 | }
  208 | 
  209 | async function login(api, credentials, label) {
  210 |   const response = await api.post('/auth/login', { data: credentials });
  211 |   if (!response.ok()) {
> 212 |     throw new Error(`Demo ${label} login failed. Start the app and seed demo data before recording.`);
      |           ^ Error: Demo admin login failed. Start the app and seed demo data before recording.
  213 |   }
  214 |   const data = await response.json();
  215 |   if (!data?.token || !data?.user) throw new Error(`Demo ${label} login did not return a session.`);
  216 |   return { token: data.token, user: data.user };
  217 | }
  218 | 
  219 | async function loadDemoAccounts() {
  220 |   return {
  221 |     admin: {
  222 |       username: process.env.DEMO_ADMIN_USER || 'admin',
  223 |       password: process.env.DEMO_ADMIN_PASSWORD || await readSeedPassword('admin')
  224 |     },
  225 |     technician: {
  226 |       username: process.env.DEMO_TECH_USER || 'emp1',
  227 |       password: process.env.DEMO_TECH_PASSWORD || await readSeedPassword('emp1')
  228 |     }
  229 |   };
  230 | }
  231 | 
  232 | async function readSeedPassword(username) {
  233 |   const seedPath = path.join(__dirname, '..', 'server', 'src', 'seed', 'seedDemo.js');
  234 |   const source = await fs.readFile(seedPath, 'utf8').catch(() => '');
  235 |   const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  236 |   const match = source.match(new RegExp(`username:\\s*['"]${escapedUsername}['"][\\s\\S]*?password:\\s*['"]([^'"]+)['"]`));
  237 |   return match?.[1] || '';
  238 | }
  239 | 
  240 | async function setSession(page, auth) {
  241 |   await goto(page, '/');
  242 |   await page.evaluate(({ token, user }) => {
  243 |     window.localStorage.removeItem('us_token');
  244 |     window.localStorage.removeItem('us_user');
  245 |     window.localStorage.removeItem('adminToken');
  246 |     window.localStorage.removeItem('token');
  247 |     window.sessionStorage.setItem('us_token', token);
  248 |     window.sessionStorage.setItem('us_user', JSON.stringify(user));
  249 |   }, auth);
  250 | }
  251 | 
  252 | async function findSafeWorkOrderId(api, token) {
  253 |   const response = await api.get('/work-orders?limit=20&lifecycle=active', {
  254 |     headers: { Authorization: `Bearer ${token}` }
  255 |   });
  256 |   if (!response.ok()) return '';
  257 |   const data = await response.json();
  258 |   const rows = Array.isArray(data?.workOrders) ? data.workOrders : Array.isArray(data?.data) ? data.data : [];
  259 |   const safeRow = rows.find((order) => {
  260 |     const customer = order.customerId || {};
  261 |     return /^Demo\b/i.test(customer.name || '') || /^DEMO-/i.test(customer.phone || '') || /^US-BK-/i.test(order.bookingId?.bookingCode || '');
  262 |   });
  263 |   return safeRow?.id || safeRow?._id || '';
  264 | }
  265 | 
```