import mongoose from 'mongoose';

const numberingItemSchema = new mongoose.Schema(
  {
    prefix: { type: String, trim: true, uppercase: true, default: '' },
    nextNumber: { type: Number, min: 1, default: 1 }
  },
  { _id: false }
);

const statusItemSchema = new mongoose.Schema(
  {
    key: { type: String, trim: true, default: '' },
    label: { type: String, trim: true, default: '' },
    color: { type: String, trim: true, default: '#75c4ff' },
    order: { type: Number, default: 0 },
    description: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true },
    protected: { type: Boolean, default: false }
  },
  { _id: false }
);

const businessSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    documentNumbering: {
      invoice: { type: numberingItemSchema, default: () => ({ prefix: 'INV', nextNumber: 1 }) },
      workOrder: { type: numberingItemSchema, default: () => ({ prefix: 'WO', nextNumber: 1 }) },
      quotation: { type: numberingItemSchema, default: () => ({ prefix: 'QUO', nextNumber: 1 }) },
      amc: { type: numberingItemSchema, default: () => ({ prefix: 'AMC', nextNumber: 1 }) },
      paymentReceipt: { type: numberingItemSchema, default: () => ({ prefix: 'RCPT', nextNumber: 1 }) },
      yearlyReset: { type: Boolean, default: false }
    },
    taxGst: {
      enabled: { type: Boolean, default: false },
      gstEnabledManual: { type: Boolean, default: false },
      defaultPercentage: { type: Number, min: 0, max: 100, default: 18 },
      splitCgstSgst: { type: Boolean, default: true },
      taxLabel: { type: String, trim: true, default: 'GST' },
      showGstOnInvoices: { type: Boolean, default: true }
    },
    payment: {
      acceptedMethods: [{ type: String, trim: true }],
      upiId: { type: String, trim: true, default: '' },
      bankDetails: { type: String, trim: true, default: '' },
      defaultPaymentStatus: { type: String, enum: ['Pending', 'Partial', 'Paid'], default: 'Pending' },
      paymentTermsText: { type: String, trim: true, default: 'Payment due on receipt.' }
    },
    notificationTemplates: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    statusWorkflows: {
      booking: { type: [statusItemSchema], default: undefined },
      workOrder: { type: [statusItemSchema], default: undefined },
      invoice: { type: [statusItemSchema], default: undefined },
      amc: { type: [statusItemSchema], default: undefined }
    },
    pdfTerms: {
      invoiceTerms: { type: String, trim: true, default: '' },
      quotationTerms: { type: String, trim: true, default: '' },
      serviceReportNotes: { type: String, trim: true, default: '' },
      amcTerms: { type: String, trim: true, default: '' },
      warrantyNote: { type: String, trim: true, default: '' },
      footerNote: { type: String, trim: true, default: '' }
    },
    preferences: {
      defaultNotifications: { type: Boolean, default: true },
      dashboardFocus: { type: Boolean, default: true },
      pdfDocuments: { type: Boolean, default: true }
    },
    securitySettings: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export default mongoose.model('BusinessSettings', businessSettingsSchema);
