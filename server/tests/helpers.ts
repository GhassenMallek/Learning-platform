import request from 'supertest';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { createApp } from '../src/app';
import {
  AcademicYear,
  Admin,
  Category,
  Course,
  CourseModule,
  Lesson,
  Student,
  User,
  clearDatabase,
  connectDb,
  disconnectDb,
  type CourseStatus,
  type StudentStatus,
} from '../src/db';
import { hashPassword } from '../src/lib/security';

export const PASSWORD = 'Passw0rd!test';
let cachedHash: string | undefined;
const passwordHash = async () => (cachedHash ??= await hashPassword(PASSWORD));

export const app = createApp();

/** Supertest agent that keeps cookies and always sends the CSRF header, like our web app does. */
export const client = (target: Parameters<typeof request.agent>[0] = app) => request.agent(target).set('X-Requested-With', 'learning-center');

export function useTestDatabase() {
  beforeAll(async () => {
    await connectDb();
  });
  beforeEach(async () => {
    await clearDatabase();
  });
  afterAll(async () => {
    await disconnectDb();
  });
}

export async function makeAdmin(email = 'admin@test.dev') {
  const user = await User.create({ email, passwordHash: await passwordHash(), role: 'ADMIN' });
  return Admin.create({ user: user._id, firstName: 'Ada', lastName: 'Admin' });
}

export async function makeStudent(email = 'student@test.dev', status: StudentStatus = 'ACTIVE') {
  const user = await User.create({ email, passwordHash: await passwordHash(), role: 'STUDENT' });
  return Student.create({ user: user._id, firstName: 'Sam', lastName: 'Student', status });
}

export async function loginAs(email: string, portal?: 'admin' | 'student') {
  const agent = client();
  const res = await agent.post('/api/auth/login').send({ email, password: PASSWORD, portal });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

export async function adminClient() {
  await makeAdmin();
  return loginAs('admin@test.dev', 'admin');
}

export async function studentClient(email = 'student@test.dev') {
  const student = await makeStudent(email);
  return { agent: await loginAs(email, 'student'), student };
}

export async function makeCategory(slug = 'technology') {
  return (await Category.findOne({ slug })) ?? Category.create({ slug, name_en: slug, name_fr: `${slug}-fr` });
}

export async function makeYear(slug = '2nd-year', sortOrder = 20) {
  return (await AcademicYear.findOne({ slug })) ?? AcademicYear.create({ slug, name_en: slug, name_fr: `${slug}-fr`, sortOrder });
}

/** A complete, publishable course: `modules` modules with `lessons` lessons each. */
export async function makeCourse(opts: { slug?: string; status?: CourseStatus; modules?: number; lessons?: number; year?: string } = {}) {
  const { slug = 'sample-course', status = 'PUBLISHED', modules = 2, lessons = 3 } = opts;
  const category = await makeCategory();
  const year = opts.year ? await makeYear(opts.year) : null;
  const course = await Course.create({
    slug,
    title_en: `Course ${slug}`,
    title_fr: `Cours ${slug}`,
    shortDescription_en: 'Short',
    shortDescription_fr: 'Court',
    description_en: 'Long description',
    description_fr: 'Longue description',
    category: category._id,
    academicYear: year?._id ?? null,
    status,
    publishedAt: status === 'PUBLISHED' ? new Date() : null,
  });
  const moduleDocs = [];
  const lessonDocs = [];
  for (let m = 0; m < modules; m++) {
    const mod = await CourseModule.create({ course: course._id, title_en: `Module ${m + 1}`, title_fr: `Module ${m + 1} fr`, order: m });
    moduleDocs.push(mod);
    for (let l = 0; l < lessons; l++) {
      lessonDocs.push(
        await Lesson.create({
          module: mod._id,
          course: course._id,
          title_en: `Lesson ${m + 1}.${l + 1}`,
          title_fr: `Leçon ${m + 1}.${l + 1}`,
          content_en: `SECRET CONTENT ${m + 1}.${l + 1}`,
          content_fr: `CONTENU SECRET ${m + 1}.${l + 1}`,
          videoUrl: 'https://example.com/private-video',
          durationMinutes: 10,
          order: l,
        }),
      );
    }
  }
  return { course, modules: moduleDocs, lessons: lessonDocs, category, year };
}
