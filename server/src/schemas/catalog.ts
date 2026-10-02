import { z } from 'zod';
import { COURSE_STATUSES, DOCUMENT_TYPES, DURATION_UNITS, LESSON_TYPES, LEVELS } from '../db/enums';
import { objectId, optMediaUrl, optHttpUrl, pair, paginationQuery, reqStr, str, mediaUrl } from './common';

const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'invalid_slug');

// ── Taxonomy ──────────────────────────────────────────────────────────────────────────
const categoryShape = {
  slug: slugField,
  name_en: reqStr(80),
  name_fr: reqStr(80),
  description_en: str(400),
  description_fr: str(400),
  sortOrder: z.number().int().min(0).max(100000),
};
export const createCategorySchema = z.object(categoryShape).partial().extend({ name_en: categoryShape.name_en, name_fr: categoryShape.name_fr });
export const updateCategorySchema = z.object(categoryShape).partial();

const yearShape = {
  slug: slugField,
  name_en: reqStr(60),
  name_fr: reqStr(60),
  sortOrder: z.number().int().min(0).max(100000),
};
export const createAcademicYearSchema = z.object(yearShape).partial().extend({ name_en: yearShape.name_en, name_fr: yearShape.name_fr });
export const updateAcademicYearSchema = z.object(yearShape).partial();

// ── Course ────────────────────────────────────────────────────────────────────────────
const courseShape = {
  slug: slugField.min(3),
  title_en: reqStr(200),
  title_fr: reqStr(200),
  shortDescription_en: str(400),
  shortDescription_fr: str(400),
  description_en: str(12000),
  description_fr: str(12000),
  category: objectId,
  academicYear: objectId.nullable(),
  level: z.enum(LEVELS),
  durationValue: z.number().int().min(1).max(10000).nullable(),
  durationUnit: z.enum(DURATION_UNITS),
  price: z.number().min(0).max(1_000_000).nullable(),
  showPrice: z.boolean(),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'invalid_currency'),
  thumbnail: optMediaUrl,
  sortOrder: z.number().int().min(0).max(100000),
  objectives: z.array(pair(300)).max(30),
  audience: z.array(pair(300)).max(30),
  skills: z.array(pair(120)).max(40),
  faq: z.array(z.object({ question: pair(300), answer: pair(2000) })).max(30),
  project: z.object({ title: pair(200), description: pair(2000) }).nullable(),
};

/** Only titles + category are needed to start a draft; everything else is checked at publish time. */
export const createCourseSchema = z
  .object(courseShape)
  .partial()
  .extend({ title_en: courseShape.title_en, title_fr: courseShape.title_fr, category: courseShape.category });
export const updateCourseSchema = z.object(courseShape).partial();

export const listCoursesQuery = paginationQuery.extend({
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  status: z.enum([...COURSE_STATUSES, 'ALL']).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  academicYear: objectId.optional(),
  level: z.enum(LEVELS).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['order', 'newest', 'updated', 'title']).optional(),
});

// ── Modules & lessons ─────────────────────────────────────────────────────────────────
const moduleShape = {
  title_en: reqStr(200),
  title_fr: reqStr(200),
  description_en: str(1000),
  description_fr: str(1000),
};
export const createModuleSchema = z
  .object(moduleShape)
  .partial()
  .extend({ title_en: moduleShape.title_en, title_fr: moduleShape.title_fr, courseId: objectId });
export const updateModuleSchema = z.object(moduleShape).partial();

export const reorderSchema = z
  .object({ parentId: objectId, ids: z.array(objectId).min(1).max(500) })
  .refine((d) => new Set(d.ids).size === d.ids.length, { path: ['ids'], message: 'duplicate_ids' });

const lessonShape = {
  type: z.enum(LESSON_TYPES),
  title_en: reqStr(200),
  title_fr: reqStr(200),
  description_en: str(1000),
  description_fr: str(1000),
  content_en: z.string().max(100000),
  content_fr: z.string().max(100000),
  videoUrl: optHttpUrl,
  durationMinutes: z.number().int().min(0).max(1440).nullable(),
  resources: z
    .array(
      z.object({
        title: pair(200),
        url: mediaUrl,
        fileType: z.enum(DOCUMENT_TYPES).nullish().transform((v) => v ?? null),
        size: z.number().int().min(0).nullish().transform((v) => v ?? null),
      }),
    )
    .max(20),
};
export const createLessonSchema = z
  .object(lessonShape)
  .partial()
  .extend({ title_en: lessonShape.title_en, title_fr: lessonShape.title_fr, moduleId: objectId });
export const updateLessonSchema = z.object(lessonShape).partial();
