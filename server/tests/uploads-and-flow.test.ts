import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { Enrollment } from '../src/db';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../src/config/env';
import { app, adminClient, client, makeCategory, makeCourse, studentClient, useTestDatabase } from './helpers';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);

describe('uploads', () => {
  useTestDatabase();

  it('stores a real image under a random name and serves it with nosniff', async () => {
    const admin = await adminClient();
    const res = await admin.post('/api/uploads/image?kind=thumbnails').attach('file', PNG, { filename: 'cover.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.data.url).toMatch(/^\/uploads\/thumbnails\/[a-f0-9]{32}\.png$/);
    const served = await request(app).get(res.body.data.url);
    expect(served.status).toBe(200);
    expect(served.headers['x-content-type-options']).toBe('nosniff');
  });

  it('trusts the bytes, not the file name: rejects scripts, SVG and text disguised as images', async () => {
    const admin = await adminClient();
    for (const [name, body, type] of [
      ['evil.png', Buffer.from('<script>alert(1)</script>'), 'image/png'],
      ['logo.svg', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'image/svg+xml'],
      ['page.html', Buffer.from('<html></html>'), 'text/html'],
    ] as const) {
      const res = await admin.post('/api/uploads/image').attach('file', body, { filename: name, contentType: type });
      expect(res.status).toBe(415);
    }
    expect((await admin.post('/api/uploads/image')).status).toBe(400); // no file at all
  });

  it('enforces the size limit and the admin-only rule', async () => {
    const admin = await adminClient();
    const huge = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);
    expect((await admin.post('/api/uploads/image').attach('file', huge, 'big.png')).status).toBe(413);

    const { agent: student } = await studentClient();
    expect((await student.post('/api/uploads/image').attach('file', PNG, 'x.png')).status).toBe(403);
    expect((await client().post('/api/uploads/image').attach('file', PNG, 'x.png')).status).toBe(401);
  });

  it("lets a student set their own avatar (and only theirs)", async () => {
    const { agent } = await studentClient();
    const res = await agent.post('/api/me/avatar').attach('file', PNG, { filename: 'me.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    expect(res.body.data.profilePhotoUrl).toMatch(/^\/uploads\/avatars\//);
  });
});

// Minimal headers: detection only looks at the leading bytes and the uncompressed OOXML part names.
const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(64)]);
const OLE2 = Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(64)]);
const ooxml = (part: string) => Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from(`....[Content_Types].xml....${part}document.xml`), Buffer.alloc(32)]);
const onDisk = (url: string) => fs.existsSync(path.join(env.uploadDir, url.replace('/uploads/', '')));

describe('document uploads', () => {
  useTestDatabase();

  it('accepts PDF, PowerPoint, Word and Excel, identified by their bytes', async () => {
    const admin = await adminClient();
    for (const [name, body, fileType] of [
      ['Chapitre 1 – Bilan.pdf', PDF, 'pdf'],
      ['slides.pptx', ooxml('ppt/'), 'pptx'],
      ['show.ppsx', ooxml('ppt/'), 'ppsx'],
      ['notes.docx', ooxml('word/'), 'docx'],
      ['sheet.xlsx', ooxml('xl/'), 'xlsx'],
      ['old-deck.ppt', OLE2, 'ppt'],
      ['old-sheet.xls', OLE2, 'xls'],
      ['mislabelled.docx', PDF, 'pdf'], // the bytes win over the extension
    ] as const) {
      const res = await admin.post('/api/uploads/document').attach('file', body, { filename: name, contentType: 'application/octet-stream' });
      expect(res.status, name).toBe(201);
      expect(res.body.data).toMatchObject({ fileType, name, size: body.length });
      expect(res.body.data.url).toMatch(new RegExp(`^/uploads/documents/[a-f0-9]{32}\\.${fileType}$`));
    }
  });

  it('rejects anything else, including OLE2 or zip files that are not Office documents', async () => {
    const admin = await adminClient();
    for (const [name, body] of [
      ['run.exe', Buffer.concat([Buffer.from('MZ'), Buffer.alloc(64)])],
      ['page.pdf', Buffer.from('<html><script>alert(1)</script></html>')],
      ['installer.msi', OLE2],
      ['archive.zip', Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(64)])],
    ] as const) {
      expect((await admin.post('/api/uploads/document').attach('file', body, name)).status, name).toBe(415);
    }
    const { agent: student } = await studentClient();
    expect((await student.post('/api/uploads/document').attach('file', PDF, 'x.pdf')).status).toBe(403);
  });

  it('keeps file type and size on lesson resources and deletes files a lesson stops using', async () => {
    const admin = await adminClient();
    const { lessons } = await makeCourse({ modules: 1, lessons: 1 });
    const lessonId = String(lessons[0]._id);
    const upload = async (name: string) => (await admin.post('/api/uploads/document').attach('file', PDF, name)).body.data;
    const [a, b] = [await upload('a.pdf'), await upload('b.pdf')];
    const resource = (f: { url: string; size: number }, title: string) => ({ title: { fr: title }, url: f.url, fileType: 'pdf', size: f.size });

    let res = await admin.put(`/api/lessons/${lessonId}`).send({ resources: [resource(a, 'A'), resource(b, 'B'), { title: { fr: 'Docs' }, url: 'https://example.com' }] });
    expect(res.status).toBe(200);
    expect(res.body.data.resources[0]).toMatchObject({ fileType: 'pdf', size: PDF.length });
    expect(res.body.data.resources[2]).toMatchObject({ fileType: null, size: null });

    res = await admin.put(`/api/lessons/${lessonId}`).send({ resources: [resource(b, 'B')] });
    expect(res.status).toBe(200);
    expect(onDisk(a.url)).toBe(false);
    expect(onDisk(b.url)).toBe(true);

    expect((await admin.delete(`/api/lessons/${lessonId}`)).status).toBe(204);
    expect(onDisk(b.url)).toBe(false);
  });
});

