import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderTree, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DataTable, EmptyState, ErrorState, PageHeader, type Column } from '@/components/ui/data';
import { ConfirmDialog, Modal, useToast } from '@/components/ui/overlays';
import { Button, Field, Input, Tabs, Textarea } from '@/components/ui/primitives';
import { useErrorText, useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import type { AcademicYear, Category } from '@/lib/types';
import { validate, rules } from '@/lib/validation';
import { IconButton, Pair, Panel } from './shared';

type Kind = 'categories' | 'years';
type Item = Category | AcademicYear;

function ItemDialog({ kind, item, onClose, onSaved }: { kind: Kind; item?: Item; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const errors = useErrorText();
  const isCat = kind === 'categories';
  const [form, setForm] = useState({
    name_fr: item?.name_fr ?? '',
    description_fr: (item as Category | undefined)?.description_fr ?? '',
    sortOrder: item ? String(item.sortOrder) : '', slug: item?.slug ?? '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const path = isCat ? '/categories' : '/academic-years';
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name_fr: form.name_fr,
        ...(isCat ? { description_fr: form.description_fr } : {}),
        ...(form.sortOrder !== '' ? { sortOrder: Number(form.sortOrder) } : {}),
        ...(form.slug.trim() ? { slug: form.slug.trim().toLowerCase() } : {}),
      };
      return item ? api.put(`${path}/${item.id}`, body) : api.post(path, body);
    },
    onSuccess: onSaved,
    onError: (err) => setFieldErrors(Object.keys(errors.fields(err)).length ? errors.fields(err) : { slug: errors.message(err) }),
  });

  const submit = () => {
    const issues = validate(form, { name_fr: [rules.required] });
    const messages = Object.fromEntries(Object.entries(issues).map(([k, i]) => [k, errors.field({ field: k, ...i! })]));
    if (form.sortOrder !== '' && !(Number.isInteger(Number(form.sortOrder)) && Number(form.sortOrder) >= 0)) messages.sortOrder = errors.field({ field: 'sortOrder', code: 'too_small', min: 0 });
    setFieldErrors(messages);
    if (!Object.keys(messages).length) save.mutate();
  };

  return (
    <Modal open onClose={onClose} size="lg" title={item ? t(isCat ? 'admin.taxonomy.editCategory' : 'admin.taxonomy.editYear') : t(isCat ? 'admin.taxonomy.addCategory' : 'admin.taxonomy.addYear')}
      footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={submit} loading={save.isPending}>{t('common.save')}</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate className="space-y-4">
        <Field label={t('admin.taxonomy.nameFr')} required error={fieldErrors.name_fr}><Input value={form.name_fr} onChange={set('name_fr')} maxLength={isCat ? 80 : 60} data-autofocus /></Field>
        {isCat && (
          <Field label={t('admin.taxonomy.descFr')} optionalLabel={t('common.optional')} error={fieldErrors.description_fr}><Textarea rows={3} value={form.description_fr} onChange={set('description_fr')} maxLength={400} /></Field>
        )}
        <Pair>
          <Field label={t('admin.taxonomy.order')} optionalLabel={t('common.optional')} error={fieldErrors.sortOrder}><Input type="number" min={0} inputMode="numeric" value={form.sortOrder} onChange={set('sortOrder')} /></Field>
          <Field label={t('admin.taxonomy.slug')} optionalLabel={t('common.optional')} error={fieldErrors.slug}><Input value={form.slug} onChange={set('slug')} /></Field>
        </Pair>
        <button type="submit" className="sr-only" tabIndex={-1}>{t('common.save')}</button>
      </form>
    </Modal>
  );
}

