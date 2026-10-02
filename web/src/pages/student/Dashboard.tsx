import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, CheckCircle2, GraduationCap, PlayCircle, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CourseCardSkeleton } from '@/components/course';
import { EmptyState, ErrorState } from '@/components/ui/data';
import { ProgressBar, Skeleton, buttonClass } from '@/components/ui/primitives';
import { useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import type { StudentDashboard } from '@/lib/types';
import { cn } from '@/lib/utils';
import { StudentCourseCard } from './StudentCourseCard';

function Stat({ icon: Icon, label, value, tone }: { icon: typeof BookOpen; label: string; value: number | undefined; tone: string }) {
  const { fmt } = useI18n();
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', tone)}><Icon className="h-5 w-5" aria-hidden /></span>
      <div className="min-w-0"><p className="truncate text-xs font-medium text-slate-500">{label}</p>{value === undefined ? <Skeleton className="mt-1 h-6 w-10" /> : <p className="font-display text-2xl font-bold text-slate-900">{fmt.number(value)}</p>}</div>
    </div>
  );
}

export default function Dashboard() {
  const { t, pick } = useI18n();
  const { data, isPending, error, refetch } = useQuery({ queryKey: ['student', 'dashboard'], queryFn: () => api.get<StudentDashboard>('/me/dashboard') });
  useDocumentTitle(t('student.dashboard.title'));

  const resume = data?.continueLearning;
  const resumeCourse = resume ? data.courses.find((c) => c.course.id === resume.courseId) : undefined;

  return (
    <>
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t('student.dashboard.welcome', { name: data?.profile.firstName ?? '' })}</h1>
        <p className="mt-1.5 text-slate-500">{t('student.dashboard.subtitle')}</p>
      </header>

      {error ? <ErrorState error={error} onRetry={() => refetch()} /> : (
        <>
          {/* Continue learning */}
          {isPending ? <Skeleton className="mb-8 h-44 w-full rounded-2xl" /> : resume && resumeCourse ? (
            <section aria-labelledby="continue" className="relative mb-8 overflow-hidden rounded-2xl bg-brand-950 p-6 text-white shadow-elevated sm:p-8">
              <div className="absolute inset-0 opacity-80" style={{ backgroundImage: 'radial-gradient(60% 90% at 100% 0%, rgb(91 118 245 / 0.45), transparent 60%)' }} aria-hidden />
              <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <p id="continue" className="eyebrow !text-brand-200"><PlayCircle className="h-4 w-4" aria-hidden />{t('student.dashboard.continueLabel')}</p>
                  <h2 className="mt-2 font-display text-xl font-bold leading-snug text-white sm:text-2xl">{pick(resumeCourse.course, 'title')}</h2>
                  <p className="mt-2 text-sm text-brand-100/85"><span className="text-brand-200">{t('student.dashboard.upNext')}:</span> {pick(resume.lesson, 'title')}</p>
                  <div className="mt-5 flex max-w-md items-center gap-3">
                    <ProgressBar value={resumeCourse.progress.percent} label={t('student.progress.label')} className="h-2 flex-1 bg-white/15" />
                    <span className="text-sm font-semibold tabular-nums">{resumeCourse.progress.percent}%</span>
                  </div>
                </div>
                <Link to={`/student/courses/${resume.courseId}/lessons/${resume.lesson.id}`} className={buttonClass({ size: 'lg', className: 'bg-white text-brand-800 hover:bg-brand-50' })}>
                  {resumeCourse.progress.completed > 0 ? t('student.dashboard.resume') : t('student.dashboard.start')}<ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </section>
          ) : data && data.courses.length > 0 ? (
            <p className="mb-8 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-medium text-emerald-800"><Trophy className="h-5 w-5 shrink-0" aria-hidden />{t('student.dashboard.allDone')}</p>
          ) : null}

          <div className="mb-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon={BookOpen} tone="bg-brand-50 text-brand-600" label={t('student.dashboard.stats.courses')} value={data?.stats.courses} />
            <Stat icon={PlayCircle} tone="bg-sky-50 text-sky-600" label={t('student.dashboard.stats.inProgress')} value={data?.stats.inProgress} />
            <Stat icon={Trophy} tone="bg-amber-50 text-amber-600" label={t('student.dashboard.stats.completed')} value={data?.stats.completedCourses} />
            <Stat icon={CheckCircle2} tone="bg-emerald-50 text-emerald-600" label={t('student.dashboard.stats.lessons')} value={data?.stats.lessonsCompleted} />
          </div>

          <section aria-labelledby="my-courses">
            <div className="mb-5 flex items-center justify-between"><h2 id="my-courses" className="font-display text-xl font-bold text-slate-900">{t('student.dashboard.myCourses')}</h2><Link to="/student/courses" className="text-sm font-semibold text-brand-700 hover:underline">{t('student.dashboard.viewAll')}</Link></div>
            {isPending ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <CourseCardSkeleton key={i} />)}</div>
            ) : data.courses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white"><EmptyState icon={GraduationCap} title={t('student.dashboard.emptyTitle')} text={t('student.dashboard.emptyText')} action={<Link to="/contact" className={buttonClass()}>{t('student.dashboard.contact')}</Link>} /></div>
            ) : (
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{data.courses.map((c) => <li key={c.course.id}><StudentCourseCard item={c} /></li>)}</ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
