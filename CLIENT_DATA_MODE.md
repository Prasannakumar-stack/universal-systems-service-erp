# Client Data Modes

Use separate MongoDB databases for demo/training and real client work.

## Database Names

- Demo database: `universal_systems_demo`
- Live database: `universal_systems_live`

Demo data is only for testing, sales walkthroughs, staff practice, and training. Live data is for real client use.

## Switch Database Mode

Edit `server\.env` and set `MONGO_URI` to the database you want.

Auto-start uses only the active, uncommented `MONGO_URI` line in `server\.env`. A line starting with `#` is disabled/commented and is ignored.

Demo/training:

```env
# MONGO_URI=mongodb://127.0.0.1:27017/universal_systems_live
MONGO_URI=mongodb://127.0.0.1:27017/universal_systems_demo
```

Live client use:

```env
MONGO_URI=mongodb://127.0.0.1:27017/universal_systems_live
# MONGO_URI=mongodb://127.0.0.1:27017/universal_systems_demo
```

Restart the app after changing `MONGO_URI`.

For real client use, keep `universal_systems_live` active. For demo or training, keep `universal_systems_demo` active. Never keep both live and demo `MONGO_URI` lines active.

`start-app.bat` does not seed, clean, delete, or switch data. It only reads `server\.env`, shows the active database, and starts the production app.

## Seed Demo Data

Use this only in the demo database:

```powershell
npm run seed:demo
```

This creates realistic sample customers, bookings, work orders, invoices, payments, AMC contracts, products/parts, suppliers, technicians, notifications, and a few audit logs for training.

Demo login examples:

- Admin: `admin` / `admin123` in local non-production setup
- Technician: `demo.tech1` / `demo12345`
- Technician: `demo.tech2` / `demo12345`

For production-like demo setup, set `SEED_ADMIN_PASSWORD` before running the seed.

## Seed Live Defaults

Use this for a clean live database:

```powershell
npm run seed:live
```

Live seed creates only required default data:

- One admin user
- Role permission defaults
- Company/default settings
- Status workflows through default settings
- PDF/document templates
- Notification templates through default settings

Live seed does not create fake customers, bookings, work orders, invoices, payments, AMC records, inventory/products, suppliers, sample photos, sample documents, old notifications, or old audit logs.

For real production handoff, set a strong admin password first:

```powershell
$env:SEED_ADMIN_PASSWORD="replace-with-a-long-client-password"
npm run seed:live
```

## Clean Client Business Data

Back up the database before cleaning.

```powershell
npm run db:clean-client
```

The command shows the records selected for deletion and requires this exact confirmation:

```text
CLEAN CLIENT DATA
```

It deletes operational/business data only, such as customers, bookings, work orders, invoices, payments, AMC contracts, inventory/products, suppliers, purchases, notifications, and audit logs.

It does not delete admin users, staff users, roles, permissions, company profile, settings, PDF templates, notification templates, or backup settings.

To preview counts without deleting:

```powershell
npm run db:clean-client -- --dry-run
```

## Backup Reminder

Always take a backup before:

- Switching `MONGO_URI`
- Running demo seed on a shared database
- Running `npm run db:clean-client`
- Handing over the live database to the client

Never run demo seed against `universal_systems_live`.
