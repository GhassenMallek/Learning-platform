import { useMutation } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/components/ui/overlays';
import { Button, Field, Input } from '@/components/ui/primitives';
import { useErrorText, useI18n } from '@/i18n';
import { api } from '@/lib/api';

/** Change-password form shared by the admin and student portals. Success signs out every other session (server side). */
export function ChangePasswordForm() {
  const { t } = useI18n();
  const errors = useErrorText();
  const toast = useToast();
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [k]: '' }));
  };

  const change = useMutation({
    mutationFn: () => api.post('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword }),
    onSuccess: () => {
      toast.success(t('account.updated'));
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      setFieldErrors({});
      if (user) setUser({ ...user, mustChangePassword: false });
    },
    onError: (err) => {
      const fields = errors.fields(err);
      setFieldErrors(Object.keys(fields).length ? fields : { currentPassword: errors.message(err) });
    },
  });

  const submit = () => {
    const next: Record<string, string> = {};
    if (!form.currentPassword) next.currentPassword = t('errors.fields.required');
    if (form.newPassword.length < 8) next.newPassword = errors.field({ field: 'newPassword', code: form.newPassword ? 'too_short' : 'required', min: 8 });
    else if (form.newPassword === form.currentPassword) next.newPassword = t('errors.fields.password_unchanged');
    if (form.confirm !== form.newPassword) next.confirm = t('errors.fields.password_mismatch');
    setFieldErrors(next);
    if (!Object.keys(next).length) change.mutate();
  };

  return (
    <>
      {user?.mustChangePassword && (
        <p role="alert" className="mb-5 flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {t('account.mustChange')}
        </p>
      )}
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate className="max-w-md space-y-5">
        <Field label={t('account.current')} required error={fieldErrors.currentPassword}><Input type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} /></Field>
        <Field label={t('account.new')} required error={fieldErrors.newPassword}><Input type="password" autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} /></Field>
        <Field label={t('account.confirm')} required error={fieldErrors.confirm}><Input type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} /></Field>
        <Button type="submit" loading={change.isPending}>{t('account.submit')}</Button>
      </form>
    </>
  );
}
