import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    customerType: { type: String, trim: true, default: '' },
    devices: [{ type: String, trim: true }],
    notes: [
      {
        text: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

customerSchema.index({ phone: 1 }, { unique: true });

export default mongoose.model('Customer', customerSchema);
