import Supplier from '../models/Supplier.js';
import PurchaseImport from '../models/PurchaseImport.js';
import { appError, clean } from '../utils/http.js';
import { addDateRange, paginatedPayload, paginationMeta, parsePagination, searchRegex, withIds } from '../utils/pagination.js';

export function normalizedSupplierName(value = '') {
  return clean(value).toLowerCase().replace(/\s+/g, ' ');
}

export function normalizedPhone(value = '') {
  return clean(value).replace(/\D+/g, '');
}

export function normalizedCity(value = '') {
  return clean(value).toLowerCase().replace(/\s+/g, ' ');
}

function supplierPayload(payload = {}, userId = null) {
  const name = clean(payload.name || payload.supplierName || payload.shopName);
  if (!name) throw appError('Supplier / shop name is required');
  const phone = clean(payload.phone || payload.contactNumber);
  const city = clean(payload.city || payload.placeCity || payload.addressCity);
  return {
    name,
    normalizedName: normalizedSupplierName(name),
    phone,
    normalizedPhone: normalizedPhone(phone),
    email: clean(payload.email),
    address: clean(payload.address || payload.addressCity),
    city,
    normalizedCity: normalizedCity(city),
    gstNumber: clean(payload.gstNumber || payload.gst),
    notes: clean(payload.notes),
    status: ['Active', 'Inactive'].includes(clean(payload.status)) ? clean(payload.status) : 'Active',
    updatedBy: userId
  };
}

export async function upsertSupplierFromPurchase(payload = {}, userId = null) {
  const data = supplierPayload(payload, userId);
  const query = {
    normalizedName: data.normalizedName,
    normalizedPhone: data.normalizedPhone,
    normalizedCity: data.normalizedCity
  };
  const supplier = await Supplier.findOneAndUpdate(
    query,
    { $set: data, $setOnInsert: { createdBy: userId } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return supplier;
}

export async function listSuppliers(req, res) {
  const filter = {};
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const regex = searchRegex(req.query.search);
  if (regex) filter.$or = [{ name: regex }, { phone: regex }, { email: regex }, { address: regex }, { city: regex }, { gstNumber: regex }];
  if (clean(req.query.status)) filter.status = clean(req.query.status);
  addDateRange(filter, req.query);

  const [total, suppliers, purchaseRows] = await Promise.all([
    Supplier.countDocuments(filter),
    Supplier.find(filter).sort({ updatedAt: -1, name: 1 }).skip(skip).limit(limit).lean(),
    PurchaseImport.aggregate([
      {
        $group: {
          _id: '$supplierId',
          totalPurchases: { $sum: 1 },
          pendingPaymentAmount: {
            $sum: {
              $cond: [{ $in: ['$paymentStatus', ['Pending', 'Partial']] }, { $ifNull: ['$totalAmount', 0] }, 0]
            }
          },
          lastPurchaseDate: { $max: '$purchaseDate' },
          parts: { $addToSet: '$items.partName' }
        }
      }
    ])
  ]);
  const statsBySupplier = new Map(purchaseRows.map((row) => [String(row._id || ''), row]));
  const rows = withIds(suppliers).map((supplier) => {
    const stats = statsBySupplier.get(String(supplier._id || supplier.id)) || {};
    const parts = (stats.parts || []).flat().filter(Boolean);
    return {
      ...supplier,
      totalPurchases: stats.totalPurchases || 0,
      pendingPaymentAmount: stats.pendingPaymentAmount || 0,
      lastPurchaseDate: stats.lastPurchaseDate || null,
      partsSupplied: Array.from(new Set(parts)).slice(0, 4)
    };
  });

  res.json(paginatedPayload('suppliers', rows, paginationMeta(page, limit, total)));
}

export async function createSupplier(payload = {}, user) {
  const data = supplierPayload(payload, user?._id || null);
  const supplier = await Supplier.create({ ...data, createdBy: user?._id || null });
  return supplier;
}

export async function updateSupplier(id, payload = {}, user) {
  const supplier = await Supplier.findById(id);
  if (!supplier) throw appError('Supplier not found', 404);
  const data = supplierPayload({ ...supplier.toObject(), ...payload, name: payload.name ?? supplier.name }, user?._id || null);
  Object.assign(supplier, data);
  await supplier.save();
  return supplier;
}

export async function deleteSupplier(id) {
  const purchaseCount = await PurchaseImport.countDocuments({ supplierId: id });
  if (purchaseCount > 0) throw appError('Supplier has purchase history and cannot be deleted. Set status to Inactive instead.');
  const supplier = await Supplier.findByIdAndDelete(id);
  if (!supplier) throw appError('Supplier not found', 404);
  return supplier;
}
