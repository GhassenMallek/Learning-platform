import { adminEn } from './admin.en';
import { commonEn } from './common.en';
import { publicEn } from './public.en';
import { studentEn } from './student.en';

/** English is the source of truth: `fr.ts` is type-checked against this object, so a missing French key fails the build. */
export const en = { ...commonEn, ...publicEn, ...adminEn, ...studentEn };
