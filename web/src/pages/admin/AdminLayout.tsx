import { BookOpen, ExternalLink, FolderTree, GraduationCap, Inbox, LayoutDashboard, LogOut, Menu as MenuIcon, PlusCircle, Settings, ShieldAlert, UserPlus, Users, X, ClipboardList, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { Logo } from '@/components/brand';
import { Menu } from '@/components/ui/overlays';
import { Avatar } from '@/components/ui/primitives';
import { useI18n, type TKey } from '@/i18n';
import { cn } from '@/lib/utils';
import { useOverview } from './shared';

interface NavItem {
  to: string;
  label: TKey;
  icon: LucideIcon;
  end?: boolean;
  badge?: number;
  /** Extra paths that should also light this item up. */
  match?: (path: string) => boolean;
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const { data } = useOverview();
  const newRequests = data?.totals.newContactRequests ?? 0;

  const groups: { title?: TKey; icon?: LucideIcon; items: NavItem[] }[] = [
    { items: [{ to: '/admin', label: 'admin.nav.dashboard', icon: LayoutDashboard, end: true }] },
    {
      title: 'admin.nav.courses',
      icon: BookOpen,
      items: [
        { to: '/admin/courses', label: 'admin.nav.allCourses', icon: GraduationCap, match: (p) => p.startsWith('/admin/courses') && !p.startsWith('/admin/courses/new') },
        { to: '/admin/courses/new', label: 'admin.nav.addCourse', icon: PlusCircle },
        { to: '/admin/categories', label: 'admin.nav.categories', icon: FolderTree },
      ],
    },
    {
      title: 'admin.nav.students',
      icon: Users,
      items: [
        { to: '/admin/students', label: 'admin.nav.allStudents', icon: Users, match: (p) => p.startsWith('/admin/students') && !p.startsWith('/admin/students/new') },
        { to: '/admin/students/new', label: 'admin.nav.addStudent', icon: UserPlus },
        { to: '/admin/enrollments', label: 'admin.nav.enrollments', icon: ClipboardList },
      ],
    },
    { title: 'admin.nav.messages', icon: Inbox, items: [{ to: '/admin/messages', label: 'admin.nav.contactRequests', icon: Inbox, badge: newRequests }] },
    { items: [{ to: '/admin/settings', label: 'admin.nav.settings', icon: Settings }] },
  ];

  return (
    <nav aria-label={t('admin.nav.main')} className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {groups.map((group, gi) => (
        <div key={gi}>
          {group.title && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{t(group.title)}</p>}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.match ? item.match(pathname) : undefined;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end ?? !item.match}
                    onClick={onNavigate}
                    className={({ isActive }) => cn('group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition', (active ?? isActive) ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{t(item.label)}</span>
                    {item.badge ? <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-semibold leading-none text-white" aria-label={`${item.badge} new`}>{item.badge}</span> : null}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminLayout() {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-slate-50/80">
      <a href="#main" className="sr-only z-[80] rounded-lg bg-white px-4 py-2 font-medium text-brand-700 shadow-elevated focus:not-sr-only focus:fixed focus:left-4 focus:top-4">{t('common.skipToContent')}</a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-68 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-slate-100 px-5"><Logo to="/admin" /></div>
        <Sidebar />
        <div className="border-t border-slate-100 p-3">
          <Link to="/" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <ExternalLink className="h-[18px] w-[18px]" aria-hidden />{t('admin.nav.viewSite')}
          </Link>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-slate-900/45" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative flex h-full w-72 max-w-[85vw] animate-fade-in flex-col bg-white shadow-elevated">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-4">
              <Logo to="/admin" />
              <button type="button" onClick={() => setOpen(false)} aria-label={t('common.closeMenu')} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" aria-hidden /></button>
            </div>
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-68">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur-md sm:px-6">
          <button type="button" onClick={() => setOpen(true)} aria-label={t('common.openMenu')} aria-expanded={open} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 lg:hidden">
            <MenuIcon className="h-5 w-5" aria-hidden />
          </button>
          <div className="lg:hidden"><Logo to="/admin" showName={false} /></div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link to="/" target="_blank" className="hidden h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:inline-flex"><ExternalLink className="h-4 w-4" aria-hidden />{t('admin.nav.viewSite')}</Link>
            {user && (
              <div className="flex items-center gap-2">
                <div className="hidden text-right leading-tight md:block">
                  <p className="text-sm font-semibold text-slate-900">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-slate-500">{t('admin.nav.role')}</p>
                </div>
                <Avatar firstName={user.firstName} lastName={user.lastName} size="md" />
                <Menu
                  label={user.email}
                  items={[
                    { label: t('admin.nav.settings'), icon: Settings, onSelect: () => navigate('/admin/settings') },
                    { label: t('admin.nav.logout'), icon: LogOut, separatorBefore: true, onSelect: async () => { await logout(); navigate('/admin/login', { replace: true }); } },
                  ]}
                  className="-ml-1"
                />
              </div>
            )}
          </div>
        </header>

        {user?.mustChangePassword && pathname !== '/admin/settings' && (
          <div role="alert" className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6">
            <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden />
            <span className="flex-1 font-medium">{t('account.mustChange')}</span>
            <Link to="/admin/settings?tab=account" className="shrink-0 font-semibold underline underline-offset-2">{t('account.changePassword')}</Link>
          </div>
        )}

        <main id="main" className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

