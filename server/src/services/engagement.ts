import type { HydratedDocument } from 'mongoose';
import type { z } from 'zod';
import {
  ContactMessage,
  Course,
  CourseModule,
  Enrollment,
  Lesson,
  Setting,
  Student,
  User,
  type ContactStatus,
  type IContactMessage,
} from '../db';
import { notFound } from '../lib/errors';
import { looseRegex } from '../lib/text';
import type { createContactSchema, listContactQuery, SiteSettings } from '../schemas/people';
import { json } from './common';
import { createEnrollment } from './learning';

type Json = Record<string, any>;

// ── Site settings (the centre's public details) ───────────────────────────────────────
export const DEFAULT_SITE: SiteSettings = {
  name: 'Meridian Learning Center',
  tagline_fr: 'Des formations pratiques pour de vraies carrières',
  email: 'contact@atheer.tn',
  phone: '',
  whatsapp: '',
  address_fr: '',
  hours_fr: 'Lun–Ven · 9h00–18h00',
  currency: 'TND',
  social: { facebook: '', instagram: '', linkedin: '', youtube: '' },
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const doc = await Setting.findOne({ key: 'site' });
  // Settings saved before the site went French-only may still hold *_en keys: never return them.
  const stored = Object.fromEntries(Object.entries(doc?.value ?? {}).filter(([k]) => !k.endsWith('_en'))) as Partial<SiteSettings>;
  return { ...DEFAULT_SITE, ...stored, social: { ...DEFAULT_SITE.social, ...(stored.social ?? {}) } };
}

export async function saveSiteSettings(value: SiteSettings): Promise<SiteSettings> {
  await Setting.findOneAndUpdate({ key: 'site' }, { $set: { value } }, { upsert: true, new: true });
  return value;
}

// ── Contact requests ──────────────────────────────────────────────────────────────────
export async function submitContact(input: z.output<typeof createContactSchema>): Promise<void> {
  // Honeypot filled ⇒ bot. Pretend success so it learns nothing, store nothing.
  if (input.website) return;
  let course = null;
  let courseTitle: string | null = null;
  if (input.courseId) {
    const found = await Course.findOne({ _id: input.courseId, status: 'PUBLISHED' }).select('title_en title_fr');
    if (found) {
      course = found._id;
      courseTitle = found.title_fr;
    }
  }
  await ContactMessage.create({
    fullName: input.fullName,
    email: input.email,
    phone: input.phone ?? null,
    message: input.message,
    locale: input.locale,
    course,
    courseTitle,
  });
}

