import { Schema } from 'mongoose';

/** Shared JSON shape for every document: `_id` → `id`, no `__v`, never a password hash. */
const jsonOptions = {
  virtuals: false,
  versionKey: false,
  transform(_doc: unknown, ret: Record<string, unknown>) {
    if (ret._id !== undefined) {
      ret.id = String(ret._id);
      delete ret._id;
    }
    delete ret.passwordHash;
    return ret;
  },
};

export function applyJson<S extends Schema>(schema: S): S {
  schema.set('toJSON', jsonOptions);
  return schema;
}

export interface LocalizedText {
  en: string;
  fr: string;
}

/** `{ en, fr }` pair used by every embedded, translatable value (objectives, FAQ, resources…). */
export const localizedSchema = applyJson(
  new Schema<LocalizedText>(
    {
      en: { type: String, trim: true, default: '', maxlength: 4000 },
      fr: { type: String, trim: true, default: '', maxlength: 4000 },
    },
    { _id: false },
  ),
);
