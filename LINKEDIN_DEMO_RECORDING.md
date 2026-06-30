# LinkedIn Demo Recording Checklist

## Page Order

1. Public Home: `/`
2. Book Service: `/book-service`
3. Admin Dashboard: `/app/admin/dashboard`
4. Work Orders: `/app/admin/work-orders`
5. Work Order Detail / PDF Preview: `/app/admin/work-orders/:id`
6. Inventory / Parts: `/app/admin/parts`
7. Technician Dashboard: `/app/tech/dashboard`
8. Technician Work Order: `/app/tech/work-orders/:id`
9. Invoice / PDF Preview: `/app/admin/invoices` or work order Documents/PDF section

## What To Show

- Public Home: hero, service cards, four-step flow, clean footer contact area.
- Book Service: three-step form, service selector, review summary. Use demo-only inputs like `Demo Customer`, `0000000000`, and `Demo Area`.
- Admin Dashboard: KPIs, recent bookings, repair queue, pending invoice snapshot.
- Work Orders: filters, status chips, work order list, customer/service/device columns.
- Work Order Detail: timeline, technician assignment, parts used/requested, PDF preview button.
- Inventory / Parts: part stock levels, low stock indicators, categories, reserved/available quantities.
- Technician Dashboard / Work Order: assigned jobs, current status, parts request, completion notes.
- Invoice / PDF Preview: invoice list, paid/partial/pending status, PDF preview with demo customer data.

## Private Details To Avoid

- Do not show real phone numbers, real email inboxes, real customer names, real addresses, passwords, MongoDB URLs, IP addresses, or `.env` files.
- Keep login passwords off camera; type them before recording or crop the login step.
- Do not open Settings, Backup/System Info, browser devtools, terminal, database tools, or server logs.
- Use only demo records whose names begin with `Demo` or seeded IDs like `US-WO-*`, `US-INV-*`, and `US-BK-*`.

## 45-60 Second Timing Plan

- 0-6s: Public Home hero and service cards.
- 6-14s: Book Service form, jump to review step with safe demo values.
- 14-23s: Admin Dashboard KPIs and recent activity.
- 23-33s: Work Orders list, open one `US-WO-*` detail.
- 33-42s: Work Order detail, parts/timeline, PDF preview button.
- 42-50s: Inventory / Parts stock view.
- 50-56s: Technician dashboard and assigned work order.
- 56-60s: Invoice/PDF preview close-up, end on clean status/invoice screen.
