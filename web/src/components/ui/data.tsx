import { AlertCircle, ChevronLeft, ChevronRight, RefreshCw, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useErrorText, useI18n, type TKey } from '@/i18n';
import { cn } from '@/lib/utils';
import { Badge, Button, Skeleton, type Tone } from './primitives';

// ── Status badges ────────────────────────────────────────────────────────────────────
const statusTones = {
  course: { DRAFT: 'warning', PUBLISHED: 'success', ARCHIVED: 'neutral' },
  student: { ACTIVE: 'success', INACTIVE: 'neutral' },
  enrollment: { ACTIVE: 'success', COMPLETED: 'brand', CANCELLED: 'danger' },
  contact: { NEW: 'brand', READ: 'neutral', ARCHIVED: 'neutral' },
} as const satisfies Record<string, Record<string, Tone>>;

type StatusKind = keyof typeof statusTones;

export function StatusBadge<K extends StatusKind>({ kind, value }: { kind: K; value: keyof (typeof statusTones)[K] & string }) {
  const { t } = useI18n();
  const tone = (statusTones[kind] as Record<string, Tone>)[value] ?? 'neutral';
  return (
    <Badge tone={tone} dot>
      {t(`status.${kind}.${value}` as TKey)}
    </Badge>
  );
}

// ── Page scaffolding ─────────────────────────────────────────────────────────────────
export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  const { t } = useI18n();
  return (
    <nav aria-label={t('common.breadcrumb')} className="mb-2">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden />}
            {item.to && i < items.length - 1 ? (
              <Link to={item.to} className="rounded transition hover:text-slate-900">{item.label}</Link>
            ) : (
              <span aria-current={i === items.length - 1 ? 'page' : undefined} className={cn(i === items.length - 1 && 'font-medium text-slate-700')}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({ title, description, actions, breadcrumbs }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; breadcrumbs?: { label: string; to?: string }[] }) {
  return (
    <header className="mb-6 sm:mb-8">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function EmptyState({ icon: Icon, title, text, action, className }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Icon className="h-7 w-7" aria-hidden />
      </div>
      <h3 className="font-display text-base font-semibold text-slate-900">{title}</h3>
      {text && <p className="mt-1.5 max-w-sm text-sm leading-6 text-slate-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const { t } = useI18n();
  const errors = useErrorText();
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
        <AlertCircle className="h-7 w-7" aria-hidden />
      </div>
      <p className="max-w-sm text-sm leading-6 text-slate-600">{errors.message(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" iconLeft={<RefreshCw className="h-4 w-4" aria-hidden />} onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}

export function Pagination({ page, totalPages, total, onPage }: { page: number; totalPages: number; total?: number; onPage: (page: number) => void }) {
  const { t } = useI18n();
  if (totalPages <= 1 && total === undefined) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
      <span>{total !== undefined ? t('common.results', { count: total }) : ''}</span>
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline">{t('common.pageOf', { page, total: totalPages })}</span>
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={t('common.previous')} iconLeft={<ChevronLeft className="h-4 w-4" aria-hidden />}>
          <span className="hidden sm:inline">{t('common.previous')}</span>
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label={t('common.next')} iconRight={<ChevronRight className="h-4 w-4" aria-hidden />}>
          <span className="hidden sm:inline">{t('common.next')}</span>
        </Button>
      </div>
    </div>
  );
}

// ── DataTable: a real table on ≥ md, stacked cards below ─────────────────────────────
export interface Column<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Hide this column in table mode below the given breakpoint. */
  hideBelow?: 'md' | 'lg' | 'xl';
  /** Title of the row when rendered as a card. */
  primary?: boolean;
  /** `actions` cells are pinned to the card's top-right corner; `hide` omits the column from cards. */
  mobile?: 'actions' | 'hide';
  align?: 'right';
}

const hideClass = { md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell' };

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  loading,
  empty,
  skeletonRows = 6,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  empty?: ReactNode;
  skeletonRows?: number;
}) {
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const actions = columns.find((c) => c.mobile === 'actions');
  const details = columns.filter((c) => c !== primary && c !== actions && c.mobile !== 'hide');

  if (loading) {
    return (
      <div aria-busy="true">
        {Array.from({ length: skeletonRows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-slate-100 px-4 py-4 last:border-0">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="hidden h-6 w-20 md:block" />
          </div>
        ))}
      </div>
    );
  }
  if (!rows || rows.length === 0) return <>{empty}</>;

  const clickable = onRowClick ? 'cursor-pointer' : '';
  const activate = (row: T) => (e: React.KeyboardEvent) => {
    if (onRowClick && (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
      e.preventDefault();
      onRowClick(row);
    }
  };

  return (
    <>
      {/* `relative` matters: absolutely-positioned `sr-only` header text would otherwise escape this scroll container and widen the page. */}
      <div className="relative hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {columns.map((c) => (
                <th key={c.id} scope="col" className={cn('px-4 py-3', c.hideBelow && hideClass[c.hideBelow], c.align === 'right' && 'text-right', c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={rowKey(row)} tabIndex={onRowClick ? 0 : undefined} onClick={() => onRowClick?.(row)} onKeyDown={activate(row)} className={cn('transition-colors hover:bg-slate-50/80', clickable)}>
                {columns.map((c) => (
                  <td key={c.id} className={cn('px-4 py-3 align-middle', c.hideBelow && hideClass[c.hideBelow], c.align === 'right' && 'text-right', c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-slate-100 md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} tabIndex={onRowClick ? 0 : undefined} onClick={() => onRowClick?.(row)} onKeyDown={activate(row)} className={cn('space-y-3 px-4 py-4', clickable)}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">{primary.cell(row)}</div>
              {actions && <div className="shrink-0">{actions.cell(row)}</div>}
            </div>
            {details.length > 0 && (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                {details.map((c) => (
                  <div key={c.id} className="min-w-0">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{c.header}</dt>
                    <dd className="mt-0.5 min-w-0 text-slate-700">{c.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

// ── Accordion ────────────────────────────────────────────────────────────────────────
export function AccordionItem({
  title,
  meta,
  leading,
  open,
  onToggle,
  children,
  className,
}: {
  title: ReactNode;
  meta?: ReactNode;
  leading?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}) {
  const [id] = useState(() => `acc-${Math.random().toString(36).slice(2, 9)}`);
  return (
    <div className={cn('overflow-hidden rounded-xl border bg-white transition-shadow', open ? 'border-brand-200 shadow-card' : 'border-slate-200', className)}>
      <h3>
        <button type="button" aria-expanded={open} aria-controls={`${id}-panel`} id={`${id}-btn`} onClick={onToggle} className="flex w-full items-center gap-4 px-4 py-4 text-left sm:px-5">
          {leading}
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[15px] font-semibold text-slate-900 sm:text-base">{title}</span>
            {meta && <span className="mt-0.5 block text-xs text-slate-500 sm:text-[13px]">{meta}</span>}
          </span>
          <ChevronRight className={cn('h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300', open && 'rotate-90 text-brand-600')} aria-hidden />
        </button>
      </h3>
      <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-btn`} inert={!open} className={cn('grid transition-[grid-template-rows] duration-300 ease-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 px-4 py-4 sm:px-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
