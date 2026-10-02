import { Schema, model, type Types } from 'mongoose';
import {
  COURSE_STATUSES,
  DOCUMENT_TYPES,
  DURATION_UNITS,
  LESSON_TYPES,
  LEVELS,
  type CourseStatus,
  type DurationUnit,
  type LessonType,
  type Level,
} from '../enums';
import { applyJson, localizedSchema, type LocalizedText } from '../schema';

// ── Category ──────────────────────────────────────────────────────────────────────────
export interface ICategory {
  slug: string;
  name_en: string;
  name_fr: string;
  description_en: string;
  description_fr: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = applyJson(
  new Schema<ICategory>(
    {
      slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 80 },
      name_en: { type: String, trim: true, default: '', maxlength: 80 },
      name_fr: { type: String, required: true, trim: true, maxlength: 80 },
      description_en: { type: String, trim: true, default: '', maxlength: 400 },
      description_fr: { type: String, trim: true, default: '', maxlength: 400 },
      sortOrder: { type: Number, default: 0 },
    },
    { timestamps: true },
  ),
);

export const Category = model<ICategory>('Category', categorySchema);

// ── Academic year (lookup used to group courses dynamically) ─────────────────────────
export interface IAcademicYear {
  slug: string;
  name_en: string;
  name_fr: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const academicYearSchema = applyJson(
  new Schema<IAcademicYear>(
    {
      slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 80 },
      name_en: { type: String, trim: true, default: '', maxlength: 60 },
      name_fr: { type: String, required: true, trim: true, maxlength: 60 },
      sortOrder: { type: Number, default: 0 },
    },
    { timestamps: true },
  ),
);

export const AcademicYear = model<IAcademicYear>('AcademicYear', academicYearSchema);

// ── Course ────────────────────────────────────────────────────────────────────────────
export interface FaqItem {
  question: LocalizedText;
  answer: LocalizedText;
}
export interface CourseProject {
  title: LocalizedText;
  description: LocalizedText;
}

export interface ICourse {
  slug: string;
  title_en: string;
  title_fr: string;
  shortDescription_en: string;
  shortDescription_fr: string;
  description_en: string;
  description_fr: string;
  category: Types.ObjectId;
  academicYear: Types.ObjectId | null;
  level: Level;
  durationValue: number | null;
  durationUnit: DurationUnit;
  /** Display price. Payments will need integer minor units (see docs/01, "Extension points"). */
  price: number | null;
  showPrice: boolean;
  currency: string;
  thumbnail: string | null;
  sortOrder: number;
  status: CourseStatus;
  publishedAt: Date | null;
  objectives: LocalizedText[];
  audience: LocalizedText[];
  skills: LocalizedText[];
  faq: FaqItem[];
  project: CourseProject | null;
  createdAt: Date;
  updatedAt: Date;
}

const faqSchema = applyJson(
  new Schema<FaqItem>({ question: { type: localizedSchema, default: () => ({}) }, answer: { type: localizedSchema, default: () => ({}) } }, { _id: false }),
);
const projectSchema = applyJson(
  new Schema<CourseProject>({ title: { type: localizedSchema, default: () => ({}) }, description: { type: localizedSchema, default: () => ({}) } }, { _id: false }),
);

