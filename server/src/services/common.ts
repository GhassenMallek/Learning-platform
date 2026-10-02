import { Types, type Model } from 'mongoose';
import { slugify } from '../lib/text';

export const isObjectId = (v: string) => /^[a-f\d]{24}$/i.test(v);
export const oid = (id: string) => new Types.ObjectId(id);

/** Returns `base` or `base-2`, `base-3`… — whichever slug is still free in the collection. */
export async function uniqueSlug(model: Model<any>, base: string, excludeId?: string): Promise<string> {
  const root = slugify(base);
  let candidate = root;
  for (let i = 2; await model.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }); i++) {
    candidate = `${root}-${i}`;
  }
  return candidate;
}

/** Plain-object view of a hydrated document (or already-plain value), with `id` instead of `_id`. */
export const json = <T = Record<string, any>>(doc: { toJSON(): unknown } | null | undefined): T => doc?.toJSON() as T;

export const percent = (completed: number, total: number) => (total === 0 ? 0 : Math.round((completed / total) * 100));
