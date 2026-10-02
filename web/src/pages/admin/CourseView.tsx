import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, BookOpen, CheckCircle2, Clock, Layers, Pencil, Plus, SearchX, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CourseDetailView } from '@/components/CourseDetailView';
import { Avatar, Badge, Button, Skeleton, Tabs, buttonClass } from '@/components/ui/primitives';
import { DataTable, EmptyState, ErrorState, PageHeader, StatusBadge, type Column } from '@/components/ui/data';
import { Menu } from '@/components/ui/overlays';
import { useI18n, type TKey } from '@/i18n';
import { ApiError, api } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import type { CourseDetail, Enrollment } from '@/lib/types';
import { useCourseActions } from './courseActions';
import { CurriculumEditor } from './Curriculum';
import { EnrollModal, ProgressCell, useEnrollmentActions } from './Enrollments';
import { Panel } from './shared';

type Tab = 'overview' | 'curriculum' | 'students' | 'preview';
const TABS: Tab[] = ['overview', 'curriculum', 'students', 'preview'];

function Stat({ icon: Icon, label, value }: { icon: typeof Layers; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" aria-hidden /></span>
      <div className="min-w-0"><p className="text-xs font-medium text-slate-500">{label}</p><p className="font-display text-xl font-bold text-slate-900">{value}</p></div>
    </div>
  );
}

function CourseStudents({ course }: { course: CourseDetail }) {
  const { t, fmt } = useI18n();
  const [enrolling, setEnrolling] = useState(false);
  const actions = useEnrollmentActions();
  const { data, isPending, error, refetch } = useQuery({ queryKey: ['admin', 'enrollments', { course: course.id, view: 'course' }], queryFn: () => api.list<Enrollment>('/enrollments', { courseId: course.id, pageSize: 100 }) });

  const columns: Column<Enrollment>[] = [
    { id: 'student', header: t('admin.view.cols.student'), primary: true, cell: (e) => (
      <Link to={`/admin/students/${e.student.id}`} className="flex min-w-0 items-center gap-3">
        <Avatar firstName={e.student.firstName} lastName={e.student.lastName} src={e.student.profilePhotoUrl} />
        <span className="min-w-0"><span className="block truncate font-semibold text-slate-900 hover:text-brand-700">{e.student.firstName} {e.student.lastName}</span><span className="block truncate text-xs text-slate-500">{e.student.user?.email}</span></span>
      </Link>
    ) },
    { id: 'date', header: t('admin.view.cols.enrolled'), hideBelow: 'md', cell: (e) => fmt.date(e.enrolledAt) },
    { id: 'status', header: t('admin.view.cols.status'), cell: (e) => <StatusBadge kind="enrollment" value={e.status} /> },
    { id: 'progress', header: t('admin.view.cols.progress'), cell: (e) => <ProgressCell progress={e.progress} /> },
    { id: 'actions', header: <span className="sr-only">{t('common.actions')}</span>, mobile: 'actions', align: 'right', className: 'w-14', cell: (e) => <Menu items={actions.items(e)} /> },
  ];

  return (
    <Panel padded={false} title={t('admin.view.tabs.students')} actions={<Button size="sm" iconLeft={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setEnrolling(true)} disabled={course.status !== 'PUBLISHED'}>{t('admin.view.enrollStudent')}</Button>}>
      {error ? <ErrorState error={error} onRetry={() => refetch()} /> : (
        <DataTable columns={columns} rows={data?.items} loading={isPending} rowKey={(e) => e.id}
          empty={<EmptyState icon={Users} title={t('admin.view.noStudentsTitle')} text={t('admin.view.noStudentsText')} />} />
      )}
      {enrolling && <EnrollModal open onClose={() => setEnrolling(false)} fixedCourseId={course.id} />}
      {actions.dialog}
    </Panel>
  );
}

