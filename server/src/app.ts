import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { buildLimiters, csrfGuard, errorHandler, notFoundHandler, requestLogger, type LimitConfig } from './middleware/http';
import { authRouter } from './routes/auth';
import { academicYearsRouter, categoriesRouter, coursesRouter, lessonsRouter, modulesRouter } from './routes/catalog';
import { contactRouter, enrollmentsRouter, progressRouter, studentsRouter } from './routes/people';
import { meRouter, settingsRouter, statsRouter, uploadsRouter } from './routes/system';

export interface AppOptions {
  /** `false` disables rate limiting (default in tests); pass numbers to override individual limits. */
  rateLimit?: Partial<LimitConfig> | false;
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  const limiters = buildLimiters(options.rateLimit ?? (env.isTest ? false : {}));

  app.disable('x-powered-by');
  if (env.TRUST_PROXY) app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'https:'],
          'media-src': ["'self'", 'https:'],
          'font-src': ["'self'", 'data:'],
          'connect-src': ["'self'"],
          'frame-src': ['https://www.youtube-nocookie.com', 'https://player.vimeo.com'],
          'upgrade-insecure-requests': env.COOKIE_SECURE ? [] : null,
        },
      },
    }),
  );
  app.use(
    cors({
      origin: (origin, callback) => callback(null, !origin || env.corsOrigins.includes(origin)),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(requestLogger);

  // Uploaded images: random names ⇒ safe to cache hard; `nosniff` stops a mislabelled file being executed as script.
  app.use(
    '/uploads',
    express.static(env.uploadDir, {
      maxAge: '30d',
      immutable: true,
      index: false,
      dotfiles: 'deny',
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      },
    }),
  );

  const api = express.Router();
  api.use(limiters.api, csrfGuard);
  api.get('/health', (_req, res) => res.json({ data: { status: 'ok' } }));
  api.use('/auth', authRouter(limiters));
  api.use('/settings', settingsRouter());
  api.use('/stats', statsRouter());
  api.use('/categories', categoriesRouter());
  api.use('/academic-years', academicYearsRouter());
  api.use('/courses', coursesRouter());
  api.use('/modules', modulesRouter());
  api.use('/lessons', lessonsRouter());
  api.use('/students', studentsRouter());
  api.use('/enrollments', enrollmentsRouter());
  api.use('/progress', progressRouter());
  api.use('/me', meRouter());
  api.use('/contact', contactRouter(limiters));
  api.use('/uploads', uploadsRouter());
  api.use(notFoundHandler);
  app.use('/api', api);

  // Production convenience: serve the built web app (client-side routes fall back to index.html).
  const indexHtml = path.join(env.webDistDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(env.webDistDir, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
      res.sendFile(indexHtml);
    });
  }

  app.use(errorHandler);
  return app;
}
