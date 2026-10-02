import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { ApiError, type FieldIssue } from '@/lib/api';
import type { DurationUnit, Lang, Localized } from '@/lib/types';
import { fr } from './fr';

type Dict = typeof fr;

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
type LeafKey = Leaves<Dict>;
type StripPlural<K extends string> = K extends `${infer B}_one` ? B : never;
/** Every dictionary key, plus the base name of plural pairs (`duration.WEEKS` for `_one`/`_other`). */
export type TKey = LeafKey | StripPlural<LeafKey>;
export type TFunction = (key: TKey, vars?: Record<string, string | number>) => string;

const LANG: Lang = 'fr';
const LOCALE = 'fr-FR';

const lookup = (dict: unknown, key: string): string | undefined =>
  key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], dict) as string | undefined;

export interface Formatters {
  date: (value: string | Date | null | undefined) => string;
  dateTime: (value: string | Date | null | undefined) => string;
  relative: (value: string | Date | null | undefined) => string;
  number: (value: number) => string;
  money: (amount: number, currency: string) => string;
  duration: (value: number | null | undefined, unit: DurationUnit) => string;
  minutes: (minutes: number | null | undefined) => string;
  hoursFromMinutes: (minutes: number) => string;
}

interface I18nValue {
  lang: Lang;
  locale: string;
  t: TFunction;
  /** `pick(course, 'title')` → `course.title_fr`. */
  pick: (obj: object | null | undefined, field: string) => string;
  /** Same for embedded `{ fr }` pairs. */
  pair: (value: Localized | null | undefined) => string;
  fmt: Formatters;
}

const I18nContext = createContext<I18nValue | null>(null);

/** The site is French-only: `<html lang="fr">` is set in index.html and every string comes from `fr`. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const lang = LANG;
  const locale = LOCALE;

  const value = useMemo<I18nValue>(() => {
    const dict = fr;
    const plural = new Intl.PluralRules(locale);

    const t: TFunction = (key, vars) => {
      let raw: string | undefined;
      if (vars && typeof vars.count === 'number') {
        const rule = plural.select(vars.count);
        raw = lookup(dict, `${key}_${rule}`) ?? lookup(dict, `${key}_other`);
      }
      raw ??= lookup(dict, key) ?? key;
      return raw.replace(/\{(\w+)\}/g, (_, name: string) => String(vars?.[name] ?? `{${name}}`));
    };

    const toDate = (v: string | Date | null | undefined) => (v ? (v instanceof Date ? v : new Date(v)) : null);
    const dateFmt = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' });
    const dateTimeFmt = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const relFmt = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const numFmt = new Intl.NumberFormat(locale);

    const fmt: Formatters = {
      date: (v) => {
        const d = toDate(v);
        return d && !Number.isNaN(+d) ? dateFmt.format(d) : '—';
      },
      dateTime: (v) => {
        const d = toDate(v);
        return d && !Number.isNaN(+d) ? dateTimeFmt.format(d) : '—';
      },
      relative: (v) => {
        const d = toDate(v);
        if (!d || Number.isNaN(+d)) return '—';
        const seconds = (+d - Date.now()) / 1000;
        const steps: [Intl.RelativeTimeFormatUnit, number][] = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
        for (const [unit, size] of steps) {
          if (Math.abs(seconds) >= size) return relFmt.format(Math.round(seconds / size), unit);
        }
        return relFmt.format(0, 'second');
      },
      number: (n) => numFmt.format(n),
      money: (amount, currency) => {
        try {
          return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(amount);
        } catch {
          return `${numFmt.format(amount)} ${currency}`;
        }
      },
      duration: (v, unit) => (v ? t(`duration.${unit}` as TKey, { count: v }) : ''),
      minutes: (m) => (m ? t('common.minutes', { count: m }) : ''),
      hoursFromMinutes: (m) => (m >= 60 ? t('duration.HOURS', { count: Math.round(m / 60) }) : t('common.minutes', { count: m })),
    };

    return {
      lang,
      locale,
      t,
      pick: (obj, field) => String(((obj ?? {}) as Record<string, unknown>)[`${field}_fr`] || ''),
      pair: (p) => p?.fr || '',
      fmt,
    };
  }, [lang, locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

/** Turns API errors (stable codes) into natural, localized sentences. */
export function useErrorText() {
  const { t } = useI18n();
  return useMemo(() => {
    const field = (issue: FieldIssue) => t(`errors.fields.${issue.code}` as TKey, { min: issue.min ?? '', max: issue.max ?? '' });
    const hasKey = (key: string) => lookup(fr, key) !== undefined;
    return {
      field,
      message: (error: unknown): string => {
        if (error instanceof ApiError) {
          if (error.code === 'NETWORK_ERROR') return t('errors.network');
          const key = `errors.codes.${error.code}`;
          if (hasKey(key)) return t(key as TKey);
          if (error.status === 404) return t('errors.notFound');
        }
        return t('errors.generic');
      },
      /** `{ field: message }` for server-side validation errors, so forms can show them under each input. */
      fields: (error: unknown): Record<string, string> =>
        error instanceof ApiError ? Object.fromEntries(error.fieldIssues.map((i) => [i.field, field(i)])) : {},
    };
  }, [t]);
}
