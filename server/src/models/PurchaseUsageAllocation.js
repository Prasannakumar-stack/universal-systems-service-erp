import mongoose from 'mongoose';

const purchaseUsageAllocationSchema = new mongoose.Schema(
  {
    purchaseImportId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseImport', required: true, index: true },
    purchaseItemId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    inventoryPartId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryPart', required: true, index: true },
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder', required: true, index: true },
    workOrderPartId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    quantity: { type: Number, min: 0, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

purchaseUsageAllocationSchema.index({ workOrderId: 1, workOrderPartId: 1, inventoryPartId: 1 });

export default mongoose.model('PurchaseUsageAllocation', purchaseUsageAllocationSchema);
