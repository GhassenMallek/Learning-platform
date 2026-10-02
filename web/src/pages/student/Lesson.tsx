import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckCircle2, Download, ExternalLink, ListTree, Lock, PartyPopper, PlayCircle, SearchX } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FileTypeIcon } from '@/components/FileType';
import { Markdown } from '@/components/Markdown';
import { EmptyState, ErrorState } from '@/components/ui/data';
import { Drawer, useToast } from '@/components/ui/overlays';
import { Badge, Button, ProgressBar, Skeleton, buttonClass } from '@/components/ui/primitives';
import { useErrorText, useI18n } from '@/i18n';
import { ApiError, api } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import type { Progress, StudentCourseOutline, StudentLessonPayload } from '@/lib/types';
import { cn, formatBytes, isSafeUrl, parseVideo } from '@/lib/utils';
import { StateIcon, lessonState, moduleState } from './CourseOutline';

function Outline({ outline, currentId, onNavigate }: { outline: StudentCourseOutline; currentId: string; onNavigate?: () => void }) {
  const { t, pick } = useI18n();
  const nextId = outline.nextLesson?.id;
  return (
    <nav aria-label={t('student.lesson.outline')} className="space-y-4">
      {outline.modules.map((m, i) => {
        const ms = moduleState(m, nextId);
        return (
          <div key={m.id}>
            <p className="mb-1.5 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <span className={cn('font-mono', ms === 'done' && 'text-emerald-500')}>{String(i + 1).padStart(2, '0')}</span>
              <span className="min-w-0 flex-1 truncate normal-case tracking-normal text-slate-600">{pick(m, 'title')}</span>
              <span className="tabular-nums">{m.completedCount}/{m.totalCount}</span>
            </p>
            <ol className="space-y-0.5">
              {m.lessons.map((l) => (
                <li key={l.id}>
                  <Link to={`/student/courses/${outline.course.id}/lessons/${l.id}`} onClick={onNavigate} aria-current={l.id === currentId ? 'page' : undefined}
                    className={cn('flex items-start gap-2.5 rounded-lg px-2 py-2 text-[13px] leading-5 transition', l.id === currentId ? 'bg-brand-50 font-semibold text-brand-800' : 'text-slate-600 hover:bg-slate-100')}>
                    <StateIcon state={lessonState(l, nextId)} className="mt-0.5 h-4 w-4" />
                    <span className="min-w-0">{pick(l, 'title')}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </nav>
  );
}

function VideoBlock({ url, title }: { url: string; title: string }) {
  const { t } = useI18n();
  const video = parseVideo(url);
  if (video.kind === 'youtube' || video.kind === 'vimeo') {
    return (
      <div className="aspect-video overflow-hidden rounded-xl bg-slate-900 shadow-card">
        <iframe src={video.src} title={title} className="h-full w-full" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      </div>
    );
  }
  if (video.kind === 'file') return <video controls preload="metadata" src={video.src} className="aspect-video w-full rounded-xl bg-black shadow-card" />;
  return isSafeUrl(url) ? <a href={url} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant: 'secondary' })}><PlayCircle className="h-4 w-4" aria-hidden />{t('student.lesson.videoFallback')}</a> : null;
}

export default function Lesson() {
  const { courseId = '', lessonId = '' } = useParams();
  const { t, lang, pick, pair, fmt } = useI18n();
  const errors = useErrorText();
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [outlineOpen, setOutlineOpen] = useState(false);

  const lessonKey = ['student', 'lesson', lessonId];
  const { data, isPending, error, refetch } = useQuery({ queryKey: lessonKey, queryFn: () => api.get<StudentLessonPayload>(`/me/lessons/${lessonId}`) });
  const { data: outline } = useQuery({ queryKey: ['student', 'course', courseId], queryFn: () => api.get<StudentCourseOutline>(`/me/courses/${courseId}`) });
  useDocumentTitle(data ? pick(data.lesson, 'title') : undefined);

  const toggle = useMutation({
    mutationFn: (completed: boolean) => api.post<{ completed: boolean; progress: Progress }>('/progress', { lessonId, completed }),
    onSuccess: (res, completed) => {
      qc.setQueryData<StudentLessonPayload>(lessonKey, (old) => old && { ...old, lesson: { ...old.lesson, completed: res.completed }, progress: res.progress });
      void qc.invalidateQueries({ queryKey: ['student', 'course'] });
      void qc.invalidateQueries({ queryKey: ['student', 'dashboard'] });
      void qc.invalidateQueries({ queryKey: ['student', 'courses'] });
      toast.success(t(completed ? 'student.lesson.toastDone' : 'student.lesson.toastUndone'));
    },
    onError: (err) => toast.error(errors.message(err)),
  });

  if (error) {
    const status = error instanceof ApiError ? error.status : 0;
    return status === 403 || status === 404
      ? <EmptyState icon={status === 403 ? Lock : SearchX} title={t(status === 403 ? 'errors.codes.NOT_ENROLLED' : 'student.lesson.notFound')} action={<Link to="/student/courses" className={buttonClass()}>{t('student.course.back')}</Link>} />
      : <ErrorState error={error} onRetry={() => refetch()} />;
  }
  if (isPending) return <div className="grid gap-8 lg:grid-cols-[1fr_300px]"><div className="space-y-4"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-10 w-3/4" /><Skeleton className="h-72 w-full" /></div><Skeleton className="hidden h-96 lg:block" /></div>;

  const { lesson, module, previous, next, progress } = data;
  const content = pick(lesson, 'content');
  const done = lesson.completed;
  const courseDone = progress.total > 0 && progress.percent === 100;
  const lessonUrl = (id: string) => `/student/courses/${courseId}/lessons/${id}`;
  const resources = lesson.resources.filter((r) => isSafeUrl(r.url));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <article className="min-w-0 pb-28 lg:pb-0">
        <nav aria-label={t('common.breadcrumb')} className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
          <Link to={`/student/courses/${courseId}`} className="inline-flex items-center gap-1.5 font-medium hover:text-slate-900"><ArrowLeft className="h-4 w-4" aria-hidden />{pick(data.course, 'title')}</Link>
          <span aria-hidden>/</span>
          <span>{pick(module, 'title')}</span>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={lesson.type === 'VIDEO' ? 'brand' : 'neutral'}>{t(`lessonType.${lesson.type}`)}</Badge>
          {lesson.durationMinutes ? <span className="text-sm text-slate-500">{fmt.minutes(lesson.durationMinutes)}</span> : null}
          {done && <Badge tone="success" dot>{t('student.lesson.completed')}</Badge>}
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">{pick(lesson, 'title')}</h1>
        {pick(lesson, 'description') && <p className="mt-3 text-lg leading-8 text-slate-500">{pick(lesson, 'description')}</p>}

        {lesson.videoUrl && <div className="mt-7"><VideoBlock url={lesson.videoUrl} title={pick(lesson, 'title')} /></div>}

        <div className="mt-8">
          {content ? <Markdown>{content}</Markdown> : !lesson.videoUrl && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">{t('student.lesson.noContent')}</p>}
        </div>

        {resources.length > 0 && (
          <section className="mt-10" aria-labelledby="resources">
            <h2 id="resources" className="mb-3 font-display text-lg font-semibold text-slate-900">{t('student.lesson.resources')}</h2>
            <ul className="space-y-2">
              {resources.map((r, i) => {
                const title = pair(r.title);
                // PDFs open in the browser's viewer; Office files download under the resource title instead of their random stored name.
                const download = r.fileType && r.fileType !== 'pdf' ? `${title}.${r.fileType}` : undefined;
                return (
                  <li key={i}>
                    <a href={r.url} target={download ? undefined : '_blank'} rel="noopener noreferrer" download={download} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-brand-300 hover:shadow-card">
                      <FileTypeIcon type={r.fileType} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-slate-800">{title}</span>
                        {r.fileType && <span className="block text-xs text-slate-500"><span className="uppercase">{r.fileType}</span>{r.size != null && ` · ${formatBytes(r.size, lang)}`}</span>}
                      </span>
                      {download
                        ? <Download className="h-4 w-4 shrink-0 text-slate-400" aria-label={t('student.lesson.download')} />
                        : <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" aria-label={t('student.lesson.openLink')} />}
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {courseDone && done && (
          <p role="status" className="mt-8 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-medium text-emerald-800"><PartyPopper className="h-5 w-5 shrink-0" aria-hidden />{t('student.lesson.courseComplete')}</p>
        )}

        {/* Action bar: sticky on phones, inline on desktop */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:static lg:mt-10 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 sm:gap-3">
            <Button variant="secondary" className="lg:hidden" iconLeft={<ListTree className="h-4 w-4" aria-hidden />} onClick={() => setOutlineOpen(true)} aria-label={t('student.lesson.outline')} />
            {previous && <Link to={lessonUrl(previous.id)} className={buttonClass({ variant: 'secondary' })} aria-label={`${t('student.lesson.previous')}: ${pick(previous, 'title')}`}><ArrowLeft className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">{t('student.lesson.previous')}</span></Link>}
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              {done ? (
                <Button variant="ghost" loading={toggle.isPending} onClick={() => toggle.mutate(false)} iconLeft={<CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />}><span className="hidden sm:inline">{t('student.lesson.markIncomplete')}</span><span className="sm:hidden">{t('student.lesson.completed')}</span></Button>
              ) : (
                <Button loading={toggle.isPending} glow onClick={() => toggle.mutate(true)} iconLeft={<CheckCircle2 className="h-4 w-4" aria-hidden />}>{t('student.lesson.markComplete')}</Button>
              )}
              {next ? (
                <Link to={lessonUrl(next.id)} className={buttonClass({ variant: done ? 'primary' : 'secondary' })}><span className="hidden sm:inline">{t('student.lesson.next')}</span><ArrowRight className="h-4 w-4" aria-hidden /></Link>
              ) : (
                <Button variant={done ? 'primary' : 'secondary'} onClick={() => navigate(`/student/courses/${courseId}`)}>{t('student.lesson.finish')}</Button>
              )}
            </div>
          </div>
        </div>
      </article>

      <aside className="hidden lg:block" aria-label={t('student.lesson.outline')}>
        <div className="sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="mb-4">
            <p className="mb-1.5 flex items-baseline justify-between text-sm"><span className="font-display font-semibold text-slate-900">{t('student.lesson.outline')}</span><span className="text-xs font-semibold tabular-nums text-slate-500">{progress.percent}%</span></p>
            <ProgressBar value={progress.percent} label={t('student.progress.label')} className="h-1.5" />
          </div>
          {outline ? <Outline outline={outline} currentId={lessonId} /> : <Skeleton className="h-60" />}
        </div>
      </aside>

      <Drawer open={outlineOpen} onClose={() => setOutlineOpen(false)} title={t('student.lesson.outline')}>
        {outline && <Outline outline={outline} currentId={lessonId} onNavigate={() => setOutlineOpen(false)} />}
      </Drawer>
    </div>
  );
}
