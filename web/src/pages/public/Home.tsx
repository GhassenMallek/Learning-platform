import { ArrowRight, Briefcase, Compass, HeartHandshake, Layers, Lightbulb, MessageSquare, Sparkles, TrendingUp, UserCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CatalogGroups, SectionHeader } from '@/components/catalog';
import { Reveal } from '@/components/content';
import { CourseCardSkeleton, groupCourses } from '@/components/course';
import { FinalCta } from '@/components/FinalCta';
import { HeroVisual } from '@/components/hero';
import { EmptyState, ErrorState, AccordionItem } from '@/components/ui/data';
import { buttonClass } from '@/components/ui/primitives';
import { BookOpen } from 'lucide-react';
import { useI18n, type TKey } from '@/i18n';
import { useDocumentTitle } from '@/lib/hooks';
import { useCategories, usePublicStats, usePublishedCourses, useSiteSettings } from '@/lib/queries';
import { cn } from '@/lib/utils';

function Hero() {
  const { t } = useI18n();
  const { data: courses } = usePublishedCourses();
  const words = t('hero.title').split(' ');
  return (
    <section className="hero-bg relative overflow-hidden">
      <div className="container-page grid items-center gap-14 pb-20 pt-12 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pb-28 lg:pt-24">
        <div>
          <p className="mb-6 inline-flex animate-fade-up items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3.5 py-1.5 text-[13px] font-medium text-brand-700 shadow-xs backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t('hero.badge')}
          </p>
          <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.04] tracking-tight text-slate-900 sm:text-6xl lg:text-[4.25rem]">
            {words.map((word, i) => (
              <span key={i} className={cn('block animate-fade-up', i === words.length - 1 && 'text-brand-600')} style={{ animationDelay: `${80 + i * 90}ms` }}>
                {word}
              </span>
            ))}
          </h1>
          <p className="mt-6 max-w-xl animate-fade-up text-lg font-medium leading-8 text-slate-700 [animation-delay:380ms] sm:text-xl">{t('hero.subtitle')}</p>
          <p className="mt-3 max-w-xl animate-fade-up text-base leading-7 text-slate-500 [animation-delay:460ms]">{t('hero.text')}</p>
          <div className="mt-9 flex animate-fade-up flex-col gap-3 [animation-delay:540ms] sm:flex-row">
            <Link to="/courses" data-glow className={buttonClass({ size: 'lg', className: 'shadow-brand' })}>
              {t('hero.ctaPrimary')}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link to="/contact" className={buttonClass({ variant: 'secondary', size: 'lg' })}>{t('hero.ctaSecondary')}</Link>
          </div>
        </div>
        <div className="animate-fade-up [animation-delay:300ms]">
          <HeroVisual courses={courses ?? []} />
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  const { t, fmt } = useI18n();
  const { data } = usePublicStats();
  if (!data || data.courses === 0) return null;
  const items = [
    { value: data.courses, label: t('stats.courses') },
    { value: data.lessons, label: t('stats.lessons') },
    { value: data.hours, label: t('stats.hours') },
    { value: data.categories, label: t('stats.categories') },
  ].filter((i) => i.value > 0);
  return (
    <section aria-label="Statistics" className="border-y border-slate-200 bg-white">
      <dl className={cn('container-page grid gap-y-6 py-8 sm:py-10', items.length >= 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3')}>
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <dd className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{fmt.number(item.value)}</dd>
            <dt className="mt-1 text-sm text-slate-500">{item.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

function WhyUs() {
  const { t } = useI18n();
  const cards = [
    { icon: Lightbulb, title: 'why.practicalTitle', text: 'why.practicalText' },
    { icon: Layers, title: 'why.structuredTitle', text: 'why.structuredText' },
    { icon: Briefcase, title: 'why.careerTitle', text: 'why.careerText' },
    { icon: HeartHandshake, title: 'why.supportTitle', text: 'why.supportText' },
  ] as const;
  return (
    <section className="section-y bg-slate-50/70">
      <div className="container-page">
        <Reveal><SectionHeader eyebrow={t('why.eyebrow')} title={t('why.title')} subtitle={t('why.subtitle')} /></Reveal>
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card, i) => (
            <li key={card.title}>
              <Reveal delay={i * 80} className="h-full">
                <div className="group h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-elevated">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                    <card.icon className="h-6 w-6" aria-hidden />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-semibold text-slate-900">{t(card.title)}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{t(card.text)}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Programs() {
  const { t, pick } = useI18n();
  const { data: courses, isPending, error, refetch } = usePublishedCourses();
  const { data: categories = [] } = useCategories({ withCourses: true });
  const [active, setActive] = useState('all');
  const groups = useMemo(() => groupCourses(courses ?? []), [courses]);
  const visible = active === 'all' ? groups : groups.filter((g) => g.category.id === active);

  return (
    <section id="programs" className="section-y scroll-mt-16">
      <div className="container-page">
        <Reveal><SectionHeader eyebrow={t('programs.eyebrow')} title={t('programs.title')} subtitle={t('programs.subtitle')} /></Reveal>

        {groups.length > 1 && (
          <div role="tablist" aria-label={t('courses.category')} className="no-scrollbar mt-9 flex justify-start gap-2 overflow-x-auto pb-1 sm:justify-center">
            {[{ id: 'all', label: t('common.all') }, ...groups.map((g) => ({ id: g.category.id, label: pick(g.category, 'name') }))].map((tab) => (
              <button key={tab.id} role="tab" type="button" aria-selected={active === tab.id} onClick={() => setActive(tab.id)} className={cn('shrink-0 rounded-full border px-5 py-2 text-sm font-semibold transition', active === tab.id ? 'border-brand-600 bg-brand-600 text-white shadow-brand' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900')}>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-12">
          {isPending ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <CourseCardSkeleton key={i} />)}</div>
          ) : error ? (
            <ErrorState error={error} onRetry={() => refetch()} />
          ) : groups.length === 0 ? (
            <EmptyState icon={BookOpen} title={t('programs.emptyTitle')} text={t('programs.emptyText')} action={<Link to="/contact" className={buttonClass()}>{t('nav.contactUs')}</Link>} />
          ) : (
            <>
              <CatalogGroups groups={visible} categories={categories} />
              <div className="mt-12 text-center">
                <Link to="/courses" className={buttonClass({ variant: 'secondary', size: 'lg' })}>
                  {t('programs.viewAll')}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const { t } = useI18n();
  const steps = [
    { icon: Compass, title: 'how.step1Title', text: 'how.step1Text' },
    { icon: MessageSquare, title: 'how.step2Title', text: 'how.step2Text' },
    { icon: UserCheck, title: 'how.step3Title', text: 'how.step3Text' },
    { icon: TrendingUp, title: 'how.step4Title', text: 'how.step4Text' },
  ] as const;
  return (
    <section className="section-y bg-slate-50/70">
      <div className="container-page">
        <Reveal><SectionHeader eyebrow={t('how.eyebrow')} title={t('how.title')} /></Reveal>
        <ol className="relative mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <div className="absolute left-[12%] right-[12%] top-7 hidden h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent lg:block" aria-hidden />
          {steps.map((step, i) => (
            <li key={step.title}>
              <Reveal delay={i * 90} className="relative text-center">
                <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-200 bg-white text-brand-600 shadow-card">
                  <step.icon className="h-6 w-6" aria-hidden />
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</span>
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold text-slate-900">{t(step.title)}</h3>
                <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-6 text-slate-500">{t(step.text)}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Faq() {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="section-y">
      <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
        <Reveal><SectionHeader align="left" eyebrow={t('faq.eyebrow')} title={t('faq.title')} /></Reveal>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n, i) => (
            <AccordionItem key={n} title={t(`faq.q${n}` as TKey)} open={open === i} onToggle={() => setOpen(open === i ? null : i)}>
              <p className="text-[15px] leading-7 text-slate-600">{t(`faq.a${n}` as TKey)}</p>
            </AccordionItem>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { data: site } = useSiteSettings();
  useDocumentTitle(site ? `${site.name} — ${site.tagline_fr}` : undefined);
  return (
    <>
      <Hero />
      <TrustStrip />
      <WhyUs />
      <Programs />
      <HowItWorks />
      <Faq />
      <FinalCta />
    </>
  );
}
