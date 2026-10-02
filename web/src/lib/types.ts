/** API contract (mirrors server responses). Bilingual fields follow the `<field>_en` / `<field>_fr` convention. */
export type Lang = 'en' | 'fr';
export interface Localized {
  en: string;
  fr: string;
}

export type Role = 'ADMIN' | 'STUDENT';
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type Level = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';
export type DurationUnit = 'HOURS' | 'DAYS' | 'WEEKS' | 'MONTHS';
export type LessonType = 'VIDEO' | 'TEXT' | 'DOCUMENT' | 'QUIZ' | 'ASSIGNMENT';
export type StudentStatus = 'ACTIVE' | 'INACTIVE';
export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type ContactStatus = 'NEW' | 'READ' | 'ARCHIVED';

export const LEVELS: Level[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'];
export const DURATION_UNITS: DurationUnit[] = ['HOURS', 'DAYS', 'WEEKS', 'MONTHS'];
export const LESSON_TYPES: LessonType[] = ['TEXT', 'VIDEO', 'DOCUMENT', 'ASSIGNMENT', 'QUIZ'];

export interface Account {
  id: string;
  profileId: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  mustChangePassword: boolean;
  profilePhotoUrl: string | null;
}

export interface SiteSettings {
  name: string;
  tagline_en: string;
  tagline_fr: string;
  email: string;
  phone: string;
  whatsapp: string;
  address_en: string;
  address_fr: string;
  hours_en: string;
  hours_fr: string;
  currency: string;
  social: { facebook: string; instagram: string; linkedin: string; youtube: string };
}

export interface PublicStats {
  courses: number;
  categories: number;
  modules: number;
  lessons: number;
  hours: number;
}

export interface Category {
  id: string;
  slug: string;
  name_en: string;
  name_fr: string;
  description_en: string;
  description_fr: string;
  sortOrder: number;
  courseCount?: number;
}

export interface AcademicYear {
  id: string;
  slug: string;
  name_en: string;
  name_fr: string;
  sortOrder: number;
  courseCount?: number;
}

export type CategoryRef = Pick<Category, 'id' | 'slug' | 'name_en' | 'name_fr' | 'sortOrder'>;
export type YearRef = Pick<AcademicYear, 'id' | 'slug' | 'name_en' | 'name_fr' | 'sortOrder'>;

export interface CourseListItem {
  id: string;
  slug: string;
  title_en: string;
  title_fr: string;
  shortDescription_en: string;
  shortDescription_fr: string;
  category: CategoryRef;
  academicYear: YearRef | null;
  level: Level;
  durationValue: number | null;
  durationUnit: DurationUnit;
  showPrice: boolean;
  price: number | null;
  currency: string;
  thumbnail: string | null;
  sortOrder: number;
  status: CourseStatus;
  publishedAt: string | null;
  moduleCount: number;
  lessonCount: number;
  totalMinutes: number;
  enrollmentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LessonOutline {
  id: string;
  order: number;
  type: LessonType;
  title_en: string;
  title_fr: string;
  description_en?: string;
  description_fr?: string;
  durationMinutes: number | null;
}

export interface ModuleOutline {
  id: string;
  order: number;
  title_en: string;
  title_fr: string;
  description_en: string;
  description_fr: string;
  lessons: LessonOutline[];
}

export interface FaqItem {
  question: Localized;
  answer: Localized;
}

export interface ReadinessIssue {
  code: string;
  moduleId?: string;
  lessonId?: string;
}

export interface CourseDetail extends CourseListItem {
  description_en: string;
  description_fr: string;
  objectives: Localized[];
  audience: Localized[];
  skills: Localized[];
  faq: FaqItem[];
  project: { title: Localized; description: Localized } | null;
  modules: ModuleOutline[];
  readiness?: { ok: boolean; issues: ReadinessIssue[] };
}

export const DOCUMENT_TYPES = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'pps', 'ppsx', 'xls', 'xlsx'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export interface LessonResource {
  title: Localized;
  url: string;
  /** Set for uploaded documents; null for external links. */
  fileType: DocumentType | null;
  size: number | null;
}

export interface LessonFull {
  id: string;
  module: string;
  course: string;
  type: LessonType;
  title_en: string;
  title_fr: string;
  description_en: string;
  description_fr: string;
  content_en: string;
  content_fr: string;
  videoUrl: string | null;
  durationMinutes: number | null;
  resources: LessonResource[];
  order: number;
}

export interface Student {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  address: string | null;
  profilePhotoUrl: string | null;
  status: StudentStatus;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  enrollmentCount?: number;
}

export interface Progress {
  completed: number;
  total: number;
  percent: number;
}

export type CourseCard = Pick<
  CourseListItem,
  'id' | 'slug' | 'title_en' | 'title_fr' | 'shortDescription_en' | 'shortDescription_fr' | 'thumbnail' | 'level' | 'durationValue' | 'durationUnit' | 'status'
> & { category?: CategoryRef; academicYear?: YearRef | null };

export interface Enrollment {
  id: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  completedAt: string | null;
  createdAt: string;
  student: Pick<Student, 'id' | 'firstName' | 'lastName' | 'status' | 'profilePhotoUrl'> & { user?: { email: string } };
  course: CourseCard;
  progress: Progress;
}

export interface StudentDetail extends Student {
  enrollments: (Omit<Enrollment, 'student'> & { student: string })[];
}

export interface ContactMessage {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  course: { id: string; slug: string; title_en: string; title_fr: string; status: CourseStatus } | string | null;
  courseTitle: string | null;
  message: string;
  locale: Lang;
  status: ContactStatus;
  student: (Pick<Student, 'id' | 'firstName' | 'lastName' | 'status'> & { user?: { email: string } }) | null;
  matchingStudent?: { id: string; firstName: string; lastName: string; email: string; status: StudentStatus } | null;
  readAt: string | null;
  createdAt: string;
}

export interface StudentCourse {
  enrollment: { id: string; status: EnrollmentStatus; enrolledAt: string };
  course: CourseCard;
  progress: Progress;
  nextLesson: { id: string; moduleId: string; title_en: string; title_fr: string } | null;
  lastActivityAt: string | null;
}

export interface StudentDashboard {
  profile: Student;
  stats: { courses: number; inProgress: number; completedCourses: number; lessonsCompleted: number };
  courses: StudentCourse[];
  continueLearning: { courseId: string; lesson: { id: string; title_en: string; title_fr: string } } | null;
}

export interface StudentOutlineLesson extends LessonOutline {
  completed: boolean;
}
export interface StudentOutlineModule extends Omit<ModuleOutline, 'lessons'> {
  lessons: StudentOutlineLesson[];
  completedCount: number;
  totalCount: number;
}
export interface StudentCourseOutline {
  enrollment: { id: string; status: EnrollmentStatus; enrolledAt: string };
  course: Pick<CourseDetail, 'id' | 'slug' | 'title_en' | 'title_fr' | 'shortDescription_en' | 'shortDescription_fr' | 'description_en' | 'description_fr' | 'thumbnail' | 'level' | 'category' | 'academicYear' | 'durationValue' | 'durationUnit'>;
  progress: Progress;
  nextLesson: { id: string; moduleId: string; title_en: string; title_fr: string; completed: boolean } | null;
  modules: StudentOutlineModule[];
}

export interface StudentLessonPayload {
  lesson: LessonFull & { completed: boolean };
  module: { id: string; title_en: string; title_fr: string; order: number };
  course: { id: string; slug: string; title_en: string; title_fr: string };
  previous: { id: string; title_en: string; title_fr: string } | null;
  next: { id: string; title_en: string; title_fr: string } | null;
  progress: Progress;
}

export interface AdminOverview {
  totals: { students: number; activeStudents: number; publishedCourses: number; totalCourses: number; enrollments: number; newContactRequests: number };
  recent: {
    students: (Pick<Student, 'id' | 'firstName' | 'lastName' | 'status' | 'profilePhotoUrl' | 'createdAt'> & { email: string })[];
    contactRequests: ContactMessage[];
    enrollments: { id: string; createdAt: string; enrolledAt: string; student: Pick<Student, 'id' | 'firstName' | 'lastName' | 'profilePhotoUrl'>; course: CourseCard }[];
    courses: { id: string; slug: string; title_en: string; title_fr: string; status: CourseStatus; thumbnail: string | null; category: CategoryRef; createdAt: string }[];
  };
}
