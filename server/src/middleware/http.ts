import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import multer from 'multer';
import { env } from '../config/env';
import { AppError } from '../lib/errors';

export const CSRF_HEADER = 'x-requested-with';
export const CSRF_VALUE = 'learning-center';

/**
 * CSRF defence for cookie sessions: every state-changing request must carry either a Bearer token
 * or a custom header. Browsers cannot attach custom headers to cross-site form posts, and CORS
 * pre-flight only allows our own origin to send it.
 */
export const csrfGuard: RequestHandler = (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.headers.authorization?.startsWith('Bearer ')) return next();
  if (req.headers[CSRF_HEADER] === CSRF_VALUE) return next();
  next(new AppError(403, 'CSRF', 'Missing request header'));
};

export interface LimitConfig {
  login: number;
  contact: number;
  api: number;
}

const defaults: LimitConfig = { login: 10, contact: 5, api: 600 };

function limiter(windowMs: number, limit: number, code: string) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new AppError(429, code, 'Too many requests, please try again later')),
  });
}

/** Rate limits: brute-force protection on login, spam protection on the public contact form, plus a generous global cap. */
export function buildLimiters(config: Partial<LimitConfig> | false) {
  const passthrough: RequestHandler = (_req, _res, next) => next();
  if (config === false) return { login: passthrough, contact: passthrough, api: passthrough };
  const c = { ...defaults, ...config };
  return {
    login: limiter(15 * 60_000, c.login, 'RATE_LIMITED'),
    contact: limiter(60 * 60_000, c.contact, 'RATE_LIMITED'),
    api: limiter(60_000, c.api, 'RATE_LIMITED'),
  };
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`));
};

/** Single place that turns any thrown value into the `{ error: { code, message, details? } }` envelope. */
export const errorHandler: ErrorRequestHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(err);

  const send = (status: number, code: string, message: string, details?: unknown) =>
    res.status(status).json({ error: { code, message, ...(details !== undefined ? { details } : {}) } });

  if (err instanceof AppError) return send(err.status, err.code, err.message, err.details);

  const e = err as { type?: string; status?: number; code?: number | string; keyPattern?: Record<string, unknown> };
  if (e?.type === 'entity.parse.failed') return send(400, 'INVALID_JSON', 'Malformed JSON body');
  if (e?.type === 'entity.too.large') return send(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  if (err instanceof multer.MulterError) {
    return err.code === 'LIMIT_FILE_SIZE'
      ? send(413, 'PAYLOAD_TOO_LARGE', 'File is too large')
      : send(400, 'UPLOAD_ERROR', 'Invalid upload');
  }
  if (err instanceof mongoose.Error.CastError) return send(400, 'INVALID_ID', 'Malformed identifier');
  if (err instanceof mongoose.Error.ValidationError) return send(400, 'VALIDATION_ERROR', 'The request is invalid');
  if (e?.code === 11000) return send(409, 'DUPLICATE', 'A record with the same unique value already exists', { fields: Object.keys(e.keyPattern ?? {}) });

  // Unknown failure: log the details server-side, never leak them to the client.
  if (!env.isTest) console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  return send(500, 'INTERNAL_ERROR', 'Something went wrong on our side');
};

/** Minimal access log (skipped in tests). */
export const requestLogger: RequestHandler = (req, res, next) => {
  if (env.isTest) return next();
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    if (req.originalUrl.startsWith('/api')) console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(0)}ms`);
  });
  next();
};
