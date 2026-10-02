import { describe, expect, it } from 'vitest';
import { Lesson, LessonProgress, CourseModule } from '../src/db';
import { adminClient, makeCourse, makeStudent, useTestDatabase } from './helpers';

describe('modules and lessons', () => {
  useTestDatabase();

  it('creates modules and lessons in order and links each lesson to its course', async () => {
    const admin = await adminClient();
    const { course } = await makeCourse({ modules: 0 });
    const m1 = await admin.post('/api/modules').send({ courseId: course.id, title_fr: 'Un' });
    const m2 = await admin.post('/api/modules').send({ courseId: course.id, title_fr: 'Deux' });
    expect([m1.body.data.order, m2.body.data.order]).toEqual([0, 1]);

    const lesson = await admin.post('/api/lessons').send({
      moduleId: m1.body.data.id,
      title_fr: 'A',
      type: 'VIDEO',
      videoUrl: 'https://www.youtube.com/watch?v=abc',
      resources: [{ title: { fr: 'Docs' }, url: 'https://example.com/docs' }],
    });
    expect(lesson.status).toBe(201);
    expect(lesson.body.data).toMatchObject({ order: 0, type: 'VIDEO', course: course.id });
  });

  it('rejects dangerous or malformed URLs and unknown lesson types', async () => {
    const admin = await adminClient();
    const { modules } = await makeCourse({ modules: 1, lessons: 0 });
    const base = { moduleId: modules[0].id, title_fr: 'A' };
    for (const bad of [
      { videoUrl: 'javascript:alert(1)' },
      { videoUrl: 'data:text/html,<script>alert(1)</script>' },
      { resources: [{ title: { fr: 'x' }, url: 'javascript:alert(1)' }] },
      { type: 'HACK' },
      { durationMinutes: -5 },
    ]) {
      expect((await admin.post('/api/lessons').send({ ...base, ...bad })).status).toBe(400);
    }
  });

  it('reorders modules and lessons, and insists on the exact set of ids', async () => {
    const admin = await adminClient();
    const { course, modules, lessons } = await makeCourse({ modules: 3, lessons: 3 });
    const reversed = [...modules].reverse().map((m) => m.id);
    expect((await admin.put('/api/modules/reorder').send({ parentId: course.id, ids: reversed })).status).toBe(200);
    expect((await CourseModule.find({ course: course._id }).sort({ order: 1 })).map((m) => m.id)).toEqual(reversed);

    const first = lessons.filter((l) => String(l.module) === modules[0].id);
    const lessonOrder = [first[2].id, first[0].id, first[1].id];
    expect((await admin.put('/api/lessons/reorder').send({ parentId: modules[0].id, ids: lessonOrder })).status).toBe(204);
    expect((await Lesson.find({ module: modules[0]._id }).sort({ order: 1 })).map((l) => l.id)).toEqual(lessonOrder);

    for (const ids of [[modules[0].id], [...reversed, lessons[0].id], [reversed[0], reversed[0], reversed[1]]]) {
      const res = await admin.put('/api/modules/reorder').send({ parentId: course.id, ids });
      expect(res.status).toBe(400);
    }
  });

  it('deleting a module removes its lessons and their progress', async () => {
    const admin = await adminClient();
    const { modules, lessons, course } = await makeCourse({ modules: 2, lessons: 2 });
    const student = await makeStudent();
    await LessonProgress.create({ student: student._id, lesson: lessons[0]._id, course: course._id, completed: true });

    expect((await admin.delete(`/api/modules/${modules[0].id}`)).status).toBe(204);
    expect(await Lesson.countDocuments({ course: course._id })).toBe(2);
    expect(await LessonProgress.countDocuments()).toBe(0);
    expect((await admin.delete(`/api/modules/${modules[0].id}`)).status).toBe(404);
  });

  it('updates and deletes a single lesson', async () => {
    const admin = await adminClient();
    const { lessons } = await makeCourse({ modules: 1, lessons: 1 });
    const updated = await admin.put(`/api/lessons/${lessons[0].id}`).send({ title_fr: 'Renommée', content_fr: '# Bonjour' });
    expect(updated.body.data).toMatchObject({ title_fr: 'Renommée', content_fr: '# Bonjour' });
    expect((await admin.delete(`/api/lessons/${lessons[0].id}`)).status).toBe(204);
    expect((await admin.get(`/api/lessons/${lessons[0].id}`)).status).toBe(404);
  });
});
