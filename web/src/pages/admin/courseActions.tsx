import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive, Eye, ExternalLink, EyeOff, Globe, Pencil, Settings2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog, useToast, type MenuItem } from '@/components/ui/overlays';
import { useErrorText, useI18n } from '@/i18n';
import { ApiError, api } from '@/lib/api';
import type { CourseStatus } from '@/lib/types';

export interface ActionCourse {
  id: string;
  slug: string;
  status: CourseStatus;
  title_fr: string;
}

type Pending = { kind: 'delete' | 'unpublish' | 'archive'; course: ActionCourse } | null;

/**
 * Every lifecycle action of a course (publish / unpublish / archive / delete) in one place,
 * shared by the courses table and the course page. Destructive or visibility-changing actions ask for confirmation.
 */
export function useCourseActions({ afterDelete }: { afterDelete?: () => void } = {}) {
  const { t, pick } = useI18n();
  const errors = useErrorText();
  const toast = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [pending, setPending] = useState<Pending>(null);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin'] });
    void qc.invalidateQueries({ queryKey: ['courses'] });
    void qc.invalidateQueries({ queryKey: ['course'] });
    void qc.invalidateQueries({ queryKey: ['categories'] });
    void qc.invalidateQueries({ queryKey: ['stats'] });
  };

  const change = useMutation({
    mutationFn: ({ course, action }: { course: ActionCourse; action: 'publish' | 'unpublish' | 'archive' }) => api.patch(`/courses/${course.id}/${action}`),
    onSuccess: (_d, { action }) => {
      toast.success(t(`admin.courses.toast.${action === 'publish' ? 'published' : action === 'unpublish' ? 'unpublished' : 'archived'}`));
      refresh();
      setPending(null);
    },
    onError: (err, { course }) => {
      setPending(null);
      if (err instanceof ApiError && err.code === 'COURSE_NOT_PUBLISHABLE') {
        toast.error(t('errors.codes.COURSE_NOT_PUBLISHABLE'));
        navigate(`/admin/courses/${course.id}/edit?step=5`);
      } else toast.error(errors.message(err));
    },
  });

  const remove = useMutation({
    mutationFn: (course: ActionCourse) => api.del(`/courses/${course.id}`),
    onSuccess: () => {
      toast.success(t('admin.courses.toast.deleted'));
      refresh();
      setPending(null);
      afterDelete?.();
    },
    onError: (err) => {
      setPending(null);
      toast.error(errors.message(err));
    },
  });

  const items = (course: ActionCourse, exclude: ('manage' | 'edit')[] = []): MenuItem[] => [
    { label: t('admin.courses.actions.manage'), icon: Settings2, hidden: exclude.includes('manage'), onSelect: () => navigate(`/admin/courses/${course.id}`) },
    { label: t('admin.courses.actions.edit'), icon: Pencil, hidden: exclude.includes('edit'), onSelect: () => navigate(`/admin/courses/${course.id}/edit`) },
    { label: t('admin.courses.actions.preview'), icon: Eye, onSelect: () => navigate(`/admin/courses/${course.id}?tab=preview`) },
    { label: t('admin.courses.actions.viewLive'), icon: ExternalLink, hidden: course.status !== 'PUBLISHED', onSelect: () => window.open(`/courses/${course.slug}`, '_blank', 'noopener') },
    { label: t('admin.courses.actions.publish'), icon: Globe, hidden: course.status === 'PUBLISHED', separatorBefore: true, onSelect: () => change.mutate({ course, action: 'publish' }) },
    { label: t('admin.courses.actions.unpublish'), icon: EyeOff, hidden: course.status !== 'PUBLISHED', separatorBefore: true, onSelect: () => setPending({ kind: 'unpublish', course }) },
    { label: t('admin.courses.actions.archive'), icon: Archive, hidden: course.status === 'ARCHIVED', onSelect: () => setPending({ kind: 'archive', course }) },
    { label: t('admin.courses.actions.delete'), icon: Trash2, tone: 'danger', separatorBefore: true, onSelect: () => setPending({ kind: 'delete', course }) },
  ];

  const busy = change.isPending || remove.isPending;
  const title = pending ? pick(pending.course, 'title') : '';
  const dialog = (
    <ConfirmDialog
      open={!!pending}
      loading={busy}
      onCancel={() => setPending(null)}
      tone={pending?.kind === 'delete' ? 'danger' : 'primary'}
      title={pending ? t(`admin.courses.confirm.${pending.kind}Title`) : ''}
      description={pending ? t(`admin.courses.confirm.${pending.kind}Text`, { title }) : ''}
      confirmLabel={pending ? t(`admin.courses.actions.${pending.kind}`) : ''}
      onConfirm={() => {
        if (!pending) return;
        if (pending.kind === 'delete') remove.mutate(pending.course);
        else change.mutate({ course: pending.course, action: pending.kind });
      }}
    />
  );

  return { items, dialog, publish: (course: ActionCourse) => change.mutate({ course, action: 'publish' }), publishing: change.isPending };
}
