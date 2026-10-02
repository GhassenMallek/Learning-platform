import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, CircleArrowRight, Lock, RotateCcw, SearchX } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Paragraphs } from '@/components/content';
import { CourseCover, categoryTone } from '@/components/course';
import { AccordionItem, EmptyState, ErrorState } from '@/components/ui/data';
import { Badge, ProgressRing, Skeleton, buttonClass } from '@/components/ui/primitives';
import { useI18n } from '@/i18n';
import { ApiError, api } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import type { StudentCourseOutline, StudentOutlineLesson, StudentOutlineModule } from '@/lib/types';
import { cn } from '@/lib/utils';

export type LessonState = 'done' | 'next' | 'todo';
export const lessonState = (lesson: StudentOutlineLesson, nextId: string | undefined): LessonState => (lesson.completed ? 'done' : lesson.id === nextId ? 'next' : 'todo');

export function StateIcon({ state, className }: { state: LessonState; className?: string }) {
  const { t } = useI18n();
  if (state === 'done') return <CheckCircle2 className={cn('h-5 w-5 shrink-0 text-emerald-500', className)} aria-label={t('student.lesson.completed')} />;
  if (state === 'next') return <CircleArrowRight className={cn('h-5 w-5 shrink-0 text-brand-600', className)} aria-label={t('student.dashboard.upNext')} />;
  return <Circle className={cn('h-5 w-5 shrink-0 text-slate-300', className)} aria-hidden />;
}

export const moduleState = (m: StudentOutlineModule, nextId: string | undefined): LessonState =>
  m.totalCount > 0 && m.completedCount === m.totalCount ? 'done' : m.lessons.some((l) => l.id === nextId) ? 'next' : 'todo';

export default function CourseOutline() {
  const { courseId = '' } = useParams();
  const { t, pick, fmt } = useI18n();
  const { data, isPending, error, refetch } = useQuery({ queryKey: ['student', 'course', courseId], queryFn: () => api.get<StudentCourseOutline>(`/me/courses/${courseId}`) });
  const nextId = data?.nextLesson?.id;
  const [openIds, setOpenIds] = useState<Set<string> | null>(null);
  useDocumentTitle(data ? pick(data.course, 'title') : t('student.courses.title'));

  if (error) {
    const denied = error instanceof ApiError && (error.status === 403 || error.status === 404);
    return denied
      ? <EmptyState icon={error.status === 403 ? Lock : SearchX} title={t(error.status === 403 ? 'errors.codes.NOT_ENROLLED' : 'errors.notFound')} action={<Link to="/student/courses" className={buttonClass()}>{t('student.course.back')}</Link>} />
      : <ErrorState error={error} onRetry={() => refetch()} />;
  }
  if (isPending) return <div className="space-y-4"><Skeleton className="h-6 w-32" /><Skeleton className="h-40 w-full rounded-2xl" /><Skeleton className="h-64 w-full" /></div>;

  const { course, progress, modules } = data;
  const finished = progress.total > 0 && progress.percent === 100;
  const cta = data.nextLesson ? `/student/courses/${course.id}/lessons/${data.nextLesson.id}` : modules[0]?.lessons[0] ? `/student/courses/${course.id}/lessons/${modules[0].lessons[0].id}` : null;
  // By default the module that contains the next lesson is open.
  const open = openIds ?? new Set(modules.filter((m) => m.lessons.some((l) => l.id === nextId)).map((m) => m.id).concat(modules.length && !nextId ? [modules[0].id] : []));
  const toggle = (id: string) => setOpenIds(() => { const next = new Set(open); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  return (
    <>
      <Link to="/student/courses" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" aria-hidden />{t('student.course.back')}</Link>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="grid md:grid-cols-[260px_1fr]">
          <div className="hidden aspect-auto md:block"><div className="h-full min-h-[190px]"><CourseCover course={course} /></div></div>
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={categoryTone(course.category.slug)}>{pick(course.category, 'name')}</Badge>
              {course.academicYear && <Badge>{pick(course.academicYear, 'name')}</Badge>}
              <Badge>{t(`level.${course.level}`)}</Badge>
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">{pick(course, 'title')}</h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="flex items-center gap-4">
                <ProgressRing value={progress.percent} size={64} stroke={7} label={t('student.progress.label')} />
                <div><p className="font-semibold text-slate-900">{t('student.course.progress')}</p><p className="text-sm text-slate-500">{t('student.progress.lessons', { completed: progress.completed, total: progress.total })}</p></div>
              </div>
              {cta && (
                <Link to={cta} data-glow className={buttonClass({ size: 'lg', className: 'shadow-brand' })}>
                  {finished ? <><RotateCcw className="h-4 w-4" aria-hidden />{t('student.course.review')}</> : <>{progress.completed > 0 ? t('student.course.continue') : t('student.course.start')}<ArrowRight className="h-4 w-4" aria-hidden /></>}
                </Link>
              )}
            </div>
            {finished && <p className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" aria-hidden />{t('student.course.allDone')}</p>}
          </div>
        </div>
      </section>

      <section aria-labelledby="content" className="mt-10">
        <h2 id="content" className="mb-5 font-display text-xl font-bold text-slate-900">{t('student.course.content')}</h2>
        <div className="space-y-3">
          {modules.map((m, i) => {
            const state = moduleState(m, nextId);
            return (
              <AccordionItem
                key={m.id}
                open={open.has(m.id)}
                onToggle={() => toggle(m.id)}
                leading={<span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-semibold', state === 'done' ? 'bg-emerald-50 text-emerald-600' : state === 'next' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500')}>{state === 'done' ? <CheckCircle2 className="h-5 w-5" aria-hidden /> : String(i + 1).padStart(2, '0')}</span>}
                title={pick(m, 'title')}
                meta={<>{t('student.course.lessonsDone', { done: m.completedCount, total: m.totalCount })} · {t(state === 'done' ? 'student.course.moduleDone' : state === 'next' ? 'student.course.moduleCurrent' : 'student.course.moduleTodo')}</>}
              >
                <ol className="space-y-1">
                  {m.lessons.map((l) => {
                    const ls = lessonState(l, nextId);
                    return (
                      <li key={l.id}>
                        <Link to={`/student/courses/${course.id}/lessons/${l.id}`} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition hover:bg-slate-50', ls === 'next' && 'bg-brand-50/70 font-semibold text-brand-800')}>
                          <StateIcon state={ls} />
                          <span className={cn('min-w-0 flex-1', ls === 'done' ? 'text-slate-500' : 'text-slate-800')}>{pick(l, 'title')}</span>
                          {l.type !== 'TEXT' && <span className="hidden text-xs text-slate-400 sm:inline">{t(`lessonType.${l.type}`)}</span>}
                          {l.durationMinutes ? <span className="text-xs tabular-nums text-slate-400">{fmt.minutes(l.durationMinutes)}</span> : null}
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </AccordionItem>
            );
          })}
        </div>
      </section>

      {pick(course, 'description') && (
        <section aria-labelledby="about" className="mt-10">
          <h2 id="about" className="mb-4 font-display text-xl font-bold text-slate-900">{t('student.course.about')}</h2>
          <Paragraphs text={pick(course, 'description')} className="max-w-3xl leading-7 text-slate-600" />
        </section>
      )}
    </>
  );
}
