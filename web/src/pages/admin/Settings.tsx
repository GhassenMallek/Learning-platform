import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { ChangePasswordForm } from '@/components/ChangePassword';
import { ErrorState, PageHeader } from '@/components/ui/data';
import { useToast } from '@/components/ui/overlays';
import { Avatar, Button, Field, Input, Skeleton, Tabs } from '@/components/ui/primitives';
import { useErrorText, useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import type { SiteSettings } from '@/lib/types';
import { rules, validate } from '@/lib/validation';
import { Pair, Panel } from './shared';

const SOCIAL = ['facebook', 'instagram', 'linkedin', 'youtube'] as const;

function CenterSettings() {
  const { t } = useI18n();
  const errors = useErrorText();
  const toast = useToast();
  const qc = useQueryClient();
  const { data, isPending, error, refetch } = useQuery({ queryKey: ['admin', 'settings'], queryFn: () => api.get<SiteSettings>('/settings') });
  const [form, setForm] = useState<SiteSettings | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: (values: SiteSettings) => api.put<SiteSettings>('/settings', { ...values, currency: values.currency.toUpperCase() }),
    onSuccess: (saved) => {
      toast.success(t('admin.settings.center.saved'));
      qc.setQueryData(['admin', 'settings'], saved);
      void qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err) => {
      setFieldErrors(errors.fields(err));
      toast.error(errors.message(err));
    },
  });

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (isPending || !form) return <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;

  const set = (k: keyof Omit<SiteSettings, 'social'>) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const social = (k: (typeof SOCIAL)[number]) => (e: { target: { value: string } }) => setForm({ ...form, social: { ...form.social, [k]: e.target.value } });

  const submit = () => {
    const issues = validate(
      { name: form.name, email: form.email, currency: form.currency, ...form.social },
      {
        name: [rules.required],
        email: [(v) => (v.trim() ? rules.email(v) : undefined)],
        currency: [(v) => (/^[A-Za-z]{3}$/.test(v.trim()) ? undefined : { code: 'invalid_currency' })],
        facebook: [rules.optionalUrl], instagram: [rules.optionalUrl], linkedin: [rules.optionalUrl], youtube: [rules.optionalUrl],
      },
    );
    const mapped: Record<string, string> = {};
    for (const [k, issue] of Object.entries(issues)) mapped[(SOCIAL as readonly string[]).includes(k) ? `social.${k}` : k] = errors.field({ field: k, ...issue! });
    setFieldErrors(mapped);
    if (!Object.keys(mapped).length) save.mutate(form);
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate className="space-y-6">
      <Panel title={t('admin.settings.center.name')}>
        <div className="space-y-5">
          <Field label={t('admin.settings.center.name')} required hint={t('admin.settings.center.nameHint')} error={fieldErrors.name}><Input value={form.name} onChange={set('name')} maxLength={80} /></Field>
          <Field label={t('admin.settings.center.taglineFr')} error={fieldErrors.tagline_fr}><Input value={form.tagline_fr} onChange={set('tagline_fr')} maxLength={160} /></Field>
          <div className="max-w-xs"><Field label={t('admin.settings.center.currency')} hint={t('admin.settings.center.currencyHint')} error={fieldErrors.currency}><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} maxLength={3} className="uppercase" /></Field></div>
        </div>
      </Panel>
      <Panel title={t('admin.settings.center.contact')} description={t('admin.settings.center.contactHint')}>
        <div className="space-y-5">
          <Pair>
            <Field label={t('admin.settings.center.email')} error={fieldErrors.email}><Input type="email" value={form.email} onChange={set('email')} /></Field>
            <Field label={t('admin.settings.center.phone')} error={fieldErrors.phone}><Input type="tel" value={form.phone} onChange={set('phone')} maxLength={40} /></Field>
          </Pair>
          <div className="max-w-md"><Field label={t('admin.settings.center.whatsapp')} error={fieldErrors.whatsapp}><Input type="tel" value={form.whatsapp} onChange={set('whatsapp')} maxLength={40} /></Field></div>
          <Pair>
            <Field label={t('admin.settings.center.addressFr')} error={fieldErrors.address_fr}><Input value={form.address_fr} onChange={set('address_fr')} maxLength={300} /></Field>
            <Field label={t('admin.settings.center.hoursFr')} error={fieldErrors.hours_fr}><Input value={form.hours_fr} onChange={set('hours_fr')} maxLength={160} /></Field>
          </Pair>
        </div>
      </Panel>
      <Panel title={t('admin.settings.center.social')}>
        <Pair>
          {SOCIAL.map((k) => (
            <Field key={k} label={t(`admin.settings.center.${k}`)} error={fieldErrors[`social.${k}`]}><Input type="url" inputMode="url" placeholder="https://" value={form.social[k]} onChange={social(k)} /></Field>
          ))}
        </Pair>
      </Panel>
      <div className="flex justify-end"><Button type="submit" size="lg" loading={save.isPending}>{t('common.saveChanges')}</Button></div>
    </form>
  );
}

function AccountSettings() {
  const { t } = useI18n();
  const { user } = useAuth();
  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <Panel title={t('admin.settings.account.profile')}>
        <div className="flex items-center gap-4">
          <Avatar firstName={user?.firstName} lastName={user?.lastName} size="lg" />
          <div className="min-w-0"><p className="font-semibold text-slate-900">{user?.firstName} {user?.lastName}</p><p className="text-xs text-slate-500">{t('admin.settings.account.signedInAs')}</p><p className="truncate text-sm text-slate-700">{user?.email}</p></div>
        </div>
      </Panel>
      <Panel title={t('account.changePassword')} description={t('account.hint')}><ChangePasswordForm /></Panel>
    </div>
  );
}

export default function Settings() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  useDocumentTitle(t('admin.settings.title'));
  // A forced password change lands here: show the account tab straight away.
  const requested = params.get('tab');
  const active = requested === 'account' || requested === 'center' ? requested : user?.mustChangePassword ? 'account' : 'center';
  return (
    <>
      <PageHeader title={t('admin.settings.title')} description={t('admin.settings.subtitle')} />
      <Tabs label={t('admin.settings.title')} value={active} onChange={(v) => setParams({ tab: v }, { replace: true })} className="mb-6"
        tabs={[{ id: 'center', label: t('admin.settings.tabs.center') }, { id: 'account', label: t('admin.settings.tabs.account') }]} />
      {active === 'center' ? <CenterSettings /> : <AccountSettings />}
    </>
  );
}
