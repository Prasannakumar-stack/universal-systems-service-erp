# Office Production Setup

This guide is for the client office main PC. It is a one-time setup: after setup, the app starts in production mode when Windows starts, and staff open the app link or installed PWA. Daily `npm run dev` is only for development on the developer PC.

## Production URLs

- Public website: `http://SERVER-IP:5050/`
- Staff app/login/PWA: `http://SERVER-IP:5050/app`
- Health check: `http://SERVER-IP:5050/api/health`

Replace `SERVER-IP` with the fixed LAN IP of the office main PC.

## One-Time Setup

1. Install Node.js LTS on the office main PC.
2. Install and start MongoDB on the office main PC, or prepare the MongoDB connection string for the office database.
3. Copy this project folder to a stable location, for example `C:\UniversalSystems`.
4. Open PowerShell in the project folder.
5. Install dependencies:

```powershell
npm install
npm run install:all
```

6. Create `server\.env` from `server\.env.example`.
7. Edit `server\.env` for the office:

```env
NODE_ENV=production
PORT=5050
MONGO_URI=mongodb://127.0.0.1:27017/universal_systems_live
# MONGO_URI=mongodb://127.0.0.1:27017/universal_systems_demo
JWT_SECRET=replace-with-a-long-random-production-secret
CLIENT_URL=http://SERVER-IP:5050
```

Use a long random `JWT_SECRET`. Do not leave the example value in production.

Auto-start uses only the uncommented `MONGO_URI` in `server\.env`. `#` means disabled/commented. For real client use, keep `universal_systems_live` active. For demo/training, keep `universal_systems_demo` active. Never keep both live and demo `MONGO_URI` lines active.

`start-app.bat` does not seed, clean, delete, or switch data. It only reads the active database line and starts the production app.

8. Build the frontend:

```powershell
npm run build
```

9. Start production once to verify:

```powershell
npm start
```

10. Check these URLs from the main PC:

- `http://localhost:5050/`
- `http://localhost:5050/app`
- `http://localhost:5050/api/health`

11. Check from a staff PC on the same LAN:

- `http://SERVER-IP:5050/`
- `http://SERVER-IP:5050/app`

## Windows Auto-Start With Task Scheduler

Use Task Scheduler so the client does not need to open a terminal daily.

1. Press Windows Start and open **Task Scheduler**.
2. Choose **Create Task**.
3. General tab:
   - Name: `Universal Systems Service App`
   - Select **Run whether user is logged on or not**.
   - Select **Run with highest privileges**.
4. Triggers tab:
   - New trigger: **At startup**.
   - Optional: Delay task for 30 seconds so MongoDB/network starts first.
5. Actions tab:
   - Action: **Start a program**.
   - Program/script: `C:\UniversalSystems\start-app.bat`
   - Start in: `C:\UniversalSystems`
6. Settings tab:
   - Enable **Restart every 1 minute**.
   - Set restart attempts to `3` or more.
   - Enable **Run task as soon as possible after a scheduled start is missed**.
7. Save the task and enter the Windows password if prompted.
8. Right-click the task and choose **Run** to test.

If the project folder is not `C:\UniversalSystems`, use the real folder path for Program/script and Start in.

## Optional PM2 Auto-Start

PM2 can keep the Node process alive and restart it after crashes.

Install PM2 globally:

```powershell
npm install -g pm2
```

Start the production server from the project folder:

```powershell
pm2 start "npm" --name "universal-systems" -- start
pm2 save
```

For Windows startup, install PM2 startup support:

```powershell
npm install -g pm2-windows-startup
pm2-startup install
pm2 save
```

Useful PM2 commands:

```powershell
pm2 status
pm2 logs universal-systems
pm2 restart universal-systems
pm2 stop universal-systems
```

## LAN IP And Firewall

Set a fixed LAN IP for the office main PC from the router DHCP reservation page or Windows network settings. Use that IP in `CLIENT_URL` and staff links.

Allow port `5050` through Windows Firewall:

1. Open **Windows Defender Firewall with Advanced Security**.
2. Choose **Inbound Rules**.
3. Choose **New Rule**.
4. Select **Port**.
5. Select **TCP** and enter `5050`.
6. Select **Allow the connection**.
7. Apply to the office network profile.
8. Name it `Universal Systems App 5050`.

## Daily Office Use

The office main PC should auto-start the production app. Staff PCs only open:

- Staff app: `http://SERVER-IP:5050/app`
- Public site: `http://SERVER-IP:5050/`

Staff can also install the PWA from the browser after opening `/app`.

## Developer Use

Development stays unchanged on the developer PC:

```powershell
npm run dev
```

This keeps Vite on `http://localhost:5173` and the API on `http://localhost:5050`.
