import 'dotenv/config';
import Customer from '../models/Customer.js';
import Booking from '../models/Booking.js';
import WorkOrder from '../models/WorkOrder.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import AMCContract from '../models/AMCContract.js';
import InventoryPart from '../models/InventoryPart.js';
import Supplier from '../models/Supplier.js';
import PurchaseImport from '../models/PurchaseImport.js';
import { connectSeedDb, disconnectSeedDb, ensureLiveDefaults, logResult } from './seedUtils.js';

async function businessCounts() {
  const rows = await Promise.all([
    ['customers', Customer.countDocuments()],
    ['bookings', Booking.countDocuments()],
    ['workOrders', WorkOrder.countDocuments()],
    ['invoices', Invoice.countDocuments()],
    ['payments', Payment.countDocuments()],
    ['amcContracts', AMCContract.countDocuments()],
    ['inventoryParts', InventoryPart.countDocuments()],
    ['suppliers', Supplier.countDocuments()],
    ['purchaseImports', PurchaseImport.countDocuments()]
  ].map(async ([label, promise]) => [label, await promise]));
  return Object.fromEntries(rows);
}

try {
  await connectSeedDb();
  const defaults = await ensureLiveDefaults();

  logResult('admin user', defaults.admin);
  console.log(`exists  role permission defaults (${defaults.roles.length} roles)`);
  console.log('exists  business settings');
  console.log('exists  public website settings');
  console.log('exists  company profile');
  console.log('exists  security settings');
  console.log(`exists  PDF/document templates (${defaults.pdfTemplates.length} templates)`);

  const counts = await businessCounts();
  const populatedBusiness = Object.entries(counts).filter(([, count]) => count > 0);
  if (populatedBusiness.length) {
    console.warn('Live seed did not create sample business data, but this database already contains operational records:');
    populatedBusiness.forEach(([label, count]) => console.warn(`- ${label}: ${count}`));
    console.warn('Use npm run db:clean-client before live handoff if these records are not real client data.');
  } else {
    console.log('verified live database has no customers, bookings, work orders, invoices, payments, AMC contracts, inventory parts, suppliers, or purchase imports.');
  }

  console.log('Live seed complete.');
  await disconnectSeedDb();
} catch (error) {
  console.error('Live seed failed:', error.message);
  await disconnectSeedDb();
  process.exit(1);
}
