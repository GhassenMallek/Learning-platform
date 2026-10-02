import { BookOpen, ClipboardList, Inbox, Users, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { Skeleton, Avatar } from '@/components/ui/primitives';
import { ErrorState, PageHeader, StatusBadge } from '@/components/ui/data';
import { useI18n } from '@/i18n';
import { useDocumentTitle } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { CourseThumb, Panel, useOverview } from './shared';

function StatCard({ icon: Icon, label, value, hint, tone, to }: { icon: LucideIcon; label: string; value: number | undefined; hint?: string; tone: string; to: string }) {
  const { fmt } = useI18n();
  return (
    <Link to={to} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tone)}><Icon className="h-5 w-5" aria-hidden /></span>
      </div>
      {value === undefined ? <Skeleton className="mt-3 h-9 w-20" /> : <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-900">{fmt.number(value)}</p>}
      <p className="mt-1 min-h-5 text-sm text-slate-500">{hint}</p>
    </Link>
  );
}

function ListPanel({ title, to, empty, isEmpty, loading, children }: { title: string; to: string; empty: string; isEmpty: boolean; loading: boolean; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <Panel title={title} padded={false} actions={<Link to={to} className="text-sm font-semibold text-brand-700 hover:underline">{t('admin.dashboard.viewAll')}</Link>}>
      {loading ? (
        <div className="space-y-4 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : isEmpty ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-slate-100">{children}</ul>
      )}
    </Panel>
  );
}

export default function Dashboard() {
  const { t, pick, fmt } = useI18n();
  const { user } = useAuth();
  const { data, isPending, error, refetch } = useOverview();
  useDocumentTitle(t('admin.dashboard.title'));
  const totals = data?.totals;

  return (
    <>
      <PageHeader title={t('admin.dashboard.welcome', { name: user?.firstName ?? '' })} description={t('admin.dashboard.subtitle')} />
      {error ? <ErrorState error={error} onRetry={() => refetch()} /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Users} tone="bg-brand-50 text-brand-600" to="/admin/students" label={t('admin.dashboard.students')} value={totals?.students} hint={totals ? t('admin.dashboard.studentsActive', { count: totals.activeStudents }) : undefined} />
            <StatCard icon={BookOpen} tone="bg-emerald-50 text-emerald-600" to="/admin/courses" label={t('admin.dashboard.courses')} value={totals?.publishedCourses} hint={totals ? t('admin.dashboard.coursesTotal', { count: totals.totalCourses }) : undefined} />
            <StatCard icon={ClipboardList} tone="bg-sky-50 text-sky-600" to="/admin/enrollments" label={t('admin.dashboard.enrollments')} value={totals?.enrollments} hint={t('admin.dashboard.enrollmentsHint')} />
            <StatCard icon={Inbox} tone="bg-amber-50 text-amber-600" to="/admin/messages" label={t('admin.dashboard.requests')} value={totals?.newContactRequests} hint={totals ? (totals.newContactRequests ? t('admin.dashboard.requestsWaiting') : t('admin.dashboard.requestsNone')) : undefined} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <ListPanel title={t('admin.dashboard.recentRequests')} to="/admin/messages" loading={isPending} isEmpty={!data?.recent.contactRequests.length} empty={t('admin.dashboard.noRequests')}>
              {data?.recent.contactRequests.map((m) => (
                <li key={m.id}>
                  <Link to="/admin/messages" className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50">
                    <Avatar firstName={m.fullName.split(' ')[0]} lastName={m.fullName.split(' ')[1]} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{m.fullName}</p>
                      <p className="truncate text-sm text-slate-500">{m.courseTitle ?? t('admin.messages.general')}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge kind="contact" value={m.status} />
                      <span className="text-xs text-slate-400">{fmt.relative(m.createdAt)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ListPanel>

            <ListPanel title={t('admin.dashboard.recentStudents')} to="/admin/students" loading={isPending} isEmpty={!data?.recent.students.length} empty={t('admin.dashboard.noStudents')}>
              {data?.recent.students.map((s) => (
                <li key={s.id}>
                  <Link to={`/admin/students/${s.id}`} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50">
                    <Avatar firstName={s.firstName} lastName={s.lastName} src={s.profilePhotoUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{s.firstName} {s.lastName}</p>
                      <p className="truncate text-sm text-slate-500">{s.email}</p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">{fmt.relative(s.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ListPanel>

            <ListPanel title={t('admin.dashboard.recentEnrollments')} to="/admin/enrollments" loading={isPending} isEmpty={!data?.recent.enrollments.length} empty={t('admin.dashboard.noEnrollments')}>
              {data?.recent.enrollments.map((e) => (
                <li key={e.id}>
                  <Link to="/admin/enrollments" className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50">
                    <Avatar firstName={e.student.firstName} lastName={e.student.lastName} src={e.student.profilePhotoUrl} />
                    <p className="min-w-0 flex-1 text-sm text-slate-600">
                      <span className="font-semibold text-slate-900">{e.student.firstName} {e.student.lastName}</span> {t('admin.dashboard.enrolledIn')} <span className="font-medium text-slate-800">{pick(e.course, 'title')}</span>
                    </p>
                    <span className="shrink-0 text-xs text-slate-400">{fmt.date(e.enrolledAt)}</span>
                  </Link>
                </li>
              ))}
            </ListPanel>

            <ListPanel title={t('admin.dashboard.recentCourses')} to="/admin/courses" loading={isPending} isEmpty={!data?.recent.courses.length} empty={t('admin.dashboard.noCourses')}>
              {data?.recent.courses.map((c) => (
                <li key={c.id}>
                  <Link to={`/admin/courses/${c.id}`} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50">
                    <CourseThumb course={c} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{pick(c, 'title')}</p>
                      <p className="truncate text-sm text-slate-500">{pick(c.category, 'name')}</p>
                    </div>
                    <StatusBadge kind="course" value={c.status} />
                  </Link>
                </li>
              ))}
            </ListPanel>
          </div>
        </>
      )}
    </>
  );
}
