import mongoose from 'mongoose';

const inventoryPartSchema = new mongoose.Schema(
  {
    partName: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: 'General' },
    costPrice: { type: Number, min: 0, default: 0 },
    sellingPrice: { type: Number, min: 0, default: 0 },
    stock: { type: Number, min: 0, default: 0 },
    onHand: { type: Number, min: 0, default: 0 },
    reserved: { type: Number, min: 0, default: 0 },
    available: { type: Number, min: 0, default: 0 },
    lowStockLimit: { type: Number, min: 0, default: 0 }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

inventoryPartSchema.pre('validate', function syncStockFields(next) {
  if ((this.onHand === undefined || this.onHand === null) && this.stock) this.onHand = this.stock;
  this.reserved = Math.max(0, Number(this.reserved || 0));
  this.onHand = Math.max(0, Number(this.onHand || 0));
  this.available = Math.max(0, this.onHand - this.reserved);
  this.stock = this.onHand;
  next();
});

export default mongoose.model('InventoryPart', inventoryPartSchema);
