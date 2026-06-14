import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    amount: { type: Number, min: 0, required: true },
    paidAmount: { type: Number, min: 0, required: true },
    balance: { type: Number, min: 0, required: true },
    status: { type: String, enum: ['Paid', 'Partial', 'Pending', 'Reversed'], required: true },
    method: { type: String, enum: ['Cash', 'UPI'], required: true },
    transactionId: { type: String, trim: true, default: '' },
    reversalReason: { type: String, trim: true, default: '' },
    reversedAt: { type: Date, default: null },
    reversedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export default mongoose.model('Payment', paymentSchema);
