import mongoose from 'mongoose';

const rolePermissionSchema = new mongoose.Schema(
  {
    role: { type: String, required: true, unique: true, trim: true, lowercase: true },
    permissions: { type: Map, of: Boolean, default: {} },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

export default mongoose.model('RolePermission', rolePermissionSchema);
