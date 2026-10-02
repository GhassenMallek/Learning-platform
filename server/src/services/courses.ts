import type { HydratedDocument, Types } from 'mongoose';
import type { z } from 'zod';
import {
  AcademicYear,
  Category,
  ContactMessage,
  Course,
  CourseModule,
  Enrollment,
  Lesson,
  LessonProgress,
  type ICourse,
} from '../db';
import { badRequest, conflict, forbidden, notFound, unprocessable } from '../lib/errors';
import { looseRegex } from '../lib/text';
import type { createCourseSchema, listCoursesQuery, updateCourseSchema } from '../schemas/catalog';
import { storage } from '../storage';
import { isObjectId, json, uniqueSlug } from './common';
import { releaseDocuments } from './curriculum';

type CourseDoc = HydratedDocument<ICourse>;
type Json = Record<string, any>;

const CATEGORY_FIELDS = 'slug name_en name_fr sortOrder';
const YEAR_FIELDS = 'slug name_en name_fr sortOrder';

// ── Counts ────────────────────────────────────────────────────────────────────────────
export interface CourseCounts {
  modules: number;
  lessons: number;
  minutes: number;
  enrollments: number;
}

export async function courseCounts(ids: Types.ObjectId[]): Promise<Map<string, CourseCounts>> {
  const [modules, lessons, enrollments] = await Promise.all([
    CourseModule.aggregate([{ $match: { course: { $in: ids } } }, { $group: { _id: '$course', n: { $sum: 1 } } }]),
    Lesson.aggregate([
      { $match: { course: { $in: ids } } },
      { $group: { _id: '$course', n: { $sum: 1 }, minutes: { $sum: { $ifNull: ['$durationMinutes', 0] } } } },
    ]),
    Enrollment.aggregate([{ $match: { course: { $in: ids } } }, { $group: { _id: '$course', n: { $sum: 1 } } }]),
  ]);
  const map = new Map<string, CourseCounts>();
  for (const id of ids) map.set(String(id), { modules: 0, lessons: 0, minutes: 0, enrollments: 0 });
  for (const m of modules) map.get(String(m._id))!.modules = m.n;
  for (const l of lessons) Object.assign(map.get(String(l._id))!, { lessons: l.n, minutes: l.minutes });
  for (const e of enrollments) map.get(String(e._id))!.enrollments = e.n;
  return map;
}

