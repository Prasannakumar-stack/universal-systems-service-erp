import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema(
  {
    partId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryPart', required: true },
    type: { type: String, enum: ['ADD', 'USED', 'RETURN', 'ADJUST'], required: true },
    quantity: { type: Number, required: true },
    balanceAfter: { type: Number, default: 0 },
    source: { type: String, trim: true, default: 'Manual' },
    note: { type: String, trim: true, default: '' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export default mongoose.model('StockMovement', stockMovementSchema);
