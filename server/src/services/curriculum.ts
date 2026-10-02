import type { z } from 'zod';
import { Course, CourseModule, Lesson, LessonProgress } from '../db';
import { badRequest, notFound } from '../lib/errors';
import type { createLessonSchema, createModuleSchema, updateLessonSchema, updateModuleSchema } from '../schemas/catalog';
import { removeFiles } from '../storage';
import { json } from './common';

type Json = Record<string, any>;

const DOCUMENTS_PREFIX = '/uploads/documents/';

/** Call *after* the database write: deletes uploaded documents among `urls` that no lesson references any more. */
export async function releaseDocuments(urls: string[]) {
  const candidates = [...new Set(urls.filter((u) => u.startsWith(DOCUMENTS_PREFIX)))];
  if (!candidates.length) return;
  const stillUsed = new Set<string>(await Lesson.distinct('resources.url', { 'resources.url': { $in: candidates } }));
  await removeFiles(candidates.filter((u) => !stillUsed.has(u)));
}

const resourceUrls = (lessons: { resources?: { url: string }[] }[]) => lessons.flatMap((l) => (l.resources ?? []).map((r) => r.url));

// ── Modules ───────────────────────────────────────────────────────────────────────────
export async function createModule(input: z.output<typeof createModuleSchema>) {
  const { courseId, ...data } = input;
  if (!(await Course.exists({ _id: courseId }))) throw notFound('Course');
  const last = await CourseModule.findOne({ course: courseId }).sort({ order: -1 }).select('order');
  const created = await CourseModule.create({ ...data, course: courseId, order: (last?.order ?? -1) + 1 });
  return json<Json>(created);
}

export async function updateModule(id: string, input: z.output<typeof updateModuleSchema>) {
  const mod = await CourseModule.findById(id);
  if (!mod) throw notFound('Module');
  mod.set(input);
  await mod.save();
  return json<Json>(mod);
}

export async function deleteModule(id: string) {
  const mod = await CourseModule.findById(id);
  if (!mod) throw notFound('Module');
  const lessons = await Lesson.find({ module: mod._id }).select('_id resources.url').lean();
  await LessonProgress.deleteMany({ lesson: { $in: lessons.map((l) => l._id) } });
  await Lesson.deleteMany({ module: mod._id });
  await mod.deleteOne();
  await releaseDocuments(resourceUrls(lessons));
}

/** `ids` must be exactly the modules of the course, in the desired order (guards against partial/foreign lists). */
export async function reorderModules(courseId: string, ids: string[]) {
  if (!(await Course.exists({ _id: courseId }))) throw notFound('Course');
  const current = (await CourseModule.find({ course: courseId }).distinct('_id')).map(String);
  assertSameSet(current, ids);
  await CourseModule.bulkWrite(ids.map((id, order) => ({ updateOne: { filter: { _id: id }, update: { $set: { order } } } })));
}

// ── Lessons ───────────────────────────────────────────────────────────────────────────
export async function createLesson(input: z.output<typeof createLessonSchema>) {
  const { moduleId, ...data } = input;
  const mod = await CourseModule.findById(moduleId);
  if (!mod) throw notFound('Module');
  const last = await Lesson.findOne({ module: mod._id }).sort({ order: -1 }).select('order');
  const created = await Lesson.create({ ...data, module: mod._id, course: mod.course, order: (last?.order ?? -1) + 1 });
  return json<Json>(created);
}

export async function getLesson(id: string) {
  const lesson = await Lesson.findById(id);
  if (!lesson) throw notFound('Lesson');
  return json<Json>(lesson);
}

export async function updateLesson(id: string, input: z.output<typeof updateLessonSchema>) {
  const lesson = await Lesson.findById(id);
  if (!lesson) throw notFound('Lesson');
  const previousUrls = resourceUrls([lesson]);
  lesson.set(input);
  await lesson.save();
  await releaseDocuments(previousUrls);
  return json<Json>(lesson);
}

export async function deleteLesson(id: string) {
  const lesson = await Lesson.findById(id);
  if (!lesson) throw notFound('Lesson');
  await LessonProgress.deleteMany({ lesson: lesson._id });
  await lesson.deleteOne();
  await releaseDocuments(resourceUrls([lesson]));
}

export async function reorderLessons(moduleId: string, ids: string[]) {
  if (!(await CourseModule.exists({ _id: moduleId }))) throw notFound('Module');
  const current = (await Lesson.find({ module: moduleId }).distinct('_id')).map(String);
  assertSameSet(current, ids);
  await Lesson.bulkWrite(ids.map((id, order) => ({ updateOne: { filter: { _id: id }, update: { $set: { order } } } })));
}

function assertSameSet(current: string[], requested: string[]) {
  const a = new Set(current.map((s) => s.toLowerCase()));
  const b = new Set(requested.map((s) => s.toLowerCase()));
  if (a.size !== b.size || [...a].some((id) => !b.has(id))) {
    throw badRequest('INVALID_ORDER', 'The list must contain exactly the existing items');
  }
}
