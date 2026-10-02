import { Router } from 'express';
import { z } from 'zod';
import { forbidden } from '../lib/errors';
import { pageMeta, parse, send } from '../lib/http';
import { adminOnly, authenticate, requireRole } from '../middleware/auth';
import type { buildLimiters } from '../middleware/http';
import { idParam, objectId } from '../schemas/common';
import {
  createContactSchema,
  createEnrollmentSchema,
  createStudentSchema,
  linkStudentSchema,
  listContactQuery,
  listEnrollmentsQuery,
  listStudentsQuery,
  progressSchema,
  studentStatusSchema,
  updateEnrollmentSchema,
  updateStudentSchema,
} from '../schemas/people';
import * as engagement from '../services/engagement';
import * as learning from '../services/learning';
import * as students from '../services/students';

// ── Students (admin) ──────────────────────────────────────────────────────────────────
export function studentsRouter() {
  const r = Router();
  r.use(...adminOnly);

  r.get('/', async (req, res) => {
    const query = parse(listStudentsQuery, req.query);
    const { items, total } = await students.listStudents(query);
    send(res, items, pageMeta(query.page, query.pageSize, total));
  });

  r.post('/', async (req, res) => send(res, await students.createStudent(parse(createStudentSchema, req.body)), undefined, 201));

  r.get('/:id', async (req, res) => send(res, await students.getStudent(parse(idParam, req.params).id)));

  r.put('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params);
    send(res, await students.updateStudent(id, parse(updateStudentSchema, req.body)));
  });

  r.patch('/:id/status', async (req, res) => {
    const { id } = parse(idParam, req.params);
    send(res, await students.setStudentStatus(id, parse(studentStatusSchema, req.body).status));
  });

  r.post('/:id/reset-password', async (req, res) => send(res, await students.resetStudentPassword(parse(idParam, req.params).id)));

  return r;
}

// ── Enrollments ───────────────────────────────────────────────────────────────────────
export function enrollmentsRouter() {
  const r = Router();

  // A student may read their own enrollments; only an admin may read anybody else's (guards against IDOR).
  r.get('/student/:studentId', authenticate, async (req, res) => {
    const { studentId } = parse(z.object({ studentId: objectId }), req.params);
    if (req.auth!.role !== 'ADMIN' && req.auth!.profileId !== studentId) throw forbidden();
    send(res, await learning.enrollmentsOfStudent(studentId));
  });

  r.get('/', ...adminOnly, async (req, res) => {
    const query = parse(listEnrollmentsQuery, req.query);
    const { items, total } = await learning.listEnrollments(query);
    send(res, items, pageMeta(query.page, query.pageSize, total));
  });

  r.post('/', ...adminOnly, async (req, res) => send(res, await learning.createEnrollment(parse(createEnrollmentSchema, req.body)), undefined, 201));

  r.patch('/:id', ...adminOnly, async (req, res) => {
    const { id } = parse(idParam, req.params);
    send(res, await learning.updateEnrollment(id, parse(updateEnrollmentSchema, req.body)));
  });

  r.delete('/:id', ...adminOnly, async (req, res) => {
    await learning.deleteEnrollment(parse(idParam, req.params).id);
    res.status(204).end();
  });

  return r;
}

// ── Progress (student) ────────────────────────────────────────────────────────────────
export function progressRouter() {
  const r = Router();
  r.use(authenticate, requireRole('STUDENT'));

  r.post('/', async (req, res) => {
    const { lessonId, completed } = parse(progressSchema, req.body);
    send(res, await learning.markLesson(req.auth!.profileId, lessonId, completed));
  });

  r.get('/course/:courseId', async (req, res) => {
    const { courseId } = parse(z.object({ courseId: objectId }), req.params);
    const outline = await learning.studentCourseOutline(req.auth!.profileId, courseId);
    send(res, {
      progress: outline.progress,
      completedLessonIds: outline.modules.flatMap((m) => m.lessons.filter((l) => l.completed).map((l) => l.id)),
    });
  });

  return r;
}

// ── Contact ───────────────────────────────────────────────────────────────────────────
export function contactRouter(limiters: ReturnType<typeof buildLimiters>) {
  const r = Router();

  // Public: the only unauthenticated write in the whole API.
  r.post('/', limiters.contact, async (req, res) => {
    await engagement.submitContact(parse(createContactSchema, req.body));
    send(res, { received: true }, undefined, 201);
  });

  r.get('/', ...adminOnly, async (req, res) => {
    const query = parse(listContactQuery, req.query);
    const { items, total, counts } = await engagement.listContact(query);
    send(res, items, { ...pageMeta(query.page, query.pageSize, total), counts });
  });

  r.get('/:id', ...adminOnly, async (req, res) => send(res, await engagement.getContact(parse(idParam, req.params).id)));

  for (const [path, status] of [['read', 'READ'], ['unread', 'NEW'], ['archive', 'ARCHIVED']] as const) {
    r.patch(`/:id/${path}`, ...adminOnly, async (req, res) => {
      send(res, await engagement.setContactStatus(parse(idParam, req.params).id, status));
    });
  }

  r.patch('/:id/link-student', ...adminOnly, async (req, res) => {
    const { id } = parse(idParam, req.params);
    const { studentId, enroll } = parse(linkStudentSchema, req.body);
    send(res, await engagement.linkContactToStudent(id, studentId, enroll));
  });

  return r;
}
