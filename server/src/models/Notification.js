import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: { type: String, enum: ['BOOKING', 'LOW_STOCK', 'PAYMENT', 'WORK_ORDER'], required: true },
    role: { type: String, enum: ['admin', 'technician', 'all'], default: 'admin' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    read: { type: Boolean, default: false },
    sourceId: { type: mongoose.Schema.Types.ObjectId, default: null }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export default mongoose.model('Notification', notificationSchema);
