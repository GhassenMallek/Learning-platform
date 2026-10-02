import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { homeFor, useAuth } from '@/auth/AuthProvider';
import { Logo } from '@/components/brand';
import { buttonClass } from '@/components/ui/primitives';
import { useI18n } from '@/i18n';
import { useSiteSettings } from '@/lib/queries';
import { cn } from '@/lib/utils';

const links = [
  { to: '/courses', key: 'nav.courses' },
  { to: '/about', key: 'nav.about' },
  { to: '/contact', key: 'nav.contact' },
] as const;

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn('rounded-lg px-3 py-2 text-sm font-medium transition', isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900');

function Header() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const account = user && (
    <Link to={homeFor(user.role)} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
      {user.role === 'ADMIN' ? t('nav.adminSpace') : t('nav.mySpace')}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label={t('nav.main')} className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass}>{t(l.key)}</NavLink>
            ))}
          </nav>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          {account ?? (
            <>
              <Link to="/login" className={buttonClass({ variant: 'ghost', size: 'sm' })}>{t('nav.login')}</Link>
              <Link to="/contact" className={buttonClass({ size: 'sm' })}>{t('nav.contactUs')}</Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <button type="button" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? t('common.closeMenu') : t('common.openMenu')} onClick={() => setOpen((v) => !v)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700">
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>
      {/* Portalled to <body>: the header's backdrop-filter makes it the containing block for fixed children,
          which would collapse this full-screen panel to the header's height. */}
      {open && createPortal(
        <div id="mobile-nav" className="fixed inset-x-0 bottom-0 top-16 z-30 animate-fade-in overflow-y-auto bg-white md:hidden">
          <nav aria-label={t('nav.main')} className="container-page flex flex-col gap-1 py-6">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => cn('rounded-xl px-4 py-3.5 font-display text-lg font-semibold', isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-800')}>
                {t(l.key)}
              </NavLink>
            ))}
            <div className="mt-6 flex flex-col gap-3">
              {account ? (
                <Link to={homeFor(user!.role)} className={buttonClass({ size: 'lg', className: 'w-full' })}>{user!.role === 'ADMIN' ? t('nav.adminSpace') : t('nav.mySpace')}</Link>
              ) : (
                <>
                  <Link to="/contact" className={buttonClass({ size: 'lg', className: 'w-full' })}>{t('nav.contactUs')}</Link>
                  <Link to="/login" className={buttonClass({ variant: 'secondary', size: 'lg', className: 'w-full' })}>{t('nav.login')}</Link>
                </>
              )}
            </div>
          </nav>
        </div>,
        document.body,
      )}
    </header>
  );
}

function Footer() {
  const { t } = useI18n();
  const { data: site } = useSiteSettings();
  const social = Object.entries(site?.social ?? {}).filter(([, url]) => url);
  const address = site?.address_fr;
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">{t('footer.tagline')}</p>
        </div>
        <FooterColumn title={t('footer.explore')}>
          {links.map((l) => (
            <li key={l.to}><Link to={l.to} className="hover:text-slate-900">{t(l.key)}</Link></li>
          ))}
        </FooterColumn>
        <FooterColumn title={t('footer.student')}>
          <li><Link to="/login" className="hover:text-slate-900">{t('nav.login')}</Link></li>
          <li><Link to="/contact" className="hover:text-slate-900">{t('nav.contactUs')}</Link></li>
        </FooterColumn>
        <FooterColumn title={t('footer.contact')}>
          {site?.email && <li><a href={`mailto:${site.email}`} className="break-all hover:text-slate-900">{site.email}</a></li>}
          {site?.phone && <li><a href={`tel:${site.phone.replace(/\s/g, '')}`} className="hover:text-slate-900">{site.phone}</a></li>}
          {address && <li>{address}</li>}
          {social.map(([name, url]) => (
            <li key={name}>
              <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 capitalize hover:text-slate-900">
                {name}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </a>
            </li>
          ))}
        </FooterColumn>
      </div>
      <div className="border-t border-slate-200">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-slate-500 sm:flex-row">
          <span>{t('footer.rights', { year: new Date().getFullYear(), name: site?.name ?? '' })}</span>
          <Link to="/admin/login" className="hover:text-slate-800">{t('footer.admin')}</Link>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm text-slate-500">{children}</ul>
    </div>
  );
}

export function PublicLayout() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <a href="#main" className="sr-only z-50 rounded-lg bg-white px-4 py-2 font-medium text-brand-700 shadow-elevated focus:not-sr-only focus:fixed focus:left-4 focus:top-4">{t('common.skipToContent')}</a>
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
