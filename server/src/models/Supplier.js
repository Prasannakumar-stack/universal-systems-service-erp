import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, trim: true, index: true },
    phone: { type: String, trim: true, default: '' },
    normalizedPhone: { type: String, trim: true, default: '', index: true },
    email: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    normalizedCity: { type: String, trim: true, default: '', index: true },
    gstNumber: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

supplierSchema.index({ normalizedName: 1, normalizedPhone: 1, normalizedCity: 1 });

export default mongoose.model('Supplier', supplierSchema);
