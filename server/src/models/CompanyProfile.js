import mongoose from 'mongoose';

const companyProfileSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    name: { type: String, trim: true, default: '' },
    businessType: { type: String, trim: true, default: '' },
    industry: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    whatsapp: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    googleMapsLink: { type: String, trim: true, default: '' },
    gstNumber: { type: String, trim: true, uppercase: true, default: '' },
    panNumber: { type: String, trim: true, uppercase: true, default: '' },
    logoUrl: { type: String, trim: true, default: '' },
    useCompanyLogoOnPublicWebsite: { type: Boolean, default: true },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export default mongoose.model('CompanyProfile', companyProfileSchema);
