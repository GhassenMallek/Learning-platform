import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, ExternalLink, Globe, Save } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CourseDetailView } from '@/components/CourseDetailView';
import { EmptyState, ErrorState, PageHeader, StatusBadge } from '@/components/ui/data';
import { useToast } from '@/components/ui/overlays';
import { Button, Field, Input, Segmented, Select, Skeleton, Switch, Textarea } from '@/components/ui/primitives';
import { I18nProvider, useErrorText, useI18n, type TKey } from '@/i18n';
import { ApiError, api } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import { useAcademicYears, useCategories, useSiteSettings } from '@/lib/queries';
import { DURATION_UNITS, LEVELS, type CourseDetail, type DurationUnit, type FaqItem, type Lang, type Level, type Localized } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CurriculumEditor } from './Curriculum';
import { BilingualList, FaqEditor } from './ListEditors';
import { ImageUpload, Pair, Panel } from './shared';

const STEPS = ['basic', 'descriptions', 'curriculum', 'settings', 'publish'] as const;
type Issue = { code: string; min?: number; max?: number };

interface CourseForm {
  title_en: string; title_fr: string; category: string; academicYear: string; level: Level; durationValue: string; durationUnit: DurationUnit; thumbnail: string | null;
  shortDescription_en: string; shortDescription_fr: string; description_en: string; description_fr: string;
  objectives: Localized[]; audience: Localized[]; skills: Localized[]; faq: FaqItem[];
  projectEnabled: boolean; projectTitle: Localized; projectDescription: Localized;
  showPrice: boolean; price: string; currency: string; slug: string; sortOrder: string;
}

const blank = (): Localized => ({ en: '', fr: '' });
const newForm = (currency: string): CourseForm => ({
  title_en: '', title_fr: '', category: '', academicYear: '', level: 'ALL_LEVELS', durationValue: '', durationUnit: 'WEEKS', thumbnail: null,
  shortDescription_en: '', shortDescription_fr: '', description_en: '', description_fr: '',
  objectives: [], audience: [], skills: [], faq: [], projectEnabled: false, projectTitle: blank(), projectDescription: blank(),
  showPrice: false, price: '', currency, slug: '', sortOrder: '',
});

const fromCourse = (c: CourseDetail): CourseForm => ({
  title_en: c.title_en, title_fr: c.title_fr, category: c.category.id, academicYear: c.academicYear?.id ?? '', level: c.level,
  durationValue: c.durationValue ? String(c.durationValue) : '', durationUnit: c.durationUnit, thumbnail: c.thumbnail,
  shortDescription_en: c.shortDescription_en, shortDescription_fr: c.shortDescription_fr, description_en: c.description_en, description_fr: c.description_fr,
  objectives: c.objectives, audience: c.audience, skills: c.skills, faq: c.faq,
  projectEnabled: !!c.project, projectTitle: c.project?.title ?? blank(), projectDescription: c.project?.description ?? blank(),
  showPrice: c.showPrice, price: c.price !== null ? String(c.price) : '', currency: c.currency, slug: c.slug, sortOrder: String(c.sortOrder),
});

const cleanPairs = (list: Localized[]) => list.filter((i) => i.en.trim() || i.fr.trim()).map((i) => ({ en: i.en.trim(), fr: i.fr.trim() }));

function toPayload(f: CourseForm) {
  return {
    title_en: f.title_en.trim(), title_fr: f.title_fr.trim(), category: f.category, academicYear: f.academicYear || null, level: f.level,
    durationValue: f.durationValue ? Number(f.durationValue) : null, durationUnit: f.durationUnit, thumbnail: f.thumbnail,
    shortDescription_en: f.shortDescription_en, shortDescription_fr: f.shortDescription_fr, description_en: f.description_en, description_fr: f.description_fr,
    objectives: cleanPairs(f.objectives), audience: cleanPairs(f.audience), skills: cleanPairs(f.skills),
    faq: f.faq.filter((i) => i.question.en || i.question.fr || i.answer.en || i.answer.fr).map((i) => ({ question: { en: i.question.en.trim(), fr: i.question.fr.trim() }, answer: { en: i.answer.en.trim(), fr: i.answer.fr.trim() } })),
    project: f.projectEnabled ? { title: f.projectTitle, description: f.projectDescription } : null,
    showPrice: f.showPrice, price: f.price === '' ? null : Number(f.price), currency: f.currency.trim().toUpperCase(),
    ...(f.slug.trim() ? { slug: f.slug.trim() } : {}),
    ...(f.sortOrder !== '' ? { sortOrder: Number(f.sortOrder) } : {}),
  };
}

