import mongoose from 'mongoose';

const backupRecordSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ['manual', 'automatic', 'pre_restore', 'restore_upload'],
      default: 'manual'
    },
    status: {
      type: String,
      enum: ['completed', 'failed', 'validated', 'restored'],
      default: 'completed'
    },
    filename: { type: String, trim: true, default: '' },
    filePath: { type: String, trim: true, default: '' },
    size: { type: Number, min: 0, default: 0 },
    manifest: { type: mongoose.Schema.Types.Mixed, default: null },
    restoreToken: { type: String, trim: true, default: '' },
    restoredFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'BackupRecord', default: null },
    error: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export default mongoose.model('BackupRecord', backupRecordSchema);
