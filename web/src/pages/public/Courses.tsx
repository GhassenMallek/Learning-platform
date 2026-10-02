import { BookOpen, Search, X } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CatalogGroups, SectionHeader } from '@/components/catalog';
import { CourseCardSkeleton, groupCourses } from '@/components/course';
import { EmptyState, ErrorState } from '@/components/ui/data';
import { Button, Input, Select, buttonClass } from '@/components/ui/primitives';
import { useI18n } from '@/i18n';
import { useDebouncedValue, useDocumentTitle } from '@/lib/hooks';
import { useCategories, usePublishedCourses, useSiteSettings } from '@/lib/queries';
import { LEVELS } from '@/lib/types';
import { useEffect, useState } from 'react';

/** Accent- and case-insensitive text normalisation so "comptabilite" finds "Comptabilité". */
const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function Courses() {
  const { t, pick } = useI18n();
  const { data: site } = useSiteSettings();
  const [params, setParams] = useSearchParams();
  const { data: courses, isPending, error, refetch } = usePublishedCourses();
  const { data: categories = [] } = useCategories({ withCourses: true });
  useDocumentTitle(site ? `${t('courses.title')} · ${site.name}` : undefined);

  const category = params.get('category') ?? '';
  const level = params.get('level') ?? '';
  const [text, setText] = useState(params.get('q') ?? '');
  const q = useDebouncedValue(text, 250);

  // Keep the URL in sync so filtered views can be shared/bookmarked.
  useEffect(() => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (q) next.set('q', q); else next.delete('q');
      return next;
    }, { replace: true });
  }, [q, setParams]);

  const setParam = (key: string, value: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    }, { replace: true });

  const filtered = useMemo(() => {
    const needle = normalize(q.trim());
    return (courses ?? []).filter((c) => {
      if (category && c.category.id !== category && c.category.slug !== category) return false;
      if (level && c.level !== level) return false;
      if (!needle) return true;
      return normalize([c.title_fr, c.shortDescription_fr].join(' ')).includes(needle);
    });
  }, [courses, q, category, level]);

  const groups = useMemo(() => groupCourses(filtered), [filtered]);
  const hasFilters = !!(q || category || level);
  const clear = () => {
    setText('');
    setParams({}, { replace: true });
  };

  return (
    <>
      <section className="hero-bg border-b border-slate-200/70">
        <div className="container-page py-12 sm:py-16">
          <SectionHeader as="h1" align="left" title={t('courses.title')} subtitle={t('courses.subtitle')} />
          <form role="search" onSubmit={(e) => e.preventDefault()} className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto_auto] lg:max-w-4xl">
            <label className="sr-only" htmlFor="course-search">{t('courses.searchLabel')}</label>
            <Input id="course-search" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('courses.searchPlaceholder')} leading={<Search className="h-4 w-4" aria-hidden />} className="h-12 bg-white" />
            <div>
              <label className="sr-only" htmlFor="course-category">{t('courses.category')}</label>
              <Select id="course-category" value={category} onChange={(e) => setParam('category', e.target.value)} className="h-12 bg-white sm:min-w-[11rem]">
                <option value="">{t('courses.allCategories')}</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{pick(c, 'name')}</option>)}
              </Select>
            </div>
            <div>
              <label className="sr-only" htmlFor="course-level">{t('courses.level')}</label>
              <Select id="course-level" value={level} onChange={(e) => setParam('level', e.target.value)} className="h-12 bg-white sm:min-w-[11rem]">
                <option value="">{t('courses.allLevels')}</option>
                {LEVELS.map((l) => <option key={l} value={l}>{t(`level.${l}`)}</option>)}
              </Select>
            </div>
          </form>
        </div>
      </section>

      <div className="container-page py-12 sm:py-16">
        {!isPending && !error && (courses?.length ?? 0) > 0 && (
          <div className="mb-8 flex items-center justify-between gap-4" aria-live="polite">
            <p className="text-sm font-medium text-slate-500">{t('courses.count', { count: filtered.length })}</p>
            {hasFilters && <Button variant="ghost" size="sm" onClick={clear} iconLeft={<X className="h-4 w-4" aria-hidden />}>{t('courses.clearFilters')}</Button>}
          </div>
        )}
        {isPending ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <CourseCardSkeleton key={i} />)}</div>
        ) : error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : (courses?.length ?? 0) === 0 ? (
          <EmptyState icon={BookOpen} title={t('programs.emptyTitle')} text={t('programs.emptyText')} action={<Link to="/contact" className={buttonClass()}>{t('nav.contactUs')}</Link>} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search} title={t('courses.noResultsTitle')} text={t('courses.noResultsText')} action={<Button variant="secondary" onClick={clear}>{t('courses.clearFilters')}</Button>} />
        ) : (
          <CatalogGroups groups={groups} categories={categories} level={2} />
        )}
      </div>
    </>
  );
}
