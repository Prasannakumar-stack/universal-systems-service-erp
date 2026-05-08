import mongoose from 'mongoose';

const visitSchema = new mongoose.Schema(
  {
    serviceType: { type: String, trim: true, default: '' },
    scheduledDate: { type: Date, required: true },
    technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['Upcoming', 'Completed'], default: 'Upcoming' },
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder', default: null },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

const amcContractSchema = new mongoose.Schema(
  {
    contractId: { type: String, required: true, unique: true, trim: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, trim: true, default: '' },
    contractType: {
      type: String,
      enum: ['Basic AMC', 'Comprehensive AMC', 'CCTV AMC', 'Printer AMC', 'Networking AMC', 'Solar / UPS AMC', 'Custom'],
      required: true
    },
    coveredService: { type: String, trim: true, default: '' },
    coveredDevices: { type: String, trim: true, default: '' },
    serviceFrequency: { type: String, enum: ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    contractValue: { type: Number, min: 0, default: 0 },
    includedVisits: { type: Number, min: 0, default: 0 },
    notes: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['Active', 'Cancelled'], default: 'Active' },
    visits: [visitSchema]
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export default mongoose.model('AMCContract', amcContractSchema);
