import type { FieldIssue } from './api';
import { isEmail } from './utils';

/** Client-side rules mirror the server's Zod schemas; both emit the same stable codes, translated by `useErrorText().field`. */
export type Issue = Pick<FieldIssue, 'code' | 'min' | 'max'>;
export type Rule = (value: string) => Issue | undefined;

export const rules = {
  required: ((v) => (v.trim() ? undefined : { code: 'required' })) as Rule,
  minLength: (min: number): Rule => (v) => (v.trim().length >= min ? undefined : { code: min <= 1 ? 'required' : v.trim() ? 'too_short' : 'required', min }),
  maxLength: (max: number): Rule => (v) => (v.trim().length <= max ? undefined : { code: 'too_long', max }),
  email: ((v) => (!v.trim() ? { code: 'required' } : isEmail(v) ? undefined : { code: 'invalid_email' })) as Rule,
  optionalPhone: ((v) => (!v.trim() || /^[+()\d][\d\s().-]{5,30}$/.test(v.trim()) ? undefined : { code: 'invalid_phone' })) as Rule,
  optionalUrl: ((v) => (!v.trim() || /^https?:\/\/\S+$/i.test(v.trim()) ? undefined : { code: 'invalid_url' })) as Rule,
  password: ((v) => (v.length >= 8 ? undefined : { code: v ? 'too_short' : 'required', min: 8 })) as Rule,
};

/** Runs every rule of every field; returns only the fields that failed (first failing rule wins). */
export function validate<T extends Record<string, string>>(values: T, spec: { [K in keyof T]?: Rule[] }): Partial<Record<keyof T, Issue>> {
  const out: Partial<Record<keyof T, Issue>> = {};
  for (const key of Object.keys(spec) as (keyof T)[]) {
    for (const rule of spec[key] ?? []) {
      const issue = rule(values[key] ?? '');
      if (issue) {
        out[key] = issue;
        break;
      }
    }
  }
  return out;
}