/** Client-side mirror of the server rules; the server still validates everything again. */
function validateForm(f: CourseForm): Record<string, Issue> {
  const e: Record<string, Issue> = {};
  const req = (key: string, v: string) => { if (!v.trim()) e[key] = { code: 'required' }; };
  req('title_en', f.title_en); req('title_fr', f.title_fr); req('category', f.category);
  if (f.durationValue && !(Number.isInteger(Number(f.durationValue)) && Number(f.durationValue) >= 1 && Number(f.durationValue) <= 10000)) e.durationValue = { code: 'too_small', min: 1 };
  const bothOrNone = (key: string, pair: Localized) => {
    if (pair.en.trim() && !pair.fr.trim()) e[`${key}.fr`] = { code: 'required' };
    if (pair.fr.trim() && !pair.en.trim()) e[`${key}.en`] = { code: 'required' };
  };
  (['objectives', 'audience', 'skills'] as const).forEach((k) => f[k].forEach((it, i) => bothOrNone(`${k}.${i}`, it)));
  f.faq.forEach((it, i) => {
    const any = it.question.en || it.question.fr || it.answer.en || it.answer.fr;
    if (!any) return;
    (['question', 'answer'] as const).forEach((part) => (['en', 'fr'] as const).forEach((l) => { if (!it[part][l].trim()) e[`faq.${i}.${part}.${l}`] = { code: 'required' }; }));
  });
  if (f.projectEnabled) {
    (['en', 'fr'] as const).forEach((l) => { req(`project.title.${l}`, f.projectTitle[l]); req(`project.description.${l}`, f.projectDescription[l]); });
  }
  if (f.price !== '' && !(Number(f.price) >= 0)) e.price = { code: 'too_small', min: 0 };
  if (f.showPrice && f.price === '') e.price = { code: 'required' };
  if (!/^[A-Za-z]{3}$/.test(f.currency.trim())) e.currency = { code: 'invalid_currency' };
  if (f.slug.trim() && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.slug.trim())) e.slug = { code: 'invalid_slug' };
  if (f.sortOrder !== '' && !(Number.isInteger(Number(f.sortOrder)) && Number(f.sortOrder) >= 0)) e.sortOrder = { code: 'too_small', min: 0 };
  return e;
}

const STEP_OF: Record<string, number> = {
  title_en: 1, title_fr: 1, category: 1, academicYear: 1, level: 1, durationValue: 1, durationUnit: 1, thumbnail: 1,
  shortDescription_en: 2, shortDescription_fr: 2, description_en: 2, description_fr: 2, objectives: 2, audience: 2, skills: 2, faq: 2, project: 2,
  showPrice: 4, price: 4, currency: 4, slug: 4, sortOrder: 4,
};
const stepOfField = (field: string) => STEP_OF[field.split('.')[0]] ?? 1;

