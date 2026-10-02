import { Router, type Request } from 'express';
import type { Model } from 'mongoose';
import { z } from 'zod';
import { AcademicYear, Category, Course } from '../db';
import { conflict, notFound } from '../lib/errors';
import { pageMeta, parse, send } from '../lib/http';
import { adminOnly, optionalAuth } from '../middleware/auth';
import {
  createAcademicYearSchema,
  createCategorySchema,
  createCourseSchema,
  createLessonSchema,
  createModuleSchema,
  listCoursesQuery,
  reorderSchema,
  updateAcademicYearSchema,
  updateCategorySchema,
  updateCourseSchema,
  updateLessonSchema,
  updateModuleSchema,
} from '../schemas/catalog';
import { idParam } from '../schemas/common';
import { changeCourseStatus, courseStudents, createCourse, deleteCourse, getCourseDetail, listCourses, updateCourse, adminCourseDetail } from '../services/courses';
import { uniqueSlug } from '../services/common';
import * as curriculum from '../services/curriculum';

const isAdmin = (req: Request) => req.auth?.role === 'ADMIN';

// ── Categories & academic years share one implementation ──────────────────────────────
function taxonomyRouter(opts: {
  model: Model<any>;
  courseField: 'category' | 'academicYear';
  createSchema: z.ZodType<any>;
  updateSchema: z.ZodType<any>;
  inUseCode: string;
  label: string;
}) {
  const { model, courseField } = opts;
  const r = Router();

  r.get('/', optionalAuth, async (req, res) => {
    const { withCourses } = parse(z.object({ withCourses: z.stringbool().optional() }), req.query);
    const admin = isAdmin(req);
    const [items, counts] = await Promise.all([
      model.find().sort({ sortOrder: 1, name_fr: 1 }),
      Course.aggregate([
        { $match: { [courseField]: { $ne: null }, ...(admin ? {} : { status: 'PUBLISHED' }) } },
        { $group: { _id: `$${courseField}`, n: { $sum: 1 } } },
      ]),
    ]);
    const countBy = new Map<string, number>(counts.map((c) => [String(c._id), c.n as number]));
    const out = items
      .map((i) => ({ ...i.toJSON(), courseCount: countBy.get(i.id) ?? 0 }))
      .filter((i) => !withCourses || i.courseCount > 0);
    send(res, out);
  });

  r.post('/', ...adminOnly, async (req, res) => {
    const input = parse(opts.createSchema, req.body);
    if (input.slug && (await model.exists({ slug: input.slug }))) throw conflict('SLUG_TAKEN', 'This slug is already used');
    const slug = input.slug ?? (await uniqueSlug(model, input.name_fr));
    const last = await model.findOne().sort({ sortOrder: -1 }).select('sortOrder');
    const created = await model.create({ sortOrder: (last?.sortOrder ?? 0) + 10, ...input, slug });
    send(res, created.toJSON(), undefined, 201);
  });

  r.put('/:id', ...adminOnly, async (req, res) => {
    const { id } = parse(idParam, req.params);
    const input = parse(opts.updateSchema, req.body);
    const doc = await model.findById(id);
    if (!doc) throw notFound(opts.label);
    if (input.slug && input.slug !== doc.slug && (await model.exists({ slug: input.slug, _id: { $ne: id } }))) {
      throw conflict('SLUG_TAKEN', 'This slug is already used');
    }
    doc.set(input);
    await doc.save();
    send(res, doc.toJSON());
  });

  r.delete('/:id', ...adminOnly, async (req, res) => {
    const { id } = parse(idParam, req.params);
    const doc = await model.findById(id);
    if (!doc) throw notFound(opts.label);
    const used = await Course.countDocuments({ [courseField]: doc._id });
    if (used > 0) throw conflict(opts.inUseCode, `${opts.label} is used by ${used} course(s)`, { courses: used });
    await doc.deleteOne();
    res.status(204).end();
  });

  return r;
}

