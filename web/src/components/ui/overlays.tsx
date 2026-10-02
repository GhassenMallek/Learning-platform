import { AlertTriangle, CheckCircle2, Info, MoreHorizontal, X, XCircle, type LucideIcon } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { Button } from './primitives';

// ── Shared overlay behaviour: focus trap, Esc, scroll lock, focus restore, stacking ──────
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const stack: symbol[] = [];
let scrollLocks = 0;

function useOverlay(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const id = Symbol('overlay');
    stack.push(id);
    const previous = document.activeElement as HTMLElement | null;
    if (scrollLocks++ === 0) document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter((el) => el.offsetParent !== null);
    (panel?.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0] ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return; // only the top-most overlay reacts
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current();
      } else if (e.key === 'Tab') {
        const list = focusables();
        if (list.length === 0) return e.preventDefault();
        const active = document.activeElement;
        if (e.shiftKey && (active === list[0] || active === panel)) {
          e.preventDefault();
          list[list.length - 1].focus();
        } else if (!e.shiftKey && active === list[list.length - 1]) {
          e.preventDefault();
          list[0].focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(id), 1);
      if (--scrollLocks === 0) document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [open]);

  return panelRef;
}

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

function CloseButton({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  return (
    <button type="button" onClick={onClose} aria-label={t('common.close')} className="-mr-2 -mt-1 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
      <X className="h-5 w-5" aria-hidden />
    </button>
  );
}

const modalSizes = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };

/** Centered dialog on desktop, bottom sheet on phones. */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: OverlayProps & { size?: keyof typeof modalSizes }) {
  const panelRef = useOverlay(open, onClose);
  const titleId = useId();
  const descId = useId();
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn('relative flex max-h-[92dvh] w-full animate-sheet-in flex-col rounded-t-2xl bg-white shadow-elevated outline-none sm:max-h-[88dvh] sm:animate-pop-in sm:rounded-2xl', modalSizes[size])}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-lg font-semibold text-slate-900">{title}</h2>
            {description && <p id={descId} className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          <CloseButton onClose={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Right-hand drawer on desktop, full screen on phones. */
export function Drawer({ open, onClose, title, description, children, footer, width = 'md' }: OverlayProps & { width?: 'md' | 'lg' | 'xl' }) {
  const panelRef = useOverlay(open, onClose);
  const titleId = useId();
  if (!open) return null;
  const w = { md: 'sm:max-w-[480px]', lg: 'sm:max-w-[620px]', xl: 'sm:max-w-[820px]' }[width];
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={cn('relative flex h-full w-full animate-drawer-in flex-col bg-white shadow-elevated outline-none', w)}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-lg font-semibold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <CloseButton onClose={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Names the object being affected and asks for an explicit yes — used before every destructive action. */
export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  description,
  confirmLabel,
  tone = 'danger',
  loading,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      onClose={loading ? () => undefined : onCancel}
      size="sm"
      title={
        <span className="flex items-center gap-3">
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', tone === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-600')}>
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </span>
          {title}
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>{t('common.cancel')}</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading} data-autofocus>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-sm leading-6 text-slate-600">{description}</p>
    </Modal>
  );
}

// ── Toasts ───────────────────────────────────────────────────────────────────────────
type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}
interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}
const ToastContext = createContext<ToastApi | null>(null);
let toastId = 0;

const toastStyle: Record<ToastTone, { icon: LucideIcon; cls: string }> = {
  success: { icon: CheckCircle2, cls: 'text-emerald-600' },
  error: { icon: XCircle, cls: 'text-rose-600' },
  info: { icon: Info, cls: 'text-brand-600' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setItems((list) => list.filter((i) => i.id !== id)), []);
  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = ++toastId;
      setItems((list) => [...list.slice(-3), { id, tone, message }]);
      setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4500);
    },
    [dismiss],
  );
  const api = useMemo<ToastApi>(() => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-4 sm:w-[380px]">
          {items.map((item) => {
            const { icon: Icon, cls } = toastStyle[item.tone];
            return (
              <div key={item.id} role={item.tone === 'error' ? 'alert' : 'status'} className="pointer-events-auto flex animate-pop-in items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-elevated">
                <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', cls)} aria-hidden />
                <p className="min-w-0 flex-1 text-sm font-medium text-slate-800">{item.message}</p>
                <button type="button" onClick={() => dismiss(item.id)} aria-label={t('common.close')} className="rounded p-0.5 text-slate-400 hover:text-slate-700">
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// ── Dropdown menu (rendered in a portal so table overflow never clips it) ──────────────
export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  tone?: 'danger';
  hidden?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
}

export function Menu({ items, label, className }: { items: MenuItem[]; label?: string; className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const visible = items.filter((i) => !i.hidden);

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    setPos(null);
    if (restoreFocus) trigger.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!open || !trigger.current) return;
    const rect = trigger.current.getBoundingClientRect();
    const width = 224;
    const height = panel.current?.offsetHeight ?? visible.length * 40 + 12;
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    const below = rect.bottom + 6;
    setPos({ left, top: below + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 6) : below });
  }, [open, visible.length]);

  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!panel.current?.contains(target) && !trigger.current?.contains(target)) close();
    };
    const dismiss = () => close();
    document.addEventListener('mousedown', outside);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    panel.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();
    return () => {
      document.removeEventListener('mousedown', outside);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
    };
  }, [open, close]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const entries = Array.from(panel.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []);
    const index = entries.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      entries[(index + 1) % entries.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      entries[(index - 1 + entries.length) % entries.length]?.focus();
    } else if (e.key === 'Tab') close();
  };

  if (visible.length === 0) return null;
  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label ?? t('common.moreActions')}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn('inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800', open && 'bg-slate-100', className)}
      >
        <MoreHorizontal className="h-5 w-5" aria-hidden />
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            role="menu"
            onKeyDown={onKeyDown}
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
            className="fixed z-[60] w-56 animate-pop-in rounded-xl border border-slate-200 bg-white p-1.5 shadow-elevated"
          >
            {visible.map((item) => (
              <div key={item.label}>
                {item.separatorBefore && <div className="my-1 h-px bg-slate-100" />}
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    close();
                    item.onSelect();
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition focus:outline-none disabled:opacity-40',
                    item.tone === 'danger' ? 'text-rose-600 hover:bg-rose-50 focus:bg-rose-50' : 'text-slate-700 hover:bg-slate-50 focus:bg-slate-100',
                  )}
                >
                  {item.icon && <item.icon className="h-4 w-4 shrink-0" aria-hidden />}
                  <span className="truncate">{item.label}</span>
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
