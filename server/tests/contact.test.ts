import { describe, expect, it } from 'vitest';
import { ContactMessage, Enrollment, Student, User } from '../src/db';
import { adminClient, client, makeCourse, makeStudent, studentClient, useTestDatabase } from './helpers';

const valid = { fullName: 'Leila Mansouri', email: 'Leila@Example.com', phone: '+216 22 456 789', message: 'Je souhaite plus d’informations, merci.', locale: 'fr' };

describe('contact requests', () => {
  useTestDatabase();

  it('stores a public request in the database, tied to a published course', async () => {
    const { course } = await makeCourse();
    const res = await client().post('/api/contact').send({ ...valid, courseId: course.id });
    expect(res.status).toBe(201);
    const stored = await ContactMessage.findOne();
    expect(stored).toMatchObject({ fullName: 'Leila Mansouri', email: 'leila@example.com', status: 'NEW', courseTitle: `Cours ${course.slug}`, locale: 'fr' });
    expect(String(stored!.course)).toBe(course.id);
  });

  it('snapshots the French course title, whatever locale the client sends', async () => {
    const { course } = await makeCourse();
    await client().post('/api/contact').send({ ...valid, courseId: course.id, locale: 'en' });
    expect((await ContactMessage.findOne())!.courseTitle).toBe(`Cours ${course.slug}`);
  });

  it('ignores drafts / unknown courses but still saves the message', async () => {
    const { course: draft } = await makeCourse({ slug: 'd', status: 'DRAFT' });
    await client().post('/api/contact').send({ ...valid, courseId: draft.id });
    await client().post('/api/contact').send({ ...valid, courseId: '64b000000000000000000000' });
    const all = await ContactMessage.find();
    expect(all).toHaveLength(2);
    expect(all.every((m) => m.course === null && m.courseTitle === null)).toBe(true);
  });

  it('validates the form with translatable field codes', async () => {
    const res = await client().post('/api/contact').send({ fullName: 'A', email: 'nope', message: 'short', phone: 'abc' });
    expect(res.status).toBe(400);
    const fields = Object.fromEntries(res.body.error.details.map((d: { field: string; code: string }) => [d.field, d.code]));
    expect(fields).toMatchObject({ fullName: 'too_short', email: 'invalid_email', message: 'too_short', phone: 'invalid_phone' });
    expect(await ContactMessage.countDocuments()).toBe(0);
  });

  it('silently drops bot submissions that fill the honeypot', async () => {
    const res = await client().post('/api/contact').send({ ...valid, website: 'http://spam.example' });
    expect(res.status).toBe(201);
    expect(await ContactMessage.countDocuments()).toBe(0);
  });

  it('is the only public write: reading requests needs an admin', async () => {
    await client().post('/api/contact').send(valid);
    const id = String((await ContactMessage.findOne())!._id);
    const { agent: student } = await studentClient();
    for (const who of [client(), student]) {
      expect((await who.get('/api/contact')).status).toBeGreaterThanOrEqual(401);
      expect((await who.get(`/api/contact/${id}`)).status).toBeGreaterThanOrEqual(401);
      expect((await who.patch(`/api/contact/${id}/archive`)).status).toBeGreaterThanOrEqual(401);
    }
  });

  it('lists, searches, filters and moves requests through NEW → READ → NEW → ARCHIVED', async () => {
    const admin = await adminClient();
    await ContactMessage.create([
      { fullName: 'Alice Martin', email: 'alice@x.dev', message: 'Question about Flutter please', courseTitle: 'Flutter' },
      { fullName: 'Bob Stone', email: 'bob@x.dev', message: 'Comptabilité intermédiaire ?' },
    ]);
    const list = await admin.get('/api/contact');
    expect(list.body.meta.counts).toEqual({ NEW: 2, READ: 0, ARCHIVED: 0 });
    expect((await admin.get('/api/contact?q=flutter')).body.data.map((m: { fullName: string }) => m.fullName)).toEqual(['Alice Martin']);
    expect((await admin.get('/api/contact?q=comptabilite')).body.data).toHaveLength(1); // accent-insensitive

    const id = list.body.data[0].id;
    expect((await admin.patch(`/api/contact/${id}/read`)).body.data).toMatchObject({ status: 'READ' });
    expect((await admin.patch(`/api/contact/${id}/unread`)).body.data).toMatchObject({ status: 'NEW', readAt: null });
    expect((await admin.patch(`/api/contact/${id}/archive`)).body.data.status).toBe('ARCHIVED');

    expect((await admin.get('/api/contact')).body.data).toHaveLength(1); // archived is hidden from the inbox
    expect((await admin.get('/api/contact?status=ARCHIVED')).body.data).toHaveLength(1);
    expect((await admin.get('/api/contact?status=ALL')).body.data).toHaveLength(2);
    expect((await admin.get('/api/contact?status=BOGUS')).status).toBe(400);
  });

  it('turns a lead into a student (linked, enrolled, marked read) without duplicates', async () => {
    const admin = await adminClient();
    const { course } = await makeCourse();
    await client().post('/api/contact').send({ ...valid, courseId: course.id });
    const message = await ContactMessage.findOne();

    const created = await admin.post('/api/students').send({
      firstName: 'Leila',
      lastName: 'Mansouri',
      email: 'leila@example.com',
      enrollCourseIds: [course.id],
      contactMessageId: message!.id,
    });
    expect(created.status).toBe(201);
    expect(created.body.data.enrollments).toEqual([{ courseId: course.id, ok: true }]);

    const detail = (await admin.get(`/api/contact/${message!.id}`)).body.data;
    expect(detail.status).toBe('READ');
    expect(detail.student.firstName).toBe('Leila');
    expect(await Enrollment.countDocuments()).toBe(1);

    // A second attempt to create the same person is refused, and the API says who already exists.
    const again = await admin.post('/api/students').send({ firstName: 'Leila', lastName: 'M', email: 'leila@example.com' });
    expect(again.status).toBe(409);
    expect(await User.countDocuments({ role: 'STUDENT' })).toBe(1);
  });

  it('suggests an existing student by e-mail and links to them (with optional enrollment)', async () => {
    const admin = await adminClient();
    const existing = await makeStudent('leila@example.com');
    const { course } = await makeCourse();
    await client().post('/api/contact').send({ ...valid, courseId: course.id });
    const message = (await ContactMessage.findOne())!;

    const detail = (await admin.get(`/api/contact/${message.id}`)).body.data;
    expect(detail.matchingStudent).toMatchObject({ id: existing.id, email: 'leila@example.com' });

    const linked = await admin.patch(`/api/contact/${message.id}/link-student`).send({ studentId: existing.id, enroll: true });
    expect(linked.status).toBe(200);
    expect(linked.body.data.enrollment).toEqual({ ok: true });
    expect(linked.body.data.message).toMatchObject({ status: 'READ', matchingStudent: null });
    expect(await Enrollment.countDocuments({ student: existing._id, course: course._id })).toBe(1);

    // Linking again is harmless: "already enrolled" counts as success.
    const twice = await admin.patch(`/api/contact/${message.id}/link-student`).send({ studentId: existing.id, enroll: true });
    expect(twice.body.data.enrollment).toMatchObject({ ok: true });
    expect(await Student.countDocuments()).toBe(1);
  });
});
