import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: { type: String, required: true, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    serviceType: { type: String, trim: true, default: '' },
    bookingSource: { type: String, trim: true, default: '' },
    problemImage: {
      filename: { type: String, trim: true, default: '' },
      originalName: { type: String, trim: true, default: '' },
      url: { type: String, trim: true, default: '' },
      mimetype: { type: String, trim: true, default: '' },
      size: { type: Number, min: 0, default: 0 }
    },
    device: { type: String, required: true, trim: true },
    issue: { type: String, required: true, trim: true },
    preferredDate: { type: Date, default: null },
    preferredTime: { type: String, trim: true, default: '' },
    technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['Pending', 'Converted'], default: 'Pending' },
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder', default: null }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export default mongoose.model('Booking', bookingSchema);
