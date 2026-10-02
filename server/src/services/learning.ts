import { Types, type HydratedDocument } from 'mongoose';
import type { z } from 'zod';
import { Course, CourseModule, Enrollment, Lesson, LessonProgress, Student, type IEnrollment } from '../db';
import { conflict, forbidden, notFound } from '../lib/errors';
import type { createEnrollmentSchema, listEnrollmentsQuery, updateEnrollmentSchema } from '../schemas/people';
import { json, oid, percent } from './common';
import { loadOutline } from './courses';

type Json = Record<string, any>;

export interface CourseProgress {
  completed: number;
  total: number;
  percent: number;
}

const ACTIVE_ACCESS = ['ACTIVE', 'COMPLETED'] as const;

// ── Progress = completed lessons / total lessons × 100, always computed, never stored ──
export async function progressForCourses(studentIds: string[], courseIds: Types.ObjectId[]): Promise<Map<string, CourseProgress>> {
  const [totals, done] = await Promise.all([
    Lesson.aggregate([{ $match: { course: { $in: courseIds } } }, { $group: { _id: '$course', n: { $sum: 1 } } }]),
    LessonProgress.aggregate([
      { $match: { student: { $in: studentIds.map(oid) }, course: { $in: courseIds }, completed: true } },
      { $group: { _id: { student: '$student', course: '$course' }, n: { $sum: 1 } } },
    ]),
  ]);
  const totalBy = new Map<string, number>(totals.map((t) => [String(t._id), t.n as number]));
  const result = new Map<string, CourseProgress>();
  for (const s of studentIds) {
    for (const c of courseIds) {
      const total = totalBy.get(String(c)) ?? 0;
      const completed = Math.min(total, done.find((d) => String(d._id.student) === s && String(d._id.course) === String(c))?.n ?? 0);
      result.set(`${s}:${c}`, { completed, total, percent: percent(completed, total) });
    }
  }
  return result;
}

export async function courseProgress(studentId: string, courseId: Types.ObjectId | string): Promise<CourseProgress> {
  const cid = new Types.ObjectId(String(courseId));
  return (await progressForCourses([studentId], [cid])).get(`${studentId}:${cid}`)!;
}

// ── Enrollments ───────────────────────────────────────────────────────────────────────
export async function createEnrollment(input: z.output<typeof createEnrollmentSchema>) {
  const [student, course] = await Promise.all([Student.findById(input.studentId), Course.findById(input.courseId).select('status')]);
  if (!student) throw notFound('Student', 'STUDENT_NOT_FOUND');
  if (!course) throw notFound('Course', 'COURSE_NOT_FOUND');
  if (student.status !== 'ACTIVE') throw conflict('STUDENT_INACTIVE', 'Inactive students cannot be enrolled');
  if (course.status !== 'PUBLISHED') throw conflict('COURSE_NOT_PUBLISHED', 'Students can only be enrolled in published courses');
  try {
    const enrollment = await Enrollment.create({ student: student._id, course: course._id, enrolledAt: input.enrolledAt ?? new Date() });
    return json<Json>(enrollment);
  } catch (err) {
    // The unique {student, course} index is the source of truth, so concurrent double-submits are safe too.
    if ((err as { code?: number }).code === 11000) throw conflict('ALREADY_ENROLLED', 'This student is already enrolled in this course');
    throw err;
  }
}

export async function updateEnrollment(id: string, input: z.output<typeof updateEnrollmentSchema>) {
  const enrollment = await Enrollment.findById(id);
  if (!enrollment) throw notFound('Enrollment');
  if (input.enrolledAt) enrollment.enrolledAt = input.enrolledAt;
  if (input.status) {
    enrollment.status = input.status;
    enrollment.completedAt = input.status === 'COMPLETED' ? (enrollment.completedAt ?? new Date()) : null;
  }
  await enrollment.save();
  return json<Json>(enrollment);
}

export async function deleteEnrollment(id: string) {
  const enrollment = await Enrollment.findById(id);
  if (!enrollment) throw notFound('Enrollment');
  // Lesson progress is intentionally kept: re-enrolling the student restores where they were.
  await enrollment.deleteOne();
}

