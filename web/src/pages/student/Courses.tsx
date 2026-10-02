import { useQuery } from '@tanstack/react-query';
import { GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CourseCardSkeleton } from '@/components/course';
import { EmptyState, ErrorState } from '@/components/ui/data';
import { buttonClass } from '@/components/ui/primitives';
import { useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import type { StudentCourse } from '@/lib/types';
import { StudentCourseCard } from './StudentCourseCard';

export default function Courses() {
  const { t } = useI18n();
  const { data, isPending, error, refetch } = useQuery({ queryKey: ['student', 'courses'], queryFn: () => api.get<StudentCourse[]>('/me/courses') });
  useDocumentTitle(t('student.courses.title'));
  return (
    <>
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t('student.courses.title')}</h1>
        <p className="mt-1.5 text-slate-500">{t('student.courses.subtitle')}</p>
      </header>
      {error ? <ErrorState error={error} onRetry={() => refetch()} /> : isPending ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <CourseCardSkeleton key={i} />)}</div>
      ) : data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white"><EmptyState icon={GraduationCap} title={t('student.dashboard.emptyTitle')} text={t('student.dashboard.emptyText')} action={<Link to="/contact" className={buttonClass()}>{t('student.dashboard.contact')}</Link>} /></div>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{data.map((c) => <li key={c.course.id}><StudentCourseCard item={c} titleTag="h2" /></li>)}</ul>
      )}
    </>
  );
}
