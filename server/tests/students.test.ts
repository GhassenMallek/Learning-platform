import { describe, expect, it } from 'vitest';
import { Enrollment, LessonProgress, Student, User } from '../src/db';
import { adminClient, client, loginAs, makeAdmin, makeCourse, makeStudent, PASSWORD, studentClient, useTestDatabase } from './helpers';

describe('students and enrollments', () => {
  useTestDatabase();

  it('creates a student with a one-time temporary password that works and forces a change', async () => {
    const admin = await adminClient();
    const res = await admin.post('/api/students').send({ firstName: 'Ahmed', lastName: 'Ben Ali', email: 'Ahmed@Example.com', phone: '+216 20 123 456' });
    expect(res.status).toBe(201);
    const { student, temporaryPassword } = res.body.data;
    expect(student).toMatchObject({ email: 'ahmed@example.com', status: 'ACTIVE', mustChangePassword: true });
    expect(temporaryPassword).toMatch(/.{8,}/);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);

    const login = await client().post('/api/auth/login').send({ email: 'ahmed@example.com', password: temporaryPassword, portal: 'student' });
    expect(login.status).toBe(200);
    expect(login.body.data.mustChangePassword).toBe(true);
  });

  it('refuses a duplicate e-mail and points to the existing student', async () => {
    const admin = await adminClient();
    const existing = await makeStudent('dup@test.dev');
    const res = await admin.post('/api/students').send({ firstName: 'Other', lastName: 'Person', email: 'DUP@test.dev' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'EMAIL_TAKEN', details: { studentId: existing.id } });
    expect(await User.countDocuments({ email: 'dup@test.dev' })).toBe(1);
  });

  it('validates student input (e-mail, phone, birth date in the future)', async () => {
    const admin = await adminClient();
    const res = await admin.post('/api/students').send({ firstName: 'A', lastName: 'B', email: 'not-an-email', phone: 'abc', dateOfBirth: '2999-01-01' });
    expect(res.status).toBe(400);
    const fields = Object.fromEntries(res.body.error.details.map((d: { field: string; code: string }) => [d.field, d.code]));
    expect(fields).toMatchObject({ email: 'invalid_email', phone: 'invalid_phone', dateOfBirth: 'invalid_date' });
  });

  it('searches by name (every word), e-mail and phone, and filters by status', async () => {
    const admin = await adminClient();
    await makeStudent('ahmed.benali@test.dev');
    const other = await makeStudent('sarra@test.dev', 'INACTIVE');
    await Student.updateOne({ _id: other._id }, { firstName: 'Sarra', lastName: 'Trabelsi', phone: '+216 55 111 222' });
    await Student.updateOne({ user: (await User.findOne({ email: 'ahmed.benali@test.dev' }))!._id }, { firstName: 'Ahmed', lastName: 'Ben Ali' });

    const names = async (qs: string) => (await admin.get(`/api/students?${qs}`)).body.data.map((s: { firstName: string }) => s.firstName);
    expect(await names('q=ahmed%20ben')).toEqual(['Ahmed']);
    expect(await names('q=benali@test')).toEqual(['Ahmed']);
    expect(await names('q=55%20111')).toEqual(['Sarra']);
    expect(await names('status=INACTIVE')).toEqual(['Sarra']);
    expect(await names('q=nobody')).toEqual([]);
  });

  it('deactivates a student without deleting anything and reactivates them', async () => {
    const admin = await adminClient();
    const { agent, student } = await studentClient();
    expect((await admin.patch(`/api/students/${student.id}/status`).send({ status: 'INACTIVE' })).body.data.status).toBe('INACTIVE');
    expect((await agent.get('/api/me/courses')).status).toBe(403);
    expect(await Student.countDocuments()).toBe(1);
    await admin.patch(`/api/students/${student.id}/status`).send({ status: 'ACTIVE' });
    expect((await agent.get('/api/me/courses')).status).toBe(200);
  });

  it('resets a password: new temporary password works, old sessions and password die', async () => {
    const admin = await adminClient();
    const { agent, student } = await studentClient();
    const reset = await admin.post(`/api/students/${student.id}/reset-password`);
    const temp = reset.body.data.temporaryPassword;
    expect((await agent.get('/api/auth/me')).status).toBe(401);
    expect((await client().post('/api/auth/login').send({ email: 'student@test.dev', password: PASSWORD })).status).toBe(401);
    expect((await client().post('/api/auth/login').send({ email: 'student@test.dev', password: temp })).status).toBe(200);
  });

  it('enrolls a student once, never twice, and only in published courses', async () => {
    const admin = await adminClient();
    const student = await makeStudent();
    const { course } = await makeCourse({ slug: 'pub' });
    const { course: draft } = await makeCourse({ slug: 'draft', status: 'DRAFT' });

    const ok = await admin.post('/api/enrollments').send({ studentId: student.id, courseId: course.id, enrolledAt: '2026-09-21' });
    expect(ok.status).toBe(201);
    expect(new Date(ok.body.data.enrolledAt).toISOString().slice(0, 10)).toBe('2026-09-21');

    const dup = await admin.post('/api/enrollments').send({ studentId: student.id, courseId: course.id });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('ALREADY_ENROLLED');

    const unpublished = await admin.post('/api/enrollments').send({ studentId: student.id, courseId: draft.id });
    expect(unpublished.body.error.code).toBe('COURSE_NOT_PUBLISHED');
    expect((await admin.post('/api/enrollments').send({ studentId: '64b000000000000000000000', courseId: course.id })).body.error.code).toBe('STUDENT_NOT_FOUND');
    expect(await Enrollment.countDocuments()).toBe(1);
  });

  it('survives two concurrent enrollment requests (unique index)', async () => {
    const admin = await adminClient();
    const student = await makeStudent();
    const { course } = await makeCourse();
    const results = await Promise.all([1, 2, 3].map(() => admin.post('/api/enrollments').send({ studentId: student.id, courseId: course.id })));
    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409]);
    expect(await Enrollment.countDocuments()).toBe(1);
  });

  it('keeps progress when an enrollment is removed and restores it on re-enrollment', async () => {
    const admin = await adminClient();
    const { agent, student } = await studentClient();
    const { course, lessons } = await makeCourse({ modules: 1, lessons: 4 });
    const enrollment = (await admin.post('/api/enrollments').send({ studentId: student.id, courseId: course.id })).body.data;
    await agent.post('/api/progress').send({ lessonId: lessons[0].id, completed: true });

    expect((await admin.delete(`/api/enrollments/${enrollment.id}`)).status).toBe(204);
    expect((await agent.get(`/api/me/courses/${course.id}`)).status).toBe(403);
    expect(await LessonProgress.countDocuments()).toBe(1);

    await admin.post('/api/enrollments').send({ studentId: student.id, courseId: course.id });
    expect((await agent.get(`/api/me/courses/${course.id}`)).body.data.progress).toMatchObject({ completed: 1, total: 4, percent: 25 });
  });

  it('suspends access when an enrollment is cancelled', async () => {
    const admin = await adminClient();
    const { agent, student } = await studentClient();
    const { course } = await makeCourse();
    const enrollment = (await admin.post('/api/enrollments').send({ studentId: student.id, courseId: course.id })).body.data;
    expect((await agent.get(`/api/me/courses/${course.id}`)).status).toBe(200);
    await admin.patch(`/api/enrollments/${enrollment.id}`).send({ status: 'CANCELLED' });
    expect((await agent.get(`/api/me/courses/${course.id}`)).status).toBe(403);
  });

  it("only lets a student read their own enrollments (no IDOR)", async () => {
    const { agent, student } = await studentClient('me@test.dev');
    const other = await makeStudent('other@test.dev');
    expect((await agent.get(`/api/enrollments/student/${student.id}`)).status).toBe(200);
    expect((await agent.get(`/api/enrollments/student/${other.id}`)).status).toBe(403);
    expect((await client().get(`/api/enrollments/student/${student.id}`)).status).toBe(401);
    const admin = await loginAsAdmin();
    expect((await admin.get(`/api/enrollments/student/${other.id}`)).status).toBe(200);
  });

  it('lets a student edit only phone and address — never name, e-mail or status', async () => {
    const { agent, student } = await studentClient();
    const res = await agent.put('/api/me/profile').send({ phone: '+216 99 000 111', address: 'Sousse', firstName: 'Hacker', email: 'evil@x.dev', status: 'INACTIVE' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ phone: '+216 99 000 111', address: 'Sousse', firstName: 'Sam', email: 'student@test.dev', status: 'ACTIVE' });
    const stored = await Student.findById(student.id);
    expect(stored).toMatchObject({ firstName: 'Sam', status: 'ACTIVE' });
  });
});

async function loginAsAdmin() {
  await makeAdmin('root@test.dev');
  return loginAs('root@test.dev', 'admin');
}
