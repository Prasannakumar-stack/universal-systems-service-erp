import mongoose from 'mongoose';

const pdfTemplateVersionSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
    editedAt: { type: Date, default: Date.now },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, trim: true, default: 'updated' },
    displayName: { type: String, trim: true, maxlength: 120, default: '' }
  },
  { _id: true }
);

const pdfTemplateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    category: { type: String, enum: ['service', 'amc'], required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['Active'], default: 'Active' },
    version: { type: Number, min: 1, default: 1 },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    versions: [pdfTemplateVersionSchema]
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export default mongoose.model('PdfTemplate', pdfTemplateSchema);
