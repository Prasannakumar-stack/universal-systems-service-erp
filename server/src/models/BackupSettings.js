import mongoose from 'mongoose';

const backupSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    automaticBackupEnabled: { type: Boolean, default: false },
    backupFrequency: { type: String, enum: ['Daily', 'Weekly', 'Monthly'], default: 'Weekly' },
    lastBackupAt: { type: Date, default: null },
    lastBackupId: { type: mongoose.Schema.Types.ObjectId, ref: 'BackupRecord', default: null },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export default mongoose.model('BackupSettings', backupSettingsSchema);