const COURSE_CARD_FIELDS =
  'slug title_en title_fr shortDescription_en shortDescription_fr thumbnail level durationValue durationUnit status category academicYear';

async function withProgress(enrollments: HydratedDocument<IEnrollment>[]): Promise<Json[]> {
  if (enrollments.length === 0) return [];
  const courseIds = [...new Map(enrollments.map((e) => [String(idOfRef(e.course)), idOfRef(e.course)])).values()];
  const studentIds = [...new Set(enrollments.map((e) => String(idOfRef(e.student))))];
  const progress = await progressForCourses(studentIds, courseIds);
  return enrollments.map((e) => ({
    ...json<Json>(e),
    progress: progress.get(`${idOfRef(e.student)}:${idOfRef(e.course)}`),
  }));
}

const idOfRef = (ref: unknown): Types.ObjectId => ((ref as { _id?: Types.ObjectId })?._id ?? ref) as Types.ObjectId;

export async function listEnrollments(query: z.output<typeof listEnrollmentsQuery>) {
  const filter: Record<string, any> = {};
  if (query.courseId) filter.course = query.courseId;
  if (query.studentId) filter.student = query.studentId;
  if (query.status && query.status !== 'ALL') filter.status = query.status;
  const [docs, total] = await Promise.all([
    Enrollment.find(filter)
      .sort({ enrolledAt: -1, _id: -1 })
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .populate({ path: 'student', select: 'firstName lastName status profilePhotoUrl user', populate: { path: 'user', select: 'email' } })
      .populate('course', COURSE_CARD_FIELDS),
    Enrollment.countDocuments(filter),
  ]);
  return { items: await withProgress(docs), total };
}

export async function enrollmentsOfStudent(studentId: string) {
  const docs = await Enrollment.find({ student: studentId })
    .sort({ enrolledAt: -1 })
    .populate('course', COURSE_CARD_FIELDS);
  return withProgress(docs);
}

// ── Marking lessons ───────────────────────────────────────────────────────────────────
/** A student may only touch content of a course they hold an ACTIVE/COMPLETED enrollment in. */
export async function assertCourseAccess(studentId: string, courseId: Types.ObjectId | string) {
  const enrollment = await Enrollment.findOne({ student: studentId, course: courseId, status: { $in: ACTIVE_ACCESS } });
  if (!enrollment) throw forbidden('NOT_ENROLLED', 'You are not enrolled in this course');
  return enrollment;
}

