import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { GraduationCap, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { DataTable, EmptyState, ErrorState, PageHeader, Pagination, StatusBadge, type Column } from '@/components/ui/data';
import { Menu } from '@/components/ui/overlays';
import { Badge, Input, Select, buttonClass } from '@/components/ui/primitives';
import { useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { useDebouncedValue, useDocumentTitle } from '@/lib/hooks';
import { useAcademicYears, useCategories } from '@/lib/queries';
import type { CourseListItem } from '@/lib/types';
import { useCourseActions } from './courseActions';
import { CourseThumb, Panel } from './shared';

export default function Courses() {
  const { t, pick, fmt } = useI18n();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState('');
  const q = useDebouncedValue(text.trim(), 300);
  const status = params.get('status') ?? '';
  const category = params.get('category') ?? '';
  const year = params.get('year') ?? '';
  const page = Number(params.get('page') ?? 1) || 1;
  useDocumentTitle(t('admin.courses.title'));

  const { data: categories = [] } = useCategories();
  const { data: years = [] } = useAcademicYears();
  const actions = useCourseActions();
  const { data, isPending, isPlaceholderData, error, refetch } = useQuery({
    queryKey: ['admin', 'courses', { q, status, category, year, page }],
    queryFn: () => api.list<CourseListItem>('/courses', { q, status: status || 'ALL', category, academicYear: year, page, pageSize: 12 }),
    placeholderData: keepPreviousData,
  });

  const set = (key: string, value: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    }, { replace: true });

  const columns: Column<CourseListItem>[] = [
    {
      id: 'course',
      header: t('admin.courses.cols.course'),
      primary: true,
      cell: (c) => (
        <div className="flex min-w-0 items-center gap-3">
          <CourseThumb course={c} />
          <div className="min-w-0">
            <Link to={`/admin/courses/${c.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-semibold text-slate-900 hover:text-brand-700">{pick(c, 'title')}</Link>
            <p className="truncate text-xs text-slate-500">{t('common.modules', { count: c.moduleCount })} · {t('common.lessons', { count: c.lessonCount })}</p>
          </div>
        </div>
      ),
    },
    { id: 'category', header: t('admin.courses.cols.category'), hideBelow: 'lg', cell: (c) => (
      <div className="flex flex-wrap items-center gap-1.5"><span className="text-slate-700">{pick(c.category, 'name')}</span>{c.academicYear && <Badge>{pick(c.academicYear, 'name')}</Badge>}</div>
    ) },
    { id: 'status', header: t('admin.courses.cols.status'), cell: (c) => <StatusBadge kind="course" value={c.status} /> },
    { id: 'students', header: t('admin.courses.cols.students'), hideBelow: 'md', cell: (c) => <span className="tabular-nums">{c.enrollmentCount ?? 0}</span> },
    { id: 'updated', header: t('admin.courses.cols.updated'), hideBelow: 'xl', cell: (c) => <span className="text-slate-500">{fmt.relative(c.updatedAt)}</span> },
    { id: 'actions', header: <span className="sr-only">{t('common.actions')}</span>, mobile: 'actions', align: 'right', className: 'w-14', cell: (c) => <Menu items={actions.items(c)} /> },
  ];

  const filtered = !!(q || status || category || year);
  return (
    <>
      <PageHeader
        title={t('admin.courses.title')}
        description={t('admin.courses.subtitle')}
        actions={<Link to="/admin/courses/new" className={buttonClass()}><Plus className="h-4 w-4" aria-hidden />{t('admin.courses.add')}</Link>}
      />
      <Panel padded={false}>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_repeat(3,minmax(0,200px))]">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="sr-only" htmlFor="c-search">{t('common.search')}</label>
            <Input id="c-search" type="search" value={text} onChange={(e) => { setText(e.target.value); set('page', ''); }} placeholder={t('admin.courses.search')} leading={<Search className="h-4 w-4" aria-hidden />} />
          </div>
          <Select aria-label={t('common.status')} value={status} onChange={(e) => set('status', e.target.value)}>
            <option value="">{t('admin.courses.allStatuses')}</option>
            {(['PUBLISHED', 'DRAFT', 'ARCHIVED'] as const).map((s) => <option key={s} value={s}>{t(`status.course.${s}`)}</option>)}
          </Select>
          <Select aria-label={t('admin.courses.cols.category')} value={category} onChange={(e) => set('category', e.target.value)}>
            <option value="">{t('admin.courses.allCategories')}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{pick(c, 'name')}</option>)}
          </Select>
          <Select aria-label={t('admin.wizard.basic.academicYear')} value={year} onChange={(e) => set('year', e.target.value)}>
            <option value="">{t('admin.courses.allYears')}</option>
            {years.map((y) => <option key={y.id} value={y.id}>{pick(y, 'name')}</option>)}
          </Select>
        </div>
        {error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : (
          <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <DataTable
              columns={columns}
              rows={data?.items}
              loading={isPending}
              rowKey={(c) => c.id}
              onRowClick={(c) => navigate(`/admin/courses/${c.id}`)}
              empty={filtered
                ? <EmptyState icon={Search} title={t('admin.courses.noMatchTitle')} text={t('admin.courses.noMatchText')} />
                : <EmptyState icon={GraduationCap} title={t('admin.courses.emptyTitle')} text={t('admin.courses.emptyText')} action={<Link to="/admin/courses/new" className={buttonClass()}>{t('admin.courses.add')}</Link>} />}
            />
            {data && data.meta.total > 0 && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={(p) => set('page', String(p))} />}
          </div>
        )}
      </Panel>
      {actions.dialog}
    </>
  );
}
