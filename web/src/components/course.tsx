import { ArrowRight, BarChart3, BookOpen, Clock } from 'lucide-react';
import { useId } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n';
import type { CategoryRef, CourseListItem, YearRef } from '@/lib/types';
import { cn, hashString } from '@/lib/utils';
import { Badge, type Tone } from './ui/primitives';

// ── Category identity: colour + cover pattern derived from the category slug ─────────────
const PALETTES = [
  { from: '#3646cc', to: '#7c98fa' }, // indigo
  { from: '#047857', to: '#34d399' }, // emerald
  { from: '#0369a1', to: '#38bdf8' }, // sky
  { from: '#6d28d9', to: '#a78bfa' }, // violet
  { from: '#be123c', to: '#fb7185' }, // rose
  { from: '#b45309', to: '#fbbf24' }, // amber
];
const BADGE_TONES: Tone[] = ['brand', 'success', 'info', 'brand', 'danger', 'warning'];

/** Technology → indigo, Accounting → emerald; any category an admin adds later gets a stable colour from its slug. */
const paletteIndex = (slug: string) => (slug === 'technology' ? 0 : slug === 'accounting' ? 1 : 2 + (hashString(slug) % 4));
export const categoryTone = (slug: string): Tone => BADGE_TONES[paletteIndex(slug)];

