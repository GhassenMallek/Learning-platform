import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Textarea } from '@/components/ui/primitives';
import { useI18n } from '@/i18n';
import type { FaqItem, Localized } from '@/lib/types';
import { IconButton } from './shared';

const swap = <T,>(list: T[], i: number, delta: -1 | 1): T[] => {
  const next = [...list];
  const j = i + delta;
  if (j < 0 || j >= next.length) return next;
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

const Err = ({ text }: { text?: string }) => (text ? <p role="alert" className="mt-1 text-xs font-medium text-rose-600">{text}</p> : null);

function Controls<T>({ list, index, onChange, labels }: { list: T[]; index: number; onChange: (next: T[]) => void; labels: { up: string; down: string; remove: string } }) {
  return (
    <div className="flex shrink-0 items-center">
      <IconButton label={labels.up} icon={ArrowUp} disabled={index === 0} onClick={() => onChange(swap(list, index, -1))} />
      <IconButton label={labels.down} icon={ArrowDown} disabled={index === list.length - 1} onClick={() => onChange(swap(list, index, 1))} />
      <IconButton label={labels.remove} icon={Trash2} tone="danger" onClick={() => onChange(list.filter((_, j) => j !== index))} />
    </div>
  );
}

/** A list of French texts (objectives, audience, skills): one row per item. */
export function TextList({ items, onChange, errors, path, label, addLabel, maxLength = 300 }: { items: Localized[]; onChange: (items: Localized[]) => void; errors: Record<string, string>; path: string; label: string; addLabel: string; maxLength?: number }) {
  const { t } = useI18n();
  const labels = { up: t('admin.wizard.desc.moveUp'), down: t('admin.wizard.desc.moveDown'), remove: t('admin.wizard.desc.removeItem') };
  const update = (i: number, value: string) => onChange(items.map((it, j) => (j === i ? { fr: value } : it)));
  return (
    <div>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <div className="min-w-0 flex-1"><Input aria-label={`${label} ${i + 1}`} value={item.fr} maxLength={maxLength} onChange={(e) => update(i, e.target.value)} /><Err text={errors[`${path}.${i}.fr`]} /></div>
            <Controls list={items} index={i} onChange={onChange} labels={labels} />
          </li>
        ))}
      </ul>
      <Button variant="secondary" size="sm" className="mt-3" iconLeft={<Plus className="h-4 w-4" aria-hidden />} onClick={() => onChange([...items, { fr: '' }])}>{addLabel}</Button>
    </div>
  );
}

export function FaqEditor({ items, onChange, errors }: { items: FaqItem[]; onChange: (items: FaqItem[]) => void; errors: Record<string, string> }) {
  const { t } = useI18n();
  const labels = { up: t('admin.wizard.desc.moveUp'), down: t('admin.wizard.desc.moveDown'), remove: t('admin.wizard.desc.removeItem') };
  const set = (i: number, part: 'question' | 'answer', value: string) => onChange(items.map((it, j) => (j === i ? { ...it, [part]: { fr: value } } : it)));
  return (
    <div>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 sm:p-4">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <div><Input aria-label={`${t('admin.wizard.desc.question')} ${i + 1}`} placeholder={t('admin.wizard.desc.question')} value={item.question.fr} maxLength={300} onChange={(e) => set(i, 'question', e.target.value)} /><Err text={errors[`faq.${i}.question.fr`]} /></div>
                <div><Textarea aria-label={`${t('admin.wizard.desc.answer')} ${i + 1}`} placeholder={t('admin.wizard.desc.answer')} rows={3} value={item.answer.fr} maxLength={2000} onChange={(e) => set(i, 'answer', e.target.value)} /><Err text={errors[`faq.${i}.answer.fr`]} /></div>
              </div>
              <Controls list={items} index={i} onChange={onChange} labels={labels} />
            </div>
          </li>
        ))}
      </ul>
      <Button variant="secondary" size="sm" className="mt-3" iconLeft={<Plus className="h-4 w-4" aria-hidden />} onClick={() => onChange([...items, { question: { fr: '' }, answer: { fr: '' } }])}>{t('admin.wizard.desc.addQuestion')}</Button>
    </div>
  );
}
