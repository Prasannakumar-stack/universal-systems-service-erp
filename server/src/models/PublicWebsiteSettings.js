import mongoose from 'mongoose';

const publicWebsiteServiceSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    imageUrl: { type: String, trim: true, default: '' },
    visible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    categories: [{ type: String, trim: true }]
  },
  { _id: true }
);

const publicWebsiteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    status: {
      websiteEnabled: { type: Boolean, default: true },
      maintenanceMode: { type: Boolean, default: false },
      maintenanceMessage: { type: String, trim: true, default: '' }
    },
    hero: {
      title: { type: String, trim: true, default: '' },
      subtitle: { type: String, trim: true, default: '' },
      primaryButtonText: { type: String, trim: true, default: '' },
      secondaryButtonText: { type: String, trim: true, default: '' },
      imageUrl: { type: String, trim: true, default: '' },
      glassmorphismAnimation: { type: Boolean, default: true }
    },
    services: [publicWebsiteServiceSchema],
    contact: {
      phoneNumber: { type: String, trim: true, default: '' },
      whatsappNumber: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, default: '' },
      address: { type: String, trim: true, default: '' },
      businessHours: { type: String, trim: true, default: '' },
      googleMapsLink: { type: String, trim: true, default: '' }
    },
    booking: {
      publicBookingEnabled: { type: Boolean, default: true },
      bookingButtonText: { type: String, trim: true, default: 'Book a Service' },
      defaultBookingStatus: { type: String, enum: ['Pending', 'Converted'], default: 'Pending' },
      showServiceSelection: { type: Boolean, default: true },
      showPreferredDateTime: { type: Boolean, default: false }
    },
    branding: {
      logoUrl: { type: String, trim: true, default: '' },
      useCompanyLogo: { type: Boolean, default: true },
      navbarLogoWidth: { type: Number, min: 80, max: 320, default: 180 },
      footerLogoWidth: { type: Number, min: 120, max: 480, default: 280 },
      accentColor: { type: String, trim: true, default: '#75c4ff' }
    },
    seo: {
      websiteTitle: { type: String, trim: true, default: '' },
      metaDescription: { type: String, trim: true, default: '' },
      keywords: { type: String, trim: true, default: '' },
      socialSharingImage: { type: String, trim: true, default: '' }
    },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export default mongoose.model('PublicWebsiteSettings', publicWebsiteSettingsSchema);