export async function markLesson(studentId: string, lessonId: string, completed: boolean) {
  const lesson = await Lesson.findById(lessonId).select('course');
  if (!lesson) throw notFound('Lesson');
  await assertCourseAccess(studentId, lesson.course);
  const progress = await LessonProgress.findOneAndUpdate(
    { student: studentId, lesson: lesson._id },
    { $set: { completed, completedAt: completed ? new Date() : null, course: lesson.course } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return { lessonId, completed: progress.completed, completedAt: progress.completedAt, progress: await courseProgress(studentId, lesson.course) };
}

// ── Student portal payloads ───────────────────────────────────────────────────────────
interface FlatLesson {
  id: string;
  moduleId: string;
  title_en: string;
  title_fr: string;
}

async function flatLessons(courseId: Types.ObjectId | string): Promise<FlatLesson[]> {
  const outline = await loadOutline(courseId, false);
  return outline.flatMap((m) => m.lessons.map((l) => ({ id: l.id, moduleId: m.id, title_en: l.title_en, title_fr: l.title_fr })));
}

async function completedLessonIds(studentId: string, courseId: Types.ObjectId | string): Promise<Set<string>> {
  const ids = await LessonProgress.find({ student: studentId, course: courseId, completed: true }).distinct('lesson');
  return new Set(ids.map(String));
}

export async function studentCourses(studentId: string) {
  const enrollments = await Enrollment.find({ student: studentId, status: { $in: ACTIVE_ACCESS } })
    .sort({ enrolledAt: -1 })
    .populate({ path: 'course', select: COURSE_CARD_FIELDS, populate: [{ path: 'category', select: 'slug name_en name_fr sortOrder' }, { path: 'academicYear', select: 'slug name_en name_fr sortOrder' }] });
  const withP = await withProgress(enrollments.filter((e) => e.course));
  const courseIds = withP.map((e) => oid(String(e.course.id)));
  const activity = await LessonProgress.aggregate([
    { $match: { student: oid(studentId), course: { $in: courseIds } } },
    { $group: { _id: '$course', last: { $max: '$updatedAt' } } },
  ]);
  const lastBy = new Map<string, Date>(activity.map((a) => [String(a._id), a.last as Date]));

  return Promise.all(
    withP.map(async (e) => {
      const done = await completedLessonIds(studentId, e.course.id);
      const next = (await flatLessons(e.course.id)).find((l) => !done.has(l.id)) ?? null;
      return {
        enrollment: { id: e.id, status: e.status, enrolledAt: e.enrolledAt },
        course: e.course,
        progress: e.progress as CourseProgress,
        nextLesson: next,
        lastActivityAt: lastBy.get(String(e.course.id)) ?? null,
      };
    }),
  );
}

export async function studentDashboard(studentId: string) {
  const courses = await studentCourses(studentId);
  const lessonsCompleted = await LessonProgress.countDocuments({ student: studentId, completed: true });
  const continueWith =
    [...courses].filter((c) => c.nextLesson).sort((a, b) => +(b.lastActivityAt ?? 0) - +(a.lastActivityAt ?? 0))[0] ?? null;
  return {
    stats: {
      courses: courses.length,
      inProgress: courses.filter((c) => c.progress.percent < 100).length,
      completedCourses: courses.filter((c) => c.progress.total > 0 && c.progress.percent === 100).length,
      lessonsCompleted,
    },
    courses,
    continueLearning: continueWith && { courseId: continueWith.course.id, lesson: continueWith.nextLesson },
  };
}

export async function studentCourseOutline(studentId: string, courseId: string) {
  const enrollment = await assertCourseAccess(studentId, courseId);
  const course = await Course.findById(courseId)
    .populate('category', 'slug name_en name_fr sortOrder')
    .populate('academicYear', 'slug name_en name_fr sortOrder');
  if (!course) throw notFound('Course');
  const [outline, done, progress] = await Promise.all([loadOutline(course._id, true), completedLessonIds(studentId, course._id), courseProgress(studentId, course._id)]);
  const c = json<Json>(course);
  const modules = outline.map((m) => {
    const lessons = m.lessons.map((l) => ({ ...l, completed: done.has(l.id) }));
    return { ...m, lessons, completedCount: lessons.filter((l) => l.completed).length, totalCount: lessons.length };
  });
  const next = modules.flatMap((m) => m.lessons.map((l) => ({ id: l.id, moduleId: m.id, title_en: l.title_en, title_fr: l.title_fr, completed: l.completed }))).find((l) => !l.completed) ?? null;
  return {
    enrollment: { id: enrollment.id, status: enrollment.status, enrolledAt: enrollment.enrolledAt },
    course: {
      id: c.id, slug: c.slug, title_en: c.title_en, title_fr: c.title_fr, shortDescription_en: c.shortDescription_en, shortDescription_fr: c.shortDescription_fr,
      description_en: c.description_en, description_fr: c.description_fr, thumbnail: c.thumbnail, level: c.level, category: c.category, academicYear: c.academicYear ?? null,
      durationValue: c.durationValue, durationUnit: c.durationUnit,
    },
    progress,
    nextLesson: next,
    modules,
  };
}

export async function studentLesson(studentId: string, lessonId: string) {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw notFound('Lesson');
  await assertCourseAccess(studentId, lesson.course);
  const [flat, done, mod, course] = await Promise.all([
    flatLessons(lesson.course),
    completedLessonIds(studentId, lesson.course),
    CourseModule.findById(lesson.module).select('title_en title_fr order'),
    Course.findById(lesson.course).select('slug title_en title_fr'),
  ]);
  const index = flat.findIndex((l) => l.id === lessonId);
  return {
    lesson: { ...json<Json>(lesson), completed: done.has(lessonId) },
    module: json<Json>(mod),
    course: json<Json>(course),
    previous: index > 0 ? flat[index - 1] : null,
    next: index >= 0 && index < flat.length - 1 ? flat[index + 1] : null,
    progress: await courseProgress(studentId, lesson.course),
  };
}
