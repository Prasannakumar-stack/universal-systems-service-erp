import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { PDF_DIR, LOGO_FULL_PATH, COMPANY } from './config.js';
import { all, get, insert } from './db.js';

const fontPath = 'C:\\Windows\\Fonts\\arial.ttf';
const boldFontPath = 'C:\\Windows\\Fonts\\arialbd.ttf';

function money(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function wordsBelowThousand(number) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const n = Math.floor(number);
  if (n < 20) return ones[n];
  if (n < 100) return `${tens[Math.floor(n / 10)]} ${ones[n % 10]}`.trim();
  return `${ones[Math.floor(n / 100)]} Hundred ${wordsBelowThousand(n % 100)}`.trim();
}

function amountInWords(value) {
  let n = Math.round(Number(value || 0));
  if (n === 0) return 'Zero Rupees Only';
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const chunks = [];
  if (crore) chunks.push(`${wordsBelowThousand(crore)} Crore`);
  if (lakh) chunks.push(`${wordsBelowThousand(lakh)} Lakh`);
  if (thousand) chunks.push(`${wordsBelowThousand(thousand)} Thousand`);
  if (n) chunks.push(wordsBelowThousand(n));
  return `${chunks.join(' ')} Rupees Only`;
}

function registerFonts(doc) {
  if (fs.existsSync(fontPath)) doc.registerFont('Body', fontPath);
  if (fs.existsSync(boldFontPath)) doc.registerFont('BodyBold', boldFontPath);
  doc.font(fs.existsSync(fontPath) ? 'Body' : 'Helvetica');
}

function addHeader(doc, title) {
  registerFonts(doc);
  doc.fillColor('#0f2a52');
  if (fs.existsSync(LOGO_FULL_PATH)) doc.image(LOGO_FULL_PATH, 40, 30, { width: 155 });
  doc.font(fs.existsSync(boldFontPath) ? 'BodyBold' : 'Helvetica-Bold').fontSize(17).text(COMPANY.name, 215, 34);
  doc.font(fs.existsSync(fontPath) ? 'Body' : 'Helvetica').fontSize(9).fillColor('#32445c');
  doc.text(COMPANY.tagline, 215, 57);
  doc.text(COMPANY.address.replace(/\n/g, ', '), 215, 75, { width: 330 });
  doc.text(`Phone: ${COMPANY.phones.join(' / ')} | Landline: ${COMPANY.landline}`, 215, 104);
  doc.text(`Email: ${COMPANY.email}`, 215, 119);

  doc.roundedRect(40, 150, 515, 34, 4).fill('#0f2a52');
  doc.fillColor('#ffffff').font(fs.existsSync(boldFontPath) ? 'BodyBold' : 'Helvetica-Bold').fontSize(15).text(title, 52, 160);
  doc.moveDown();
}

function addWatermark(doc) {
  doc.save();
  doc.rotate(-28, { origin: [300, 440] });
  doc.opacity(0.055).fillColor('#0f2a52').fontSize(56).font(fs.existsSync(boldFontPath) ? 'BodyBold' : 'Helvetica-Bold').text('Universal Systems', 82, 425, {
    align: 'center',
    width: 520
  });
  doc.restore();
  doc.opacity(1);
}

function line(doc, y) {
  doc.strokeColor('#cbd5e1').lineWidth(0.7).moveTo(40, y).lineTo(555, y).stroke();
}

function infoBlock(doc, booking, y) {
  const left = 52;
  const right = 320;
  const date = new Date().toLocaleDateString('en-IN');
  doc.font(fs.existsSync(boldFontPath) ? 'BodyBold' : 'Helvetica-Bold').fontSize(10).fillColor('#0f172a');
  doc.text('Customer Details', left, y);
  doc.text('Document Details', right, y);
  doc.font(fs.existsSync(fontPath) ? 'Body' : 'Helvetica').fontSize(9).fillColor('#334155');
  doc.text(`Customer ID: ${booking.booking_code}`, left, y + 18);
  doc.text(`Name: ${booking.customer_name}`, left, y + 34);
  doc.text(`Phone: ${booking.phone}`, left, y + 50);
  doc.text(`Address: ${booking.address}`, left, y + 66, { width: 220 });
  doc.text(`Date: ${date}`, right, y + 18);
  doc.text(`Service Type: ${booking.service_type}`, right, y + 34);
  doc.text(`Status: ${booking.status}`, right, y + 50);
  doc.text(`Customer issue image uploaded: ${booking.image_filename ? 'Yes' : 'No'}`, right, y + 66);
}

