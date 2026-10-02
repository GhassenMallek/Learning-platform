import type { en } from './en';
import { adminFr } from './admin.fr';
import { commonFr } from './common.fr';
import { publicFr } from './public.fr';
import { studentFr } from './student.fr';

export const fr: typeof en = { ...commonFr, ...publicFr, ...adminFr, ...studentFr };
