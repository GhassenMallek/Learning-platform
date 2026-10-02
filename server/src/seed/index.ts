/**
 * Initial database population.
 *
 *   npm run seed        admin account, site settings, categories, academic years and the 8 starter courses
 *   npm run seed:demo   … plus a demo student with real lesson progress and sample contact requests
 *   npm run seed:reset  wipe the database first (never in production), then seed everything incl. demo data
 *
 * Idempotent: existing records are never overwritten, so it is safe to run again after the admin edited content.
 * These courses are ordinary database rows — the app has no knowledge of them; the admin can add any other course.
 */
import { env } from '../config/env';
import {
  AcademicYear,
  Admin,
  Category,
  ContactMessage,
  Course,
  CourseModule,
  Enrollment,
  Lesson,
  LessonProgress,
  Setting,
  Student,
  User,
  clearDatabase,
  connectDb,
  databaseName,
  disconnectDb,
} from '../db';
import { generateTemporaryPassword, hashPassword } from '../lib/security';
import { DEFAULT_SITE } from '../services/engagement';
import { accountingCourses } from './data/accounting';
import { flutter } from './data/flutter';
import { contentKeys, lessonBody, type SeedCourse } from './data/helpers';
// The source data is bilingual; the site is French-only, so only the French side is stored.
const frOnly = (v: { fr: string }) => ({ fr: v.fr });
import { java } from './data/java';
import { RESOURCES } from './data/resources';

const args = new Set(process.argv.slice(2));
const log = (msg: string) => console.log(`  ${msg}`);

async function seedAdmin() {
  const email = env.SEED_ADMIN_EMAIL.toLowerCase();
  if (await User.exists({ email })) return log(`• admin ${email} already exists`);
  const provided = env.SEED_ADMIN_PASSWORD;
  if (provided !== undefined && provided !== '' && provided.length < 8) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters (tip: quote it in .env if it contains "#").');
  }
  const password = provided || `${generateTemporaryPassword()}${generateTemporaryPassword()}`;
  const user = await User.create({ email, passwordHash: await hashPassword(password), role: 'ADMIN', mustChangePassword: !provided });
  await Admin.create({ user: user._id, firstName: 'Site', lastName: 'Admin' });
  log(`✔ admin created: ${email}${provided ? ' (password from SEED_ADMIN_PASSWORD)' : `  password: ${password}   ← shown once, you will be asked to change it`}`);
}

async function seedSettings() {
  await Setting.updateOne({ key: 'site' }, { $setOnInsert: { value: DEFAULT_SITE } }, { upsert: true });
  log('✔ site settings');
}

async function seedTaxonomy() {
  const categories = [
    { slug: 'technology', name_fr: 'Technologie', description_fr: 'Programmation, logiciels et compétences numériques.', sortOrder: 10 },
    { slug: 'accounting', name_fr: 'Comptabilité', description_fr: 'Comptabilité, fiscalité, audit et information financière.', sortOrder: 20 },
  ];
  const years = [
    { slug: '2nd-year', name_fr: '2e année', sortOrder: 20 },
    { slug: '3rd-year', name_fr: '3e année', sortOrder: 30 },
  ];
  const cat = new Map<string, unknown>();
  const year = new Map<string, unknown>();
  for (const c of categories) cat.set(c.slug, (await Category.findOneAndUpdate({ slug: c.slug }, { $setOnInsert: c }, { upsert: true, new: true }))!._id);
  for (const y of years) year.set(y.slug, (await AcademicYear.findOneAndUpdate({ slug: y.slug }, { $setOnInsert: y }, { upsert: true, new: true }))!._id);
  log(`✔ ${categories.length} categories, ${years.length} academic years`);
  return { cat, year };
}

