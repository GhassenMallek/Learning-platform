import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Power, Search, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { DataTable, EmptyState, ErrorState, PageHeader, Pagination, StatusBadge, type Column } from '@/components/ui/data';
import { Menu, useToast } from '@/components/ui/overlays';
import { Avatar, Input, Select, buttonClass } from '@/components/ui/primitives';
import { useErrorText, useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { useDebouncedValue, useDocumentTitle } from '@/lib/hooks';
import type { Student, StudentStatus } from '@/lib/types';
import { Panel } from './shared';

export default function Students() {
  const { t, fmt } = useI18n();
  const errors = useErrorText();
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState('');
  const q = useDebouncedValue(text.trim(), 300);
  const status = params.get('status') ?? '';
  const page = Number(params.get('page') ?? 1) || 1;
  useDocumentTitle(t('admin.students.title'));

  const { data, isPending, isPlaceholderData, error, refetch } = useQuery({
    queryKey: ['admin', 'students', { q, status, page }],
    queryFn: () => api.list<Student>('/students', { q, status: status || 'ALL', page, pageSize: 15 }),
    placeholderData: keepPreviousData,
  });
  const setStatus = useMutation({
    mutationFn: ({ s, next }: { s: Student; next: StudentStatus }) => api.patch(`/students/${s.id}/status`, { status: next }),
    onSuccess: (_d, { next }) => { toast.success(t(next === 'ACTIVE' ? 'admin.students.detail.toast.activated' : 'admin.students.detail.toast.deactivated')); void qc.invalidateQueries({ queryKey: ['admin'] }); void qc.invalidateQueries({ queryKey: ['students'] }); },
    onError: (err) => toast.error(errors.message(err)),
  });
  const set = (key: string, value: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    }, { replace: true });

  const columns: Column<Student>[] = [
    { id: 'student', header: t('admin.students.cols.student'), primary: true, cell: (s) => (
      <div className="flex min-w-0 items-center gap-3">
        <Avatar firstName={s.firstName} lastName={s.lastName} src={s.profilePhotoUrl} />
        <div className="min-w-0"><p className="truncate font-semibold text-slate-900">{s.firstName} {s.lastName}</p><p className="truncate text-xs text-slate-500">{s.email}</p></div>
      </div>
    ) },
    { id: 'phone', header: t('admin.students.cols.phone'), hideBelow: 'lg', cell: (s) => <span className="text-slate-600">{s.phone ?? '—'}</span> },
    { id: 'courses', header: t('admin.students.cols.courses'), hideBelow: 'md', cell: (s) => <span className="tabular-nums">{s.enrollmentCount ?? 0}</span> },
    { id: 'status', header: t('admin.students.cols.status'), cell: (s) => <StatusBadge kind="student" value={s.status} /> },
    { id: 'joined', header: t('admin.students.cols.joined'), hideBelow: 'xl', cell: (s) => <span className="text-slate-500">{fmt.date(s.createdAt)}</span> },
    { id: 'actions', header: <span className="sr-only">{t('common.actions')}</span>, mobile: 'actions', align: 'right', className: 'w-14', cell: (s) => (
      <Menu items={[
        { label: t('common.view'), icon: Eye, onSelect: () => navigate(`/admin/students/${s.id}`) },
        { label: t(s.status === 'ACTIVE' ? 'admin.students.detail.deactivate' : 'admin.students.detail.activate'), icon: Power, separatorBefore: true, onSelect: () => setStatus.mutate({ s, next: s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }) },
      ]} />
    ) },
  ];

  const filtered = !!(q || status);
  return (
    <>
      <PageHeader title={t('admin.students.title')} description={t('admin.students.subtitle')} actions={<Link to="/admin/students/new" className={buttonClass()}><UserPlus className="h-4 w-4" aria-hidden />{t('admin.students.add')}</Link>} />
      <Panel padded={false}>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-[1fr_220px]">
          <div><label className="sr-only" htmlFor="s-search">{t('common.search')}</label><Input id="s-search" type="search" value={text} onChange={(e) => { setText(e.target.value); set('page', ''); }} placeholder={t('admin.students.search')} leading={<Search className="h-4 w-4" aria-hidden />} /></div>
          <Select aria-label={t('common.status')} value={status} onChange={(e) => set('status', e.target.value)}>
            <option value="">{t('admin.students.allStatuses')}</option>
            {(['ACTIVE', 'INACTIVE'] as const).map((s) => <option key={s} value={s}>{t(`status.student.${s}`)}</option>)}
          </Select>
        </div>
        {error ? <ErrorState error={error} onRetry={() => refetch()} /> : (
          <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <DataTable columns={columns} rows={data?.items} loading={isPending} rowKey={(s) => s.id} onRowClick={(s) => navigate(`/admin/students/${s.id}`)}
              empty={filtered
                ? <EmptyState icon={Search} title={t('admin.students.noMatchTitle')} text={t('admin.students.noMatchText')} />
                : <EmptyState icon={Users} title={t('admin.students.emptyTitle')} text={t('admin.students.emptyText')} action={<Link to="/admin/students/new" className={buttonClass()}>{t('admin.students.add')}</Link>} />} />
            {data && data.meta.total > 0 && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={(p) => set('page', String(p))} />}
          </div>
        )}
      </Panel>
    </>
  );
}
