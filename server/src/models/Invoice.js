import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder', default: null },
    amcContractId: { type: mongoose.Schema.Types.ObjectId, ref: 'AMCContract', default: null },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    title: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
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
    status: { type: String, enum: ['Paid', 'Partial', 'Pending', 'Void'], default: 'Pending' },
    adjustmentForInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export default mongoose.model('Invoice', invoiceSchema);
