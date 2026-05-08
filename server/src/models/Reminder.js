import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: { type: String, enum: ['payment', 'work_order', 'quotation', 'stock'], required: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    relatedId: { type: mongoose.Schema.Types.ObjectId, default: null },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

reminderSchema.index({ type: 1, relatedId: 1, title: 1 }, { unique: true, sparse: true });

export default mongoose.model('Reminder', reminderSchema);
