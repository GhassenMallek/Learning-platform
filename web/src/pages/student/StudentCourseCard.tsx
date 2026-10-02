import { ArrowRight, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CourseCover, categoryTone } from '@/components/course';
import { Badge, ProgressBar } from '@/components/ui/primitives';
import { useI18n } from '@/i18n';
import type { StudentCourse } from '@/lib/types';

/** A course the student can open, with progress that always comes from real lesson completions. */
export function StudentCourseCard({ item, titleTag: Heading = 'h3' }: { item: StudentCourse; titleTag?: 'h2' | 'h3' }) {
  const { t, pick, fmt } = useI18n();
  const { course, progress, nextLesson, enrollment } = item;
  const finished = progress.total > 0 && progress.percent === 100;
  const started = progress.completed > 0;
  const cta = nextLesson && !finished ? `/student/courses/${course.id}/lessons/${nextLesson.id}` : `/student/courses/${course.id}`;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-elevated">
      <div className="aspect-[16/8] overflow-hidden bg-slate-100"><div className="h-full w-full transition duration-500 group-hover:scale-[1.04]"><CourseCover course={course} /></div></div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          {course.category && <Badge tone={categoryTone(course.category.slug)}>{pick(course.category, 'name')}</Badge>}
          {course.academicYear && <Badge>{pick(course.academicYear, 'name')}</Badge>}
          {finished && <Badge tone="success" dot>{t('student.progress.done')}</Badge>}
        </div>
        <Heading className="mt-3 line-clamp-2 font-display text-lg font-semibold leading-snug text-slate-900">
          <Link to={`/student/courses/${course.id}`} className="rounded after:absolute after:inset-0 after:z-10 after:content-['']">{pick(course, 'title')}</Link>
        </Heading>
        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="font-semibold text-slate-900">{t('student.progress.percent', { percent: progress.percent })}</span>
            <span className="text-xs text-slate-500">{progress.completed}/{progress.total}</span>
          </div>
          <ProgressBar value={progress.percent} label={t('student.progress.label')} />
        </div>
        <p className="mt-3 text-xs text-slate-400">{t('student.courses.enrolledOn', { date: fmt.date(enrollment.enrolledAt) })}</p>
        <div className="mt-auto pt-5">
          <Link to={cta} className="relative z-20 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:gap-3">
            {finished ? <><RotateCcw className="h-4 w-4" aria-hidden />{t('student.courses.review')}</> : <>{started ? t('student.courses.continue') : t('student.courses.start')}<ArrowRight className="h-4 w-4" aria-hidden /></>}
          </Link>
        </div>
      </div>
    </article>
  );
}
