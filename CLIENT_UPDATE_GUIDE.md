# Client Update Guide

This guide explains how to safely update the client office installation after making code changes on the development PC.

## Roles

- **Development PC:** Your PC, where code changes are made and tested.
- **Client main PC:** The office production/server PC, where the real app runs for daily use.
- **Staff PCs:** Browser or PWA users only. Staff should open the app URL and should not run terminal commands.

Changes made on the development PC do not automatically change the client office PC. The client office app updates only when you intentionally deploy the new code by copying a ZIP/project folder or by running `git pull` on the client main PC.

## Critical Safety Rules

- Never overwrite `server/.env` on the client main PC.
- Never delete the live MongoDB database.
- Never delete `server/uploads`.
- Never run `npm run seed:demo` on the live database.
- Never run `npm run db:clean-client` on the live database unless you intentionally want to clean business data and have confirmed the operation.
- Always take backups before updating the client office installation.

## Before Every Update

On the client main PC, make these backups first:

1. Back up the full project folder.
2. Back up the MongoDB live database.
3. Back up `server/uploads`.
4. Confirm `server/.env` is present and keep it unchanged.

Recommended backup items:

```text
project-folder-backup/
mongodb-live-database-backup/
server/uploads-backup/
server/.env
```

## Update by ZIP or Folder Copy

Use this flow when copying the updated project from the development PC to the client main PC.

1. On the development PC, finish changes and verify:

```bash
npm run build
```

2. Create a ZIP or copy of the updated source code.
3. On the client main PC, stop the running app, PM2 process, or scheduled task.
4. Back up the client project folder, MongoDB database, and `server/uploads`.
5. Copy updated source files into the client project folder.
6. Do not replace these client files/folders:

```text
server/.env
server/uploads
```

7. Run `npm install` only if `package.json`, `package-lock.json`, `server/package.json`, or client package files changed.
8. Build the frontend:

```bash
npm run build
```

9. Restart the production app:

```bash
npm start
```

If the office uses PM2 or Windows Task Scheduler, restart through that same setup instead of leaving a manual terminal session running.

## Optional Git Update Flow

Use this flow only if the client main PC has the project connected to the correct Git repository.

1. Stop the running app, PM2 process, or scheduled task.
2. Back up the client project folder, MongoDB database, and `server/uploads`.
3. Confirm `server/.env` is not tracked or overwritten.
4. Pull the latest code:

```bash
git pull
```

5. Install dependencies if package files changed:

```bash
npm install
```

6. Build the frontend:

```bash
npm run build
```

7. Restart the app, PM2 process, or Task Scheduler startup.

## Restart Options

Manual production start:

```bash
npm start
```

PM2 restart example:

```bash
pm2 restart universal-systems
```

Windows Task Scheduler:

- Stop the current running app if it is already open.
- Run the configured task again, or restart Windows if the task is configured to start at login.
- Confirm the app opens on the client main PC.

## After Update Verification

Open these URLs from the client office network:

```text
http://SERVER-IP:5050/api/health
http://SERVER-IP:5050/
http://SERVER-IP:5050/app
```

Then verify:

- Staff login opens.
- Login API works.
- Existing customers, bookings, work orders, invoices, payments, AMC records, inventory, and uploaded files are still present.
- Refreshing `/app`, `/admin/*`, and `/tech/*` does not show 404.
- New code changes are visible only after the update and restart.

## Rollback

If the update has a problem:

1. Stop the app.
2. Restore the backed-up project folder.
3. Restore `server/uploads` if needed.
4. Restore MongoDB only if data was damaged or intentionally changed during the update.
5. Start the app again.

Do not restore an old database backup over newer live client data unless you are certain the newer data can be discarded.
