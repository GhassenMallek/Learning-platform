import { z } from 'zod';
import { CONTACT_STATUSES, ENROLLMENT_STATUSES, LOCALES, STUDENT_STATUSES } from '../db/enums';
import { email, isoDate, objectId, optDate, optMediaUrl, optStr, paginationQuery, password, phone, reqStr, str } from './common';

// ── Auth ──────────────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(200),
  portal: z.enum(['admin', 'student']).optional(),
});

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1).max(200), newPassword: password })
  .refine((d) => d.currentPassword !== d.newPassword, { path: ['newPassword'], message: 'password_unchanged' });

// ── Students ──────────────────────────────────────────────────────────────────────────
const birthDate = optDate.refine((d) => d == null || (d.getTime() <= Date.now() && d.getUTCFullYear() >= 1900), 'invalid_date');

const personShape = {
  firstName: reqStr(80),
  lastName: reqStr(80),
  phone,
  dateOfBirth: birthDate,
  address: optStr(300),
  profilePhotoUrl: optMediaUrl,
};

export const createStudentSchema = z.object({
  ...personShape,
  email,
  password: password.optional(),
  enrollCourseIds: z.array(objectId).max(20).optional(),
  contactMessageId: objectId.optional(),
});

export const updateStudentSchema = z.object({ ...personShape, email }).partial();
export const studentStatusSchema = z.object({ status: z.enum(STUDENT_STATUSES) });

export const listStudentsQuery = paginationQuery.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum([...STUDENT_STATUSES, 'ALL']).optional(),
});

/** What a student may change about themselves. Name, e-mail, status… stay under admin control. */
export const updateOwnProfileSchema = z.object({ phone, address: optStr(300) }).partial();

// ── Enrollments & progress ────────────────────────────────────────────────────────────
export const createEnrollmentSchema = z.object({
  studentId: objectId,
  courseId: objectId,
  enrolledAt: isoDate.optional(),
});

export const updateEnrollmentSchema = z
  .object({ status: z.enum(ENROLLMENT_STATUSES), enrolledAt: isoDate })
  .partial()
  .refine((d) => d.status !== undefined || d.enrolledAt !== undefined, { message: 'required' });

export const listEnrollmentsQuery = paginationQuery.extend({
  courseId: objectId.optional(),
  studentId: objectId.optional(),
  status: z.enum([...ENROLLMENT_STATUSES, 'ALL']).optional(),
});

export const progressSchema = z.object({ lessonId: objectId, completed: z.boolean().default(true) });

// ── Contact ───────────────────────────────────────────────────────────────────────────
export const createContactSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email,
  phone,
  courseId: objectId.nullish().transform((v) => v ?? null),
  message: z.string().trim().min(10).max(3000),
  locale: z.enum(LOCALES).default('en'),
  /** Honeypot: real visitors never see or fill this field. */
  website: z.string().max(200).optional(),
});

export const listContactQuery = paginationQuery.extend({
  status: z.enum([...CONTACT_STATUSES, 'ALL']).optional(),
  q: z.string().trim().max(100).optional(),
});

export const linkStudentSchema = z.object({ studentId: objectId, enroll: z.boolean().default(false) });

// ── Settings ──────────────────────────────────────────────────────────────────────────
const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .refine((v) => v === '' || z.email().safeParse(v).success, 'invalid_email');

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === '' || /^https?:\/\//i.test(v), 'invalid_url');

export const siteSettingsSchema = z.object({
  name: reqStr(80),
  tagline_fr: str(160),
  email: optionalEmail,
  phone: str(40),
  whatsapp: str(40),
  address_fr: str(300),
  hours_fr: str(160),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'invalid_currency'),
  social: z.object({ facebook: optionalUrl, instagram: optionalUrl, linkedin: optionalUrl, youtube: optionalUrl }),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;
