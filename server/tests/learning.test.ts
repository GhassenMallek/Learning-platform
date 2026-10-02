import { describe, expect, it } from 'vitest';
import { Enrollment, LessonProgress } from '../src/db';
import { adminClient, makeCourse, makeStudent, loginAs, studentClient, useTestDatabase } from './helpers';

async function enrolled(lessonsPerModule = 3, modules = 2) {
  const { agent, student } = await studentClient();
  const data = await makeCourse({ modules, lessons: lessonsPerModule });
  await Enrollment.create({ student: student._id, course: data.course._id });
  return { agent, student, ...data };
}

describe('learning and progress', () => {
  useTestDatabase();

  it('calculates progress from real lesson completions (completed ÷ total × 100)', async () => {
    const { agent, course, lessons } = await enrolled(3, 2); // 6 lessons
    const percentAfter = async () => (await agent.get(`/api/me/courses/${course.id}`)).body.data.progress;

    expect(await percentAfter()).toEqual({ completed: 0, total: 6, percent: 0 });
    const first = await agent.post('/api/progress').send({ lessonId: lessons[0].id, completed: true });
    expect(first.status).toBe(200);
    expect(first.body.data.progress).toEqual({ completed: 1, total: 6, percent: 17 });
    await agent.post('/api/progress').send({ lessonId: lessons[1].id });
    await agent.post('/api/progress').send({ lessonId: lessons[2].id });
    expect((await percentAfter()).percent).toBe(50);

    // Completing the same lesson twice never double counts.
    await agent.post('/api/progress').send({ lessonId: lessons[2].id, completed: true });
    expect((await percentAfter()).completed).toBe(3);

    // Un-completing lowers it again.
    const undone = await agent.post('/api/progress').send({ lessonId: lessons[2].id, completed: false });
    expect(undone.body.data.progress.percent).toBe(33);

    for (const l of lessons) await agent.post('/api/progress').send({ lessonId: l.id, completed: true });
    expect((await percentAfter()).percent).toBe(100);
  });

  it("shows each student only their own progress", async () => {
    const { agent, course, lessons, student } = await enrolled(2, 1);
    const otherStudent = await makeStudent('other@test.dev');
    await Enrollment.create({ student: otherStudent._id, course: course._id });
    await agent.post('/api/progress').send({ lessonId: lessons[0].id });

    const other = await loginAs('other@test.dev', 'student');
    expect((await other.get(`/api/me/courses/${course.id}`)).body.data.progress.completed).toBe(0);
    expect(await LessonProgress.countDocuments({ student: student._id })).toBe(1);
    // The body cannot name another student: `studentId` is ignored, the session decides.
    await other.post('/api/progress').send({ lessonId: lessons[1].id, studentId: student.id });
    expect(await LessonProgress.countDocuments({ student: student._id })).toBe(1);
    expect(await LessonProgress.countDocuments({ student: otherStudent._id })).toBe(1);
  });

  it('gives lesson content only to enrolled students', async () => {
    const { agent, lessons } = await enrolled(1, 1);
    const own = await agent.get(`/api/me/lessons/${lessons[0].id}`);
    expect(own.status).toBe(200);
    expect(own.body.data.lesson).toMatchObject({ content_en: 'SECRET CONTENT 1.1', videoUrl: 'https://example.com/private-video', completed: false });

    const { lessons: foreign } = await makeCourse({ slug: 'not-mine', modules: 1, lessons: 1 });
    const denied = await agent.get(`/api/me/lessons/${foreign[0].id}`);
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('NOT_ENROLLED');
    expect(JSON.stringify(denied.body)).not.toMatch(/SECRET/);
    expect((await agent.post('/api/progress').send({ lessonId: foreign[0].id })).status).toBe(403);
  });

  it('keeps access for enrolled students when the course is unpublished or archived', async () => {
    const { agent, course, lessons } = await enrolled(1, 1);
    course.status = 'ARCHIVED';
    await course.save();
    expect((await agent.get(`/api/me/lessons/${lessons[0].id}`)).status).toBe(200);
  });

  it('builds the dashboard: real progress per course, next lesson and stats', async () => {
    const { agent, lessons } = await enrolled(2, 2); // 4 lessons
    await agent.post('/api/progress').send({ lessonId: lessons[0].id });
    await agent.post('/api/progress').send({ lessonId: lessons[1].id });
    const res = await agent.get('/api/me/dashboard');
    const data = res.body.data;
    expect(data.stats).toMatchObject({ courses: 1, inProgress: 1, completedCourses: 0, lessonsCompleted: 2 });
    expect(data.courses[0].progress).toEqual({ completed: 2, total: 4, percent: 50 });
    expect(data.courses[0].nextLesson.id).toBe(lessons[2].id);
    expect(data.continueLearning.lesson.id).toBe(lessons[2].id);
    expect(data.profile.firstName).toBe('Sam');
  });

  it('serves the outline with per-module completion and previous/next navigation', async () => {
    const { agent, course, lessons } = await enrolled(2, 2);
    await agent.post('/api/progress').send({ lessonId: lessons[0].id });
    const outline = (await agent.get(`/api/me/courses/${course.id}`)).body.data;
    expect(outline.modules[0]).toMatchObject({ completedCount: 1, totalCount: 2 });
    expect(outline.modules[0].lessons[0].completed).toBe(true);
    expect(JSON.stringify(outline)).not.toMatch(/SECRET|content_en/); // outline carries no bodies

    const middle = (await agent.get(`/api/me/lessons/${lessons[1].id}`)).body.data;
    expect(middle.previous.id).toBe(lessons[0].id);
    expect(middle.next.id).toBe(lessons[2].id);
    expect((await agent.get(`/api/me/lessons/${lessons[0].id}`)).body.data.previous).toBeNull();
    expect((await agent.get(`/api/me/lessons/${lessons[3].id}`)).body.data.next).toBeNull();
  });

  it('rejects malformed progress requests', async () => {
    const { agent } = await enrolled();
    for (const body of [{}, { lessonId: 'abc' }, { lessonId: { $ne: null } }, { lessonId: '64b000000000000000000000', completed: 'yes' }]) {
      expect((await agent.post('/api/progress').send(body)).status).toBe(400);
    }
    expect((await agent.post('/api/progress').send({ lessonId: '64b000000000000000000000' })).status).toBe(404);
  });

  it("reflects a deleted lesson immediately (progress is never stale)", async () => {
    const { agent, course, lessons } = await enrolled(2, 1);
    await agent.post('/api/progress').send({ lessonId: lessons[0].id });
    await agent.post('/api/progress').send({ lessonId: lessons[1].id });
    const admin = await adminClient();
    await admin.delete(`/api/lessons/${lessons[1].id}`);
    expect((await agent.get(`/api/me/courses/${course.id}`)).body.data.progress).toEqual({ completed: 1, total: 1, percent: 100 });
  });
});