export default function CourseWizard() {
  const { id } = useParams();
  const isEdit = !!id;
  const { t, lang, pick } = useI18n();
  const errorText = useErrorText();
  const toast = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const step = Math.min(5, Math.max(1, Number(params.get('step')) || 1));
  const { data: site } = useSiteSettings();
  const { data: categories = [] } = useCategories();
  const { data: years = [] } = useAcademicYears();

  const [form, setForm] = useState<CourseForm | null>(isEdit ? null : newForm('TND'));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewLang, setPreviewLang] = useState<Lang>(lang);
  const initialized = useRef(false);

  const courseKey = ['admin', 'course', id];
  const { data: course, error: loadError, refetch } = useQuery({ queryKey: courseKey, queryFn: () => api.get<CourseDetail>(`/courses/${id}`), enabled: isEdit });
  useDocumentTitle(`${isEdit ? t('admin.wizard.titleEdit') : t('admin.wizard.titleNew')} · ${site?.name ?? ''}`);

  // Initialise the form once (never overwrite the admin's unsaved edits when the query refetches).
  useEffect(() => {
    if (course && !initialized.current) {
      initialized.current = true;
      setForm(fromCourse(course));
    }
  }, [course]);
  useEffect(() => {
    if (!isEdit && site && !dirty) setForm((f) => (f && !f.title_en ? { ...f, currency: site.currency } : f));
  }, [site, isEdit, dirty]);

  // Warn before closing the tab with unsaved changes, and pick up categories created in another tab.
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    const onFocus = () => { void qc.invalidateQueries({ queryKey: ['categories'] }); void qc.invalidateQueries({ queryKey: ['academic-years'] }); };
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('focus', onFocus);
    return () => { window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('focus', onFocus); };
  }, [dirty, qc]);

  // Entering the last step always shows fresh readiness data.
  useEffect(() => {
    if (step === 5 && isEdit) void qc.invalidateQueries({ queryKey: courseKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const update = (patch: Partial<CourseForm>) => {
    setForm((f) => (f ? { ...f, ...patch } : f));
    setDirty(true);
    setErrors((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(patch)) for (const ek of Object.keys(next)) if (ek === k || ek.startsWith(`${k}.`)) delete next[ek];
      return next;
    });
  };

  const goTo = (n: number) => setParams((prev) => { const p = new URLSearchParams(prev); p.set('step', String(n)); return p; }, { replace: false });

  /** Validates and persists the form. Returns the course id, or null when validation/saving failed. */
  const save = async (): Promise<string | null> => {
    if (!form) return null;
    const issues = validateForm(form);
    const keys = Object.keys(issues);
    if (keys.length) {
      setErrors(Object.fromEntries(keys.map((k) => [k, errorText.field({ field: k, ...issues[k] })])));
      const first = Math.min(...keys.map(stepOfField));
      if (first !== step) goTo(first);
      toast.error(t('errors.codes.VALIDATION_ERROR'));
      return null;
    }
    setSaving(true);
    try {
      if (!id) {
        const created = await api.post<CourseDetail>('/courses', toPayload(form));
        qc.setQueryData(['admin', 'course', created.id], created);
        setDirty(false);
        toast.success(t('admin.wizard.draftCreated'));
        void qc.invalidateQueries({ queryKey: ['admin', 'courses'] });
        return created.id;
      }
      const updated = await api.put<CourseDetail>(`/courses/${id}`, toPayload(form));
      qc.setQueryData(courseKey, updated);
      void qc.invalidateQueries({ queryKey: ['admin', 'courses'] });
      void qc.invalidateQueries({ queryKey: ['courses'] });
      void qc.invalidateQueries({ queryKey: ['course'] });
      setDirty(false);
      toast.success(t('admin.wizard.draftSaved'));
      return id;
    } catch (err) {
      const fields = errorText.fields(err);
      if (Object.keys(fields).length) {
        setErrors(fields);
        const first = Math.min(...Object.keys(fields).map(stepOfField));
        if (first !== step) goTo(first);
      }
      toast.error(errorText.message(err));
      if (err instanceof ApiError && err.code === 'SLUG_TAKEN') {
        setErrors({ slug: errorText.message(err) });
        if (step !== 4) goTo(4);
      }
      return null;
    } finally {
      setSaving(false);
    }
  };

  /** Saves, then moves to `next`. A brand-new course is created here and the URL switches to its edit page. */
  const saveAndGo = async (next: number) => {
    if (dirty || !isEdit) {
      const savedId = await save();
      if (!savedId) return;
      if (!isEdit) return navigate(`/admin/courses/${savedId}/edit?step=${next}`, { replace: true });
    }
    goTo(next);
  };

  const publish = async () => {
    if (dirty) { const ok = await save(); if (!ok) return; }
    setPublishing(true);
    try {
      await api.patch(`/courses/${id}/publish`);
      toast.success(t('admin.wizard.publish.published'));
      void qc.invalidateQueries({ queryKey: ['admin'] });
      void qc.invalidateQueries({ queryKey: ['courses'] });
      void qc.invalidateQueries({ queryKey: ['course'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      navigate(`/admin/courses/${id}`);
    } catch (err) {
      toast.error(errorText.message(err));
      void qc.invalidateQueries({ queryKey: courseKey });
    } finally {
      setPublishing(false);
    }
  };

  if (isEdit && loadError) {
    return loadError instanceof ApiError && loadError.status === 404
      ? <EmptyState icon={AlertTriangle} title={t('admin.view.notFound')} action={<Link to="/admin/courses" className="text-sm font-semibold text-brand-700">{t('admin.nav.allCourses')}</Link>} />
      : <ErrorState error={loadError} onRetry={() => refetch()} />;
  }
  if (!form) return <div className="space-y-4"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-16 w-full" /><Skeleton className="h-96 w-full" /></div>;

  const e = errors;
  const title = form.title_en || form.title_fr;
  const stepTitle = t(`admin.wizard.steps.${STEPS[step - 1]}` as TKey);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t('admin.nav.courses'), to: '/admin/courses' }, ...(isEdit && course ? [{ label: pick(course, 'title'), to: `/admin/courses/${id}` }] : []), { label: isEdit ? t('admin.wizard.titleEdit') : t('admin.wizard.titleNew') }]}
        title={isEdit ? (title || t('admin.wizard.titleEdit')) : t('admin.wizard.titleNew')}
        actions={<>{isEdit && course && <StatusBadge kind="course" value={course.status} />}{dirty && <span className="text-xs font-medium text-amber-700">{t('admin.wizard.unsaved')}</span>}</>}
      />

      {/* Stepper + progress */}
      <nav aria-label={t('admin.wizard.stepOf', { current: step, total: 5 })} className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
        <ol className="flex items-center gap-1 sm:gap-2">
          {STEPS.map((key, i) => {
            const n = i + 1;
            const done = n < step;
            const reachable = isEdit || n <= step;
            return (
              <li key={key} className={cn('flex items-center', n < 5 && 'flex-1')}>
                <button
                  type="button"
                  disabled={!reachable}
                  aria-current={n === step ? 'step' : undefined}
                  onClick={() => n !== step && (isEdit && dirty ? void saveAndGo(n) : goTo(n))}
                  className="flex items-center gap-2.5 rounded-lg py-1 text-left disabled:cursor-not-allowed"
                >
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition', n === step ? 'bg-brand-600 text-white shadow-brand' : done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500')}>
                    {done ? <Check className="h-4 w-4" aria-hidden /> : n}
                  </span>
                  <span className={cn('hidden text-sm font-medium xl:block', n === step ? 'text-slate-900' : 'text-slate-500')}>{t(`admin.wizard.steps.${key}` as TKey)}</span>
                </button>
                {n < 5 && <span className={cn('mx-2 h-0.5 flex-1 rounded-full', done ? 'bg-emerald-400' : 'bg-slate-200')} aria-hidden />}
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-sm font-semibold text-slate-900 xl:hidden">{t('admin.wizard.stepOf', { current: step, total: 5 })} — <span className="text-brand-700">{stepTitle}</span></p>
      </nav>

      <div className="pb-24">
        {step === 1 && <StepBasic form={form} update={update} errors={e} categories={categories} years={years} />}
        {step === 2 && <StepDescriptions form={form} update={update} errors={e} />}
        {step === 3 && (id ? <Panel><CurriculumEditor courseId={id} /></Panel> : <EmptyState icon={AlertTriangle} title={t('admin.wizard.draftSaved')} />)}
        {step === 4 && <StepSettings form={form} update={update} errors={e} />}
        {step === 5 && id && course && (
          <StepPublish course={course} previewLang={previewLang} setPreviewLang={setPreviewLang} onFix={goTo} onUnpublish={async () => { await api.patch(`/courses/${id}/unpublish`); await qc.invalidateQueries({ queryKey: courseKey }); toast.success(t('admin.courses.toast.unpublished')); }} />
        )}
      </div>

      {/* Action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-6 lg:left-68">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => (step === 1 ? navigate(isEdit ? `/admin/courses/${id}` : '/admin/courses') : (dirty && isEdit ? void saveAndGo(step - 1) : goTo(step - 1)))} iconLeft={<ArrowLeft className="h-4 w-4" aria-hidden />}>
            <span className="hidden sm:inline">{step === 1 ? t('common.cancel') : t('admin.wizard.back')}</span>
          </Button>
          <div className="flex items-center gap-2">
            {step !== 3 && step !== 5 && (
              <Button variant="secondary" loading={saving} aria-label={t('admin.wizard.saveDraft')} title={t('admin.wizard.saveDraft')} onClick={async () => { const savedId = await save(); if (savedId && !isEdit) navigate(`/admin/courses/${savedId}/edit?step=${step}`, { replace: true }); }} iconLeft={<Save className="h-4 w-4" aria-hidden />}>
                {/* Icon-only on phones: two long French labels would not fit side by side. */}
                <span className="hidden sm:inline">{t('admin.wizard.saveDraft')}</span>
              </Button>
            )}
            {step < 4 && <Button loading={saving} onClick={() => void saveAndGo(step + 1)} iconRight={<ArrowRight className="h-4 w-4" aria-hidden />}>{step === 3 ? t('admin.wizard.continue') : t('admin.wizard.saveContinue')}</Button>}
            {step === 4 && <Button loading={saving} onClick={() => void saveAndGo(5)} iconRight={<ArrowRight className="h-4 w-4" aria-hidden />}>{t('admin.wizard.saveContinue')}</Button>}
            {step === 5 && course && (
              <>
                {course.status === 'PUBLISHED'
                  ? <Link to={`/courses/${course.slug}`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"><ExternalLink className="h-4 w-4" aria-hidden />{t('admin.wizard.publish.viewLive')}</Link>
                  : null}
                <Button glow loading={publishing} disabled={!course.readiness?.ok || dirty} onClick={publish} iconLeft={<Globe className="h-4 w-4" aria-hidden />}>{course.status === 'PUBLISHED' ? t('admin.wizard.publish.republish') : t('admin.wizard.publish.publish')}</Button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Step 1 ───────────────────────────────────────────────────────────────────────────
interface StepProps { form: CourseForm; update: (patch: Partial<CourseForm>) => void; errors: Record<string, string> }

function StepBasic({ form, update, errors: e, categories, years }: StepProps & { categories: { id: string; name_en: string; name_fr: string }[]; years: { id: string; name_en: string; name_fr: string }[] }) {
  const { t, pick } = useI18n();
  return (
    <Panel title={t('admin.wizard.basic.title')} description={t('admin.wizard.basic.subtitle')}>
      <div className="space-y-5">
        <Pair>
          <Field label={t('admin.wizard.basic.titleEn')} required error={e.title_en}><Input value={form.title_en} maxLength={200} onChange={(ev) => update({ title_en: ev.target.value })} data-autofocus /></Field>
          <Field label={t('admin.wizard.basic.titleFr')} required error={e.title_fr}><Input value={form.title_fr} maxLength={200} onChange={(ev) => update({ title_fr: ev.target.value })} /></Field>
        </Pair>
        <Pair>
          <Field label={t('admin.wizard.basic.category')} required error={e.category} hint={<Link to="/admin/categories" target="_blank" className="font-medium text-brand-700 hover:underline">{t('admin.wizard.basic.manageCategories')} ↗</Link>}>
            <Select value={form.category} onChange={(ev) => update({ category: ev.target.value })}>
              <option value="">{t('admin.wizard.basic.chooseCategory')}</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{pick(c, 'name')}</option>)}
            </Select>
          </Field>
          <Field label={t('admin.wizard.basic.academicYear')} optionalLabel={t('common.optional')} error={e.academicYear}>
            <Select value={form.academicYear} onChange={(ev) => update({ academicYear: ev.target.value })}>
              <option value="">{t('admin.wizard.basic.noYear')}</option>
              {years.map((y) => <option key={y.id} value={y.id}>{pick(y, 'name')}</option>)}
            </Select>
          </Field>
        </Pair>
        <Pair>
          <Field label={t('admin.wizard.basic.level')}>
            <Select value={form.level} onChange={(ev) => update({ level: ev.target.value as Level })}>{LEVELS.map((l) => <option key={l} value={l}>{t(`level.${l}`)}</option>)}</Select>
          </Field>
          <div className="grid grid-cols-[1fr_1.4fr] gap-3">
            <Field label={t('admin.wizard.basic.durationValue')} optionalLabel={t('common.optional')} error={e.durationValue}><Input type="number" min={1} max={10000} inputMode="numeric" value={form.durationValue} onChange={(ev) => update({ durationValue: ev.target.value })} /></Field>
            <Field label={t('admin.wizard.basic.durationUnit')}>
              <Select value={form.durationUnit} onChange={(ev) => update({ durationUnit: ev.target.value as DurationUnit })}>{DURATION_UNITS.map((u) => <option key={u} value={u}>{t(`durationUnit.${u}`)}</option>)}</Select>
            </Field>
          </div>
        </Pair>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">{t('admin.wizard.basic.thumbnail')}</p>
          <ImageUpload value={form.thumbnail} onChange={(url) => update({ thumbnail: url })} labels={{ choose: t('admin.wizard.basic.chooseImage'), replace: t('admin.wizard.basic.replaceImage'), remove: t('admin.wizard.basic.removeImage') }} />
          <p className="mt-2 text-xs text-slate-500">{t('admin.wizard.basic.thumbnailHint')}</p>
        </div>
      </div>
    </Panel>
  );
}

// ── Step 2 ───────────────────────────────────────────────────────────────────────────
function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="font-display text-base font-semibold text-slate-900">{title}</h3>
      {hint && <p className="mb-3 mt-0.5 text-sm text-slate-500">{hint}</p>}
      <div className={hint ? '' : 'mt-3'}>{children}</div>
    </section>
  );
}

function StepDescriptions({ form, update, errors: e }: StepProps) {
  const { t } = useI18n();
  const count = (s: string, max: number) => <span className="tabular-nums">{s.length}/{max}</span>;
  return (
    <Panel title={t('admin.wizard.desc.title')} description={t('admin.wizard.desc.subtitle')}>
      <div className="space-y-9">
        <div className="space-y-5">
          <Pair>
            <Field label={t('admin.wizard.desc.shortEn')} hint={<>{t('admin.wizard.desc.shortHint')} {count(form.shortDescription_en, 400)}</>} error={e.shortDescription_en}><Textarea rows={3} maxLength={400} value={form.shortDescription_en} onChange={(ev) => update({ shortDescription_en: ev.target.value })} /></Field>
            <Field label={t('admin.wizard.desc.shortFr')} hint={<>{t('admin.wizard.desc.shortHint')} {count(form.shortDescription_fr, 400)}</>} error={e.shortDescription_fr}><Textarea rows={3} maxLength={400} value={form.shortDescription_fr} onChange={(ev) => update({ shortDescription_fr: ev.target.value })} /></Field>
          </Pair>
          <Pair>
            <Field label={t('admin.wizard.desc.longEn')} hint={t('admin.wizard.desc.longHint')} error={e.description_en}><Textarea rows={9} maxLength={12000} value={form.description_en} onChange={(ev) => update({ description_en: ev.target.value })} /></Field>
            <Field label={t('admin.wizard.desc.longFr')} hint={t('admin.wizard.desc.longHint')} error={e.description_fr}><Textarea rows={9} maxLength={12000} value={form.description_fr} onChange={(ev) => update({ description_fr: ev.target.value })} /></Field>
          </Pair>
        </div>
        <Section title={t('admin.wizard.desc.objectives')} hint={t('admin.wizard.desc.objectivesHint')}>
          <BilingualList items={form.objectives} onChange={(v) => update({ objectives: v })} errors={e} path="objectives" label={t('admin.wizard.desc.objectives')} addLabel={t('admin.wizard.desc.addItem')} />
        </Section>
        <Section title={t('admin.wizard.desc.audience')} hint={t('admin.wizard.desc.audienceHint')}>
          <BilingualList items={form.audience} onChange={(v) => update({ audience: v })} errors={e} path="audience" label={t('admin.wizard.desc.audience')} addLabel={t('admin.wizard.desc.addItem')} />
        </Section>
        <Section title={t('admin.wizard.desc.skills')} hint={t('admin.wizard.desc.skillsHint')}>
          <BilingualList items={form.skills} onChange={(v) => update({ skills: v })} errors={e} path="skills" label={t('admin.wizard.desc.skills')} addLabel={t('admin.wizard.desc.addItem')} maxLength={120} />
        </Section>
        <Section title={t('admin.wizard.desc.project')}>
          <div className="flex items-center gap-3"><Switch checked={form.projectEnabled} onChange={(v) => update({ projectEnabled: v })} label={t('admin.wizard.desc.projectEnable')} /><span className="text-sm text-slate-700">{t('admin.wizard.desc.projectEnable')}</span></div>
          {form.projectEnabled && (
            <div className="mt-4 space-y-4">
              <Pair>
                <Field label={`${t('admin.wizard.desc.projectTitle')} (EN)`} required error={e['project.title.en']}><Input value={form.projectTitle.en} maxLength={200} onChange={(ev) => update({ projectTitle: { ...form.projectTitle, en: ev.target.value } })} /></Field>
                <Field label={`${t('admin.wizard.desc.projectTitle')} (FR)`} required error={e['project.title.fr']}><Input value={form.projectTitle.fr} maxLength={200} onChange={(ev) => update({ projectTitle: { ...form.projectTitle, fr: ev.target.value } })} /></Field>
              </Pair>
              <Pair>
                <Field label={`${t('admin.wizard.desc.projectDescription')} (EN)`} required error={e['project.description.en']}><Textarea rows={4} maxLength={2000} value={form.projectDescription.en} onChange={(ev) => update({ projectDescription: { ...form.projectDescription, en: ev.target.value } })} /></Field>
                <Field label={`${t('admin.wizard.desc.projectDescription')} (FR)`} required error={e['project.description.fr']}><Textarea rows={4} maxLength={2000} value={form.projectDescription.fr} onChange={(ev) => update({ projectDescription: { ...form.projectDescription, fr: ev.target.value } })} /></Field>
              </Pair>
            </div>
          )}
        </Section>
        <Section title={t('admin.wizard.desc.faq')}>
          <FaqEditor items={form.faq} onChange={(v) => update({ faq: v })} errors={e} />
        </Section>
      </div>
    </Panel>
  );
}

// ── Step 4 ───────────────────────────────────────────────────────────────────────────
function StepSettings({ form, update, errors: e }: StepProps) {
  const { t } = useI18n();
  return (
    <Panel title={t('admin.wizard.settings.title')} description={t('admin.wizard.settings.subtitle')}>
      <div className="space-y-8">
        <Section title={t('admin.wizard.settings.pricing')}>
          <div className="flex items-start gap-3">
            <Switch checked={form.showPrice} onChange={(v) => update({ showPrice: v })} label={t('admin.wizard.settings.showPrice')} />
            <div><p className="text-sm font-medium text-slate-800">{t('admin.wizard.settings.showPrice')}</p><p className="text-xs text-slate-500">{t('admin.wizard.settings.showPriceHint')}</p></div>
          </div>
          <div className="mt-4 grid max-w-md grid-cols-[1.4fr_1fr] gap-3">
            <Field label={t('admin.wizard.settings.price')} error={e.price} required={form.showPrice} optionalLabel={form.showPrice ? undefined : t('common.optional')}><Input type="number" min={0} step="any" inputMode="decimal" value={form.price} onChange={(ev) => update({ price: ev.target.value })} /></Field>
            <Field label={t('admin.wizard.settings.currency')} error={e.currency}><Input value={form.currency} maxLength={3} className="uppercase" onChange={(ev) => update({ currency: ev.target.value.toUpperCase() })} /></Field>
          </div>
        </Section>
        <Section title={t('admin.wizard.settings.address')}>
          <Pair>
            <Field label={t('admin.wizard.settings.slug')} hint={t('admin.wizard.settings.slugHint')} error={e.slug}><Input value={form.slug} placeholder={form.title_en ? '…' : ''} onChange={(ev) => update({ slug: ev.target.value.toLowerCase() })} /></Field>
            <Field label={t('admin.wizard.settings.order')} hint={t('admin.wizard.settings.orderHint')} error={e.sortOrder} optionalLabel={t('common.optional')}><Input type="number" min={0} inputMode="numeric" value={form.sortOrder} onChange={(ev) => update({ sortOrder: ev.target.value })} /></Field>
          </Pair>
        </Section>
      </div>
    </Panel>
  );
}

// ── Step 5 ───────────────────────────────────────────────────────────────────────────
const issueStep = (code: string) => (code.startsWith('title') ? 1 : code.startsWith('short') || code.startsWith('description') ? 2 : 3);

function StepPublish({ course, previewLang, setPreviewLang, onFix, onUnpublish }: { course: CourseDetail; previewLang: Lang; setPreviewLang: (l: Lang) => void; onFix: (step: number) => void; onUnpublish: () => Promise<void> }) {
  const { t } = useI18n();
  const [unpublishing, setUnpublishing] = useState(false);
  const readiness = course.readiness;
  const issues = readiness?.issues ?? [];
  const seen = new Set<string>();
  const unique = issues.filter((i) => (seen.has(i.code) ? false : seen.add(i.code)));

  return (
    <div className="space-y-6">
      <Panel title={t('admin.wizard.publish.checklist')}>
        {readiness?.ok ? (
          <div className="flex items-start gap-3 rounded-lg bg-emerald-50 p-4 text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div className="flex-1">
              <p className="font-medium">{course.status === 'PUBLISHED' ? t('admin.wizard.publish.live') : t('admin.wizard.publish.ready')}</p>
              {course.status === 'PUBLISHED' && <Button variant="secondary" size="sm" className="mt-3 bg-white" loading={unpublishing} onClick={async () => { setUnpublishing(true); try { await onUnpublish(); } finally { setUnpublishing(false); } }}>{t('admin.wizard.publish.unpublish')}</Button>}
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-3 text-sm font-medium text-slate-700">{t('admin.wizard.publish.fix')}</p>
            <ul className="space-y-2">
              {unique.map((i) => (
                <li key={i.code} className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="flex-1">{t(`admin.readiness.${i.code}` as TKey)}</span>
                  <Button variant="ghost" size="sm" onClick={() => onFix(issueStep(i.code))}>{t('admin.wizard.publish.goTo')}</Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      <Panel title={t('admin.wizard.publish.preview')} description={t('admin.wizard.publish.subtitle')} padded={false}
        actions={<Segmented label={t('admin.wizard.publish.previewLanguage')} value={previewLang} onChange={setPreviewLang} options={[{ value: 'en', label: 'EN' }, { value: 'fr', label: 'FR' }]} />}>
        <I18nProvider forcedLang={previewLang}>
          <div className="max-h-[72vh] overflow-y-auto overflow-x-hidden rounded-b-xl bg-white" lang={previewLang}>
            <CourseDetailView course={course} preview />
          </div>
        </I18nProvider>
      </Panel>
    </div>
  );
}
