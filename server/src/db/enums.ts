export const ROLES = ['ADMIN', 'STUDENT'] as const;
export type Role = (typeof ROLES)[number];

export const COURSE_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const STUDENT_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const ENROLLMENT_STATUSES = ['ACTIVE', 'COMPLETED', 'CANCELLED'] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const CONTACT_STATUSES = ['NEW', 'READ', 'ARCHIVED'] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

/** Extensible: only TEXT/VIDEO/DOCUMENT are rendered today; QUIZ/ASSIGNMENT are reserved (see Lesson.metadata). */
export const LESSON_TYPES = ['VIDEO', 'TEXT', 'DOCUMENT', 'QUIZ', 'ASSIGNMENT'] as const;
export type LessonType = (typeof LESSON_TYPES)[number];

export const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'] as const;
export type Level = (typeof LEVELS)[number];

export const DURATION_UNITS = ['HOURS', 'DAYS', 'WEEKS', 'MONTHS'] as const;
export type DurationUnit = (typeof DURATION_UNITS)[number];

export const LOCALES = ['en', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];

/** Uploadable lesson documents (verified by their bytes in `storage.detectDocument`). */
export const DOCUMENT_TYPES = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'pps', 'ppsx', 'xls', 'xlsx'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
