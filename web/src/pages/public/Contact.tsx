import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Clock, Mail, MapPin, MessageCircle, Phone, ArrowUpRight, Send } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SectionHeader } from '@/components/catalog';
import { groupCourses } from '@/components/course';
import { Button, Field, Input, Select, Textarea } from '@/components/ui/primitives';
import { useErrorText, useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import { usePublishedCourses, useSiteSettings } from '@/lib/queries';
import { rules, validate, type Issue } from '@/lib/validation';

const empty = { fullName: '', email: '', phone: '', courseId: '', message: '', website: '' };

export function ContactInfo() {
  const { t, lang } = useI18n();
  const { data: site } = useSiteSettings();
  if (!site) return null;
  const address = (lang === 'fr' ? site.address_fr || site.address_en : site.address_en || site.address_fr).trim();
  const hours = (lang === 'fr' ? site.hours_fr || site.hours_en : site.hours_en || site.hours_fr).trim();
  const whatsapp = site.whatsapp.replace(/[^\d]/g, '');
  const items = [
    site.email && { icon: Mail, label: t('contact.emailUs'), value: site.email, href: `mailto:${site.email}` },
    site.phone && { icon: Phone, label: t('contact.callUs'), value: site.phone, href: `tel:${site.phone.replace(/\s/g, '')}` },
    whatsapp && { icon: MessageCircle, label: t('contact.whatsapp'), value: site.whatsapp, href: `https://wa.me/${whatsapp}` },
    address && { icon: MapPin, label: t('contact.visitUs'), value: address },
    hours && { icon: Clock, label: t('contact.hours'), value: hours },
  ].filter(Boolean) as { icon: typeof Mail; label: string; value: string; href?: string }[];
  const social = Object.entries(site.social).filter(([, url]) => url);

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><item.icon className="h-5 w-5" aria-hidden /></span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{item.label}</p>
            {item.href ? <a href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="mt-0.5 block break-words font-medium text-slate-900 hover:text-brand-700">{item.value}</a> : <p className="mt-0.5 font-medium text-slate-900">{item.value}</p>}
          </div>
        </div>
      ))}
      {social.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-sm text-slate-500">{t('contact.social')}</span>
          {social.map(([name, url]) => (
            <a key={name} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium capitalize text-slate-700 hover:border-brand-300 hover:text-brand-700">
              {name}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Contact() {
  const { t, lang, pick } = useI18n();
  const errors = useErrorText();
  const { data: site } = useSiteSettings();
  const { data: courses } = usePublishedCourses();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ ...empty, courseId: params.get('course') ?? '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  useDocumentTitle(site ? `${t('contact.title')} · ${site.name}` : undefined);

  const groups = useMemo(() => groupCourses(courses ?? []), [courses]);
  const set = (key: keyof typeof empty) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  const send = useMutation({
    mutationFn: () => api.post('/contact', { ...form, courseId: form.courseId || null, phone: form.phone.trim() || null, locale: lang }),
    onSuccess: () => {
      setDone(true);
      setForm(empty);
    },
    onError: (err) => setFieldErrors(errors.fields(err)),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const issues = validate(form, { fullName: [rules.minLength(2)], email: [rules.email], phone: [rules.optionalPhone], message: [rules.minLength(10)] });
    const messages = Object.fromEntries(Object.entries(issues).map(([k, i]) => [k, errors.field({ field: k, ...(i as Issue) })]));
    setFieldErrors(messages);
    if (Object.keys(messages).length === 0) send.mutate();
  };

  return (
    <>
      <section className="hero-bg border-b border-slate-200/70">
        <div className="container-page py-12 sm:py-16"><SectionHeader as="h1" align="left" title={t('contact.title')} subtitle={t('contact.subtitle')} /></div>
      </section>
      <div className="container-page grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
          {done ? (
            <div className="flex flex-col items-center py-10 text-center" role="status">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-9 w-9" aria-hidden /></span>
              <h2 className="mt-5 font-display text-2xl font-bold text-slate-900">{t('contact.successTitle')}</h2>
              <p className="mt-2 max-w-sm text-slate-500">{t('contact.successText')}</p>
              <Button variant="secondary" className="mt-7" onClick={() => setDone(false)}>{t('contact.another')}</Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="space-y-5">
              <h2 className="font-display text-xl font-bold text-slate-900">{t('contact.formTitle')}</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t('contact.fullName')} required error={fieldErrors.fullName}><Input value={form.fullName} onChange={set('fullName')} autoComplete="name" maxLength={120} /></Field>
                <Field label={t('contact.email')} required error={fieldErrors.email}><Input type="email" value={form.email} onChange={set('email')} autoComplete="email" inputMode="email" /></Field>
                <Field label={t('contact.phone')} optionalLabel={t('common.optional')} error={fieldErrors.phone}><Input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" /></Field>
                <Field label={t('contact.course')} optionalLabel={t('common.optional')} error={fieldErrors.courseId}>
                  <Select value={form.courseId} onChange={set('courseId')}>
                    <option value="">{t('contact.courseNone')}</option>
                    {groups.map((g) => (
                      <optgroup key={g.category.id} label={pick(g.category, 'name')}>
                        {g.sections.flatMap((s) => s.courses).map((c) => <option key={c.id} value={c.id}>{pick(c, 'title')}</option>)}
                      </optgroup>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label={t('contact.message')} required error={fieldErrors.message}><Textarea rows={6} value={form.message} onChange={set('message')} placeholder={t('contact.messagePlaceholder')} maxLength={3000} /></Field>
              {/* Honeypot: invisible to people, irresistible to bots. */}
              <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
                <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} /></label>
              </div>
              {send.error && !Object.keys(fieldErrors).length && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{errors.message(send.error)}</p>}
              <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">{t('contact.privacy')}</p>
                <Button type="submit" size="lg" loading={send.isPending} glow iconRight={<Send className="h-4 w-4" aria-hidden />}>{send.isPending ? t('contact.sending') : t('contact.submit')}</Button>
              </div>
            </form>
          )}
        </div>
        <aside aria-label={t('contact.infoTitle')}>
          <h2 className="mb-5 font-display text-xl font-bold text-slate-900">{t('contact.infoTitle')}</h2>
          <ContactInfo />
        </aside>
      </div>
    </>
  );
}
