import { BarChart3, BookOpen, CheckCircle2, ChevronRight, ClipboardCheck, Clock, FileText, Globe, Layers, PlayCircle, Rocket, Tag, Users, FileDown, CircleHelp, ArrowRight, type LucideIcon } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n';
import type { CourseDetail, LessonType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { SectionHeader } from './catalog';
import { Paragraphs, Reveal } from './content';
import { CourseCover, categoryTone } from './course';
import { AccordionItem } from './ui/data';
import { Badge, Button, buttonClass } from './ui/primitives';

const lessonIcons: Record<LessonType, LucideIcon> = { TEXT: FileText, VIDEO: PlayCircle, DOCUMENT: FileDown, ASSIGNMENT: ClipboardCheck, QUIZ: CircleHelp };

/**
 * The full course page. Used by the public site *and* by the admin preview (wrapped in a forced-language
 * I18nProvider), so what an admin previews is exactly what a visitor will see.
 */
export function CourseDetailView({ course, preview = false }: { course: CourseDetail; preview?: boolean }) {
  const { t, pick, pair, fmt } = useI18n();
  const [openModules, setOpenModules] = useState<Set<string>>(() => new Set(course.modules.slice(0, 1).map((m) => m.id)));
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const allOpen = openModules.size === course.modules.length && course.modules.length > 0;

  const title = pick(course, 'title');
  const PageTitle = preview ? 'h2' : 'h1';
  const duration = fmt.duration(course.durationValue, course.durationUnit);
  const price = course.showPrice && course.price !== null ? fmt.money(course.price, course.currency) : null;
  const requestTo = `/contact?course=${course.id}`;
  const totalTime = useMemo(() => (course.totalMinutes > 0 ? fmt.hoursFromMinutes(course.totalMinutes) : ''), [course.totalMinutes, fmt]);

  const RequestButton = ({ size = 'lg' as const, className }: { size?: 'md' | 'lg'; className?: string }) =>
    preview ? (
      <Button size={size} glow className={className} iconRight={<ArrowRight className="h-4 w-4" aria-hidden />}>{t('detail.requestInfo')}</Button>
    ) : (
      <Link to={requestTo} data-glow className={buttonClass({ size, className: cn('shadow-brand', className) })}>
        {t('detail.requestInfo')}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    );

  const crumb = (label: string, to?: string) => (to && !preview ? <Link to={to} className="hover:text-slate-900">{label}</Link> : <span>{label}</span>);

  const facts: { icon: LucideIcon; label: string; value: ReactNode }[] = [
    { icon: Layers, label: t('detail.category'), value: pick(course.category, 'name') },
    ...(course.academicYear ? [{ icon: Users, label: t('detail.academicYear'), value: pick(course.academicYear, 'name') }] : []),
    { icon: BarChart3, label: t('detail.level'), value: t(`level.${course.level}`) },
    ...(duration ? [{ icon: Clock, label: t('detail.duration'), value: duration }] : []),
    { icon: BookOpen, label: t('detail.content'), value: `${t('common.modules', { count: course.moduleCount })} · ${t('common.lessons', { count: course.lessonCount })}` },
    { icon: Globe, label: t('detail.languages'), value: t('detail.languagesValue') },
  ];

  return (
    <article>
      {/* Hero */}
      <section className="hero-bg border-b border-slate-200/70">
        <div className="container-page grid items-center gap-10 py-10 lg:grid-cols-[1.2fr_1fr] lg:gap-14 lg:py-16">
          <div>
            <nav aria-label={t('common.breadcrumb')} className="mb-5">
              <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
                <li>{crumb(t('detail.breadcrumb'), '/courses')}</li>
                <li aria-hidden><ChevronRight className="h-3.5 w-3.5 text-slate-300" /></li>
                <li>{crumb(pick(course.category, 'name'), `/courses?category=${course.category.id}`)}</li>
              </ol>
            </nav>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={categoryTone(course.category.slug)}>{pick(course.category, 'name')}</Badge>
              {course.academicYear && <Badge>{pick(course.academicYear, 'name')}</Badge>}
              <Badge tone="neutral">{t(`level.${course.level}`)}</Badge>
            </div>
            {/* Embedded in the admin (which already has an h1), the preview title steps down to h2. */}
            <PageTitle className="mt-5 font-display text-3xl font-extrabold leading-[1.12] tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem]">{title}</PageTitle>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{pick(course, 'shortDescription')}</p>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2.5 text-sm font-medium text-slate-600">
              {duration && <li className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-brand-600" aria-hidden />{duration}</li>}
              <li className="inline-flex items-center gap-2"><Layers className="h-4 w-4 text-brand-600" aria-hidden />{t('common.modules', { count: course.moduleCount })}</li>
              <li className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4 text-brand-600" aria-hidden />{t('common.lessons', { count: course.lessonCount })}</li>
              {price && <li className="font-display text-base font-bold text-slate-900">{price}</li>}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><RequestButton /></div>
          </div>
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-elevated lg:block">
            <div className="aspect-[16/11]"><CourseCover course={course} /></div>
          </div>
        </div>
      </section>

      <div className={cn('container-page grid gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14 lg:py-16', !preview && 'pb-28 lg:pb-16')}>
        <div className="min-w-0 space-y-16">
          {pick(course, 'description') && (
            <section aria-labelledby="about-course">
              <h2 id="about-course" className="mb-5 font-display text-2xl font-bold text-slate-900">{t('detail.aboutTitle')}</h2>
              <Paragraphs text={pick(course, 'description')} className="text-base leading-8 text-slate-600" />
            </section>
          )}

          {course.objectives.length > 0 && (
            <section aria-labelledby="learn">
              <h2 id="learn" className="mb-6 font-display text-2xl font-bold text-slate-900">{t('detail.learnTitle')}</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {course.objectives.map((o, i) => (
                  <li key={i}>
                    <Reveal delay={(i % 4) * 60} className="h-full">
                      <div className="flex h-full gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" aria-hidden />
                        <span className="text-[15px] leading-6 text-slate-700">{pair(o)}</span>
                      </div>
                    </Reveal>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {course.modules.length > 0 && (
            <section aria-labelledby="program">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="program" className="font-display text-2xl font-bold text-slate-900">{t('detail.programTitle')}</h2>
                  <p className="mt-1 text-sm text-slate-500">{t('detail.programSummary', { modules: t('common.modules', { count: course.moduleCount }), lessons: t('common.lessons', { count: course.lessonCount }) })}{totalTime && ` · ${totalTime}`}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setOpenModules(allOpen ? new Set() : new Set(course.modules.map((m) => m.id)))}>
                  {allOpen ? t('detail.collapseAll') : t('detail.expandAll')}
                </Button>
              </div>
              <div className="space-y-3">
                {course.modules.map((m, i) => {
                  const minutes = m.lessons.reduce((n, l) => n + (l.durationMinutes ?? 0), 0);
                  const open = openModules.has(m.id);
                  return (
                    <AccordionItem
                      key={m.id}
                      open={open}
                      onToggle={() => setOpenModules((prev) => { const next = new Set(prev); if (next.has(m.id)) next.delete(m.id); else next.add(m.id); return next; })}
                      leading={<span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-semibold transition-colors', open ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600')}>{String(i + 1).padStart(2, '0')}</span>}
                      title={pick(m, 'title')}
                      meta={[t('common.lessons', { count: m.lessons.length }), minutes > 0 ? fmt.hoursFromMinutes(minutes) : ''].filter(Boolean).join(' · ')}
                    >
                      {pick(m, 'description') && <p className="mb-3 text-sm leading-6 text-slate-500">{pick(m, 'description')}</p>}
                      <ol className="space-y-1">
                        {m.lessons.map((l) => {
                          const Icon = lessonIcons[l.type] ?? FileText;
                          return (
                            <li key={l.id} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">
                              <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                              <span className="min-w-0 flex-1">{pick(l, 'title')}</span>
                              {l.type !== 'TEXT' && <span className="hidden text-xs text-slate-400 sm:inline">{t(`lessonType.${l.type}`)}</span>}
                              {l.durationMinutes ? <span className="shrink-0 text-xs tabular-nums text-slate-400">{fmt.minutes(l.durationMinutes)}</span> : null}
                            </li>
                          );
                        })}
                      </ol>
                    </AccordionItem>
                  );
                })}
              </div>
            </section>
          )}

          {course.audience.length > 0 && (
            <section aria-labelledby="audience">
              <h2 id="audience" className="mb-6 font-display text-2xl font-bold text-slate-900">{t('detail.audienceTitle')}</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {course.audience.map((a, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3.5 text-[15px] text-slate-700">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-xs"><Users className="h-4 w-4" aria-hidden /></span>
                    {pair(a)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {course.project && (
            <section aria-labelledby="project">
              <div className="relative overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-white p-6 sm:p-8">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-100/60 blur-2xl" aria-hidden />
                <div className="relative flex flex-col gap-5 sm:flex-row">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-brand"><Rocket className="h-7 w-7" aria-hidden /></span>
                  <div>
                    <p className="eyebrow">{t('detail.projectLabel')}</p>
                    <h2 id="project" className="mt-2 font-display text-2xl font-bold text-slate-900">{pair(course.project.title)}</h2>
                    <p className="mt-3 text-[15px] leading-7 text-slate-600">{pair(course.project.description)}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {course.skills.length > 0 && (
            <section aria-labelledby="skills">
              <h2 id="skills" className="mb-5 font-display text-2xl font-bold text-slate-900">{t('detail.skillsTitle')}</h2>
              <ul className="flex flex-wrap gap-2.5">
                {course.skills.map((s, i) => (
                  <li key={i} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-xs">
                    <Tag className="h-3.5 w-3.5 text-brand-500" aria-hidden />{pair(s)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {course.faq.length > 0 && (
            <section aria-labelledby="faq">
              <h2 id="faq" className="mb-6 font-display text-2xl font-bold text-slate-900">{t('detail.faqTitle')}</h2>
              <div className="space-y-3">
                {course.faq.map((f, i) => (
                  <AccordionItem key={i} title={pair(f.question)} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? null : i)}>
                    <p className="text-[15px] leading-7 text-slate-600">{pair(f.answer)}</p>
                  </AccordionItem>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sticky facts card */}
        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label={t('detail.facts')}>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="font-display text-base font-semibold text-slate-900">{t('detail.facts')}</h2>
            {price && <p className="mt-3 font-display text-3xl font-extrabold text-slate-900">{price}</p>}
            <dl className="mt-5 space-y-4 text-sm">
              {facts.map((f) => (
                <div key={f.label} className="flex items-start gap-3">
                  <f.icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  <div className="min-w-0"><dt className="text-xs text-slate-400">{f.label}</dt><dd className="font-medium text-slate-800">{f.value}</dd></div>
                </div>
              ))}
            </dl>
            <RequestButton className="mt-6 w-full" />
          </div>
        </aside>
      </div>

      {/* Final CTA */}
      <section className="pb-16 md:pb-24">
        <div className="container-page">
          <div className="rounded-3xl bg-brand-950 px-6 py-12 text-center sm:px-12">
            <SectionHeader as="h2" title={<span className="text-white">{t('detail.ctaTitle')}</span>} subtitle={<span className="text-brand-100/90">{t('detail.ctaText')}</span>} />
            <div className="mt-8 flex justify-center">
              {preview ? (
                <Button size="lg" className="bg-white text-brand-800 hover:bg-brand-50">{t('detail.requestInfo')}</Button>
              ) : (
                <Link to={requestTo} className={buttonClass({ size: 'lg', className: 'bg-white text-brand-800 hover:bg-brand-50' })}>{t('detail.requestInfo')}<ArrowRight className="h-4 w-4" aria-hidden /></Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Mobile sticky CTA */}
      {!preview && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
            <p className="truncate text-xs text-slate-500">{price ?? duration}</p>
          </div>
          <Link to={requestTo} className={buttonClass({ size: 'md', className: 'shrink-0' })}>{t('detail.requestInfo')}</Link>
        </div>
      )}
    </article>
  );
}
