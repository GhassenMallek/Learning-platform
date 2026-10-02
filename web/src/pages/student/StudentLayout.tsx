import { BookOpen, ExternalLink, LayoutDashboard, LogOut, ShieldAlert, User, type LucideIcon } from 'lucide-react';
import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { Logo } from '@/components/brand';
import { Menu } from '@/components/ui/overlays';
import { Avatar } from '@/components/ui/primitives';
import { useI18n, type TKey } from '@/i18n';
import { cn } from '@/lib/utils';

const items: { to: string; label: TKey; icon: LucideIcon; end?: boolean }[] = [
  { to: '/student', label: 'student.nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/student/courses', label: 'student.nav.courses', icon: BookOpen },
  { to: '/student/profile', label: 'student.nav.profile', icon: User },
];

export function StudentLayout() {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // The lesson player has its own sticky action bar, so the bottom tab bar steps aside there.
  const inLesson = /\/lessons\//.test(pathname);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-dvh bg-slate-50/80">
      <a href="#main" className="sr-only z-[80] rounded-lg bg-white px-4 py-2 font-medium text-brand-700 shadow-elevated focus:not-sr-only focus:fixed focus:left-4 focus:top-4">{t('common.skipToContent')}</a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-slate-100 px-5"><Logo to="/student" /></div>
        <nav aria-label={t('student.nav.main')} className="flex-1 space-y-0.5 px-3 py-4">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition', isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}>
              <item.icon className="h-[18px] w-[18px]" aria-hidden />{t(item.label)}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-0.5 border-t border-slate-100 p-3">
          <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"><ExternalLink className="h-[18px] w-[18px]" aria-hidden />{t('student.nav.viewSite')}</Link>
          <button type="button" onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"><LogOut className="h-[18px] w-[18px]" aria-hidden />{t('student.nav.logout')}</button>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur-md sm:px-6">
          <div className="lg:hidden"><Logo to="/student" /></div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {user && (
              <div className="flex items-center gap-2">
                <div className="hidden text-right leading-tight md:block"><p className="text-sm font-semibold text-slate-900">{user.firstName} {user.lastName}</p><p className="text-xs text-slate-500">{t('student.nav.role')}</p></div>
                <Avatar firstName={user.firstName} lastName={user.lastName} src={user.profilePhotoUrl} />
                <Menu label={user.email} className="-ml-1" items={[
                  { label: t('student.nav.profile'), icon: User, onSelect: () => navigate('/student/profile') },
                  { label: t('student.nav.viewSite'), icon: ExternalLink, onSelect: () => navigate('/') },
                  { label: t('student.nav.logout'), icon: LogOut, separatorBefore: true, onSelect: signOut },
                ]} />
              </div>
            )}
          </div>
        </header>

        {user?.mustChangePassword && pathname !== '/student/profile' && (
          <div role="alert" className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6">
            <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden />
            <span className="flex-1 font-medium">{t('account.mustChange')}</span>
            <Link to="/student/profile" className="shrink-0 font-semibold underline underline-offset-2">{t('account.changePassword')}</Link>
          </div>
        )}

        <main id="main" className={cn('mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8', !inLesson && 'pb-24 lg:pb-8')}>
          <Outlet />
        </main>
      </div>

      {!inLesson && (
        <nav aria-label={t('student.nav.main')} className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cn('flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold', isActive ? 'text-brand-700' : 'text-slate-500')}>
              <item.icon className="h-5 w-5" aria-hidden />{t(item.label)}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