function table(doc, rows, startY, includeSubtotal = true) {
  const columns = [
    { label: 'Description', x: 52, width: 255 },
    { label: 'Qty', x: 316, width: 50 },
    { label: 'Price', x: 372, width: 80 },
    { label: 'Total', x: 462, width: 82 }
  ];
  let y = startY;
  doc.roundedRect(48, y, 500, 24, 2).fill('#eaf1fb');
  doc.fillColor('#0f2a52').font(fs.existsSync(boldFontPath) ? 'BodyBold' : 'Helvetica-Bold').fontSize(9);
  columns.forEach((col) => doc.text(col.label, col.x, y + 8, { width: col.width }));
  y += 24;
  doc.font(fs.existsSync(fontPath) ? 'Body' : 'Helvetica').fillColor('#1e293b');

  rows.forEach((row) => {
    const rowHeight = Math.max(28, doc.heightOfString(row.description, { width: 245 }) + 14);
    doc.rect(48, y, 500, rowHeight).strokeColor('#d7dee8').stroke();
    doc.text(row.description, 52, y + 9, { width: 250 });
    doc.text(String(row.quantity), 316, y + 9, { width: 50 });
    doc.text(money(row.price), 372, y + 9, { width: 80 });
    doc.text(money(row.total), 462, y + 9, { width: 82 });
    y += rowHeight;
  });

  if (includeSubtotal) line(doc, y + 8);
  return y + 18;
}

function footer(doc) {
  const y = 770;
  line(doc, y - 8);
  doc.fontSize(8).fillColor('#64748b').text(`${COMPANY.name} | ${COMPANY.phones.join(' / ')} | ${COMPANY.email}`, 40, y, {
    width: 515,
    align: 'center'
  });
}

function rowsFromBooking(booking, parts) {
  const rows = [];
  if (Number(booking.service_charge || 0) > 0) {
    rows.push({
      description: `${booking.service_type} - Service Charge`,
      quantity: 1,
      price: Number(booking.service_charge || 0),
      total: Number(booking.service_charge || 0)
    });
  }
  parts.forEach((part) => {
    rows.push({
      description: part.part_name,
      quantity: part.quantity,
      price: part.unit_price,
      total: part.total
    });
  });
  if (!rows.length) {
    rows.push({
      description: `${booking.service_type} - ${booking.problem_description}`,
      quantity: 1,
      price: 0,
      total: 0
    });
  }
  return rows;
}

function buildQuotation(doc, booking, parts) {
  addHeader(doc, 'QUOTATION / SERVICE ESTIMATE');
  addWatermark(doc);
  infoBlock(doc, booking, 205);
  const rows = rowsFromBooking(booking, parts);
  let y = table(doc, rows, 330);
  const subtotal = rows.reduce((sum, row) => sum + Number(row.total || 0), 0);
  doc.font(fs.existsSync(boldFontPath) ? 'BodyBold' : 'Helvetica-Bold').fontSize(10).fillColor('#0f172a');
  doc.text(`Final Total: ${money(subtotal)}`, 380, y, { width: 165, align: 'right' });
  y += 50;
  doc.fontSize(10).text('Terms & Conditions', 52, y);
  doc.font(fs.existsSync(fontPath) ? 'Body' : 'Helvetica').fontSize(9).fillColor('#334155').text(
    'This is an estimate and not an invoice. Final cost may vary after detailed inspection. Customer approval is required before additional parts or major work.',
    52,
    y + 18,
    { width: 492 }
  );
  footer(doc);
}

