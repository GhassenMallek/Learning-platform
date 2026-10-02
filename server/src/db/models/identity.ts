import { Schema, model, type Types } from 'mongoose';
import { ROLES, STUDENT_STATUSES, type Role, type StudentStatus } from '../enums';
import { applyJson } from '../schema';

export interface IUser {
  email: string;
  passwordHash: string;
  role: Role;
  /** Bumped on password change/reset → every previously issued JWT stops working. */
  tokenVersion: number;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = applyJson(
  new Schema<IUser>(
    {
      email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
      passwordHash: { type: String, required: true, select: false },
      role: { type: String, enum: ROLES, required: true },
      tokenVersion: { type: Number, default: 0 },
      mustChangePassword: { type: Boolean, default: false },
      lastLoginAt: { type: Date, default: null },
    },
    { timestamps: true },
  ),
);

export const User = model<IUser>('User', userSchema);

export interface IAdmin {
  user: Types.ObjectId;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = applyJson(
  new Schema<IAdmin>(
    {
      user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
      firstName: { type: String, required: true, trim: true, maxlength: 80 },
      lastName: { type: String, required: true, trim: true, maxlength: 80 },
    },
    { timestamps: true },
  ),
);

export const Admin = model<IAdmin>('Admin', adminSchema);

export interface IStudent {
  user: Types.ObjectId;
  firstName: string;
  lastName: string;
  phone: string | null;
  dateOfBirth: Date | null;
  address: string | null;
  profilePhotoUrl: string | null;
  status: StudentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = applyJson(
  new Schema<IStudent>(
    {
      user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
      firstName: { type: String, required: true, trim: true, maxlength: 80 },
      lastName: { type: String, required: true, trim: true, maxlength: 80 },
      phone: { type: String, trim: true, maxlength: 32, default: null },
      dateOfBirth: { type: Date, default: null },
      address: { type: String, trim: true, maxlength: 300, default: null },
      profilePhotoUrl: { type: String, trim: true, maxlength: 500, default: null },
      status: { type: String, enum: STUDENT_STATUSES, default: 'ACTIVE' },
    },
    { timestamps: true },
  ),
);
studentSchema.index({ status: 1, createdAt: -1 });

export const Student = model<IStudent>('Student', studentSchema);
