import { z } from 'zod';

/** MongoDB ObjectId in hex form. Validating the format up front means malformed ids are a clean 400, never a driver error. */
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'invalid_id');

export const str = (max: number) => z.string().trim().max(max);
export const reqStr = (max: number) => z.string().trim().min(1).max(max);

/** Optional text: "" and null both become null; an *absent* key stays absent (matters for partial updates). */
export const optStr = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v === undefined ? undefined : v || null));

export const email = z.string().trim().toLowerCase().pipe(z.email().max(254));

export const password = z.string().min(8).max(128);

export const phone = z
  .string()
  .trim()
  .regex(/^[+()\d][\d\s().-]{5,30}$/, 'invalid_phone')
  .nullish()
  .transform((v) => (v === undefined ? undefined : v || null));

const isHttpUrl = (u: string) => {
  try {
    const url = new URL(u);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

/** Only http(s) — blocks `javascript:` / `data:` URLs that would become XSS when rendered as links. */
export const httpUrl = z.string().trim().max(600).refine(isHttpUrl, 'invalid_url');

/** http(s) URL or a file we stored ourselves (`/uploads/...`). */
export const mediaUrl = z
  .string()
  .trim()
  .max(600)
  .refine((u) => u.startsWith('/uploads/') || isHttpUrl(u), 'invalid_url');

export const optMediaUrl = z
  .string()
  .trim()
  .max(600)
  .refine((u) => u === '' || u.startsWith('/uploads/') || isHttpUrl(u), 'invalid_url')
  .nullish()
  .transform((v) => (v === undefined ? undefined : v || null));

export const optHttpUrl = z
  .string()
  .trim()
  .max(600)
  .refine((u) => u === '' || isHttpUrl(u), 'invalid_url')
  .nullish()
  .transform((v) => (v === undefined ? undefined : v || null));

export const isoDate = z
  .string()
  .trim()
  .refine((s) => /^\d{4}-\d{2}-\d{2}/.test(s) && !Number.isNaN(Date.parse(s)), 'invalid_date')
  .transform((s) => new Date(s));

export const optDate = z
  .string()
  .trim()
  .refine((s) => s === '' || (/^\d{4}-\d{2}-\d{2}/.test(s) && !Number.isNaN(Date.parse(s))), 'invalid_date')
  .nullish()
  .transform((v) => (v === undefined ? undefined : v ? new Date(v) : null));

/** `{ en, fr }` pair where both languages are mandatory. */
export const pair = (max: number) => z.object({ en: reqStr(max), fr: reqStr(max) });

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParam = z.object({ id: objectId });
