import { Check, Layers, Target, TrendingUp } from 'lucide-react';
import { SectionHeader } from '@/components/catalog';
import { Reveal } from '@/components/content';
import { FinalCta } from '@/components/FinalCta';
import { useI18n, type TKey } from '@/i18n';
import { useDocumentTitle } from '@/lib/hooks';
import { usePublicStats, useSiteSettings } from '@/lib/queries';
import { ContactInfo } from './Contact';

export default function About() {
  const { t, fmt } = useI18n();
  const { data: site } = useSiteSettings();
  const { data: stats } = usePublicStats();
  useDocumentTitle(site ? `${t('nav.about')} · ${site.name}` : undefined);

  const approach = [
    { icon: Layers, title: 'about.approach1Title', text: 'about.approach1Text' },
    { icon: Target, title: 'about.approach2Title', text: 'about.approach2Text' },
    { icon: TrendingUp, title: 'about.approach3Title', text: 'about.approach3Text' },
  ] as const;
  const facts = stats && stats.courses > 0 ? [
    { value: stats.courses, label: t('stats.courses') },
    { value: stats.lessons, label: t('stats.lessons') },
    ...(stats.hours > 0 ? [{ value: stats.hours, label: t('stats.hours') }] : []),
    { value: stats.categories, label: t('stats.categories') },
  ] : [];

  return (
    <>
      <section className="hero-bg border-b border-slate-200/70">
        <div className="container-page py-14 sm:py-20"><SectionHeader as="h1" align="left" title={t('about.title')} subtitle={t('about.lead')} className="max-w-3xl" /></div>
      </section>

      <section className="section-y">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <h2 className="font-display text-3xl font-bold text-slate-900">{t('about.missionTitle')}</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">{t('about.missionText')}</p>
          </Reveal>
          {facts.length > 0 && (
            <Reveal delay={120}>
              <dl className="grid grid-cols-2 gap-4">
                {facts.map((f) => (
                  <div key={f.label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                    <dd className="font-display text-4xl font-extrabold tracking-tight text-brand-600">{fmt.number(f.value)}</dd>
                    <dt className="mt-1 text-sm text-slate-500">{f.label}</dt>
                  </div>
                ))}
              </dl>
            </Reveal>
          )}
        </div>
      </section>

      <section className="section-y bg-slate-50/70">
        <div className="container-page">
          <Reveal><SectionHeader title={t('about.approachTitle')} /></Reveal>
          <ul className="mt-12 grid gap-5 md:grid-cols-3">
            {approach.map((a, i) => (
              <li key={a.title}>
                <Reveal delay={i * 90} className="h-full">
                  <div className="h-full rounded-2xl border border-slate-200 bg-white p-7 shadow-card">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><a.icon className="h-6 w-6" aria-hidden /></span>
                    <h3 className="mt-5 font-display text-lg font-semibold text-slate-900">{t(a.title)}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{t(a.text)}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section-y">
        <div className="container-page grid gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <h2 className="font-display text-3xl font-bold text-slate-900">{t('about.valuesTitle')}</h2>
            <ul className="mt-7 space-y-4">
              {[1, 2, 3, 4].map((n) => (
                <li key={n} className="flex items-center gap-3 text-lg text-slate-700">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-4 w-4" aria-hidden /></span>
                  {t(`about.value${n}` as TKey)}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <h2 className="mb-6 font-display text-3xl font-bold text-slate-900">{t('about.visitTitle')}</h2>
            <ContactInfo />
          </Reveal>
        </div>
      </section>
      <FinalCta />
    </>
  );
}
