import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n';
import type { Lang } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useSiteSettings } from '@/lib/queries';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8', className)} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-brand-600" />
      <path d="M8 22V10.5l8 6.2 8-6.2V22" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Brand lockup: the centre's name comes from the database (Admin → Settings), never from code. */
export function Logo({ to = '/', className, showName = true }: { to?: string; className?: string; showName?: boolean }) {
  const { data } = useSiteSettings();
  const name = data?.name ?? '';
  const [first, ...rest] = name.split(' ');
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2.5 rounded-lg', className)} aria-label={name || 'Home'}>
      <LogoMark />
      {showName && name && (
        <span className="font-display text-[17px] font-bold leading-none tracking-tight text-slate-900">
          {first}
          {rest.length > 0 && <span className="ml-1 hidden font-semibold text-slate-500 sm:inline">{rest.join(' ')}</span>}
        </span>
      )}
    </Link>
  );
}

/** EN | FR switch. */
export function LangSwitcher({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div role="group" aria-label={t('lang.switch')} className={cn('inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold shadow-xs', className)}>
      {(['en', 'fr'] as Lang[]).map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={lang === code}
          aria-label={t(`lang.${code}`)}
          onClick={() => setLang(code)}
          className={cn('rounded-md px-2.5 py-1.5 uppercase tracking-wide transition', lang === code ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900')}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
