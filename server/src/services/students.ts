import type { HydratedDocument } from 'mongoose';
import type { z } from 'zod';
import { ContactMessage, Enrollment, Student, User, type IStudent, type IUser } from '../db';
import { conflict, notFound } from '../lib/errors';
import { generateTemporaryPassword, hashPassword } from '../lib/security';
import { looseRegex } from '../lib/text';
import type { createStudentSchema, listStudentsQuery, updateOwnProfileSchema, updateStudentSchema } from '../schemas/people';
import { storage } from '../storage';
import { json } from './common';
import { attachStudentToMessage } from './engagement';
import { createEnrollment, enrollmentsOfStudent } from './learning';

type Json = Record<string, any>;

const USER_FIELDS = 'email mustChangePassword lastLoginAt';

/** The login identity of a student loaded with `.populate('user')`. */
const userOf = (student: HydratedDocument<IStudent>) => student.user as unknown as HydratedDocument<IUser>;

/** Flat student payload (identity e-mail merged in). Never contains a password hash. */
export function studentDto(doc: HydratedDocument<IStudent>): Json {
  const { user, ...rest } = json<Json>(doc);
  const u = user && typeof user === 'object' ? user : {};
  return { ...rest, userId: u.id ?? String(user), email: u.email, mustChangePassword: u.mustChangePassword ?? false, lastLoginAt: u.lastLoginAt ?? null };
}

async function loadStudent(id: string) {
  const student = await Student.findById(id).populate('user', USER_FIELDS);
  if (!student) throw notFound('Student', 'STUDENT_NOT_FOUND');
  return student;
}

export async function listStudents(query: z.output<typeof listStudentsQuery>) {
  const filter: Record<string, any> = {};
  if (query.status && query.status !== 'ALL') filter.status = query.status;
  if (query.q) {
    // Every word must match somewhere (first name, last name, phone or e-mail): "ahmed ben" finds "Ahmed Ben Ali".
    const tokens = query.q.split(/\s+/).filter(Boolean).slice(0, 5);
    filter.$and = await Promise.all(
      tokens.map(async (token) => {
        const re = looseRegex(token);
        const userIds = await User.find({ role: 'STUDENT', email: re }).distinct('_id');
        return { $or: [{ firstName: re }, { lastName: re }, { phone: re }, { user: { $in: userIds } }] };
      }),
    );
  }
  const [docs, total] = await Promise.all([
    Student.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .populate('user', USER_FIELDS),
    Student.countDocuments(filter),
  ]);
  const counts = await Enrollment.aggregate([{ $match: { student: { $in: docs.map((d) => d._id) } } }, { $group: { _id: '$student', n: { $sum: 1 } } }]);
  const countBy = new Map<string, number>(counts.map((c) => [String(c._id), c.n as number]));
  return { items: docs.map((d) => ({ ...studentDto(d), enrollmentCount: countBy.get(d.id) ?? 0 })), total };
}

export async function getStudent(id: string) {
  const student = await loadStudent(id);
  return { ...studentDto(student), enrollments: await enrollmentsOfStudent(student.id) };
}

export async function createStudent(input: z.output<typeof createStudentSchema>) {
  const { email, password, enrollCourseIds = [], contactMessageId, ...profile } = input;

  const existing = await User.findOne({ email });
  if (existing) {
    const holder = await Student.findOne({ user: existing._id }).select('_id');
    throw conflict('EMAIL_TAKEN', 'A user with this e-mail already exists', { studentId: holder?.id ?? null });
  }
  if (contactMessageId && !(await ContactMessage.exists({ _id: contactMessageId }))) throw notFound('Contact message');

  const temporaryPassword = password ? null : generateTemporaryPassword();
  let user;
  try {
    user = await User.create({ email, passwordHash: await hashPassword(password ?? temporaryPassword!), role: 'STUDENT', mustChangePassword: true });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) throw conflict('EMAIL_TAKEN', 'A user with this e-mail already exists');
    throw err;
  }

  // No multi-document transaction (works on a standalone mongod): compensate by removing the orphan login if the profile fails.
  let student;
  try {
    student = await Student.create({ ...profile, user: user._id });
  } catch (err) {
    await user.deleteOne();
    throw err;
  }

  const enrollments: { courseId: string; ok: boolean; error?: string }[] = [];
  for (const courseId of enrollCourseIds) {
    try {
      await createEnrollment({ studentId: student.id, courseId });
      enrollments.push({ courseId, ok: true });
    } catch (err) {
      enrollments.push({ courseId, ok: false, error: (err as { code?: string }).code ?? 'ERROR' });
    }
  }

  if (contactMessageId) await attachStudentToMessage(contactMessageId, student.id);

  return { student: studentDto(await loadStudent(student.id)), temporaryPassword, enrollments };
}

export async function updateStudent(id: string, input: z.output<typeof updateStudentSchema>) {
  const student = await loadStudent(id);
  const { email, ...profile } = input;
  const identity = userOf(student);
  if (email && email !== identity.email) {
    if (await User.exists({ email, _id: { $ne: identity._id } })) throw conflict('EMAIL_TAKEN', 'A user with this e-mail already exists');
    await User.updateOne({ _id: identity._id }, { $set: { email } });
  }
  const previousPhoto = student.profilePhotoUrl;
  student.set(profile);
  await student.save();
  if (profile.profilePhotoUrl !== undefined && previousPhoto && previousPhoto !== student.profilePhotoUrl) {
    await storage.remove(previousPhoto).catch(() => undefined);
  }
  return studentDto(await loadStudent(id));
}

export async function setStudentStatus(id: string, status: 'ACTIVE' | 'INACTIVE') {
  const student = await loadStudent(id);
  student.status = status;
  await student.save();
  return studentDto(student);
}

/** Generates a new one-time password and invalidates every existing session of that student. */
export async function resetStudentPassword(id: string) {
  const student = await loadStudent(id);
  const temporaryPassword = generateTemporaryPassword();
  await User.updateOne(
    { _id: userOf(student)._id },
    { $set: { passwordHash: await hashPassword(temporaryPassword), mustChangePassword: true }, $inc: { tokenVersion: 1 } },
  );
  return { temporaryPassword };
}

// ── Self-service: a student can change only phone/address/photo ───────────────────────
export async function getOwnProfile(studentId: string) {
  return studentDto(await loadStudent(studentId));
}

export async function updateOwnProfile(studentId: string, input: z.output<typeof updateOwnProfileSchema>) {
  const student = await loadStudent(studentId);
  student.set(input);
  await student.save();
  return studentDto(student);
}

export async function setOwnAvatar(studentId: string, url: string) {
  const student = await loadStudent(studentId);
  const previous = student.profilePhotoUrl;
  student.profilePhotoUrl = url;
  await student.save();
  if (previous) await storage.remove(previous).catch(() => undefined);
  return studentDto(student);
}
