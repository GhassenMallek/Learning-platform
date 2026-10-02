import fs from 'node:fs';
import path from 'node:path';
import type { DurationUnit, LessonType, Level } from '../../db/enums';

export interface L {
  en: string;
  fr: string;
}
export const l = (en: string, fr: string): L => ({ en, fr });

export interface SeedLesson {
  type: LessonType;
  title: L;
  description: L;
  minutes: number;
  resources?: { title: L; url: string }[];
}
export interface SeedModule {
  title: L;
  description: L;
  lessons: SeedLesson[];
}
export interface SeedCourse {
  slug: string;
  category: 'technology' | 'accounting';
  year?: '2nd-year' | '3rd-year';
  title: L;
  short: L;
  description: L;
  level: Level;
  duration: { value: number; unit: DurationUnit };
  objectives: L[];
  audience: L[];
  skills: L[];
  faq: { q: L; a: L }[];
  project?: { title: L; description: L };
  modules: SeedModule[];
}

/** [English title, French title, English description, French description, minutes?, type?] */
export type Row = [string, string, string, string, number?, LessonType?];

export const lessons = (rows: Row[]): SeedLesson[] =>
  rows.map(([te, tf, de, df, minutes, type]) => ({
    type: type ?? 'TEXT',
    title: l(te, tf),
    description: l(de, df),
    minutes: minutes ?? 12,
  }));

export const mod = (titleEn: string, titleFr: string, descEn: string, descFr: string, rows: Row[]): SeedModule => ({
  title: l(titleEn, titleFr),
  description: l(descEn, descFr),
  lessons: lessons(rows),
});

/** Convenience for `[[en, fr], …]` lists (objectives, audience, skills). */
export const pairs = (rows: [string, string][]): L[] => rows.map(([en, fr]) => l(en, fr));

/**
 * Lesson bodies live in Markdown bundles (server/src/seed/content/*.md) so code samples need no escaping:
 *
 *   @@ course-slug | English lesson title | en
 *   ...markdown...
 *   @@ course-slug | English lesson title | fr
 *   ...markdown...
 */
const CONTENT_DIR = path.resolve(__dirname, '../../../src/seed/content');
const bodies = new Map<string, string>();

for (const file of fs.existsSync(CONTENT_DIR) ? fs.readdirSync(CONTENT_DIR) : []) {
  if (!file.endsWith('.md')) continue;
  let key: string | null = null;
  let buffer: string[] = [];
  const flush = () => {
    if (key) bodies.set(key, buffer.join('\n').trim());
    buffer = [];
  };
  for (const line of fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8').split('\n')) {
    const m = /^@@ (.+?) \| (.+?) \| (en|fr)\s*$/.exec(line);
    if (m) {
      flush();
      key = `${m[1]}|${m[2]}|${m[3]}`;
    } else {
      buffer.push(line);
    }
  }
  flush();
}

export const lessonBody = (courseSlug: string, titleEn: string): L => ({
  en: bodies.get(`${courseSlug}|${titleEn}|en`) ?? '',
  fr: bodies.get(`${courseSlug}|${titleEn}|fr`) ?? '',
});

export const contentKeys = () => [...bodies.keys()];
