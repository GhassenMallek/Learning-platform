import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ClipboardCheck, FileDown, FileText, FileUp, Layers, Pencil, Plus, PlayCircle, Trash2, CircleHelp, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FileTypeIcon } from '@/components/FileType';
import { EmptyState, ErrorState } from '@/components/ui/data';
import { ConfirmDialog, Drawer, Modal, useToast } from '@/components/ui/overlays';
import { Button, Field, Input, Select, Skeleton, Textarea } from '@/components/ui/primitives';
import { useErrorText, useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { DOCUMENT_TYPES, LESSON_TYPES, type CourseDetail, type DocumentType, type LessonFull, type LessonOutline, type LessonResource, type LessonType, type ModuleOutline } from '@/lib/types';
import { cn, formatBytes } from '@/lib/utils';
import { validate, rules } from '@/lib/validation';
import { IconButton, Pair } from './shared';

const lessonIcons: Record<LessonType, LucideIcon> = { TEXT: FileText, VIDEO: PlayCircle, DOCUMENT: FileDown, ASSIGNMENT: ClipboardCheck, QUIZ: CircleHelp };
const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;
const DOCUMENT_ACCEPT = DOCUMENT_TYPES.map((x) => `.${x}`).join(',');
const extensionOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';
const move = (ids: string[], index: number, delta: -1 | 1) => {
  const next = [...ids];
  const target = index + delta;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

// ── Module dialog ───────────────────────────────────────────────────────────────────
function ModuleDialog({ courseId, module, onClose, onSaved }: { courseId: string; module?: ModuleOutline; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const errors = useErrorText();
  const [form, setForm] = useState({ title_fr: module?.title_fr ?? '', description_fr: module?.description_fr ?? '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = useMutation({
    mutationFn: () => (module ? api.put(`/modules/${module.id}`, form) : api.post('/modules', { ...form, courseId })),
    onSuccess: onSaved,
    onError: (err) => setFieldErrors(errors.fields(err)),
  });
  const submit = () => {
    const issues = validate(form, { title_fr: [rules.required] });
    const messages = Object.fromEntries(Object.entries(issues).map(([k, i]) => [k, errors.field({ field: k, ...i! })]));
    setFieldErrors(messages);
    if (!Object.keys(messages).length) save.mutate();
  };

  return (
    <Modal open onClose={onClose} title={module ? t('admin.curriculum.editModule') : t('admin.curriculum.newModule')} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={submit} loading={save.isPending}>{t('common.save')}</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4" noValidate>
        <Field label={t('admin.curriculum.moduleTitleFr')} required error={fieldErrors.title_fr}><Input value={form.title_fr} onChange={set('title_fr')} data-autofocus maxLength={200} /></Field>
        <Field label={t('admin.curriculum.moduleDescFr')} optionalLabel={t('common.optional')} error={fieldErrors.description_fr}><Textarea rows={3} value={form.description_fr} onChange={set('description_fr')} maxLength={1000} /></Field>
        <button type="submit" className="sr-only" tabIndex={-1}>{t('common.save')}</button>
      </form>
    </Modal>
  );
}

// ── Lesson drawer ───────────────────────────────────────────────────────────────────
interface LessonForm {
  type: LessonType;
  title_fr: string;
  description_fr: string;
  content_fr: string;
  videoUrl: string;
  durationMinutes: string;
  resources: LessonResource[];
}
const emptyLesson: LessonForm = { type: 'TEXT', title_fr: '', description_fr: '', content_fr: '', videoUrl: '', durationMinutes: '', resources: [] };

function LessonDrawer({ moduleId, lessonId, onClose, onSaved }: { moduleId: string; lessonId?: string; onClose: () => void; onSaved: () => void }) {
  const { t, lang } = useI18n();
  const errors = useErrorText();
  const [form, setForm] = useState<LessonForm>(emptyLesson);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { data: existing, isPending, error } = useQuery({ queryKey: ['admin', 'lesson', lessonId], queryFn: () => api.get<LessonFull>(`/lessons/${lessonId}`), enabled: !!lessonId, staleTime: 0, gcTime: 0 });

  useEffect(() => {
    if (!existing) return;
    setForm({
      type: existing.type,
      title_fr: existing.title_fr,
      description_fr: existing.description_fr,
      content_fr: existing.content_fr,
      videoUrl: existing.videoUrl ?? '',
      durationMinutes: existing.durationMinutes ? String(existing.durationMinutes) : '',
      resources: existing.resources,
    });
  }, [existing]);

  const set = <K extends keyof LessonForm>(key: K, value: LessonForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const save = useMutation({
    mutationFn: () => {
      const payload = {
        type: form.type,
        title_fr: form.title_fr,
        description_fr: form.description_fr,
        content_fr: form.content_fr,
        videoUrl: form.videoUrl.trim() || null,
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
        // A resource needs both labels: if one language is empty we reuse the other.
        resources: form.resources.filter((r) => r.url.trim()).map((r) => ({ url: r.url.trim(), fileType: r.fileType, size: r.size, title: { fr: r.title.fr || r.url } })),
      };
      return lessonId ? api.put(`/lessons/${lessonId}`, payload) : api.post('/lessons', { ...payload, moduleId });
    },
    onSuccess: onSaved,
    onError: (err) => setFieldErrors(errors.fields(err)),
  });

  // Each file is uploaded on its own, so one rejected file does not block the others; the lesson is saved with the form.
  const uploadFiles = async (files: File[]) => {
    setUploadError(null);
    for (const file of files) {
      if (!(DOCUMENT_TYPES as readonly string[]).includes(extensionOf(file.name))) { setUploadError(`${file.name} — ${t('errors.codes.UNSUPPORTED_DOCUMENT_TYPE')}`); continue; }
      if (file.size > MAX_DOCUMENT_BYTES) { setUploadError(`${file.name} — ${t('errors.codes.PAYLOAD_TOO_LARGE')}`); continue; }
      setUploading((n) => n + 1);
      try {
        const doc = await api.upload<{ url: string; size: number; fileType: DocumentType; name: string }>('/uploads/document', file);
        const label = doc.name.replace(/\.[^.]+$/, '');
        setForm((f) => ({ ...f, resources: [...f.resources, { title: { fr: label }, url: doc.url, fileType: doc.fileType, size: doc.size }] }));
      } catch (err) {
        setUploadError(`${file.name} — ${errors.message(err)}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const submit = () => {
    const issues = validate({ title_fr: form.title_fr, videoUrl: form.videoUrl }, { title_fr: [rules.required], videoUrl: [rules.optionalUrl] });
    const messages = Object.fromEntries(Object.entries(issues).map(([k, i]) => [k, errors.field({ field: k, ...i! })]));
    setFieldErrors(messages);
    if (!Object.keys(messages).length) save.mutate();
  };

  return (
    <Drawer open onClose={onClose} width="lg" title={lessonId ? t('admin.curriculum.editLesson') : t('admin.curriculum.newLesson')}
      footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={submit} loading={save.isPending} disabled={(!!lessonId && isPending) || uploading > 0}>{t('common.save')}</Button></>}>
      {lessonId && error ? <ErrorState error={error} /> : lessonId && isPending ? (
        <div className="space-y-4"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-40" /></div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-5" noValidate>
          <Field label={t('admin.curriculum.lessonType')}>
            <Select value={form.type} onChange={(e) => set('type', e.target.value as LessonType)}>
              {LESSON_TYPES.filter((x) => x !== 'QUIZ' || form.type === 'QUIZ').map((x) => <option key={x} value={x}>{t(`lessonType.${x}`)}</option>)}
            </Select>
          </Field>
          <Field label={t('admin.curriculum.lessonTitleFr')} required error={fieldErrors.title_fr}><Input value={form.title_fr} onChange={(e) => set('title_fr', e.target.value)} maxLength={200} data-autofocus /></Field>
          <Field label={t('admin.curriculum.lessonDescFr')} optionalLabel={t('common.optional')} error={fieldErrors.description_fr}><Textarea rows={2} value={form.description_fr} onChange={(e) => set('description_fr', e.target.value)} maxLength={1000} /></Field>
          <Field label={t('admin.curriculum.content')} hint={t('admin.curriculum.contentHint')} error={fieldErrors.content_fr}>
            <Textarea rows={14} value={form.content_fr} onChange={(e) => set('content_fr', e.target.value)} className="font-mono text-[13px] leading-6" spellCheck lang="fr" />
          </Field>

          <Pair>
            <Field label={t('admin.curriculum.video')} optionalLabel={t('common.optional')} hint={t('admin.curriculum.videoHint')} error={fieldErrors.videoUrl}><Input type="url" inputMode="url" value={form.videoUrl} onChange={(e) => set('videoUrl', e.target.value)} placeholder="https://" /></Field>
            <Field label={t('admin.curriculum.duration')} optionalLabel={t('common.optional')} error={fieldErrors.durationMinutes}><Input type="number" min={0} max={1440} value={form.durationMinutes} onChange={(e) => set('durationMinutes', e.target.value)} /></Field>
          </Pair>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">{t('admin.curriculum.resources')}</legend>
            <div className="space-y-3">
              {form.resources.map((r, i) => (
                <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                  <Field label={t('admin.curriculum.resourceTitleFr')}><Input value={r.title.fr} onChange={(e) => set('resources', form.resources.map((x, j) => (j === i ? { ...x, title: { fr: e.target.value } } : x)))} /></Field>
                  <div className="mt-3 flex items-end gap-2">
                    {r.fileType ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 hover:border-brand-300">
                        <FileTypeIcon type={r.fileType} className="h-9 w-9" />
                        <span className="text-sm font-semibold uppercase text-slate-700">{r.fileType}</span>
                        {r.size != null && <span className="text-sm text-slate-500">{formatBytes(r.size, lang)}</span>}
                      </a>
                    ) : (
                      <Field className="flex-1" label={t('admin.curriculum.resourceUrl')} error={fieldErrors[`resources.${i}.url`]}><Input type="url" inputMode="url" value={r.url} placeholder="https://" onChange={(e) => set('resources', form.resources.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} /></Field>
                    )}
                    <IconButton label={t('admin.curriculum.removeResource')} icon={Trash2} tone="danger" onClick={() => set('resources', form.resources.filter((_, j) => j !== i))} />
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-2">
                <input ref={fileInput} type="file" multiple accept={DOCUMENT_ACCEPT} className="sr-only" tabIndex={-1} onChange={(e) => { uploadFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
                <Button variant="secondary" size="sm" loading={uploading > 0} iconLeft={<FileUp className="h-4 w-4" aria-hidden />} onClick={() => fileInput.current?.click()}>{t('admin.curriculum.uploadFile')}</Button>
                <Button variant="secondary" size="sm" iconLeft={<Plus className="h-4 w-4" aria-hidden />} onClick={() => set('resources', [...form.resources, { title: { fr: '' }, url: '', fileType: null, size: null }])}>{t('admin.curriculum.addResource')}</Button>
              </div>
              <p className="text-xs text-slate-500">{t('admin.curriculum.uploadHint')}</p>
              {uploadError && <p role="alert" className="text-xs font-medium text-rose-600">{uploadError}</p>}
            </div>
          </fieldset>
          <button type="submit" className="sr-only" tabIndex={-1}>{t('common.save')}</button>
        </form>
      )}
    </Drawer>
  );
}

// ── Editor ──────────────────────────────────────────────────────────────────────────
type ConfirmState = { kind: 'module'; module: ModuleOutline } | { kind: 'lesson'; lesson: LessonOutline } | null;

export function CurriculumEditor({ courseId }: { courseId: string }) {
  const { t, pick, fmt } = useI18n();
  const errors = useErrorText();
  const toast = useToast();
  const qc = useQueryClient();
  const key = ['admin', 'course', courseId];
  const { data: course, isPending, error, refetch } = useQuery({ queryKey: key, queryFn: () => api.get<CourseDetail>(`/courses/${courseId}`) });
  const [moduleDialog, setModuleDialog] = useState<{ module?: ModuleOutline } | null>(null);
  const [lessonDrawer, setLessonDrawer] = useState<{ moduleId: string; lessonId?: string } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: key });
    void qc.invalidateQueries({ queryKey: ['admin', 'courses'] });
    void qc.invalidateQueries({ queryKey: ['courses'] });
    void qc.invalidateQueries({ queryKey: ['course'] });
    void qc.invalidateQueries({ queryKey: ['stats'] });
  };

  // Reordering is optimistic: the list moves instantly and rolls back if the server refuses.
  const reorder = useMutation({
    mutationFn: ({ path, parentId, ids }: { path: 'modules' | 'lessons'; parentId: string; ids: string[] }) => api.put(`/${path}/reorder`, { parentId, ids }),
    onMutate: async ({ path, parentId, ids }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<CourseDetail>(key);
      qc.setQueryData<CourseDetail>(key, (old) => {
        if (!old) return old;
        if (path === 'modules') return { ...old, modules: ids.map((id) => old.modules.find((m) => m.id === id)!) };
        return { ...old, modules: old.modules.map((m) => (m.id === parentId ? { ...m, lessons: ids.map((id) => m.lessons.find((l) => l.id === id)!) } : m)) };
      });
      return { previous };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
      toast.error(errors.message(err));
    },
    onSettled: refresh,
  });

  const remove = useMutation({
    mutationFn: (c: NonNullable<ConfirmState>) => api.del(c.kind === 'module' ? `/modules/${c.module.id}` : `/lessons/${c.lesson.id}`),
    onSuccess: (_d, c) => {
      toast.success(t(c.kind === 'module' ? 'admin.curriculum.toast.moduleDeleted' : 'admin.curriculum.toast.lessonDeleted'));
      setConfirm(null);
      refresh();
    },
    onError: (err) => {
      setConfirm(null);
      toast.error(errors.message(err));
    },
  });

  if (isPending) return <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  const modules = course.modules;
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900">{t('admin.curriculum.title')}</h2>
          <p className="text-sm text-slate-500">{t('admin.curriculum.subtitle')}</p>
        </div>
        <Button iconLeft={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setModuleDialog({})}>{t('admin.curriculum.addModule')}</Button>
      </div>

      {modules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white">
          <EmptyState icon={Layers} title={t('admin.curriculum.emptyTitle')} text={t('admin.curriculum.emptyText')} action={<Button onClick={() => setModuleDialog({})}>{t('admin.curriculum.addModule')}</Button>} />
        </div>
      ) : (
        <ol className="space-y-4">
          {modules.map((m, mi) => (
            <li key={m.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
              <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 font-mono text-sm font-semibold text-white">{String(mi + 1).padStart(2, '0')}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-semibold text-slate-900">{pick(m, 'title')}</p>
                  <p className="truncate text-xs text-slate-500">{t('common.lessons', { count: m.lessons.length })}{m.lessons.some((l) => l.durationMinutes) && ` · ${fmt.hoursFromMinutes(m.lessons.reduce((n, l) => n + (l.durationMinutes ?? 0), 0))}`}</p>
                </div>
                <div className="flex items-center">
                  <IconButton label={t('admin.curriculum.moveUp')} icon={ArrowUp} disabled={mi === 0 || reorder.isPending} onClick={() => reorder.mutate({ path: 'modules', parentId: courseId, ids: move(modules.map((x) => x.id), mi, -1) })} />
                  <IconButton label={t('admin.curriculum.moveDown')} icon={ArrowDown} disabled={mi === modules.length - 1 || reorder.isPending} onClick={() => reorder.mutate({ path: 'modules', parentId: courseId, ids: move(modules.map((x) => x.id), mi, 1) })} />
                  <IconButton label={t('admin.curriculum.editModule')} icon={Pencil} onClick={() => setModuleDialog({ module: m })} />
                  <IconButton label={t('admin.curriculum.deleteModule')} icon={Trash2} tone="danger" onClick={() => setConfirm({ kind: 'module', module: m })} />
                </div>
              </div>
              <div className="px-2 py-2 sm:px-3">
                {m.lessons.length === 0 ? (
                  <p className="px-2 py-4 text-sm text-slate-500">{t('admin.curriculum.noLessons')}</p>
                ) : (
                  <ol>
                    {m.lessons.map((l, li) => {
                      const Icon = lessonIcons[l.type] ?? FileText;
                      return (
                        <li key={l.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                          <span className="w-6 shrink-0 text-center font-mono text-xs text-slate-400">{li + 1}</span>
                          <Icon className={cn('h-4 w-4 shrink-0', l.type === 'VIDEO' ? 'text-brand-500' : 'text-slate-400')} aria-hidden />
                          <button type="button" onClick={() => setLessonDrawer({ moduleId: m.id, lessonId: l.id })} className="min-w-0 flex-1 truncate rounded text-left text-sm font-medium text-slate-800 hover:text-brand-700">{pick(l, 'title')}</button>
                          {l.durationMinutes ? <span className="hidden text-xs tabular-nums text-slate-400 sm:inline">{fmt.minutes(l.durationMinutes)}</span> : null}
                          <div className="flex items-center">
                            <IconButton label={t('admin.curriculum.moveUp')} icon={ArrowUp} disabled={li === 0 || reorder.isPending} onClick={() => reorder.mutate({ path: 'lessons', parentId: m.id, ids: move(m.lessons.map((x) => x.id), li, -1) })} />
                            <IconButton label={t('admin.curriculum.moveDown')} icon={ArrowDown} disabled={li === m.lessons.length - 1 || reorder.isPending} onClick={() => reorder.mutate({ path: 'lessons', parentId: m.id, ids: move(m.lessons.map((x) => x.id), li, 1) })} />
                            <IconButton label={t('admin.curriculum.editLesson')} icon={Pencil} onClick={() => setLessonDrawer({ moduleId: m.id, lessonId: l.id })} />
                            <IconButton label={t('admin.curriculum.deleteLesson')} icon={Trash2} tone="danger" onClick={() => setConfirm({ kind: 'lesson', lesson: l })} />
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
                <div className="px-2 pb-1 pt-1">
                  <Button variant="ghost" size="sm" iconLeft={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setLessonDrawer({ moduleId: m.id })}>{t('admin.curriculum.addLesson')}</Button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {moduleDialog && (
        <ModuleDialog courseId={courseId} module={moduleDialog.module} onClose={() => setModuleDialog(null)} onSaved={() => { toast.success(t('admin.curriculum.toast.moduleSaved')); setModuleDialog(null); refresh(); }} />
      )}
      {lessonDrawer && (
        <LessonDrawer key={lessonDrawer.lessonId ?? 'new'} moduleId={lessonDrawer.moduleId} lessonId={lessonDrawer.lessonId} onClose={() => setLessonDrawer(null)} onSaved={() => { toast.success(t('admin.curriculum.toast.lessonSaved')); setLessonDrawer(null); refresh(); void qc.invalidateQueries({ queryKey: ['admin', 'lesson'] }); }} />
      )}
      <ConfirmDialog
        open={!!confirm}
        loading={remove.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && remove.mutate(confirm)}
        title={confirm?.kind === 'module' ? t('admin.curriculum.confirmDeleteModule') : t('admin.curriculum.confirmDeleteLesson')}
        description={confirm?.kind === 'module' ? t('admin.curriculum.confirmDeleteModuleText', { title: pick(confirm.module, 'title'), count: confirm.module.lessons.length }) : confirm ? t('admin.curriculum.confirmDeleteLessonText', { title: pick(confirm.lesson, 'title') }) : ''}
        confirmLabel={t('common.delete')}
      />
    </div>
  );
}
