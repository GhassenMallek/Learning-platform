import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Inbox, Mail, MailOpen, Phone, Search, UserCheck, UserPlus, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DataTable, EmptyState, ErrorState, PageHeader, Pagination, StatusBadge, type Column } from '@/components/ui/data';
import { Drawer, Modal, useToast } from '@/components/ui/overlays';
import { Avatar, Button, Checkbox, Input, Skeleton, Tabs } from '@/components/ui/primitives';
import { useErrorText, useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { useDebouncedValue, useDocumentTitle } from '@/lib/hooks';
import type { ContactMessage, ContactStatus } from '@/lib/types';
import { NewStudentForm, splitName } from './StudentForm';
import { Panel, StudentPicker, type StudentLite } from './shared';

type TabId = 'inbox' | ContactStatus | 'ALL';

const courseOf = (m: ContactMessage) => (m.course && typeof m.course === 'object' ? m.course : null);

function LinkStudentModal({ message, onClose, onLinked }: { message: ContactMessage; onClose: () => void; onLinked: () => void }) {
  const { t, pick } = useI18n();
  const errors = useErrorText();
  const toast = useToast();
  const course = courseOf(message);
  const [student, setStudent] = useState<StudentLite | null>(message.matchingStudent ? { ...message.matchingStudent, profilePhotoUrl: null } : null);
  const [enroll, setEnroll] = useState(!!course && course.status === 'PUBLISHED');
  const link = useMutation({
    mutationFn: () => api.patch<{ enrollment: { ok: boolean; error?: string } | null }>(`/contact/${message.id}/link-student`, { studentId: student!.id, enroll }),
    onSuccess: (res) => {
      if (res.enrollment && !res.enrollment.ok) toast.error(t(`errors.codes.${res.enrollment.error ?? 'VALIDATION_ERROR'}` as never));
      else toast.success(t('admin.messages.toast.linked'));
      onLinked();
    },
    onError: (err) => toast.error(errors.message(err)),
  });
  return (
    <Modal open onClose={onClose} title={t('admin.messages.detail.addExisting')}
      footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={() => link.mutate()} loading={link.isPending} disabled={!student} iconLeft={<UserCheck className="h-4 w-4" aria-hidden />}>{t('admin.messages.detail.link')}</Button></>}>
      <div className="space-y-4">
        {message.matchingStudent && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">{t('admin.messages.detail.matchFound')}</p>}
        <p className="text-sm font-medium text-slate-700">{t('admin.messages.detail.chooseStudent')}</p>
        <StudentPicker value={student} onChange={setStudent} />
        {course && course.status === 'PUBLISHED' && <Checkbox checked={enroll} onChange={(e) => setEnroll(e.target.checked)} label={t('admin.messages.detail.alsoEnroll', { course: pick(course, 'title') })} />}
      </div>
    </Modal>
  );
}

function MessageDrawer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { t, pick, fmt } = useI18n();
  const errors = useErrorText();
  const toast = useToast();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [linking, setLinking] = useState(false);
  const key = ['admin', 'message', id];
  const { data: message, isPending, error, refetch } = useQuery({ queryKey: key, queryFn: () => api.get<ContactMessage>(`/contact/${id}`), staleTime: 0 });

  const refresh = () => { void qc.invalidateQueries({ queryKey: key }); onChanged(); };
  const setStatus = useMutation({
    mutationFn: ({ action }: { action: 'read' | 'unread' | 'archive' }) => api.patch(`/contact/${id}/${action}`),
    onSuccess: (_d, { action }) => { toast.success(t(`admin.messages.toast.${action === 'archive' ? 'archived' : action}` as never)); refresh(); if (action === 'archive') onClose(); },
    onError: (err) => toast.error(errors.message(err)),
  });

  // Opening a NEW request marks it as read (it can be flipped back with "Mark as unread").
  const autoRead = useRef(false);
  useEffect(() => {
    if (message?.status === 'NEW' && !autoRead.current) {
      autoRead.current = true;
      api.patch(`/contact/${id}/read`).then(onChanged).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message?.status]);

  const course = message && courseOf(message);
  const canCreate = message && !message.student;
  return (
    <Drawer open onClose={onClose} width="lg" title={t('admin.messages.detail.title')}>
      {error ? <ErrorState error={error} onRetry={() => refetch()} /> : isPending ? (
        <div className="space-y-4"><Skeleton className="h-16" /><Skeleton className="h-28" /><Skeleton className="h-40" /></div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <Avatar firstName={splitName(message.fullName).firstName} lastName={splitName(message.fullName).lastName} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-xl font-bold text-slate-900">{message.fullName}</h3><StatusBadge kind="contact" value={message.status} /></div>
              <a href={`mailto:${message.email}`} className="mt-1 flex items-center gap-2 text-sm text-slate-600 hover:text-brand-700"><Mail className="h-4 w-4" aria-hidden />{message.email}</a>
              {message.phone && <a href={`tel:${message.phone.replace(/\s/g, '')}`} className="mt-1 flex items-center gap-2 text-sm text-slate-600 hover:text-brand-700"><Phone className="h-4 w-4" aria-hidden />{message.phone}</a>}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-sm">
            <div className="col-span-2 sm:col-span-1"><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{t('admin.messages.detail.course')}</dt><dd className="mt-0.5 font-medium text-slate-900">{course ? <Link to={`/admin/courses/${course.id}`} className="hover:text-brand-700 hover:underline">{pick(course, 'title')}</Link> : (message.courseTitle ?? t('admin.messages.general'))}</dd></div>
            <div className="col-span-2 sm:col-span-1"><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{t('admin.messages.detail.received')}</dt><dd className="mt-0.5 font-medium text-slate-900">{fmt.dateTime(message.createdAt)}</dd></div>
          </dl>

          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">{t('admin.messages.detail.message')}</h4>
            <p className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-[15px] leading-7 text-slate-700">{message.message}</p>
          </div>

          {message.student ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <UserCheck className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
              <div className="min-w-0 flex-1"><p className="text-xs font-medium uppercase tracking-wide text-emerald-700">{t('admin.messages.detail.linked')}</p><p className="truncate font-semibold text-slate-900">{message.student.firstName} {message.student.lastName}</p></div>
              <Link to={`/admin/students/${message.student.id}`} className="text-sm font-semibold text-emerald-800 underline underline-offset-2">{t('admin.messages.detail.openStudent')}</Link>
            </div>
          ) : message.matchingStudent ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-900"><Users className="h-4 w-4" aria-hidden />{t('admin.messages.detail.matchFound')}</p>
              <p className="mt-1 text-sm text-amber-800">{message.matchingStudent.firstName} {message.matchingStudent.lastName} · {message.matchingStudent.email}</p>
              <Button size="sm" className="mt-3" onClick={() => setLinking(true)}>{t('admin.messages.detail.useStudent', { name: message.matchingStudent.firstName })}</Button>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-5">
            {canCreate && <Button iconLeft={<UserPlus className="h-4 w-4" aria-hidden />} onClick={() => setCreating(true)}>{t('admin.messages.detail.createStudent')}</Button>}
            {canCreate && <Button variant="secondary" iconLeft={<Users className="h-4 w-4" aria-hidden />} onClick={() => setLinking(true)}>{t('admin.messages.detail.addExisting')}</Button>}
            <a href={`mailto:${message.email}?subject=${encodeURIComponent(course ? pick(course, 'title') : '')}`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50"><Mail className="h-4 w-4" aria-hidden />{t('admin.messages.detail.reply')}</a>
            {message.status === 'READ' ? (
              <Button variant="ghost" iconLeft={<Mail className="h-4 w-4" aria-hidden />} loading={setStatus.isPending} onClick={() => setStatus.mutate({ action: 'unread' })}>{t('admin.messages.detail.markUnread')}</Button>
            ) : message.status === 'ARCHIVED' ? (
              <Button variant="ghost" iconLeft={<MailOpen className="h-4 w-4" aria-hidden />} loading={setStatus.isPending} onClick={() => setStatus.mutate({ action: 'unread' })}>{t('admin.messages.detail.markUnread')}</Button>
            ) : (
              <Button variant="ghost" iconLeft={<MailOpen className="h-4 w-4" aria-hidden />} loading={setStatus.isPending} onClick={() => setStatus.mutate({ action: 'read' })}>{t('admin.messages.detail.markRead')}</Button>
            )}
            {message.status !== 'ARCHIVED' && <Button variant="ghost" iconLeft={<Archive className="h-4 w-4" aria-hidden />} loading={setStatus.isPending} onClick={() => setStatus.mutate({ action: 'archive' })}>{t('admin.messages.detail.archive')}</Button>}
          </div>

          {creating && (
            <Modal open onClose={() => setCreating(false)} size="lg" title={t('admin.messages.createTitle')}>
              <NewStudentForm embedded contactMessageId={message.id} initial={{ ...splitName(message.fullName), email: message.email, phone: message.phone ?? '' }} defaultCourseIds={course && course.status === 'PUBLISHED' ? [course.id] : []} onCreated={() => { setCreating(false); refresh(); }} />
            </Modal>
          )}
          {linking && <LinkStudentModal message={message} onClose={() => setLinking(false)} onLinked={() => { setLinking(false); refresh(); }} />}
        </div>
      )}
    </Drawer>
  );
}

export default function Messages() {
  const { t, fmt } = useI18n();
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState('');
  const q = useDebouncedValue(text.trim(), 300);
  const tab = (params.get('tab') as TabId) ?? 'inbox';
  const page = Number(params.get('page') ?? 1) || 1;
  const openId = params.get('open');
  const qc = useQueryClient();
  useDocumentTitle(t('admin.messages.title'));

  const { data, isPending, isPlaceholderData, error, refetch } = useQuery({
    queryKey: ['admin', 'messages', { q, tab, page }],
    queryFn: () => api.list<ContactMessage>('/contact', { q, status: tab === 'inbox' ? undefined : tab, page, pageSize: 15 }),
    placeholderData: keepPreviousData,
  });
  const counts = data?.meta.counts;
  const set = (key: string, value: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value && !(key === 'tab' && value === 'inbox')) next.set(key, value); else next.delete(key);
      if (key !== 'page' && key !== 'open') next.delete('page');
      return next;
    }, { replace: true });
  const changed = () => { void qc.invalidateQueries({ queryKey: ['admin'] }); };

  const columns: Column<ContactMessage>[] = [
    { id: 'from', header: t('admin.messages.cols.from'), primary: true, cell: (m) => (
      <div className="flex min-w-0 items-center gap-3">
        <Avatar firstName={splitName(m.fullName).firstName} lastName={splitName(m.fullName).lastName} />
        <div className="min-w-0"><p className={m.status === 'NEW' ? 'truncate font-bold text-slate-900' : 'truncate font-medium text-slate-800'}>{m.fullName}</p><p className="truncate text-xs text-slate-500">{m.email}</p></div>
      </div>
    ) },
    { id: 'course', header: t('admin.messages.cols.course'), hideBelow: 'lg', cell: (m) => <span className="line-clamp-1 text-slate-600">{m.courseTitle ?? t('admin.messages.general')}</span> },
    { id: 'message', header: t('admin.messages.cols.message'), mobile: 'hide', hideBelow: 'xl', className: 'max-w-xs', cell: (m) => <span className="line-clamp-1 text-slate-500">{m.message}</span> },
    { id: 'received', header: t('admin.messages.cols.received'), hideBelow: 'md', cell: (m) => <span className="whitespace-nowrap text-slate-500">{fmt.relative(m.createdAt)}</span> },
    { id: 'status', header: t('admin.messages.cols.status'), cell: (m) => <StatusBadge kind="contact" value={m.status} /> },
  ];

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'inbox', label: t('admin.messages.tabs.inbox'), count: counts ? counts.NEW + counts.READ : undefined },
    { id: 'NEW', label: t('admin.messages.tabs.NEW'), count: counts?.NEW },
    { id: 'READ', label: t('admin.messages.tabs.READ'), count: counts?.READ },
    { id: 'ARCHIVED', label: t('admin.messages.tabs.ARCHIVED'), count: counts?.ARCHIVED },
    { id: 'ALL', label: t('admin.messages.tabs.ALL'), count: counts ? counts.NEW + counts.READ + counts.ARCHIVED : undefined },
  ];

  return (
    <>
      <PageHeader title={t('admin.messages.title')} description={t('admin.messages.subtitle')} />
      <Panel padded={false}>
        <div className="border-b border-slate-100 px-4 pt-2"><Tabs label={t('admin.messages.title')} tabs={tabs} value={tab} onChange={(v) => set('tab', v)} className="border-b-0" /></div>
        <div className="border-b border-slate-100 p-4 sm:max-w-md">
          <label className="sr-only" htmlFor="m-search">{t('common.search')}</label>
          <Input id="m-search" type="search" value={text} onChange={(e) => { setText(e.target.value); set('page', ''); }} placeholder={t('admin.messages.search')} leading={<Search className="h-4 w-4" aria-hidden />} />
        </div>
        {error ? <ErrorState error={error} onRetry={() => refetch()} /> : (
          <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <DataTable columns={columns} rows={data?.items} loading={isPending} rowKey={(m) => m.id} onRowClick={(m) => set('open', m.id)}
              empty={<EmptyState icon={Inbox} title={t('admin.messages.emptyTitle')} text={t('admin.messages.emptyText')} />} />
            {data && data.meta.total > 0 && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={(p) => set('page', String(p))} />}
          </div>
        )}
      </Panel>
      {openId && <MessageDrawer key={openId} id={openId} onClose={() => set('open', '')} onChanged={changed} />}
    </>
  );
}
