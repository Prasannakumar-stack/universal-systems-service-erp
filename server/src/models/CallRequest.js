import mongoose from 'mongoose';

const callRequestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, default: '' },
    serviceInterest: { type: String, trim: true, default: '' },
    message: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['New', 'Contacted', 'Converted', 'Closed'], default: 'New' },
    convertedBookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export default mongoose.model('CallRequest', callRequestSchema);