function buildInvoice(doc, booking, parts, handledBy) {
  addHeader(doc, 'INVOICE / WORK COMPLETION');
  addWatermark(doc);
  infoBlock(doc, booking, 205);
  const rows = rowsFromBooking(booking, parts);
  let y = table(doc, rows, 330);
  const subtotal = rows.reduce((sum, row) => sum + Number(row.total || 0), 0);
  doc.font(fs.existsSync(fontPath) ? 'Body' : 'Helvetica').fontSize(9).fillColor('#334155');
  doc.text(`Subtotal: ${money(subtotal)}`, 376, y, { width: 168, align: 'right' });
  doc.text(`Discount: ${money(booking.discount)}`, 376, y + 16, { width: 168, align: 'right' });
  doc.font(fs.existsSync(boldFontPath) ? 'BodyBold' : 'Helvetica-Bold').fillColor('#0f172a');
  doc.text(`Total Amount: ${money(booking.total_cost || subtotal)}`, 356, y + 36, { width: 188, align: 'right' });
  doc.font(fs.existsSync(fontPath) ? 'Body' : 'Helvetica').fillColor('#334155');
  doc.text(`Amount in words: ${amountInWords(booking.total_cost || subtotal)}`, 52, y + 66, { width: 492 });
  doc.text(`Payment Status: ${booking.payment_status || 'Unpaid'}`, 52, y + 86);
  doc.text(`Handled By: ${handledBy}`, 52, y + 104);
  doc.text('Work completion notice: The above service/work has been completed as per the customer request.', 52, y + 130, { width: 492 });
  footer(doc);
}

function buildThanks(doc, booking, handledBy) {
  addHeader(doc, 'SERVICE COMPLETED');
  addWatermark(doc);
  doc.font(fs.existsSync(boldFontPath) ? 'BodyBold' : 'Helvetica-Bold').fontSize(28).fillColor('#0f2a52').text('SERVICE COMPLETED!', 52, 230, {
    align: 'center',
    width: 492
  });
  doc.font(fs.existsSync(fontPath) ? 'Body' : 'Helvetica').fontSize(12).fillColor('#334155').text(`Dear ${booking.customer_name},`, 70, 305);
  doc.text(
    `Thank you for choosing Universal Systems. Your ${booking.service_type} service has been completed. We appreciate your trust and hope the service experience met your expectations.`,
    70,
    335,
    { width: 455, lineGap: 5 }
  );
  doc.text(`Customer ID: ${booking.booking_code}`, 70, 425);
  doc.text(`Customer issue image uploaded: ${booking.image_filename ? 'Yes' : 'No'}`, 70, 445);
  doc.text('For future support, service booking, printer service, OS installation, or repair needs, please contact us anytime.', 70, 485, {
    width: 455,
    lineGap: 5
  });
  doc.font(fs.existsSync(boldFontPath) ? 'BodyBold' : 'Helvetica-Bold').fillColor('#0f172a').text(`Contact: ${COMPANY.phones.join(' / ')}`, 70, 540);
  doc.font(fs.existsSync(fontPath) ? 'Body' : 'Helvetica').fillColor('#334155').text(`Handled By: ${handledBy}`, 70, 570);
  doc.text('Warm regards,', 70, 625);
  doc.font(fs.existsSync(boldFontPath) ? 'BodyBold' : 'Helvetica-Bold').text('Universal Systems', 70, 648);
  footer(doc);
}

export async function generatePdf({ bookingId, type, user }) {
  const booking = get(
    `SELECT b.*, u.name AS technician_name, h.name AS handled_by_name
     FROM bookings b
     LEFT JOIN users u ON u.id = b.assigned_to
     LEFT JOIN users h ON h.id = b.handled_by_user_id
     WHERE b.id = ?`,
    [bookingId]
  );
  if (!booking) throw new Error('Booking not found');

  const parts = all('SELECT * FROM booking_parts WHERE booking_id = ? ORDER BY id ASC', [bookingId]);
  const safeType = type === 'thank-you' ? 'thank-you' : type;
  const filename = `${booking.booking_code}-${safeType}-${Date.now()}.pdf`;
  const filePath = path.join(PDF_DIR, filename);
  const handledBy = user?.name || booking.handled_by_name || booking.technician_name || 'Universal Systems';

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: false });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    if (safeType === 'quotation') buildQuotation(doc, booking, parts);
    if (safeType === 'invoice') buildInvoice(doc, booking, parts, handledBy);
    if (safeType === 'thank-you') buildThanks(doc, booking, handledBy);
    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  const id = insert(
    'INSERT INTO pdf_documents (booking_id, type, filename, file_path, generated_by) VALUES (?, ?, ?, ?, ?)',
    [bookingId, safeType, filename, filePath, user.id]
  );
  return get('SELECT * FROM pdf_documents WHERE id = ?', [id]);
}
