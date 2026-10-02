import type { ReactNode } from 'react';
import { useI18n } from '@/i18n';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CourseCard, type CourseGroup } from './course';
import { Badge } from './ui/primitives';

export function SectionHeader({ eyebrow, title, subtitle, align = 'center', as: Tag = 'h2', className }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; align?: 'center' | 'left'; as?: 'h1' | 'h2'; className?: string }) {
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <Tag className="font-display text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">{title}</Tag>
      {subtitle && <p className="mt-4 text-base leading-7 text-slate-500 sm:text-lg">{subtitle}</p>}
    </div>
  );
}

/**
 * The public course catalog, generated entirely from data:
 * category → (academic year) → cards. "2nd Year" / "3rd Year" are just rows of the academic-years collection.
 */
export function CatalogGroups({ groups, categories = [], className, level = 3 }: { groups: CourseGroup[]; categories?: Category[]; className?: string; level?: 2 | 3 }) {
  const { t, pick } = useI18n();
  // Heading levels follow the page: category = `level`, academic year = level + 1, card title = one more when years are shown.
  const CategoryHeading = `h${level}` as 'h2' | 'h3';
  const YearHeading = `h${level + 1}` as 'h3' | 'h4';
  return (
    <div className={cn('space-y-14', className)}>
      {groups.map((group) => {
        const description = pick(categories.find((c) => c.id === group.category.id), 'description');
        const total = group.sections.reduce((n, s) => n + s.courses.length, 0);
        return (
          <section key={group.category.id} aria-labelledby={`cat-${group.category.id}`}>
            <header className="mb-7">
              <div className="flex flex-wrap items-center gap-3">
                <CategoryHeading id={`cat-${group.category.id}`} className="font-display text-2xl font-bold text-slate-900">{pick(group.category, 'name')}</CategoryHeading>
                <Badge tone="neutral">{t('courses.count', { count: total })}</Badge>
              </div>
              {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
            </header>
            <div className="space-y-10">
              {group.sections.map((section) => (
                <div key={section.year?.id ?? 'no-year'}>
                  {section.year && (
                    <div className="mb-5 flex items-center gap-4">
                      <YearHeading className="font-display text-lg font-semibold text-slate-800">{pick(section.year, 'name')}</YearHeading>
                      <span className="h-px flex-1 bg-slate-200" aria-hidden />
                      <span className="text-sm text-slate-400">{t('courses.count', { count: section.courses.length })}</span>
                    </div>
                  )}
                  <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {section.courses.map((course) => (
                      <li key={course.id}>
                        <CourseCard course={course} titleTag={`h${level + (section.year ? 2 : 1)}` as 'h3' | 'h4' | 'h5'} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
