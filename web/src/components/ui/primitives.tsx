import { ChevronDown, Loader2 } from 'lucide-react';
import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn, hashString, initials } from '@/lib/utils';

// ── Button ───────────────────────────────────────────────────────────────────────────
type Variant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger' | 'link';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white shadow-xs hover:bg-brand-700 data-[glow=true]:shadow-brand',
  secondary: 'border border-slate-300 bg-white text-slate-700 shadow-xs hover:border-slate-400 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  danger: 'bg-rose-600 text-white shadow-xs hover:bg-rose-700',
  link: 'h-auto px-0 text-brand-700 underline-offset-4 hover:text-brand-800 hover:underline',
};
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-10 w-10 shrink-0',
};

/** Class names of a button — use on router `<Link>`s so links and buttons look identical. */
export function buttonClass({ variant = 'primary', size = 'md', className }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-150',
    'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Adds the brand glow (use for the one main call-to-action of a view). */
  glow?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, glow, iconLeft, iconRight, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} data-glow={glow} aria-busy={loading || undefined} className={buttonClass({ variant, size, className })} {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  );
});

// ── Form fields ──────────────────────────────────────────────────────────────────────
interface FieldContextValue {
  id: string;
  describedBy?: string;
  invalid: boolean;
}
const FieldContext = createContext<FieldContextValue | null>(null);

/** Wires label ↔ control ↔ hint/error automatically (ids, aria-describedby, aria-invalid). */
export function Field({
  label,
  hint,
  error,
  required,
  optionalLabel,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  optionalLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;
  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: !!error }}>
      <div className={cn('min-w-0 space-y-1.5', className)}>
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-rose-600" aria-hidden>*</span>}
          {!required && optionalLabel && <span className="ml-1.5 text-xs font-normal text-slate-400">({optionalLabel})</span>}
        </label>
        {children}
        {hint && !error && <p id={`${id}-hint`} className="text-xs text-slate-500">{hint}</p>}
        {error && (
          <p id={`${id}-error`} role="alert" className="text-xs font-medium text-rose-600">
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

const controlBase =
  'block w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-xs transition placeholder:text-slate-400 ' +
  'focus:outline-none focus-visible:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 read-only:bg-slate-50';
const controlOk = 'border-slate-300 focus:border-brand-500 focus:ring-brand-100';
const controlBad = 'border-rose-400 focus:border-rose-500 focus:ring-rose-100';

function useControlProps() {
  const ctx = useContext(FieldContext);
  return { id: ctx?.id, 'aria-describedby': ctx?.describedBy, 'aria-invalid': ctx?.invalid || undefined, invalid: ctx?.invalid ?? false };
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { leading?: ReactNode }>(function Input(
  { className, leading, ...rest },
  ref,
) {
  const { invalid, ...aria } = useControlProps();
  return (
    <div className="relative">
      {leading && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">{leading}</span>}
      <input ref={ref} {...aria} className={cn(controlBase, 'h-10', invalid ? controlBad : controlOk, leading && 'pl-9', className)} {...rest} />
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, rows = 4, ...rest }, ref) {
  const { invalid, ...aria } = useControlProps();
  return <textarea ref={ref} rows={rows} {...aria} className={cn(controlBase, 'py-2.5 leading-6', invalid ? controlBad : controlOk, className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  const { invalid, ...aria } = useControlProps();
  return (
    <div className="relative">
      <select ref={ref} {...aria} className={cn(controlBase, 'h-10 appearance-none pr-9', invalid ? controlBad : controlOk, className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
    </div>
  );
});

export function Checkbox({ label, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2.5 text-sm text-slate-700', className)}>
      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-brand-600" {...rest} />
      {label}
    </label>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50', checked ? 'bg-brand-600' : 'bg-slate-300')}
    >
      <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </button>
  );
}

// ── Display ──────────────────────────────────────────────────────────────────────────
export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
const tones: Record<Tone, { badge: string; dot: string }> = {
  neutral: { badge: 'bg-slate-100 text-slate-700 ring-slate-200', dot: 'bg-slate-400' },
  brand: { badge: 'bg-brand-50 text-brand-700 ring-brand-200', dot: 'bg-brand-500' },
  success: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  warning: { badge: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  danger: { badge: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
  info: { badge: 'bg-sky-50 text-sky-700 ring-sky-200', dot: 'bg-sky-500' },
};

export function Badge({ tone = 'neutral', dot, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', tones[tone].badge, className)}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', tones[tone].dot)} aria-hidden />}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function Card({ className, children, as: Tag = 'div' }: { className?: string; children: ReactNode; as?: 'div' | 'section' | 'article' | 'li' }) {
  return <Tag className={cn('rounded-xl border border-slate-200 bg-white shadow-card', className)}>{children}</Tag>;
}

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-slate-500">
      <Loader2 className={cn('h-5 w-5 animate-spin', className)} aria-hidden />
      {label ? <span className="text-sm">{label}</span> : <span className="sr-only">Loading</span>}
    </span>
  );
}

export const Skeleton = ({ className }: { className?: string }) => <div className={cn('skeleton', className)} aria-hidden />;

const avatarColors = ['bg-brand-100 text-brand-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-800', 'bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700'];

export function Avatar({ firstName, lastName, src, size = 'md', className }: { firstName?: string | null; lastName?: string | null; src?: string | null; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const dim = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg', xl: 'h-24 w-24 text-3xl' }[size];
  if (src) return <img src={src} alt="" className={cn('shrink-0 rounded-full object-cover ring-1 ring-slate-200', dim, className)} />;
  const color = avatarColors[hashString(`${firstName}${lastName}`) % avatarColors.length];
  return (
    <span aria-hidden className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', dim, color, className)}>
      {initials(firstName, lastName)}
    </span>
  );
}

export function ProgressBar({ value, label, className, tone = 'brand' }: { value: number; label: string; className?: string; tone?: 'brand' | 'success' }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label} className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-100', className)}>
      <div className={cn('h-full rounded-full transition-all duration-700 ease-out', pct >= 100 || tone === 'success' ? 'bg-emerald-500' : 'bg-brand-600')} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ProgressRing({ value, size = 56, stroke = 6, label }: { value: number; size?: number; stroke?: number; label: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-slate-100" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} className={cn('transition-all duration-700', pct >= 100 ? 'stroke-emerald-500' : 'stroke-brand-600')} />
      </svg>
      <span className="absolute text-xs font-semibold text-slate-900">{Math.round(pct)}%</span>
    </div>
  );
}

/** Small pill switcher (EN | FR, list/grid…). */
export function Segmented<T extends string>({ value, onChange, options, label, size = 'md' }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; label: string; size?: 'sm' | 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-slate-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn('rounded-md font-medium transition', size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm', value === o.value ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, label, className }: { tabs: { id: T; label: ReactNode; count?: number }[]; value: T; onChange: (id: T) => void; label: string; className?: string }) {
  return (
    <div role="tablist" aria-label={label} className={cn('no-scrollbar -mb-px flex gap-1 overflow-x-auto border-b border-slate-200', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          type="button"
          aria-selected={value === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition',
            value === tab.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800',
          )}
        >
          {tab.label}
          {tab.count !== undefined && <span className={cn('rounded-full px-1.5 text-xs font-semibold', value === tab.id ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600')}>{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}