const courseSchema = applyJson(
  new Schema<ICourse>(
    {
      slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 100 },
      title_en: { type: String, trim: true, default: '', maxlength: 200 },
      title_fr: { type: String, required: true, trim: true, maxlength: 200 },
      shortDescription_en: { type: String, trim: true, default: '', maxlength: 400 },
      shortDescription_fr: { type: String, trim: true, default: '', maxlength: 400 },
      description_en: { type: String, trim: true, default: '', maxlength: 12000 },
      description_fr: { type: String, trim: true, default: '', maxlength: 12000 },
      category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
      academicYear: { type: Schema.Types.ObjectId, ref: 'AcademicYear', default: null },
      level: { type: String, enum: LEVELS, default: 'ALL_LEVELS' },
      durationValue: { type: Number, min: 1, max: 10000, default: null },
      durationUnit: { type: String, enum: DURATION_UNITS, default: 'HOURS' },
      price: { type: Number, min: 0, default: null },
      showPrice: { type: Boolean, default: false },
      currency: { type: String, uppercase: true, trim: true, default: 'TND', maxlength: 3 },
      thumbnail: { type: String, trim: true, maxlength: 500, default: null },
      sortOrder: { type: Number, default: 0 },
      status: { type: String, enum: COURSE_STATUSES, default: 'DRAFT' },
      publishedAt: { type: Date, default: null },
      objectives: { type: [localizedSchema], default: [] },
      audience: { type: [localizedSchema], default: [] },
      skills: { type: [localizedSchema], default: [] },
      faq: { type: [faqSchema], default: [] },
      project: { type: projectSchema, default: null },
    },
    { timestamps: true },
  ),
);
courseSchema.index({ status: 1, category: 1, sortOrder: 1 });
courseSchema.index({ status: 1, academicYear: 1 });
courseSchema.index({ updatedAt: -1 });

export const Course = model<ICourse>('Course', courseSchema);

// ── Module ────────────────────────────────────────────────────────────────────────────
export interface IModule {
  course: Types.ObjectId;
  title_en: string;
  title_fr: string;
  description_en: string;
  description_fr: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const moduleSchema = applyJson(
  new Schema<IModule>(
    {
      course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
      title_en: { type: String, trim: true, default: '', maxlength: 200 },
      title_fr: { type: String, required: true, trim: true, maxlength: 200 },
      description_en: { type: String, trim: true, default: '', maxlength: 1000 },
      description_fr: { type: String, trim: true, default: '', maxlength: 1000 },
      order: { type: Number, required: true, default: 0 },
    },
    { timestamps: true },
  ),
);
moduleSchema.index({ course: 1, order: 1 });

export const CourseModule = model<IModule>('Module', moduleSchema);

// ── Lesson ────────────────────────────────────────────────────────────────────────────
export interface LessonResource {
  title: LocalizedText;
  url: string;
  /** Set for uploaded documents (pdf, pptx…); null for external links. */
  fileType: string | null;
  size: number | null;
}

export interface ILesson {
  module: Types.ObjectId;
  /** Denormalised from the module: makes per-course counts/progress a single indexed query. */
  course: Types.ObjectId;
  type: LessonType;
  title_en: string;
  title_fr: string;
  description_en: string;
  description_fr: string;
  /** Markdown. */
  content_en: string;
  content_fr: string;
  videoUrl: string | null;
  durationMinutes: number | null;
  resources: LessonResource[];
  /** Reserved for future lesson types (quiz definition, assignment brief…). */
  metadata: Record<string, unknown> | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const resourceSchema = applyJson(
  new Schema<LessonResource>(
    {
      title: { type: localizedSchema, default: () => ({}) },
      url: { type: String, required: true, trim: true, maxlength: 600 },
      fileType: { type: String, enum: [...DOCUMENT_TYPES, null], default: null },
      size: { type: Number, min: 0, default: null },
    },
    { _id: false },
  ),
);

const lessonSchema = applyJson(
  new Schema<ILesson>(
    {
      module: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
      course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
      type: { type: String, enum: LESSON_TYPES, default: 'TEXT' },
      title_en: { type: String, trim: true, default: '', maxlength: 200 },
      title_fr: { type: String, required: true, trim: true, maxlength: 200 },
      description_en: { type: String, trim: true, default: '', maxlength: 1000 },
      description_fr: { type: String, trim: true, default: '', maxlength: 1000 },
      content_en: { type: String, default: '', maxlength: 100000 },
      content_fr: { type: String, default: '', maxlength: 100000 },
      videoUrl: { type: String, trim: true, maxlength: 600, default: null },
      durationMinutes: { type: Number, min: 0, max: 1440, default: null },
      resources: { type: [resourceSchema], default: [] },
      metadata: { type: Schema.Types.Mixed, default: null },
      order: { type: Number, required: true, default: 0 },
    },
    { timestamps: true },
  ),
);
lessonSchema.index({ module: 1, order: 1 });
lessonSchema.index({ course: 1 });

export const Lesson = model<ILesson>('Lesson', lessonSchema);
