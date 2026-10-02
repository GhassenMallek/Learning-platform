import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { ChangePasswordForm } from '@/components/ChangePassword';
import { ErrorState } from '@/components/ui/data';
import { useToast } from '@/components/ui/overlays';
import { Avatar, Button, Field, Input, Skeleton, Textarea } from '@/components/ui/primitives';
import { useErrorText, useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import type { Student } from '@/lib/types';
import { rules, validate } from '@/lib/validation';

export default function Profile() {
  const { t } = useI18n();
  const errors = useErrorText();
  const toast = useToast();
  const qc = useQueryClient();
  const { user, setUser } = useAuth();
  const file = useRef<HTMLInputElement>(null);
  const { data, isPending, error, refetch } = useQuery({ queryKey: ['student', 'profile'], queryFn: () => api.get<Student>('/me/profile') });
  const [form, setForm] = useState({ phone: '', address: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  useDocumentTitle(t('student.profile.title'));
  useEffect(() => {
    if (data) setForm({ phone: data.phone ?? '', address: data.address ?? '' });
  }, [data]);

  const save = useMutation({
    mutationFn: () => api.put<Student>('/me/profile', { phone: form.phone.trim() || null, address: form.address.trim() || null }),
    onSuccess: (saved) => { qc.setQueryData(['student', 'profile'], saved); toast.success(t('student.profile.saved')); },
    onError: (err) => setFieldErrors(errors.fields(err)),
  });
  const upload = useMutation({
    mutationFn: (f: File) => api.upload<Student>('/me/avatar', f),
    onSuccess: (saved) => {
      qc.setQueryData(['student', 'profile'], saved);
      if (user) setUser({ ...user, profilePhotoUrl: saved.profilePhotoUrl });
      toast.success(t('student.profile.photoUpdated'));
    },
    onError: (err) => toast.error(errors.message(err)),
  });

  const submit = () => {
    const issues = validate(form, { phone: [rules.optionalPhone] });
    const messages = Object.fromEntries(Object.entries(issues).map(([k, i]) => [k, errors.field({ field: k, ...i! })]));
    setFieldErrors(messages);
    if (!Object.keys(messages).length) save.mutate();
  };
  const pickFile = (f?: File) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|gif|webp)$/.test(f.type)) return toast.error(t('errors.codes.UNSUPPORTED_MEDIA_TYPE'));
    if (f.size > 2 * 1024 * 1024) return toast.error(t('errors.codes.PAYLOAD_TOO_LARGE'));
    upload.mutate(f);
  };

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  return (
    <>
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t('student.profile.title')}</h1>
        <p className="mt-1.5 text-slate-500">{t('student.profile.subtitle')}</p>
      </header>
      {isPending || !data ? <div className="space-y-4"><Skeleton className="h-48" /><Skeleton className="h-64" /></div> : (
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8" aria-labelledby="personal">
            <h2 id="personal" className="font-display text-lg font-semibold text-slate-900">{t('student.profile.personal')}</h2>
            <div className="mt-6 grid gap-8 md:grid-cols-[auto_1fr]">
              <div className="flex flex-col items-center gap-3">
                <Avatar firstName={data.firstName} lastName={data.lastName} src={data.profilePhotoUrl} size="xl" />
                <input ref={file} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
                <Button variant="secondary" size="sm" loading={upload.isPending} onClick={() => file.current?.click()} iconLeft={<Camera className="h-4 w-4" aria-hidden />}>{t('common.changePhoto')}</Button>
                <p className="max-w-[10rem] text-center text-xs text-slate-400">{t('student.profile.photoHint')}</p>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label={t('student.profile.fullName')}><Input value={`${data.firstName} ${data.lastName}`} readOnly /></Field>
                  <Field label={t('student.profile.email')}><Input value={data.email} readOnly /></Field>
                </div>
                <p className="-mt-2 text-xs text-slate-500">{t('student.profile.readonlyNote')}</p>
                <Field label={t('student.profile.phone')} optionalLabel={t('common.optional')} error={fieldErrors.phone}><Input type="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
                <Field label={t('student.profile.address')} optionalLabel={t('common.optional')} error={fieldErrors.address}><Textarea rows={2} maxLength={300} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
                <Button type="submit" loading={save.isPending}>{t('student.profile.save')}</Button>
              </form>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8" aria-labelledby="security">
            <h2 id="security" className="font-display text-lg font-semibold text-slate-900">{t('student.profile.security')}</h2>
            <p className="mb-6 mt-1 text-sm text-slate-500">{t('account.hint')}</p>
            <ChangePasswordForm />
          </section>
        </div>
      )}
    </>
  );
}