export async function listContact(query: z.output<typeof listContactQuery>) {
  const filter: Record<string, any> = {};
  // Default view is the inbox (archived requests are hidden); ALL shows everything.
  if (!query.status) filter.status = { $in: ['NEW', 'READ'] };
  else if (query.status !== 'ALL') filter.status = query.status;
  if (query.q) {
    const re = looseRegex(query.q);
    filter.$or = [{ fullName: re }, { email: re }, { phone: re }, { message: re }, { courseTitle: re }];
  }
  const [docs, total, byStatus] = await Promise.all([
    ContactMessage.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize),
    ContactMessage.countDocuments(filter),
    ContactMessage.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  const counts = { NEW: 0, READ: 0, ARCHIVED: 0 } as Record<ContactStatus, number>;
  for (const row of byStatus) counts[row._id as ContactStatus] = row.n;
  return { items: docs.map((d) => json<Json>(d)), total, counts };
}

/** The message plus whoever it relates to: the linked student, and (if not linked yet) an existing student with the same e-mail. */
export async function getContact(id: string) {
  const message = await ContactMessage.findById(id).populate('course', 'slug title_en title_fr status').populate({ path: 'student', select: 'firstName lastName status user', populate: { path: 'user', select: 'email' } });
  if (!message) throw notFound('Contact request');
  let matchingStudent: Json | null = null;
  if (!message.student) {
    const user = await User.findOne({ email: message.email, role: 'STUDENT' }).select('_id email');
    const student = user && (await Student.findOne({ user: user._id }).select('firstName lastName status'));
    if (student) matchingStudent = { ...json<Json>(student), email: user!.email };
  }
  return { ...json<Json>(message), matchingStudent };
}

export async function setContactStatus(id: string, status: ContactStatus) {
  const message = await ContactMessage.findById(id);
  if (!message) throw notFound('Contact request');
  message.status = status;
  message.readAt = status === 'NEW' ? null : (message.readAt ?? new Date());
  await message.save();
  return json<Json>(message);
}

/** Links a lead to a student; a NEW request becomes READ because an admin has clearly dealt with it. */
export async function attachStudentToMessage(messageId: string, studentId: string) {
  const message = await ContactMessage.findById(messageId);
  if (!message) return null;
  message.student = studentId as unknown as HydratedDocument<IContactMessage>['student'];
  if (message.status === 'NEW') {
    message.status = 'READ';
    message.readAt = new Date();
  }
  await message.save();
  return message;
}

/** "Add to existing student": prevents duplicate students, optionally enrolls in the course the lead asked about. */
export async function linkContactToStudent(messageId: string, studentId: string, enroll: boolean) {
  const message = await ContactMessage.findById(messageId);
  if (!message) throw notFound('Contact request');
  if (!(await Student.exists({ _id: studentId }))) throw notFound('Student', 'STUDENT_NOT_FOUND');
  await attachStudentToMessage(messageId, studentId);

  let enrollment: { ok: boolean; error?: string } | null = null;
  if (enroll && message.course) {
    try {
      await createEnrollment({ studentId, courseId: String(message.course) });
      enrollment = { ok: true };
    } catch (err) {
      const code = (err as { code?: string }).code;
      // Already being enrolled is the desired end state, not a failure.
      enrollment = { ok: code === 'ALREADY_ENROLLED', error: code };
    }
  }
  return { message: await getContact(messageId), enrollment };
}

// ── Statistics (real database aggregates only) ────────────────────────────────────────
export async function publicStats() {
  const courses = await Course.find({ status: 'PUBLISHED' }).select('_id category');
  const ids = courses.map((c) => c._id);
  const [modules, lessons] = await Promise.all([
    CourseModule.countDocuments({ course: { $in: ids } }),
    Lesson.aggregate([{ $match: { course: { $in: ids } } }, { $group: { _id: null, n: { $sum: 1 }, minutes: { $sum: { $ifNull: ['$durationMinutes', 0] } } } }]),
  ]);
  return {
    courses: courses.length,
    categories: new Set(courses.map((c) => String(c.category))).size,
    modules,
    lessons: lessons[0]?.n ?? 0,
    hours: Math.round((lessons[0]?.minutes ?? 0) / 60),
  };
}

export async function adminOverview() {
  const [students, activeStudents, publishedCourses, totalCourses, enrollments, newContactRequests] = await Promise.all([
    Student.countDocuments(),
    Student.countDocuments({ status: 'ACTIVE' }),
    Course.countDocuments({ status: 'PUBLISHED' }),
    Course.countDocuments(),
    Enrollment.countDocuments(),
    ContactMessage.countDocuments({ status: 'NEW' }),
  ]);
  const [recentStudents, recentContacts, recentEnrollments, recentCourses] = await Promise.all([
    Student.find().sort({ createdAt: -1 }).limit(5).populate('user', 'email'),
    ContactMessage.find({ status: { $ne: 'ARCHIVED' } }).sort({ createdAt: -1 }).limit(5),
    Enrollment.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({ path: 'student', select: 'firstName lastName profilePhotoUrl' })
      .populate('course', 'slug title_en title_fr'),
    Course.find().sort({ createdAt: -1 }).limit(5).select('slug title_en title_fr status thumbnail category createdAt').populate('category', 'slug name_en name_fr'),
  ]);
  const flatStudent = (s: HydratedDocument<any>) => {
    const { user, ...rest } = json<Json>(s);
    return { ...rest, email: user?.email };
  };
  return {
    totals: { students, activeStudents, publishedCourses, totalCourses, enrollments, newContactRequests },
    recent: {
      students: recentStudents.map(flatStudent),
      contactRequests: recentContacts.map((m) => json<Json>(m)),
      enrollments: recentEnrollments.map((e) => json<Json>(e)),
      courses: recentCourses.map((c) => json<Json>(c)),
    },
  };
}
