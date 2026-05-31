import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema(
  {
    inventoryPartId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryPart', required: true },
    partName: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: 'General' },
    quantityOrdered: { type: Number, min: 0, default: 0 },
    quantityReceived: { type: Number, min: 0, default: 0 },
    unitCost: { type: Number, min: 0, default: 0 },
    totalCost: { type: Number, min: 0, default: 0 },
    stockAppliedQuantity: { type: Number, min: 0, default: 0 }
  },
  { timestamps: false }
);

const billFileSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true, default: '' },
    filename: { type: String, trim: true, default: '' },
    originalName: { type: String, trim: true, default: '' },
    mimetype: { type: String, trim: true, default: '' },
    size: { type: Number, min: 0, default: 0 },
    uploadedAt: { type: Date, default: null }
  },
  { _id: false }
);

const purchaseImportSchema = new mongoose.Schema(
  {
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
    supplierName: { type: String, required: true, trim: true },
    contactNumber: { type: String, trim: true, default: '' },
    placeCity: { type: String, trim: true, default: '' },
    purchaseSource: {
      type: String,
      enum: ['Local Shop', 'Supplier', 'Online', 'Dealer', 'Other'],
      default: 'Supplier'
    },
    invoiceRef: { type: String, required: true, trim: true },
    purchaseDate: { type: Date, default: Date.now },
    deliveryStatus: {
      type: String,
      enum: ['Ordered', 'Received', 'Partially Received', 'Returned', 'Cancelled'],
      default: 'Ordered'
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Pending', 'Partial'],
      default: 'Pending'
    },
    warrantyPeriod: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    billFile: { type: billFileSchema, default: () => ({}) },
    items: { type: [purchaseItemSchema], default: [] },
    totalAmount: { type: Number, min: 0, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

purchaseImportSchema.index({ invoiceRef: 1 });
purchaseImportSchema.index({ supplierId: 1, purchaseDate: -1 });
purchaseImportSchema.index({ deliveryStatus: 1, paymentStatus: 1, purchaseDate: -1 });
purchaseImportSchema.index({ 'items.inventoryPartId': 1, purchaseDate: 1 });

export default mongoose.model('PurchaseImport', purchaseImportSchema);