export const categoriesRouter = () =>
  taxonomyRouter({ model: Category, courseField: 'category', createSchema: createCategorySchema, updateSchema: updateCategorySchema, inUseCode: 'CATEGORY_IN_USE', label: 'Category' });

export const academicYearsRouter = () =>
  taxonomyRouter({ model: AcademicYear, courseField: 'academicYear', createSchema: createAcademicYearSchema, updateSchema: updateAcademicYearSchema, inUseCode: 'ACADEMIC_YEAR_IN_USE', label: 'Academic year' });

// ── Courses ───────────────────────────────────────────────────────────────────────────
const refParam = z.object({ ref: z.string().trim().min(1).max(120) });

export function coursesRouter() {
  const r = Router();

  r.get('/', optionalAuth, async (req, res) => {
    const query = parse(listCoursesQuery, req.query);
    const { items, total } = await listCourses(query, isAdmin(req));
    send(res, items, pageMeta(query.page, query.pageSize, total));
  });

  r.post('/', ...adminOnly, async (req, res) => {
    send(res, await createCourse(parse(createCourseSchema, req.body)), undefined, 201);
  });

  r.get('/:ref', optionalAuth, async (req, res) => {
    const { ref } = parse(refParam, req.params);
    send(res, await getCourseDetail(ref, isAdmin(req)));
  });

  r.put('/:id', ...adminOnly, async (req, res) => {
    const { id } = parse(idParam, req.params);
    send(res, await updateCourse(id, parse(updateCourseSchema, req.body)));
  });

  r.delete('/:id', ...adminOnly, async (req, res) => {
    await deleteCourse(parse(idParam, req.params).id);
    res.status(204).end();
  });

  for (const action of ['publish', 'unpublish', 'archive'] as const) {
    r.patch(`/:id/${action}`, ...adminOnly, async (req, res) => {
      send(res, await changeCourseStatus(parse(idParam, req.params).id, action));
    });
  }

  r.get('/:id/students', ...adminOnly, async (req, res) => {
    send(res, await courseStudents(parse(idParam, req.params).id));
  });

  return r;
}

// ── Modules ───────────────────────────────────────────────────────────────────────────
export function modulesRouter() {
  const r = Router();
  r.use(...adminOnly);

  r.post('/', async (req, res) => send(res, await curriculum.createModule(parse(createModuleSchema, req.body)), undefined, 201));

  // Registered before "/:id" so "reorder" is never mistaken for an id.
  r.put('/reorder', async (req, res) => {
    const { parentId, ids } = parse(reorderSchema, req.body);
    await curriculum.reorderModules(parentId, ids);
    send(res, await adminCourseDetail(parentId));
  });

  r.put('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params);
    send(res, await curriculum.updateModule(id, parse(updateModuleSchema, req.body)));
  });

  r.delete('/:id', async (req, res) => {
    await curriculum.deleteModule(parse(idParam, req.params).id);
    res.status(204).end();
  });
  return r;
}

// ── Lessons ───────────────────────────────────────────────────────────────────────────
export function lessonsRouter() {
  const r = Router();
  r.use(...adminOnly);

  r.post('/', async (req, res) => send(res, await curriculum.createLesson(parse(createLessonSchema, req.body)), undefined, 201));

  r.put('/reorder', async (req, res) => {
    const { parentId, ids } = parse(reorderSchema, req.body);
    await curriculum.reorderLessons(parentId, ids);
    res.status(204).end();
  });

  r.get('/:id', async (req, res) => send(res, await curriculum.getLesson(parse(idParam, req.params).id)));

  r.put('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params);
    send(res, await curriculum.updateLesson(id, parse(updateLessonSchema, req.body)));
  });

  r.delete('/:id', async (req, res) => {
    await curriculum.deleteLesson(parse(idParam, req.params).id);
    res.status(204).end();
  });
  return r;
}