/**
 * The whole business flow from the brief, end to end through the public API:
 * admin creates a course → publishes → visitor sees it → visitor sends a request → admin sees it →
 * creates + enrolls a student → student logs in → completes lessons → progress updates.
 */
describe('end-to-end business flow', () => {
  useTestDatabase();

  it('works from course creation to student progress', async () => {
    const admin = await adminClient();
    const category = await makeCategory('technology');

    // 1. Admin creates a brand-new course (nothing hard-coded: "Python for Beginners").
    const course = (await admin.post('/api/courses').send({ title_fr: 'Python pour débutants', category: category.id, level: 'BEGINNER', durationValue: 6, durationUnit: 'WEEKS' })).body.data;
    await admin.put(`/api/courses/${course.id}`).send({
      shortDescription_fr: 'Apprenez Python.', description_fr: 'Texte long.',
      objectives: [{ fr: 'Écrire des scripts' }], skills: [{ fr: 'Python' }],
      faq: [{ question: { fr: 'Prérequis ?' }, answer: { fr: 'Aucun.' } }],
    });
    const mod = (await admin.post('/api/modules').send({ courseId: course.id, title_fr: 'Bases' })).body.data;
    const lessonIds: string[] = [];
    for (const n of [1, 2, 3, 4]) {
      lessonIds.push((await admin.post('/api/lessons').send({ moduleId: mod.id, title_fr: `Leçon ${n}`, content_fr: `Corps ${n}` })).body.data.id);
    }

    // 2. Not public until published.
    expect((await client().get('/api/courses')).body.data).toHaveLength(0);
    expect((await admin.patch(`/api/courses/${course.id}/publish`)).status).toBe(200);
    const listed = (await client().get('/api/courses?status=PUBLISHED')).body.data;
    expect(listed.map((c: { title_fr: string }) => c.title_fr)).toEqual(['Python pour débutants']);

    // 3. A visitor asks for information; the request lands in the admin inbox.
    expect((await client().post('/api/contact').send({ fullName: 'Nour Haddad', email: 'nour@example.com', message: 'Y a-t-il un cours du soir ?', courseId: course.id, locale: 'fr' })).status).toBe(201);
    const inbox = (await admin.get('/api/contact')).body;
    expect(inbox.data).toHaveLength(1);
    expect(inbox.meta.counts.NEW).toBe(1);
    expect((await admin.get('/api/stats/overview')).body.data.totals).toMatchObject({ newContactRequests: 1, publishedCourses: 1, students: 0 });

    // 4. Admin converts the lead: creates the student, enrolls them, links the request.
    const created = (await admin.post('/api/students').send({
      firstName: 'Nour', lastName: 'Haddad', email: 'nour@example.com', enrollCourseIds: [course.id], contactMessageId: inbox.data[0].id,
    })).body.data;
    expect(created.enrollments[0].ok).toBe(true);
    expect((await admin.get('/api/stats/overview')).body.data.totals).toMatchObject({ newContactRequests: 0, students: 1, enrollments: 1 });

    // 5. The student signs in with the temporary password and sees the course.
    const student = client();
    expect((await student.post('/api/auth/login').send({ email: 'nour@example.com', password: created.temporaryPassword, portal: 'student' })).status).toBe(200);
    const dash = (await student.get('/api/me/dashboard')).body.data;
    expect(dash.courses).toHaveLength(1);
    expect(dash.courses[0].progress.percent).toBe(0);

    // 6. Completing lessons updates the progress: 1/4 → 25 %, 2/4 → 50 %, 4/4 → 100 %.
    const after = async (i: number) => (await student.post('/api/progress').send({ lessonId: lessonIds[i], completed: true })).body.data.progress.percent;
    expect(await after(0)).toBe(25);
    expect(await after(1)).toBe(50);
    await after(2);
    expect(await after(3)).toBe(100);
    expect((await student.get('/api/me/dashboard')).body.data.stats).toMatchObject({ completedCourses: 1, lessonsCompleted: 4 });

    // 7. The admin sees the same real progress on the student's record.
    const record = (await admin.get(`/api/students/${created.student.id}`)).body.data;
    expect(record.enrollments[0].progress).toEqual({ completed: 4, total: 4, percent: 100 });
    expect(await Enrollment.countDocuments()).toBe(1);
  });
});
