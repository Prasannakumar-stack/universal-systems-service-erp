import mongoose from 'mongoose';
import { SUPPORTED_ROLES } from '../permissions.js';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: SUPPORTED_ROLES, required: true },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    avatarUrl: { type: String, trim: true, default: '' },
    lastLoginAt: { type: Date, default: null },
    lastActivityAt: { type: Date, default: null },
    lastActivityType: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export default mongoose.model('User', userSchema);
