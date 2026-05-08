# Universal Systems - Service & Repair Management App

Universal Systems local-first service booking and repair management web application.

## Run Locally

Install dependencies:

```bash
npm install
npm run install:all
```

Run both frontend and backend:

```bash
npm run dev
```

Or run separately:

```bash
npm run dev --prefix server
npm run dev --prefix client
```

Default URLs:

- Customer website: `http://localhost:5173`
- Admin login: `http://localhost:5173/admin/login`
- Admin dashboard: `http://localhost:5173/admin/dashboard`
- Technician login: `http://localhost:5173/technician/login`
- Backend API: `http://localhost:5050/api`

Submission build:

```bash
npm run build
npm start
```

After build, the Express server serves the customer site and preserved admin panel from `http://localhost:5050`.

## Default Login

- Admin: `admin` / `admin123`
- Technician 1: `emp1` / `emp123`
- Technician 2: `emp2` / `emp123`

## Access Rules

- Admin can view and manage all bookings, call requests, employees, inventory parts, PDFs, reports, settings, backup, and restore.
- Technicians can only view bookings assigned to their own employee account.
- Technician image and PDF access is protected by assignment.
- Bills, progress updates, and generated PDFs store the logged-in employee and print `Handled By` on invoice and thank-you PDFs.

## PDF Generation

Open a booking detail page from Admin or Technician panel, save bill details if needed, then use:

- Generate Quotation PDF
- Generate Invoice / Work Completion PDF
- Generate Service Completed / Thank You PDF

PDF files are stored in `server/storage/pdfs`.

## Stored Data

- SQLite database: `server/storage/app.sqlite`
- Uploaded customer problem images: `server/storage/uploads`
- Generated PDFs: `server/storage/pdfs`
- Backup exports are downloaded as JSON from Admin Settings.

## Notes

The booking image upload accepts JPG, JPEG, PNG, and WEBP files up to 5 MB. Uploaded images are stored for booking reference and are not printed large in PDFs; PDFs include a Yes/No note for whether a customer issue image was uploaded.
