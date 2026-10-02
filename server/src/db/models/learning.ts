import { Schema, model, type Types } from 'mongoose';
import { CONTACT_STATUSES, ENROLLMENT_STATUSES, LOCALES, type ContactStatus, type EnrollmentStatus, type Locale } from '../enums';
import { applyJson } from '../schema';

// ── Enrollment: the only link between a student and a course (no course data is copied) ──
export interface IEnrollment {
  student: Types.ObjectId;
  course: Types.ObjectId;
  status: EnrollmentStatus;
  enrolledAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = applyJson(
  new Schema<IEnrollment>(
    {
      student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
      course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
      status: { type: String, enum: ENROLLMENT_STATUSES, default: 'ACTIVE' },
      enrolledAt: { type: Date, default: () => new Date() },
      completedAt: { type: Date, default: null },
    },
    { timestamps: true },
  ),
);
// The unique compound index is what makes a duplicate enrollment impossible, even under concurrent requests.
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ course: 1, createdAt: -1 });
enrollmentSchema.index({ createdAt: -1 });

export const Enrollment = model<IEnrollment>('Enrollment', enrollmentSchema);

// ── Lesson progress: percentages are always computed from these rows, never stored ──
export interface ILessonProgress {
  student: Types.ObjectId;
  lesson: Types.ObjectId;
  /** Denormalised so "progress in course X" is one indexed count. */
  course: Types.ObjectId;
  completed: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const lessonProgressSchema = applyJson(
  new Schema<ILessonProgress>(
    {
      student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
      lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
      course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
      completed: { type: Boolean, default: true },
      completedAt: { type: Date, default: null },
    },
    { timestamps: true },
  ),
);
lessonProgressSchema.index({ student: 1, lesson: 1 }, { unique: true });
lessonProgressSchema.index({ student: 1, course: 1, completed: 1 });
lessonProgressSchema.index({ lesson: 1 });

export const LessonProgress = model<ILessonProgress>('LessonProgress', lessonProgressSchema);

// ── Contact request (lead) ────────────────────────────────────────────────────────────
export interface IContactMessage {
  fullName: string;
  email: string;
  phone: string | null;
  course: Types.ObjectId | null;
  /** Snapshot of the course title at submission time — survives the course being deleted. */
  courseTitle: string | null;
  message: string;
  locale: Locale;
  status: ContactStatus;
  student: Types.ObjectId | null;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = applyJson(
  new Schema<IContactMessage>(
    {
      fullName: { type: String, required: true, trim: true, maxlength: 120 },
      email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
      phone: { type: String, trim: true, maxlength: 32, default: null },
      course: { type: Schema.Types.ObjectId, ref: 'Course', default: null },
      courseTitle: { type: String, trim: true, maxlength: 200, default: null },
      message: { type: String, required: true, trim: true, maxlength: 3000 },
      locale: { type: String, enum: LOCALES, default: 'en' },
      status: { type: String, enum: CONTACT_STATUSES, default: 'NEW' },
      student: { type: Schema.Types.ObjectId, ref: 'Student', default: null },
      readAt: { type: Date, default: null },
    },
    { timestamps: true },
  ),
);
contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ email: 1 });

export const ContactMessage = model<IContactMessage>('ContactMessage', contactSchema);

// ── Settings: one document per key (`site` holds the centre's public details) ────────
export interface ISetting {
  key: string;
  value: Record<string, unknown>;
  updatedAt: Date;
}

const settingSchema = applyJson(
  new Schema<ISetting>(
    {
      key: { type: String, required: true, unique: true },
      value: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: { createdAt: false, updatedAt: true } },
  ),
);

export const Setting = model<ISetting>('Setting', settingSchema);