export default function CourseView() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { t, pick, fmt } = useI18n();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.includes(params.get('tab') as Tab) ? params.get('tab') : 'overview') as Tab;
  const actions = useCourseActions({ afterDelete: () => navigate('/admin/courses', { replace: true }) });
  const { data: course, isPending, error, refetch } = useQuery({ queryKey: ['admin', 'course', id], queryFn: () => api.get<CourseDetail>(`/courses/${id}`) });
  useDocumentTitle(course ? pick(course, 'title') : t('admin.courses.title'));

  if (error) {
    return error instanceof ApiError && error.status === 404
      ? <EmptyState icon={SearchX} title={t('admin.view.notFound')} action={<Link to="/admin/courses" className={buttonClass()}>{t('admin.nav.allCourses')}</Link>} />
      : <ErrorState error={error} onRetry={() => refetch()} />;
  }
  if (isPending) return <div className="space-y-4"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;

  const readiness = course.readiness;
  const issueStep = (code: string) => (code.startsWith('title') ? 1 : code.startsWith('short') || code.startsWith('description') ? 2 : 3);
  const seen = new Set<string>();
  const issues = (readiness?.issues ?? []).filter((i) => (seen.has(i.code) ? false : seen.add(i.code)));
  const setTab = (next: Tab) => setParams((prev) => { const p = new URLSearchParams(prev); p.set('tab', next); return p; }, { replace: true });

  const details: [string, string][] = [
    [t('admin.wizard.basic.category'), pick(course.category, 'name')],
    ...(course.academicYear ? [[t('admin.wizard.basic.academicYear'), pick(course.academicYear, 'name')] as [string, string]] : []),
    [t('admin.wizard.basic.level'), t(`level.${course.level}`)],
    [t('admin.wizard.basic.duration'), fmt.duration(course.durationValue, course.durationUnit) || '—'],
    [t('admin.wizard.settings.price'), course.price !== null ? `${fmt.money(course.price, course.currency)}${course.showPrice ? '' : ` (${t('common.no')})`}` : '—'],
    [t('admin.wizard.settings.slug'), `/courses/${course.slug}`],
    [t('common.created'), fmt.dateTime(course.createdAt)],
    [t('common.updated'), fmt.dateTime(course.updatedAt)],
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t('admin.nav.courses'), to: '/admin/courses' }, { label: pick(course, 'title') }]}
        title={<span className="flex flex-wrap items-center gap-3">{pick(course, 'title')}<StatusBadge kind="course" value={course.status} /></span>}
        description={<span className="flex flex-wrap items-center gap-2">{pick(course.category, 'name')}{course.academicYear && <Badge>{pick(course.academicYear, 'name')}</Badge>}</span>}
        actions={
          <>
            <Link to={`/admin/courses/${course.id}/edit`} className={buttonClass({ variant: 'secondary' })}><Pencil className="h-4 w-4" aria-hidden />{t('admin.view.editDetails')}</Link>
            {course.status !== 'PUBLISHED' && <Button loading={actions.publishing} onClick={() => actions.publish(course)}>{t('admin.courses.actions.publish')}</Button>}
            <Menu items={actions.items(course, ['manage', 'edit'])} />
          </>
        }
      />
      <Tabs label={t('admin.view.tabs.overview')} value={tab} onChange={setTab} className="mb-6"
        tabs={TABS.map((id2) => ({ id: id2, label: t(`admin.view.tabs.${id2}` as TKey), count: id2 === 'students' ? course.enrollmentCount : undefined }))} />

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat icon={Layers} label={t('admin.view.stats.modules')} value={fmt.number(course.moduleCount)} />
            <Stat icon={BookOpen} label={t('admin.view.stats.lessons')} value={fmt.number(course.lessonCount)} />
            <Stat icon={Clock} label={t('admin.view.stats.duration')} value={course.totalMinutes ? fmt.hoursFromMinutes(course.totalMinutes) : '—'} />
            <Stat icon={Users} label={t('admin.view.stats.enrolled')} value={fmt.number(course.enrollmentCount ?? 0)} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title={t('admin.view.checklist')}>
              {readiness?.ok ? (
                <p className="flex items-start gap-3 rounded-lg bg-emerald-50 p-4 font-medium text-emerald-800"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />{t('admin.view.ready')}</p>
              ) : (
                <>
                  <p className="mb-3 text-sm font-medium text-slate-700">{t('admin.view.notReady')}</p>
                  <ul className="space-y-2">
                    {issues.map((i) => (
                      <li key={i.code} className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden /><span className="flex-1">{t(`admin.readiness.${i.code}` as TKey)}</span>
                        <Link to={`/admin/courses/${course.id}/edit?step=${issueStep(i.code)}`} className="shrink-0 font-semibold underline underline-offset-2">{t('admin.wizard.publish.goTo')}</Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Panel>
            <Panel title={t('admin.view.details')}>
              <dl className="divide-y divide-slate-100 text-sm">
                {details.map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-2.5 first:pt-0 last:pb-0"><dt className="text-slate-500">{k}</dt><dd className="min-w-0 truncate text-right font-medium text-slate-900">{v}</dd></div>)}
              </dl>
            </Panel>
          </div>
        </div>
      )}
      {tab === 'curriculum' && <Panel><CurriculumEditor courseId={course.id} /></Panel>}
      {tab === 'students' && <CourseStudents course={course} />}
      {tab === 'preview' && (
        <Panel padded={false} title={t('admin.wizard.publish.preview')} description={t('admin.wizard.publish.subtitle')}>
          <div className="max-h-[75vh] overflow-y-auto overflow-x-hidden rounded-b-xl"><CourseDetailView course={course} preview /></div>
        </Panel>
      )}
      {actions.dialog}
    </>
  );
}
