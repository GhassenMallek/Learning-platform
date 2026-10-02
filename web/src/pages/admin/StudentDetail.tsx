import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, KeyRound, Pencil, Plus, Power, SearchX } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DataTable, EmptyState, ErrorState, PageHeader, StatusBadge, type Column } from '@/components/ui/data';
import { ConfirmDialog, Menu, useToast } from '@/components/ui/overlays';
import { Avatar, Button, Skeleton, buttonClass } from '@/components/ui/primitives';
import { useErrorText, useI18n } from '@/i18n';
import { ApiError, api } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import type { StudentDetail as StudentDetailType } from '@/lib/types';
import { EnrollModal, ProgressCell, useEnrollmentActions } from './Enrollments';
import { EditStudentDrawer } from './StudentForm';
import { CourseThumb, CredentialsModal, Panel } from './shared';

export default function StudentDetail() {
  const { id = '' } = useParams();
  const { t, pick, fmt } = useI18n();
  const errors = useErrorText();
  const toast = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [confirm, setConfirm] = useState<'toggle' | 'reset' | null>(null);
  const [credentials, setCredentials] = useState<string | null>(null);
  const enrollmentActions = useEnrollmentActions();
  const key = ['admin', 'student', id];
  const { data: student, isPending, error, refetch } = useQuery({ queryKey: key, queryFn: () => api.get<StudentDetailType>(`/students/${id}`) });
  useDocumentTitle(student ? `${student.firstName} ${student.lastName}` : t('admin.students.title'));

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin'] });
    void qc.invalidateQueries({ queryKey: ['students'] });
  };
  const toggle = useMutation({
    mutationFn: () => api.patch(`/students/${id}/status`, { status: student!.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
    onSuccess: () => { toast.success(t(student!.status === 'ACTIVE' ? 'admin.students.detail.toast.deactivated' : 'admin.students.detail.toast.activated')); setConfirm(null); refresh(); },
    onError: (err) => { setConfirm(null); toast.error(errors.message(err)); },
  });
  const reset = useMutation({
    mutationFn: () => api.post<{ temporaryPassword: string }>(`/students/${id}/reset-password`),
    onSuccess: (res) => { setConfirm(null); setCredentials(res.temporaryPassword); refresh(); },
    onError: (err) => { setConfirm(null); toast.error(errors.message(err)); },
  });

  if (error) {
    return error instanceof ApiError && error.status === 404
      ? <EmptyState icon={SearchX} title={t('errors.notFound')} action={<Link to="/admin/students" className={buttonClass()}>{t('admin.nav.allStudents')}</Link>} />
      : <ErrorState error={error} onRetry={() => refetch()} />;
  }
  if (isPending) return <div className="space-y-4"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-40 w-full" /><Skeleton className="h-56 w-full" /></div>;

  const name = `${student.firstName} ${student.lastName}`;
  const enrollments = student.enrollments.map((e) => ({ ...e, student: { id: student.id, firstName: student.firstName, lastName: student.lastName, status: student.status, profilePhotoUrl: student.profilePhotoUrl } }));
  const columns: Column<(typeof enrollments)[number]>[] = [
    { id: 'course', header: t('admin.students.detail.cols.course'), primary: true, cell: (e) => (
      <Link to={`/admin/courses/${e.course.id}`} className="flex min-w-0 items-center gap-3"><CourseThumb course={e.course} /><span className="min-w-0 truncate font-semibold text-slate-900 hover:text-brand-700">{pick(e.course, 'title')}</span></Link>
    ) },
    { id: 'date', header: t('admin.students.detail.cols.enrolled'), hideBelow: 'md', cell: (e) => fmt.date(e.enrolledAt) },
    { id: 'status', header: t('admin.students.detail.cols.status'), cell: (e) => <StatusBadge kind="enrollment" value={e.status} /> },
    { id: 'progress', header: t('admin.students.detail.cols.progress'), cell: (e) => <ProgressCell progress={e.progress} /> },
    { id: 'actions', header: <span className="sr-only">{t('common.actions')}</span>, mobile: 'actions', align: 'right', className: 'w-14', cell: (e) => <Menu items={enrollmentActions.items(e)} /> },
  ];

  const info: [string, string][] = [
    [t('admin.students.form.email'), student.email],
    [t('admin.students.form.phone'), student.phone ?? '—'],
    [t('admin.students.form.dob'), student.dateOfBirth ? fmt.date(student.dateOfBirth) : '—'],
    [t('admin.students.form.address'), student.address ?? '—'],
    [t('admin.students.detail.memberSince'), fmt.date(student.createdAt)],
    [t('admin.students.detail.lastLogin'), student.lastLoginAt ? fmt.dateTime(student.lastLoginAt) : t('admin.students.detail.never')],
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t('admin.nav.students'), to: '/admin/students' }, { label: name }]}
        title={<span className="flex flex-wrap items-center gap-3"><Avatar firstName={student.firstName} lastName={student.lastName} src={student.profilePhotoUrl} size="lg" />{name}<StatusBadge kind="student" value={student.status} /></span>}
        actions={
          <>
            <Button variant="secondary" iconLeft={<Pencil className="h-4 w-4" aria-hidden />} onClick={() => setEditing(true)}>{t('admin.students.detail.edit')}</Button>
            <Button onClick={() => setEnrolling(true)} disabled={student.status !== 'ACTIVE'} iconLeft={<Plus className="h-4 w-4" aria-hidden />}>{t('admin.students.detail.enroll')}</Button>
            <Menu items={[
              { label: t('admin.students.detail.resetPassword'), icon: KeyRound, onSelect: () => setConfirm('reset') },
              { label: t(student.status === 'ACTIVE' ? 'admin.students.detail.deactivate' : 'admin.students.detail.activate'), icon: Power, tone: student.status === 'ACTIVE' ? 'danger' : undefined, onSelect: () => setConfirm('toggle') },
            ]} />
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Panel title={t('admin.students.detail.profile')}>
          <dl className="divide-y divide-slate-100 text-sm">
            {info.map(([k, v]) => <div key={k} className="py-3 first:pt-0 last:pb-0"><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{k}</dt><dd className="mt-0.5 break-words font-medium text-slate-900">{v}</dd></div>)}
          </dl>
        </Panel>
        <Panel title={t('admin.students.detail.enrollments')} padded={false}>
          <DataTable columns={columns} rows={enrollments} rowKey={(e) => e.id}
            empty={<EmptyState icon={ClipboardList} title={t('admin.students.detail.noEnrollments')} action={student.status === 'ACTIVE' ? <Button onClick={() => setEnrolling(true)}>{t('admin.students.detail.enroll')}</Button> : undefined} />} />
        </Panel>
      </div>

      {editing && <EditStudentDrawer student={student} onClose={() => setEditing(false)} onSaved={() => { toast.success(t('admin.students.detail.toast.updated')); setEditing(false); refresh(); }} />}
      {enrolling && <EnrollModal open onClose={() => setEnrolling(false)} fixedStudent={{ id: student.id, firstName: student.firstName, lastName: student.lastName, email: student.email, profilePhotoUrl: student.profilePhotoUrl, status: student.status }} />}
      <ConfirmDialog open={confirm === 'toggle'} loading={toggle.isPending} onCancel={() => setConfirm(null)} onConfirm={() => toggle.mutate()}
        tone={student.status === 'ACTIVE' ? 'danger' : 'primary'}
        title={student.status === 'ACTIVE' ? t('admin.students.detail.confirmDeactivateTitle') : t('admin.students.detail.activate')}
        description={student.status === 'ACTIVE' ? t('admin.students.detail.confirmDeactivateText', { name }) : name}
        confirmLabel={t(student.status === 'ACTIVE' ? 'admin.students.detail.deactivate' : 'admin.students.detail.activate')} />
      <ConfirmDialog open={confirm === 'reset'} loading={reset.isPending} onCancel={() => setConfirm(null)} onConfirm={() => reset.mutate()} tone="primary"
        title={t('admin.students.detail.confirmResetTitle')} description={t('admin.students.detail.confirmResetText', { name })} confirmLabel={t('admin.students.detail.resetPassword')} />
      {credentials && <CredentialsModal open onClose={() => setCredentials(null)} email={student.email} password={credentials} />}
      {enrollmentActions.dialog}
    </>
  );
}
