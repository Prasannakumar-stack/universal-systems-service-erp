import 'dotenv/config';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import AMCContract from '../models/AMCContract.js';
import AuditLog from '../models/AuditLog.js';
import Booking from '../models/Booking.js';
import CallRequest from '../models/CallRequest.js';
import Communication from '../models/Communication.js';
import Customer from '../models/Customer.js';
import Document from '../models/Document.js';
import InventoryPart from '../models/InventoryPart.js';
import Invoice from '../models/Invoice.js';
import Notification from '../models/Notification.js';
import Payment from '../models/Payment.js';
import PurchaseImport from '../models/PurchaseImport.js';
import Reminder from '../models/Reminder.js';
import StockMovement from '../models/StockMovement.js';
import Supplier from '../models/Supplier.js';
import WorkOrder from '../models/WorkOrder.js';
import { connectSeedDb, disconnectSeedDb } from './seedUtils.js';

const CONFIRMATION = 'CLEAN CLIENT DATA';

const businessCollections = [
  ['payments', Payment],
  ['invoices', Invoice],
  ['documents', Document],
  ['work orders', WorkOrder],
  ['bookings', Booking],
  ['call requests', CallRequest],
  ['AMC contracts', AMCContract],
  ['stock movements', StockMovement],
  ['purchase/import records', PurchaseImport],
  ['inventory parts/products', InventoryPart],
  ['suppliers', Supplier],
  ['communications', Communication],
  ['reminders', Reminder],
  ['notifications', Notification],
  ['audit logs', AuditLog],
  ['customers', Customer]
];

async function confirmClean() {
  if (process.argv.includes('--dry-run')) return false;
  const rl = readline.createInterface({ input, output });
  try {
    console.log('This will delete operational client data only.');
    console.log('It will NOT delete users, roles, settings, company profile, PDF templates, or backup settings.');
    console.log(`Type exactly "${CONFIRMATION}" to continue.`);
    const answer = await rl.question('Confirmation: ');
    return answer === CONFIRMATION;
  } finally {
    rl.close();
  }
}

try {
  await connectSeedDb();

  const counts = [];
  for (const [label, Model] of businessCollections) {
    counts.push([label, await Model.countDocuments()]);
  }

  console.log('Business data selected for cleaning:');
  counts.forEach(([label, count]) => console.log(`- ${label}: ${count}`));

  if (process.argv.includes('--dry-run')) {
    console.log('Dry run only. No data deleted.');
    await disconnectSeedDb();
    process.exit(0);
  }

  if (!(await confirmClean())) {
    console.log('Confirmation did not match. No data deleted.');
    await disconnectSeedDb();
    process.exit(0);
  }

  for (const [label, Model] of businessCollections) {
    const result = await Model.deleteMany({});
    console.log(`deleted ${label}: ${result.deletedCount}`);
  }

  console.log('Client business data clean complete. Admin users, roles, settings, and templates were preserved.');
  await disconnectSeedDb();
} catch (error) {
  console.error('Client data clean failed:', error.message);
  await disconnectSeedDb();
  process.exit(1);
}
