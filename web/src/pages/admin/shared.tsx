import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Copy, ImagePlus, Search, Trash2, X, type LucideIcon } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '@/components/ui/overlays';
import { Avatar, Button, Input, Spinner } from '@/components/ui/primitives';
import { CourseCover } from '@/components/course';
import { useErrorText, useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { useDebouncedValue } from '@/lib/hooks';
import type { AdminOverview, CourseCard, Student } from '@/lib/types';
import { cn } from '@/lib/utils';

export const useOverview = () =>
  useQuery({ queryKey: ['admin', 'overview'], queryFn: () => api.get<AdminOverview>('/stats/overview'), refetchInterval: 60_000, staleTime: 15_000 });

/** Two side-by-side columns on ≥ sm — used for every English / French field pair. */
export const Pair = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cn('grid gap-4 sm:grid-cols-2', className)}>{children}</div>;

export const Panel = ({ title, description, actions, children, className, padded = true }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) => (
  <section className={cn('rounded-xl border border-slate-200 bg-white shadow-card', className)}>
    {(title || actions) && (
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          {title && <h2 className="font-display text-base font-semibold text-slate-900">{title}</h2>}
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
        {actions}
      </header>
    )}
    <div className={cn(padded && 'p-5')}>{children}</div>
  </section>
);

/** Compact icon-only button; always carries an accessible name. */
export function IconButton({ label, icon: Icon, onClick, disabled, tone }: { label: string; icon: LucideIcon; onClick: () => void; disabled?: boolean; tone?: 'danger' }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition disabled:pointer-events-none disabled:opacity-30', tone === 'danger' ? 'text-slate-400 hover:bg-rose-50 hover:text-rose-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-800')}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}

export function CourseThumb({ course, className }: { course: Pick<CourseCard, 'slug' | 'thumbnail'> & { category?: CourseCard['category'] }; className?: string }) {
  return (
    <div className={cn('aspect-[16/10] w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100', className)}>
      <CourseCover course={course} />
    </div>
  );
}

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      iconLeft={copied ? <Check className="h-4 w-4 text-emerald-600" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard unavailable — the value is still visible to copy by hand */
        }
      }}
    >
      {copied ? t('common.copied') : (label ?? t('common.copy'))}
    </Button>
  );
}

/** Image upload with instant preview. Files are validated again by the server (size, real image bytes). */
export function ImageUpload({ value, onChange, kind = 'thumbnails', labels }: { value: string | null; onChange: (url: string | null) => void; kind?: 'thumbnails' | 'avatars'; labels: { choose: string; replace: string; remove: string } }) {
  const { t } = useI18n();
  const errors = useErrorText();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const upload = useMutation({
    mutationFn: (file: File) => api.upload<{ url: string }>(`/uploads/image?kind=${kind}`, file),
    onSuccess: ({ url }) => onChange(url),
    onError: (err) => setError(errors.message(err)),
  });

  const pick = (file?: File) => {
    setError(null);
    if (!file) return;
    if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type)) return setError(t('errors.codes.UNSUPPORTED_MEDIA_TYPE'));
    if (file.size > 5 * 1024 * 1024) return setError(t('errors.codes.PAYLOAD_TOO_LARGE'));
    upload.mutate(file);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex aspect-[16/10] w-40 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
          {upload.isPending ? <Spinner /> : value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-7 w-7" aria-hidden />}
        </div>
        <div className="flex flex-col items-start gap-2">
          <input ref={input} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
          <Button variant="secondary" size="sm" loading={upload.isPending} onClick={() => input.current?.click()} iconLeft={<ImagePlus className="h-4 w-4" aria-hidden />}>{value ? labels.replace : labels.choose}</Button>
          {value && <Button variant="ghost" size="sm" onClick={() => onChange(null)} iconLeft={<Trash2 className="h-4 w-4" aria-hidden />}>{labels.remove}</Button>}
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}

export type StudentLite = Pick<Student, 'id' | 'firstName' | 'lastName' | 'email' | 'profilePhotoUrl' | 'status'>;

/** Type-ahead student search. Only ACTIVE students are offered (inactive ones cannot be enrolled). */
export function StudentPicker({ value, onChange, changeLabel }: { value: StudentLite | null; onChange: (student: StudentLite | null) => void; changeLabel?: string }) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const q = useDebouncedValue(text.trim(), 250);
  const { data, isFetching } = useQuery({
    queryKey: ['students', 'picker', q],
    queryFn: () => api.list<Student>('/students', { q, status: 'ACTIVE', pageSize: 6 }),
    enabled: !value,
  });

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50/50 p-3">
        <Avatar firstName={value.firstName} lastName={value.lastName} src={value.profilePhotoUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{value.firstName} {value.lastName}</p>
          <p className="truncate text-xs text-slate-500">{value.email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onChange(null)} iconLeft={<X className="h-4 w-4" aria-hidden />}>{changeLabel ?? t('admin.enrollments.form.change')}</Button>
      </div>
    );
  }
  return (
    <div>
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={t('admin.picker.search')} leading={isFetching ? <Spinner className="h-4 w-4" /> : <Search className="h-4 w-4" aria-hidden />} autoComplete="off" />
      <ul className="mt-2 max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 bg-white">
        {(data?.items ?? []).map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => onChange(s)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50">
              <Avatar firstName={s.firstName} lastName={s.lastName} src={s.profilePhotoUrl} size="sm" />
              <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-900">{s.firstName} {s.lastName}</span><span className="block truncate text-xs text-slate-500">{s.email}</span></span>
            </button>
          </li>
        ))}
        {data && data.items.length === 0 && <li className="px-3 py-4 text-center text-sm text-slate-500">{t('admin.picker.none')}</li>}
      </ul>
    </div>
  );
}

/** Shown once after a student account is created (or a password reset): the temporary password is never retrievable again. */
export function CredentialsModal({ open, onClose, email, password, studentId, warning }: { open: boolean; onClose: () => void; email: string; password: string; studentId?: string; warning?: string | null }) {
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onClose} title={t('admin.students.credentials.title')} description={t('admin.students.credentials.text')}
      footer={
        <>
          {studentId && <Link to={`/admin/students/${studentId}`} onClick={onClose} className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">{t('admin.students.credentials.view')}</Link>}
          <Button onClick={onClose} data-autofocus>{t('admin.students.credentials.done')}</Button>
        </>
      }>
      <dl className="space-y-4">
        <div className="rounded-lg bg-slate-50 p-4">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{t('admin.students.credentials.email')}</dt>
          <dd className="mt-1 flex items-center justify-between gap-3"><span className="break-all font-medium text-slate-900">{email}</span><CopyButton text={email} /></dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-4">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{t('admin.students.credentials.password')}</dt>
          <dd className="mt-1 flex items-center justify-between gap-3"><code className="select-all rounded bg-white px-2 py-1 font-mono text-base font-semibold tracking-wide text-slate-900 ring-1 ring-slate-200">{password}</code><CopyButton text={password} /></dd>
        </div>
      </dl>
      <p className="mt-4 text-sm text-slate-500">{t('admin.students.credentials.note')}</p>
      {warning && <p role="alert" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">{warning}</p>}
    </Modal>
  );
}
