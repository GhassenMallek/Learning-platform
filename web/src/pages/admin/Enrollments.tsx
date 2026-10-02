import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CheckCircle2, ClipboardList, PlayCircle, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DataTable, EmptyState, ErrorState, PageHeader, Pagination, StatusBadge, type Column } from '@/components/ui/data';
import { ConfirmDialog, Menu, Modal, useToast, type MenuItem } from '@/components/ui/overlays';
import { Avatar, Button, Field, Input, ProgressBar, Select } from '@/components/ui/primitives';
import { useErrorText, useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import { usePublishedCourses } from '@/lib/queries';
import type { CourseListItem, Enrollment, EnrollmentStatus, Progress } from '@/lib/types';
import { toDateInput } from '@/lib/utils';
import { CourseThumb, Panel, StudentPicker, type StudentLite } from './shared';

export function ProgressCell({ progress }: { progress: Progress }) {
  const { t } = useI18n();
  return (
    <div className="flex min-w-[8rem] items-center gap-2.5" title={`${progress.completed}/${progress.total}`}>
      <ProgressBar value={progress.percent} label={t('student.progress.label')} className="h-1.5 flex-1" />
      <span className="w-9 text-right text-xs font-semibold tabular-nums text-slate-700">{progress.percent}%</span>
    </div>
  );
}

/** Enroll a student in a course. Either side can be fixed by the caller (from a course page or a student page). */
export function EnrollModal({ open, onClose, fixedCourseId, fixedStudent }: { open: boolean; onClose: () => void; fixedCourseId?: string; fixedStudent?: StudentLite }) {
  const { t, pick } = useI18n();
  const errors = useErrorText();
  const toast = useToast();
  const qc = useQueryClient();
  const { data: courses = [] } = usePublishedCourses();
  const [student, setStudent] = useState<StudentLite | null>(fixedStudent ?? null);
  const [courseId, setCourseId] = useState(fixedCourseId ?? '');
  const [date, setDate] = useState(toDateInput(new Date().toISOString()));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const enroll = useMutation({
    mutationFn: () => api.post('/enrollments', { studentId: student!.id, courseId, enrolledAt: date }),
    onSuccess: () => {
      toast.success(t('admin.enrollments.toast.created'));
      void qc.invalidateQueries({ queryKey: ['admin'] });
      void qc.invalidateQueries({ queryKey: ['students'] });
      onClose();
    },
    onError: (err) => {
      const fields = errors.fields(err);
      setFieldErrors(fields);
      if (!Object.keys(fields).length) toast.error(errors.message(err));
    },
  });

  const submit = () => {
    const next: Record<string, string> = {};
    if (!student) next.studentId = t('errors.fields.required');
    if (!courseId) next.courseId = t('errors.fields.required');
    if (!date) next.enrolledAt = t('errors.fields.required');
    setFieldErrors(next);
    if (!Object.keys(next).length) enroll.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title={t('admin.enrollments.form.title')}
      footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={submit} loading={enroll.isPending} iconLeft={<Plus className="h-4 w-4" aria-hidden />}>{t('admin.enrollments.form.submit')}</Button></>}>
      <div className="space-y-5">
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">{t('admin.enrollments.form.student')} <span className="text-rose-600" aria-hidden>*</span></p>
          {fixedStudent ? <StudentPicker value={fixedStudent} onChange={() => undefined} changeLabel="" /> : <StudentPicker value={student} onChange={setStudent} />}
          {fieldErrors.studentId && <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">{fieldErrors.studentId}</p>}
        </div>
        <Field label={t('admin.enrollments.form.course')} required error={fieldErrors.courseId}>
          <Select value={courseId} disabled={!!fixedCourseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">{t('admin.enrollments.form.chooseCourse')}</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{pick(c, 'title')}</option>)}
          </Select>
        </Field>
        <Field label={t('admin.enrollments.form.date')} required error={fieldErrors.enrolledAt}><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

/** Status changes and removal, shared by every table that lists enrollments. */
export function useEnrollmentActions() {
  const { t, pick } = useI18n();
  const errors = useErrorText();
  const toast = useToast();
  const qc = useQueryClient();
  const [removing, setRemoving] = useState<Enrollment | null>(null);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin'] });
    void qc.invalidateQueries({ queryKey: ['students'] });
  };
  const setStatus = useMutation({
    mutationFn: ({ e, status }: { e: { id: string }; status: EnrollmentStatus }) => api.patch(`/enrollments/${e.id}`, { status }),
    onSuccess: () => { toast.success(t('admin.enrollments.toast.updated')); refresh(); },
    onError: (err) => toast.error(errors.message(err)),
  });
  const remove = useMutation({
    mutationFn: (e: Enrollment) => api.del(`/enrollments/${e.id}`),
    onSuccess: () => { toast.success(t('admin.enrollments.toast.removed')); setRemoving(null); refresh(); },
    onError: (err) => { setRemoving(null); toast.error(errors.message(err)); },
  });

  const items = (e: Enrollment): MenuItem[] => [
    { label: t('admin.enrollments.actions.active'), icon: PlayCircle, hidden: e.status === 'ACTIVE', onSelect: () => setStatus.mutate({ e, status: 'ACTIVE' }) },
    { label: t('admin.enrollments.actions.completed'), icon: CheckCircle2, hidden: e.status === 'COMPLETED', onSelect: () => setStatus.mutate({ e, status: 'COMPLETED' }) },
    { label: t('admin.enrollments.actions.cancelled'), icon: Ban, hidden: e.status === 'CANCELLED', onSelect: () => setStatus.mutate({ e, status: 'CANCELLED' }) },
    { label: t('admin.enrollments.actions.remove'), icon: Trash2, tone: 'danger', separatorBefore: true, onSelect: () => setRemoving(e) },
  ];

  const dialog = (
    <ConfirmDialog
      open={!!removing}
      loading={remove.isPending}
      onCancel={() => setRemoving(null)}
      onConfirm={() => removing && remove.mutate(removing)}
      title={t('admin.enrollments.confirmRemoveTitle')}
      description={removing ? t('admin.enrollments.confirmRemoveText', { student: `${removing.student.firstName} ${removing.student.lastName}`, course: pick(removing.course, 'title') }) : ''}
      confirmLabel={t('admin.enrollments.actions.remove')}
    />
  );
  return { items, dialog };
}

export default function Enrollments() {
  const { t, pick, fmt } = useI18n();
  const [params, setParams] = useSearchParams();
  const [enrolling, setEnrolling] = useState(false);
  const course = params.get('course') ?? '';
  const status = params.get('status') ?? '';
  const page = Number(params.get('page') ?? 1) || 1;
  const actions = useEnrollmentActions();
  useDocumentTitle(t('admin.enrollments.title'));

  const { data: courseList } = useQuery({ queryKey: ['admin', 'courses', 'all-light'], queryFn: () => api.list<CourseListItem>('/courses', { status: 'ALL', pageSize: 100, sort: 'title' }), staleTime: 60_000 });
  const { data, isPending, isPlaceholderData, error, refetch } = useQuery({
    queryKey: ['admin', 'enrollments', { course, status, page }],
    queryFn: () => api.list<Enrollment>('/enrollments', { courseId: course, status: status || 'ALL', page, pageSize: 15 }),
    placeholderData: keepPreviousData,
  });
  const set = (key: string, value: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    }, { replace: true });

  const columns: Column<Enrollment>[] = [
    { id: 'student', header: t('admin.enrollments.cols.student'), primary: true, cell: (e) => (
      <Link to={`/admin/students/${e.student.id}`} className="flex min-w-0 items-center gap-3" onClick={(ev) => ev.stopPropagation()}>
        <Avatar firstName={e.student.firstName} lastName={e.student.lastName} src={e.student.profilePhotoUrl} />
        <span className="min-w-0"><span className="block truncate font-semibold text-slate-900 hover:text-brand-700">{e.student.firstName} {e.student.lastName}</span><span className="block truncate text-xs text-slate-500">{e.student.user?.email}</span></span>
      </Link>
    ) },
    { id: 'course', header: t('admin.enrollments.cols.course'), cell: (e) => (
      <Link to={`/admin/courses/${e.course.id}`} className="flex min-w-0 items-center gap-3" onClick={(ev) => ev.stopPropagation()}>
        <CourseThumb course={e.course} className="hidden w-12 lg:block" />
        <span className="min-w-0 truncate font-medium text-slate-800 hover:text-brand-700">{pick(e.course, 'title')}</span>
      </Link>
    ) },
    { id: 'date', header: t('admin.enrollments.cols.date'), hideBelow: 'lg', cell: (e) => <span className="text-slate-600">{fmt.date(e.enrolledAt)}</span> },
    { id: 'status', header: t('admin.enrollments.cols.status'), cell: (e) => <StatusBadge kind="enrollment" value={e.status} /> },
    { id: 'progress', header: t('admin.enrollments.cols.progress'), hideBelow: 'md', cell: (e) => <ProgressCell progress={e.progress} /> },
    { id: 'actions', header: <span className="sr-only">{t('common.actions')}</span>, mobile: 'actions', align: 'right', className: 'w-14', cell: (e) => <Menu items={actions.items(e)} /> },
  ];

  return (
    <>
      <PageHeader title={t('admin.enrollments.title')} description={t('admin.enrollments.subtitle')} actions={<Button iconLeft={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setEnrolling(true)}>{t('admin.enrollments.new')}</Button>} />
      <Panel padded={false}>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:max-w-2xl">
          <Select aria-label={t('admin.enrollments.cols.course')} value={course} onChange={(e) => set('course', e.target.value)}>
            <option value="">{t('admin.enrollments.allCourses')}</option>
            {courseList?.items.map((c) => <option key={c.id} value={c.id}>{pick(c, 'title')}</option>)}
          </Select>
          <Select aria-label={t('common.status')} value={status} onChange={(e) => set('status', e.target.value)}>
            <option value="">{t('admin.enrollments.allStatuses')}</option>
            {(['ACTIVE', 'COMPLETED', 'CANCELLED'] as const).map((s) => <option key={s} value={s}>{t(`status.enrollment.${s}`)}</option>)}
          </Select>
        </div>
        {error ? <ErrorState error={error} onRetry={() => refetch()} /> : (
          <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <DataTable columns={columns} rows={data?.items} loading={isPending} rowKey={(e) => e.id}
              empty={course || status
                ? <EmptyState icon={ClipboardList} title={t('admin.enrollments.noMatchTitle')} />
                : <EmptyState icon={ClipboardList} title={t('admin.enrollments.emptyTitle')} text={t('admin.enrollments.emptyText')} action={<Button onClick={() => setEnrolling(true)}>{t('admin.enrollments.new')}</Button>} />} />
            {data && data.meta.total > 0 && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={(p) => set('page', String(p))} />}
          </div>
        )}
      </Panel>
      {enrolling && <EnrollModal open onClose={() => setEnrolling(false)} />}
      {actions.dialog}
    </>
  );
}
