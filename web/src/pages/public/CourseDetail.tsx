import { useQuery } from '@tanstack/react-query';
import { SearchX } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { CourseDetailView } from '@/components/CourseDetailView';
import { EmptyState, ErrorState } from '@/components/ui/data';
import { Skeleton, buttonClass } from '@/components/ui/primitives';
import { useI18n } from '@/i18n';
import { ApiError, api } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import { useSiteSettings } from '@/lib/queries';
import type { CourseDetail as CourseDetailType } from '@/lib/types';

export default function CourseDetail() {
  const { ref = '' } = useParams();
  const { t, pick } = useI18n();
  const { data: site } = useSiteSettings();
  const { data: course, isPending, error, refetch } = useQuery({
    queryKey: ['course', ref],
    queryFn: () => api.get<CourseDetailType>(`/courses/${encodeURIComponent(ref)}`),
    retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
  });
  useDocumentTitle(course ? `${pick(course, 'title')} · ${site?.name ?? ''}` : undefined);

  if (isPending) {
    return (
      <div className="container-page space-y-6 py-16" aria-busy="true">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="container-page">
        <EmptyState icon={SearchX} className="py-28" title={t('detail.notFoundTitle')} text={t('detail.notFoundText')} action={<Link to="/courses" className={buttonClass()}>{t('detail.backToCourses')}</Link>} />
      </div>
    );
  }
  if (error) return <div className="container-page py-20"><ErrorState error={error} onRetry={() => refetch()} /></div>;
  return <CourseDetailView course={course} />;
}
