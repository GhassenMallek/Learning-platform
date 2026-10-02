import { adminFr } from './admin.fr';
import { commonFr } from './common.fr';
import { publicFr } from './public.fr';
import { studentFr } from './student.fr';

/** The site is French-only: this dictionary is the single source of every UI string. */
export const fr = { ...commonFr, ...publicFr, ...adminFr, ...studentFr };