/** Generated cover for courses without an uploaded thumbnail — always looks intentional, never a grey box. */
export function CourseCover({ course, className }: { course: Pick<CourseListItem, 'slug' | 'thumbnail'> & { category?: CategoryRef }; className?: string }) {
  const gid = useId();
  if (course.thumbnail) {
    return <img src={course.thumbnail} alt="" loading="lazy" className={cn('h-full w-full object-cover', className)} />;
  }
  const index = paletteIndex(course.category?.slug ?? course.slug);
  const { from, to } = PALETTES[index];
  const shift = hashString(course.slug) % 40;

  return (
    <svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" className={cn('h-full w-full', className)} aria-hidden>
      <defs>
        <linearGradient id={`${gid}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
        <pattern id={`${gid}-d`} width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.4" fill="#fff" fillOpacity=".22" />
        </pattern>
      </defs>
      <rect width="400" height="225" fill={`url(#${gid}-g)`} />
      <rect width="400" height="225" fill={`url(#${gid}-d)`} />
      {index === 0 && (
        <g>
          <rect x="54" y="38" width="220" height="150" rx="14" fill="#0f172a" fillOpacity=".4" />
          {[74, 90, 106].map((cx) => <circle key={cx} cx={cx} cy="58" r="4.5" fill="#fff" fillOpacity=".5" />)}
          {[[78, 86, 96], [94, 106, 132], [94, 124, 70], [78, 142, 110], [94, 160, 84]].map(([x, y, w]) => (
            <rect key={y} x={x} y={y} width={w} height="9" rx="4.5" fill="#fff" fillOpacity={y === 106 ? 0.95 : 0.65} />
          ))}
          <rect x="236" y="120" width="124" height="78" rx="14" fill="#fff" fillOpacity=".2" stroke="#fff" strokeOpacity=".4" />
          <path d="M262 148l-12 13 12 13M334 148l12 13-12 13M306 144l-16 34" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      )}
      {index === 1 && (
        <g>
          <rect x="70" y="36" width="260" height="154" rx="14" fill="#fff" fillOpacity=".16" stroke="#fff" strokeOpacity=".45" />
          <path d="M200 36v154M70 76h260" stroke="#fff" strokeOpacity=".45" />
          <rect x="120" y="50" width="60" height="9" rx="4.5" fill="#fff" fillOpacity=".9" />
          <rect x="248" y="50" width="52" height="9" rx="4.5" fill="#fff" fillOpacity=".9" />
          {[92, 116, 140, 164].map((y, i) => (
            <g key={y}>
              <rect x={86} y={y} width={i % 2 ? 70 : 96} height="8" rx="4" fill="#fff" fillOpacity=".7" />
              <rect x={216} y={y} width={i % 2 ? 96 : 60} height="8" rx="4" fill="#fff" fillOpacity=".7" />
            </g>
          ))}
        </g>
      )}
      {index >= 2 && (
        <g fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="2">
          {[40, 80, 120, 160].map((r, i) => <circle key={r} cx={280 - shift} cy={130 + (index % 2) * 20} r={r} strokeOpacity={0.55 - i * 0.1} />)}
          <rect x="60" y="60" width="130" height="92" rx="14" fill="#fff" fillOpacity=".18" />
          <rect x="78" y="80" width="70" height="9" rx="4.5" fill="#fff" fillOpacity=".9" stroke="none" />
          <rect x="78" y="100" width="94" height="9" rx="4.5" fill="#fff" fillOpacity=".6" stroke="none" />
          <rect x="78" y="120" width="52" height="9" rx="4.5" fill="#fff" fillOpacity=".6" stroke="none" />
        </g>
      )}
    </svg>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────────────
export function CourseCard({ course, className, titleTag: Heading = 'h3' }: { course: CourseListItem; className?: string; titleTag?: 'h2' | 'h3' | 'h4' | 'h5' }) {
  const { t, pick, fmt } = useI18n();
  const title = pick(course, 'title');
  return (
    <article className={cn('group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-elevated', className)}>
      <div className="aspect-[16/9] overflow-hidden bg-slate-100">
        <div className="h-full w-full transition duration-500 group-hover:scale-[1.04]">
          <CourseCover course={course} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={categoryTone(course.category.slug)}>{pick(course.category, 'name')}</Badge>
          {course.academicYear && <Badge>{pick(course.academicYear, 'name')}</Badge>}
        </div>
        <Heading className="mt-3 line-clamp-2 font-display text-lg font-semibold leading-snug text-slate-900">
          {/* Stretched link: the whole card is clickable but the accessible name is just the title. */}
          <Link to={`/courses/${course.slug}`} className="rounded after:absolute after:inset-0 after:z-10 after:content-['']">
            {title}
          </Link>
        </Heading>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{pick(course, 'shortDescription')}</p>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-slate-500">
          <li className="inline-flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" aria-hidden />{t(`level.${course.level}`)}</li>
          {course.durationValue && <li className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" aria-hidden />{fmt.duration(course.durationValue, course.durationUnit)}</li>}
          {course.lessonCount > 0 && <li className="inline-flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" aria-hidden />{t('common.lessons', { count: course.lessonCount })}</li>}
        </ul>
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          {course.showPrice && course.price !== null ? (
            <span className="font-display text-base font-bold text-slate-900">{fmt.money(course.price, course.currency)}</span>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition-all group-hover:gap-2.5">
            {t('courseCard.view')}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </div>
    </article>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-hidden>
      <div className="skeleton aspect-[16/9] rounded-none" />
      <div className="space-y-3 p-5">
        <div className="skeleton h-5 w-28" />
        <div className="skeleton h-6 w-4/5" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-3/5" />
      </div>
    </div>
  );
}

// ── Dynamic grouping: category → academic year, straight from database fields ───────────
export interface CourseSection {
  year: YearRef | null;
  courses: CourseListItem[];
}
export interface CourseGroup {
  category: CategoryRef;
  sections: CourseSection[];
}

/**
 * Builds the public catalog structure purely from course data: courses are grouped by category,
 * and inside a category by `academicYear` (courses without one come first, without a heading).
 * Nothing here knows about "Accounting" or "2nd Year" — a new year created by an admin just appears.
 */
export function groupCourses(courses: CourseListItem[]): CourseGroup[] {
  const categories = new Map<string, { category: CategoryRef; courses: CourseListItem[] }>();
  for (const course of courses) {
    const entry = categories.get(course.category.id) ?? { category: course.category, courses: [] };
    entry.courses.push(course);
    categories.set(course.category.id, entry);
  }
  return [...categories.values()]
    .sort((a, b) => a.category.sortOrder - b.category.sortOrder)
    .map(({ category, courses: list }) => {
      const years = new Map<string, CourseSection>();
      const noYear: CourseSection = { year: null, courses: [] };
      for (const course of list) {
        if (!course.academicYear) noYear.courses.push(course);
        else {
          const section = years.get(course.academicYear.id) ?? { year: course.academicYear, courses: [] };
          section.courses.push(course);
          years.set(course.academicYear.id, section);
        }
      }
      const sections = [...years.values()].sort((a, b) => (a.year?.sortOrder ?? 0) - (b.year?.sortOrder ?? 0));
      return { category, sections: noYear.courses.length ? [noYear, ...sections] : sections };
    });
}
