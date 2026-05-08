import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    items: [
      {
        description: { type: String, required: true, trim: true },
        quantity: { type: Number, min: 1, default: 1 },
        rate: { type: Number, min: 0, default: 0 },
        amount: { type: Number, min: 0, default: 0 }
      }
    ],
    total: { type: Number, min: 0, required: true },
    paidAmount: { type: Number, min: 0, default: 0 },
    balance: { type: Number, min: 0, required: true },
    status: { type: String, enum: ['Paid', 'Partial', 'Pending'], default: 'Pending' }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export default mongoose.model('Invoice', invoiceSchema);
