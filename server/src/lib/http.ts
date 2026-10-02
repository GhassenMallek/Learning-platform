import type { Response } from 'express';
import { z } from 'zod';
import { AppError } from './errors';

/**
 * Turn every Zod issue into a stable code the UI can translate
 * (`required`, `too_short`, `invalid_email`, …) instead of an English sentence.
 */
z.config({
  customError: (iss) => {
    switch (iss.code) {
      case 'invalid_type':
        return iss.input === undefined || iss.input === null ? 'required' : 'invalid_type';
      case 'too_small':
        if (iss.origin === 'string') return Number(iss.minimum) <= 1 ? 'required' : 'too_short';
        if (iss.origin === 'array') return 'too_few';
        return 'too_small';
      case 'too_big':
        if (iss.origin === 'string') return 'too_long';
        if (iss.origin === 'array') return 'too_many';
        return 'too_large';
      case 'invalid_format':
        if (iss.format === 'email') return 'invalid_email';
        if (iss.format === 'url') return 'invalid_url';
        return 'invalid_format';
      case 'invalid_value':
        return 'invalid_option';
      case 'unrecognized_keys':
        return 'unknown_field';
      default:
        return 'invalid';
    }
  },
});

export interface FieldIssue {
  field: string;
  code: string;
  min?: number;
  max?: number;
}

function toFieldIssues(error: z.ZodError): FieldIssue[] {
  return error.issues.map((issue) => {
    const out: FieldIssue = { field: issue.path.join('.'), code: String(issue.message) };
    if (issue.code === 'too_small') out.min = Number(issue.minimum);
    if (issue.code === 'too_big') out.max = Number(issue.maximum);
    return out;
  });
}

/** Parse untrusted input with a Zod schema. Throws a 400 `VALIDATION_ERROR` with per-field codes. */
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input ?? {});
  if (!result.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'The request is invalid', toFieldIssues(result.error));
  }
  return result.data;
}

export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export const pageMeta = (page: number, pageSize: number, total: number): PageMeta => ({
  page,
  pageSize,
  total,
  totalPages: Math.max(1, Math.ceil(total / pageSize)),
});

/** Uniform success envelope: `{ data, meta? }`. */
export function send(res: Response, data: unknown, meta?: Record<string, unknown>, status = 200) {
  res.status(status).json(meta ? { data, meta } : { data });
}