async function seedCourses(tax: Awaited<ReturnType<typeof seedTaxonomy>>) {
  const all: SeedCourse[] = [flutter, java, ...accountingCourses];
  const used = new Set<string>();
  let created = 0;
  let lessonCount = 0;

  for (const [index, c] of all.entries()) {
    if (await Course.exists({ slug: c.slug })) {
      log(`• course "${c.slug}" already exists — left untouched`);
      continue;
    }
    const course = await Course.create({
      slug: c.slug,
      title_fr: c.title.fr,
      shortDescription_fr: c.short.fr,
      description_fr: c.description.fr,
      category: tax.cat.get(c.category),
      academicYear: c.year ? tax.year.get(c.year) : null,
      level: c.level,
      durationValue: c.duration.value,
      durationUnit: c.duration.unit,
      price: null,
      showPrice: false,
      currency: DEFAULT_SITE.currency,
      sortOrder: (index + 1) * 10,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      objectives: c.objectives.map(frOnly),
      audience: c.audience.map(frOnly),
      skills: c.skills.map(frOnly),
      faq: c.faq.map((f) => ({ question: frOnly(f.q), answer: frOnly(f.a) })),
      project: c.project ? { title: frOnly(c.project.title), description: frOnly(c.project.description) } : null,
    });
    for (const [mi, m] of c.modules.entries()) {
      const moduleDoc = await CourseModule.create({
        course: course._id,
        title_fr: m.title.fr,
        description_fr: m.description.fr,
        order: mi,
      });
      await Lesson.insertMany(
        m.lessons.map((ls, li) => {
          const body = lessonBody(c.slug, ls.title.en);
          if (body.en) {
            used.add(`${c.slug}|${ls.title.en}|en`);
            used.add(`${c.slug}|${ls.title.en}|fr`);
          }
          return {
            module: moduleDoc._id,
            course: course._id,
            type: ls.type,
            title_fr: ls.title.fr,
            description_fr: ls.description.fr,
            content_fr: body.fr,
            durationMinutes: ls.minutes,
            resources: (RESOURCES[`${c.slug}|${ls.title.en}`] ?? []).map((r) => ({ ...r, title: frOnly(r.title) })),
            order: li,
          };
        }),
      );
      lessonCount += m.lessons.length;
    }
    created++;
    log(`✔ ${c.category}${c.year ? ` / ${c.year}` : ''} — ${c.title.en}`);
  }

  const unused = contentKeys().filter((k) => !used.has(k));
  if (created > 0 && unused.length > 0) console.warn(`  ⚠ content bodies with no matching lesson:\n    ${unused.join('\n    ')}`);
  log(`✔ ${created} course(s) created with ${lessonCount} lessons`);
}

// ── Demo data (only with --demo) ──────────────────────────────────────────────────────
const DEMO_PASSWORD = 'Student#Learn2026';

async function completeLessons(studentId: unknown, courseSlug: string, percent: number) {
  const course = await Course.findOne({ slug: courseSlug });
  if (!course) return;
  const modules = await CourseModule.find({ course: course._id }).sort({ order: 1 });
  const ordered = (await Promise.all(modules.map((m) => Lesson.find({ module: m._id }).sort({ order: 1 })))).flat();
  const count = Math.round((ordered.length * percent) / 100);
  const now = Date.now();
  await LessonProgress.insertMany(
    ordered.slice(0, count).map((lesson, i) => ({
      student: studentId,
      lesson: lesson._id,
      course: course._id,
      completed: true,
      completedAt: new Date(now - (count - i) * 3 * 3600_000),
    })),
  );
}