function TaxonomyManager({ kind }: { kind: Kind }) {
  const { t, pick } = useI18n();
  const errors = useErrorText();
  const toast = useToast();
  const qc = useQueryClient();
  const isCat = kind === 'categories';
  const path = isCat ? '/categories' : '/academic-years';
  const { data, isPending, error, refetch } = useQuery({ queryKey: ['admin', 'taxonomy', kind], queryFn: () => api.get<Item[]>(path) });
  const [editing, setEditing] = useState<{ item?: Item } | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin'] });
    void qc.invalidateQueries({ queryKey: ['categories'] });
    void qc.invalidateQueries({ queryKey: ['academic-years'] });
    void qc.invalidateQueries({ queryKey: ['courses'] });
  };
  const remove = useMutation({
    mutationFn: (item: Item) => api.del(`${path}/${item.id}`),
    onSuccess: () => { toast.success(t('admin.taxonomy.toast.deleted')); setDeleting(null); refresh(); },
    onError: (err) => { setDeleting(null); toast.error(errors.message(err)); },
  });

  const columns: Column<Item>[] = [
    { id: 'name', header: t('admin.taxonomy.cols.name'), primary: true, cell: (i) => (
      <div className="min-w-0"><p className="truncate font-semibold text-slate-900">{pick(i, 'name')}</p></div>
    ) },
    { id: 'slug', header: t('admin.taxonomy.cols.slug'), hideBelow: 'md', cell: (i) => <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{i.slug}</code> },
    { id: 'courses', header: t('admin.taxonomy.cols.courses'), cell: (i) => <span className="tabular-nums">{i.courseCount ?? 0}</span> },
    { id: 'order', header: t('admin.taxonomy.cols.order'), hideBelow: 'md', cell: (i) => <span className="tabular-nums text-slate-500">{i.sortOrder}</span> },
    { id: 'actions', header: <span className="sr-only">{t('common.actions')}</span>, mobile: 'actions', align: 'right', className: 'w-24', cell: (i) => (
      <div className="flex justify-end"><IconButton label={t('common.edit')} icon={Pencil} onClick={() => setEditing({ item: i })} /><IconButton label={t('common.delete')} icon={Trash2} tone="danger" onClick={() => setDeleting(i)} /></div>
    ) },
  ];

  return (
    <Panel padded={false}
      title={t(isCat ? 'admin.taxonomy.tabs.categories' : 'admin.taxonomy.tabs.years')}
      description={isCat ? undefined : t('admin.taxonomy.yearHint')}
      actions={<Button size="sm" iconLeft={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setEditing({})}>{t(isCat ? 'admin.taxonomy.addCategory' : 'admin.taxonomy.addYear')}</Button>}>
      {error ? <ErrorState error={error} onRetry={() => refetch()} /> : (
        <DataTable columns={columns} rows={data} loading={isPending} rowKey={(i) => i.id}
          empty={<EmptyState icon={FolderTree} title={t(isCat ? 'admin.taxonomy.emptyCategories' : 'admin.taxonomy.emptyYears')} text={t('admin.taxonomy.emptyText')} action={<Button onClick={() => setEditing({})}>{t(isCat ? 'admin.taxonomy.addCategory' : 'admin.taxonomy.addYear')}</Button>} />} />
      )}
      {editing && <ItemDialog kind={kind} item={editing.item} onClose={() => setEditing(null)} onSaved={() => { toast.success(t('admin.taxonomy.toast.saved')); setEditing(null); refresh(); }} />}
      <ConfirmDialog open={!!deleting} loading={remove.isPending} onCancel={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting)}
        title={t(isCat ? 'admin.taxonomy.deleteCategoryTitle' : 'admin.taxonomy.deleteYearTitle')} description={deleting ? t('admin.taxonomy.deleteText', { name: pick(deleting, 'name') }) : ''} confirmLabel={t('common.delete')} />
    </Panel>
  );
}

export default function Categories() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const tab: Kind = params.get('tab') === 'years' ? 'years' : 'categories';
  useDocumentTitle(t('admin.taxonomy.title'));
  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('admin.nav.courses'), to: '/admin/courses' }, { label: t('admin.taxonomy.title') }]} title={t('admin.taxonomy.title')} description={t('admin.taxonomy.subtitle')} />
      <Tabs label={t('admin.taxonomy.title')} value={tab} onChange={(v) => setParams(v === 'years' ? { tab: 'years' } : {}, { replace: true })} className="mb-6"
        tabs={[{ id: 'categories', label: t('admin.taxonomy.tabs.categories') }, { id: 'years', label: t('admin.taxonomy.tabs.years') }]} />
      <TaxonomyManager key={tab} kind={tab} />
    </>
  );
}
