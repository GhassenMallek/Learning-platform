import { Check, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import type { CourseListItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { categoryTone } from './course';
import { ProgressBar } from './ui/primitives';

const dotColor: Record<string, string> = { brand: 'bg-brand-500', success: 'bg-emerald-500', info: 'bg-sky-500', danger: 'bg-rose-500', warning: 'bg-amber-500', neutral: 'bg-slate-400' };
const SAMPLE_PROGRESS = [68, 42, 15];

/**
 * Hero illustration: a learning-dashboard preview built from real published course titles,
 * plus floating "code" and "journal entry" cards that hint at the two fields of study.
 * The progress values are decorative — they are an illustration, not a statistic.
 */
export function HeroVisual({ courses }: { courses: CourseListItem[] }) {
  const { t, pick } = useI18n();
  const rows = courses.slice(0, 3);

  return (
    <div className="relative mx-auto w-full max-w-[540px] pb-6 sm:pb-10 lg:mx-0 lg:ml-auto">
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-tr from-brand-100/80 via-brand-50/40 to-transparent blur-3xl" aria-hidden />

      {/* Dashboard preview */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-elevated sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
          </div>
          <span className="text-xs font-semibold text-slate-500">{t('hero.dashboardTitle')}</span>
        </div>
        <p className="mb-3 text-sm font-semibold text-slate-900">{t('hero.continueLearning')}</p>
        <ul className="space-y-3">
          {(rows.length ? rows : [null, null, null]).map((course, i) => (
            <li key={course?.id ?? i} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
              <div className="flex items-center gap-3">
                <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', course ? dotColor[categoryTone(course.category.slug)] : 'bg-slate-300')} aria-hidden />
                {course ? <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{pick(course, 'title')}</p> : <div className="skeleton h-4 flex-1" aria-hidden />}
                <span className="text-xs font-semibold tabular-nums text-slate-500">{SAMPLE_PROGRESS[i]}%</span>
              </div>
              <ProgressBar value={SAMPLE_PROGRESS[i]} label={t('hero.completed')} className="mt-3 h-1.5" />
            </li>
          ))}
        </ul>
      </div>

      {/* Floating code card (technology) */}
      <div className="absolute -right-4 -top-10 hidden w-[236px] animate-float rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-elevated sm:block lg:-right-10" aria-hidden>
        <div className="mb-3 flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-400" /><span className="h-2 w-2 rounded-full bg-amber-400" /><span className="h-2 w-2 rounded-full bg-emerald-400" />
        </div>
        <pre className="font-mono text-[11px] leading-[1.7] text-slate-300">
          <span className="text-brand-300">class</span> <span className="text-amber-200">Learner</span>{' {'}
          {'\n  '}<span className="text-brand-300">final</span> String skill;
          {'\n  '}<span className="text-slate-500">// build it</span>
          {'\n  '}Widget <span className="text-sky-300">grow</span>() =&gt;
          {'\n    '}<span className="text-emerald-300">{`Text('Master.')`}</span>;
          {'\n}'}
          <span className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-blink bg-brand-300" />
        </pre>
      </div>

      {/* Floating journal-entry card (accounting) */}
      <div className="absolute -bottom-2 -left-4 hidden w-[214px] animate-float-slow rounded-xl border border-slate-200 bg-white p-4 shadow-elevated sm:block lg:-left-10" aria-hidden>
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('hero.ledgerTitle')}</p>
        <div className="grid grid-cols-2 divide-x divide-slate-200 text-xs">
          <div className="pr-3">
            <p className="font-semibold text-emerald-700">{t('hero.debit')}</p>
            <p className="mt-1.5 flex justify-between text-slate-600"><span>Cash</span><span className="tabular-nums">1 200</span></p>
          </div>
          <div className="pl-3">
            <p className="font-semibold text-brand-700">{t('hero.credit')}</p>
            <p className="mt-1.5 flex justify-between text-slate-600"><span>Sales</span><span className="tabular-nums">1 200</span></p>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2.5 text-[11px] font-medium text-emerald-700"><Check className="h-3.5 w-3.5" />1 200 = 1 200</p>
      </div>

      {/* Completed chip */}
      <div className="absolute -bottom-3 right-3 hidden animate-float items-center gap-2 rounded-full border border-emerald-200 bg-white py-2 pl-2.5 pr-4 text-xs font-semibold text-slate-700 shadow-elevated sm:flex" aria-hidden>
        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        {t('hero.lessonDone')}
      </div>
    </div>
  );
}