// ── DTOs ──────────────────────────────────────────────────────────────────────────────
/** Fields shown on cards/tables. Heavy marketing content only travels with the detail view. */
function listItem(course: CourseDoc, counts: CourseCounts | undefined, admin: boolean): Json {
  const c = json<Json>(course);
  const out: Json = {
    id: c.id,
    slug: c.slug,
    title_en: c.title_en,
    title_fr: c.title_fr,
    shortDescription_en: c.shortDescription_en,
    shortDescription_fr: c.shortDescription_fr,
    category: c.category,
    academicYear: c.academicYear ?? null,
    level: c.level,
    durationValue: c.durationValue,
    durationUnit: c.durationUnit,
    showPrice: c.showPrice,
    price: admin || c.showPrice ? c.price : null,
    currency: c.currency,
    thumbnail: c.thumbnail,
    sortOrder: c.sortOrder,
    status: c.status,
    publishedAt: c.publishedAt,
    moduleCount: counts?.modules ?? 0,
    lessonCount: counts?.lessons ?? 0,
    totalMinutes: counts?.minutes ?? 0,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
  if (admin) out.enrollmentCount = counts?.enrollments ?? 0;
  return out;
}

export interface OutlineLesson {
  id: string;
  order: number;
  type: string;
  title_en: string;
  title_fr: string;
  description_en?: string;
  description_fr?: string;
  durationMinutes: number | null;
}
export interface OutlineModule {
  id: string;
  order: number;
  title_en: string;
  title_fr: string;
  description_en: string;
  description_fr: string;
  lessons: OutlineLesson[];
}

/** Modules with their lessons, *without* lesson content/video/resources (safe for the public syllabus). */
export async function loadOutline(courseId: Types.ObjectId | string, admin = false): Promise<OutlineModule[]> {
  const lessonFields = admin
    ? 'module type title_en title_fr description_en description_fr durationMinutes order'
    : 'module type title_en title_fr durationMinutes order';
  const [modules, lessons] = await Promise.all([
    CourseModule.find({ course: courseId }).sort({ order: 1, _id: 1 }),
    Lesson.find({ course: courseId }).select(lessonFields).sort({ order: 1, _id: 1 }),
  ]);
  const byModule = new Map<string, OutlineLesson[]>();
  for (const l of lessons) {
    const j = json<Json>(l);
    const key = String(j.module);
    const { module: _m, ...rest } = j;
    (byModule.get(key) ?? byModule.set(key, []).get(key)!).push(rest as OutlineLesson);
  }
  return modules.map((m) => {
    const j = json<Json>(m);
    return {
      id: j.id,
      order: j.order,
      title_en: j.title_en,
      title_fr: j.title_fr,
      description_en: j.description_en,
      description_fr: j.description_fr,
      lessons: byModule.get(j.id) ?? [],
    };
  });
}

// ── Readiness (publish gate) ──────────────────────────────────────────────────────────
export interface ReadinessIssue {
  code: string;
  moduleId?: string;
  lessonId?: string;
}

export function computeReadiness(course: Json, outline: OutlineModule[]): { ok: boolean; issues: ReadinessIssue[] } {
  const issues: ReadinessIssue[] = [];
  const blank = (v: unknown) => typeof v !== 'string' || v.trim() === '';
  for (const f of ['title_en', 'title_fr', 'shortDescription_en', 'shortDescription_fr', 'description_en', 'description_fr']) {
    if (blank(course[f])) issues.push({ code: f });
  }
  if (outline.length === 0) issues.push({ code: 'no_modules' });
  for (const m of outline) {
    if (blank(m.title_en) || blank(m.title_fr)) issues.push({ code: 'module_title', moduleId: m.id });
    if (m.lessons.length === 0) issues.push({ code: 'module_empty', moduleId: m.id });
    for (const l of m.lessons) {
      if (blank(l.title_en) || blank(l.title_fr)) issues.push({ code: 'lesson_title', moduleId: m.id, lessonId: l.id });
    }
  }
  return { ok: issues.length === 0, issues };
}

// ── Queries ───────────────────────────────────────────────────────────────────────────
type ListQuery = z.output<typeof listCoursesQuery>;

export async function listCourses(query: ListQuery, admin: boolean) {
  const filter: Record<string, any> = {};
  if (!admin) {
    // Visitors and students can only ever see PUBLISHED courses; asking for anything else is an explicit 403.
    if (query.status && query.status !== 'PUBLISHED') throw forbidden();
    filter.status = 'PUBLISHED';
  } else if (query.status && query.status !== 'ALL') {
    filter.status = query.status;
  }

  if (query.category) {
    const cat = isObjectId(query.category)
      ? await Category.findById(query.category)
      : await Category.findOne({ slug: query.category.toLowerCase() });
    if (!cat) return { items: [], total: 0 };
    filter.category = cat._id;
  }
  if (query.academicYear) filter.academicYear = query.academicYear;
  if (query.level) filter.level = query.level;
  if (query.q) {
    const re = looseRegex(query.q);
    filter.$or = [{ title_en: re }, { title_fr: re }, { shortDescription_en: re }, { shortDescription_fr: re }];
  }

  const sort: Record<string, 1 | -1> =
    query.sort === 'newest' ? { createdAt: -1 }
    : query.sort === 'updated' ? { updatedAt: -1 }
    : query.sort === 'title' ? { title_en: 1 }
    : admin && !query.sort ? { updatedAt: -1 }
    : { sortOrder: 1, createdAt: 1 };

  const [docs, total] = await Promise.all([
    Course.find(filter)
      .sort(sort)
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .populate('category', CATEGORY_FIELDS)
      .populate('academicYear', YEAR_FIELDS),
    Course.countDocuments(filter),
  ]);
  const counts = await courseCounts(docs.map((d) => d._id));
  return { items: docs.map((d) => listItem(d, counts.get(String(d._id)), admin)), total };
}

export async function findCourse(ref: string): Promise<CourseDoc | null> {
  if (isObjectId(ref)) {
    const byId = await Course.findById(ref);
    if (byId) return byId;
  }
  return Course.findOne({ slug: ref.toLowerCase() });
}

/** Full course page payload. Non-admins never see anything that is not PUBLISHED (a 404, not a 403, so drafts are not discoverable). */
export async function getCourseDetail(ref: string, admin: boolean): Promise<Json> {
  const found = await findCourse(ref);
  if (!found || (!admin && found.status !== 'PUBLISHED')) throw notFound('Course');
  const course = await found.populate([
    { path: 'category', select: CATEGORY_FIELDS },
    { path: 'academicYear', select: YEAR_FIELDS },
  ]);
  const [outline, counts] = await Promise.all([loadOutline(course._id, admin), courseCounts([course._id])]);
  const c = counts.get(String(course._id));
  const detail: Json = {
    ...listItem(course, c, admin),
    description_en: course.description_en,
    description_fr: course.description_fr,
    objectives: json<Json>(course).objectives,
    audience: json<Json>(course).audience,
    skills: json<Json>(course).skills,
    faq: json<Json>(course).faq,
    project: json<Json>(course).project,
    modules: outline,
  };
  if (admin) detail.readiness = computeReadiness(json<Json>(course), outline);
  return detail;
}

export async function adminCourseDetail(id: string) {
  return getCourseDetail(id, true);
}

// ── Commands ──────────────────────────────────────────────────────────────────────────
type CreateInput = z.output<typeof createCourseSchema>;
type UpdateInput = z.output<typeof updateCourseSchema>;

async function assertTaxonomy(categoryId?: string, academicYearId?: string | null) {
  if (categoryId && !(await Category.exists({ _id: categoryId }))) throw badRequest('CATEGORY_NOT_FOUND', 'Unknown category');
  if (academicYearId && !(await AcademicYear.exists({ _id: academicYearId }))) {
    throw badRequest('ACADEMIC_YEAR_NOT_FOUND', 'Unknown academic year');
  }
}

export async function createCourse(input: CreateInput): Promise<Json> {
  await assertTaxonomy(input.category, input.academicYear);
  const slug = input.slug ?? (await uniqueSlug(Course, input.title_en));
  if (input.slug && (await Course.exists({ slug }))) throw conflict('SLUG_TAKEN', 'This URL slug is already used');
  const last = await Course.findOne().sort({ sortOrder: -1 }).select('sortOrder');
  const course = await Course.create({ sortOrder: (last?.sortOrder ?? 0) + 10, ...input, slug, status: 'DRAFT', publishedAt: null });
  return adminCourseDetail(course.id);
}

export async function updateCourse(id: string, input: UpdateInput): Promise<Json> {
  const course = await Course.findById(id);
  if (!course) throw notFound('Course');
  await assertTaxonomy(input.category, input.academicYear);
  if (input.slug && input.slug !== course.slug && (await Course.exists({ slug: input.slug, _id: { $ne: course._id } }))) {
    throw conflict('SLUG_TAKEN', 'This URL slug is already used');
  }
  const previousThumbnail = course.thumbnail;
  course.set(input);
  await course.save();
  if (input.thumbnail !== undefined && previousThumbnail && previousThumbnail !== course.thumbnail) {
    await storage.remove(previousThumbnail).catch(() => undefined);
  }
  return adminCourseDetail(id);
}

export type CourseAction = 'publish' | 'unpublish' | 'archive';

export async function changeCourseStatus(id: string, action: CourseAction): Promise<Json> {
  const course = await Course.findById(id);
  if (!course) throw notFound('Course');

  if (action === 'publish') {
    const outline = await loadOutline(course._id, true);
    const readiness = computeReadiness(json<Json>(course), outline);
    if (!readiness.ok) throw unprocessable('COURSE_NOT_PUBLISHABLE', 'The course is not ready to be published', readiness.issues);
    course.status = 'PUBLISHED';
    course.publishedAt ??= new Date();
  } else if (action === 'unpublish') {
    if (course.status !== 'PUBLISHED') throw conflict('INVALID_STATE', 'Only published courses can be unpublished');
    course.status = 'DRAFT';
  } else {
    course.status = 'ARCHIVED';
  }
  await course.save();
  return adminCourseDetail(id);
}

/** Deleting a course that students are enrolled in would destroy their learning history, so it is refused — archive instead. */
export async function deleteCourse(id: string): Promise<void> {
  const course = await Course.findById(id);
  if (!course) throw notFound('Course');
  const enrollments = await Enrollment.countDocuments({ course: course._id });
  if (enrollments > 0) throw conflict('COURSE_HAS_ENROLLMENTS', 'This course has enrolled students; archive it instead', { enrollments });

  // Children first, parent last: an interrupted delete leaves a course that can simply be deleted again.
  await LessonProgress.deleteMany({ course: course._id });
  const documentUrls = await Lesson.distinct('resources.url', { course: course._id });
  await Lesson.deleteMany({ course: course._id });
  await CourseModule.deleteMany({ course: course._id });
  await ContactMessage.updateMany({ course: course._id }, { $set: { course: null } });
  await course.deleteOne();
  if (course.thumbnail) await storage.remove(course.thumbnail).catch(() => undefined);
  await releaseDocuments(documentUrls);
}

export async function courseStudents(id: string) {
  const course = await Course.findById(id).select('_id');
  if (!course) throw notFound('Course');
  const enrollments = await Enrollment.find({ course: course._id })
    .sort({ createdAt: -1 })
    .populate({ path: 'student', populate: { path: 'user', select: 'email' } });
  return enrollments.map((e) => json<Json>(e));
}