async function seedDemo() {
  const people = [
    { firstName: 'Ahmed', lastName: 'Ben Ali', email: 'ahmed.benali@example.com', phone: '+216 20 123 456', dateOfBirth: new Date('2003-04-12'), address: 'Tunis', status: 'ACTIVE' as const },
    { firstName: 'Sarra', lastName: 'Trabelsi', email: 'sarra.trabelsi@example.com', phone: '+216 55 987 654', dateOfBirth: new Date('2002-11-03'), address: 'Sfax', status: 'ACTIVE' as const },
    { firstName: 'Yassine', lastName: 'Gharbi', email: 'yassine.gharbi@example.com', phone: null, dateOfBirth: null, address: null, status: 'INACTIVE' as const },
  ];
  const ids = new Map<string, unknown>();
  for (const { email, ...profile } of people) {
    const existing = await User.findOne({ email });
    if (existing) {
      ids.set(email, (await Student.findOne({ user: existing._id }))?._id);
      continue;
    }
    const user = await User.create({ email, passwordHash: await hashPassword(DEMO_PASSWORD), role: 'STUDENT' });
    ids.set(email, (await Student.create({ ...profile, user: user._id }))._id);
  }
  log(`✔ demo students (password for all: ${DEMO_PASSWORD})`);

  const enroll = async (email: string, slug: string, enrolledAt: string, percent: number) => {
    const course = await Course.findOne({ slug });
    const student = ids.get(email);
    if (!course || !student || (await Enrollment.exists({ student, course: course._id }))) return;
    await Enrollment.create({ student, course: course._id, enrolledAt: new Date(enrolledAt) });
    if (percent > 0) await completeLessons(student, slug, percent);
  };
  await enroll('ahmed.benali@example.com', 'flutter-development', '2026-09-21', 65);
  await enroll('ahmed.benali@example.com', 'java-oop', '2026-09-10', 30);
  await enroll('sarra.trabelsi@example.com', 'intermediate-accounting-1', '2026-09-14', 40);
  await enroll('sarra.trabelsi@example.com', 'taxation-irpp-is', '2026-09-16', 10);
  await enroll('yassine.gharbi@example.com', 'ifrs', '2026-08-30', 0);
  log('✔ demo enrollments with real lesson progress');

  if (await ContactMessage.estimatedDocumentCount()) return log('• contact requests already exist');
  const course = async (slug: string) => Course.findOne({ slug }).select('title_fr');
  const hours = (h: number) => new Date(Date.now() - h * 3600_000);
  const [fl, ifrsC, tax, audit] = await Promise.all([course('flutter-development'), course('ifrs'), course('taxation-irpp-is'), course('financial-audit')]);
  await ContactMessage.insertMany([
    { fullName: 'Leila Mansouri', email: 'leila.mansouri@example.com', phone: '+216 22 456 789', course: fl?._id, courseTitle: fl?.title_fr, locale: 'fr', message: "Bonjour, je souhaite connaître les prochaines dates de démarrage de la formation Flutter ainsi que les modalités d'inscription. Merci !", status: 'NEW', createdAt: hours(2) },
    { fullName: 'Nour Haddad', email: 'nour.haddad@example.com', phone: null, course: null, courseTitle: null, locale: 'fr', message: 'Je souhaiterais recevoir le programme complet de vos cours de comptabilité de 2e année, avec le calendrier.', status: 'NEW', createdAt: hours(5) },
    { fullName: 'John Carter', email: 'j.carter@example.com', phone: null, course: ifrsC?._id, courseTitle: ifrsC?.title_fr, locale: 'fr', message: 'Bonjour, la formation IFRS convient-elle à une personne ayant deux ans d’expérience en audit ? Proposez-vous des séances le soir ?', status: 'NEW', createdAt: hours(26) },
    { fullName: 'Sarra Trabelsi', email: 'sarra.trabelsi@example.com', phone: '+216 55 987 654', course: audit?._id, courseTitle: audit?.title_fr, locale: 'fr', message: "Bonjour, je suis déjà inscrite en Comptabilité Intermédiaire I. Puis-je aussi m'inscrire au cours d'Audit Financier ?", status: 'NEW', createdAt: hours(30) },
    { fullName: 'Mehdi Karray', email: 'mehdi.karray@example.com', phone: '+216 98 765 432', course: tax?._id, courseTitle: tax?.title_fr, locale: 'fr', message: 'Bonjour, proposez-vous des cas pratiques corrigés pour la partie IRPP ?', status: 'READ', readAt: hours(60), createdAt: hours(72) },
    { fullName: 'Karim Jlassi', email: 'karim.jlassi@example.com', phone: null, course: null, courseTitle: null, locale: 'fr', message: 'Merci, j’ai trouvé les informations dont j’avais besoin sur le site.', status: 'ARCHIVED', readAt: hours(120), createdAt: hours(130) },
  ]);
  log('✔ demo contact requests');
}

async function main() {
  await connectDb();
  console.log(`\nSeeding database "${databaseName()}" …`);
  if (args.has('--reset')) {
    if (env.isProd) throw new Error('--reset is disabled in production');
    await clearDatabase();
    log('✔ all collections cleared');
  }
  await seedAdmin();
  await seedSettings();
  await seedCourses(await seedTaxonomy());
  if (args.has('--demo')) await seedDemo();
  console.log('\nDone.\n');
}

main()
  .catch((err) => {
    console.error('\nSeed failed:', err);
    process.exitCode = 1;
  })
  .finally(disconnectDb);
