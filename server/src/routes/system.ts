import { Router, type Request, type RequestHandler } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { AppError } from '../lib/errors';
import { parse, send } from '../lib/http';
import { adminOnly, authenticate, requireRole } from '../middleware/auth';
import { siteSettingsSchema, updateOwnProfileSchema } from '../schemas/people';
import * as engagement from '../services/engagement';
import * as learning from '../services/learning';
import * as students from '../services/students';
import { detectDocument, detectImage, storage } from '../storage';

// `defParamCharset: utf8` keeps accented file names (FR) intact.
const singleFile = (maxBytes: number) => multer({ storage: multer.memoryStorage(), defParamCharset: 'utf8', limits: { fileSize: maxBytes, files: 1, fields: 4 } }).single('file');

/** Reads the uploaded file, verifies it really is an image (magic bytes), and stores it through the storage provider. */
async function storeImage(req: Request, folder: string) {
  if (!req.file) throw new AppError(400, 'VALIDATION_ERROR', 'A file is required', [{ field: 'file', code: 'required' }]);
  const type = detectImage(req.file.buffer);
  if (!type) throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Only JPEG, PNG, GIF or WebP images are accepted');
  return storage.save({ buffer: req.file.buffer, folder, extension: type.extension, contentType: type.contentType });
}

const DOCUMENT_MAX_BYTES = 50 * 1024 * 1024;

/** Course documents (PDF, Word, PowerPoint, Excel), verified by their bytes like images. */
async function storeDocument(req: Request) {
  if (!req.file) throw new AppError(400, 'VALIDATION_ERROR', 'A file is required', [{ field: 'file', code: 'required' }]);
  const type = detectDocument(req.file.buffer, req.file.originalname);
  if (!type) throw new AppError(415, 'UNSUPPORTED_DOCUMENT_TYPE', 'Only PDF, Word, PowerPoint or Excel files are accepted');
  const file = await storage.save({ buffer: req.file.buffer, folder: 'documents', extension: type.extension, contentType: type.contentType });
  const name = req.file.originalname.replace(/[\u0000-\u001f]/g, '').slice(0, 200);
  return { ...file, fileType: type.extension, name };
}

const runMulter = (mw: RequestHandler): RequestHandler => (req, res, next) => mw(req, res, next);

// ── Settings, statistics, uploads, health ─────────────────────────────────────────────
export function settingsRouter() {
  const r = Router();
  // The centre's public details (name, contact info…) are safe to expose and drive the public site.
  r.get('/public', async (_req, res) => send(res, await engagement.getSiteSettings()));
  r.get('/', ...adminOnly, async (_req, res) => send(res, await engagement.getSiteSettings()));
  r.put('/', ...adminOnly, async (req, res) => send(res, await engagement.saveSiteSettings(parse(siteSettingsSchema, req.body))));
  return r;
}

export function statsRouter() {
  const r = Router();
  r.get('/public', async (_req, res) => send(res, await engagement.publicStats()));
  r.get('/overview', ...adminOnly, async (_req, res) => send(res, await engagement.adminOverview()));
  return r;
}

export function uploadsRouter() {
  const r = Router();
  const kind = z.object({ kind: z.enum(['thumbnails', 'avatars', 'misc']).default('misc') });
  r.post('/image', ...adminOnly, runMulter(singleFile(5 * 1024 * 1024)), async (req, res) => {
    const file = await storeImage(req, parse(kind, req.query).kind);
    send(res, { url: file.url, size: file.size, contentType: file.contentType }, undefined, 201);
  });
  r.post('/document', ...adminOnly, runMulter(singleFile(DOCUMENT_MAX_BYTES)), async (req, res) => {
    const file = await storeDocument(req);
    send(res, { url: file.url, size: file.size, contentType: file.contentType, fileType: file.fileType, name: file.name }, undefined, 201);
  });
  return r;
}

// ── Student self-service (/api/me) ────────────────────────────────────────────────────
export function meRouter() {
  const r = Router();
  r.use(authenticate, requireRole('STUDENT'));
  const sid = (req: Request) => req.auth!.profileId;

  r.get('/dashboard', async (req, res) => send(res, { profile: await students.getOwnProfile(sid(req)), ...(await learning.studentDashboard(sid(req))) }));
  r.get('/courses', async (req, res) => send(res, await learning.studentCourses(sid(req))));
  r.get('/courses/:courseId', async (req, res) => {
    const { courseId } = parse(z.object({ courseId: z.string().regex(/^[a-f\d]{24}$/i, 'invalid_id') }), req.params);
    send(res, await learning.studentCourseOutline(sid(req), courseId));
  });
  r.get('/lessons/:lessonId', async (req, res) => {
    const { lessonId } = parse(z.object({ lessonId: z.string().regex(/^[a-f\d]{24}$/i, 'invalid_id') }), req.params);
    send(res, await learning.studentLesson(sid(req), lessonId));
  });

  r.get('/profile', async (req, res) => send(res, await students.getOwnProfile(sid(req))));
  r.put('/profile', async (req, res) => send(res, await students.updateOwnProfile(sid(req), parse(updateOwnProfileSchema, req.body))));
  r.post('/avatar', runMulter(singleFile(2 * 1024 * 1024)), async (req, res) => {
    const file = await storeImage(req, 'avatars');
    send(res, await students.setOwnAvatar(sid(req), file.url));
  });

  return r;
}
