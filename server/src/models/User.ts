import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  firebaseUID: string;
  name: string;
  email: string;
  photoURL?: string;
  provider: string;
  role: 'admin' | 'user' | 'analyst';
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

const UserSchema = new Schema<IUser>(
  {
    firebaseUID: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    photoURL: {
      type: String,
    },
    provider: {
      type: String,
      required: true,
      default: 'google.com',
    },
    role: {
      type: String,
      enum: ['admin', 'user', 'analyst'],
      default: 'user',
    },
    organizationId: {
      type: String,
      default: 'default-org',
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const User = model<IUser>('User', UserSchema);
export default User;
