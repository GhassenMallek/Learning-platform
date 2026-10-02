import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { homeFor, useAuth } from '@/auth/AuthProvider';
import { Logo, LogoMark } from '@/components/brand';
import { Button, Field, Input } from '@/components/ui/primitives';
import { useErrorText, useI18n } from '@/i18n';
import { useDocumentTitle } from '@/lib/hooks';
import { useSiteSettings } from '@/lib/queries';
import type { Account } from '@/lib/types';
import { rules, validate } from '@/lib/validation';

/** One login screen for both portals: `/login` (students) and `/admin/login` (administrators). */
export default function Login({ portal }: { portal: 'admin' | 'student' }) {
  const { t } = useI18n();
  const errors = useErrorText();
  const { user, login } = useAuth();
  const { data: site } = useSiteSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const isAdmin = portal === 'admin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  useDocumentTitle(`${t(isAdmin ? 'auth.adminTitle' : 'auth.studentTitle')} · ${site?.name ?? ''}`);

  /** Where to send a signed-in user: the password-change screen when forced, else where they were headed, else their home. */
  const landing = (account: Account) => {
    if (account.mustChangePassword) return isAdmin ? '/admin/settings?tab=account' : '/student/profile';
    return from?.startsWith(isAdmin ? '/admin' : '/student') ? from : homeFor(account.role);
  };

  const submit = useMutation({
    mutationFn: () => login(email.trim(), password, portal),
    onSuccess: (account) => navigate(landing(account), { replace: true }),
  });

  if (user && user.role === (isAdmin ? 'ADMIN' : 'STUDENT') && !submit.isPending) return <Navigate to={landing(user)} replace />;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const issues = validate({ email, password }, { email: [rules.email], password: [rules.required] });
    const messages = Object.fromEntries(Object.entries(issues).map(([k, i]) => [k, errors.field({ field: k, ...i! })]));
    setFieldErrors(messages);
    if (Object.keys(messages).length === 0) submit.mutate();
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <aside className="relative hidden overflow-hidden bg-brand-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-80" style={{ backgroundImage: 'radial-gradient(70% 60% at 100% 0%, rgb(91 118 245 / 0.5), transparent 60%), radial-gradient(50% 50% at 0% 100%, rgb(66 88 232 / 0.4), transparent 60%)' }} aria-hidden />
        <div className="relative flex items-center gap-3"><LogoMark className="h-9 w-9" /><span className="font-display text-lg font-bold">{site?.name}</span></div>
        <div className="relative max-w-md">
          {isAdmin ? <ShieldCheck className="mb-6 h-10 w-10 text-brand-300" aria-hidden /> : null}
          <p className="font-display text-4xl font-extrabold leading-tight">{isAdmin ? t('auth.adminTitle') : t('hero.title')}</p>
          <p className="mt-5 text-lg leading-8 text-brand-100/85">{isAdmin ? t('auth.adminSubtitle') : t('hero.subtitle')}</p>
        </div>
        <p className="relative text-sm text-brand-200/70">{site?.tagline_fr}</p>
      </aside>

      <main id="main" className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" aria-hidden />{t('auth.backToSite')}</Link>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <div className="lg:hidden"><Logo className="mb-8" /></div>
          <h1 className="font-display text-3xl font-bold text-slate-900">{t(isAdmin ? 'auth.adminTitle' : 'auth.studentTitle')}</h1>
          <p className="mt-2 text-slate-500">{t(isAdmin ? 'auth.adminSubtitle' : 'auth.studentSubtitle')}</p>

          <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
            {submit.error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{errors.message(submit.error)}</p>}
            <Field label={t('auth.email')} required error={fieldErrors.email}>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" inputMode="email" autoFocus />
            </Field>
            <Field label={t('auth.password')} required error={fieldErrors.password}>
              <div className="relative">
                <Input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="pr-11" />
                <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? t('common.hidePassword') : t('common.showPassword')} aria-pressed={show} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-700">
                  {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </button>
              </div>
            </Field>
            <Button type="submit" size="lg" glow className="w-full" loading={submit.isPending}>{submit.isPending ? t('auth.signingIn') : t('auth.signIn')}</Button>
          </form>

          <div className="mt-8 space-y-3 text-sm text-slate-500">
            {!isAdmin && <p>{t('auth.noAccount')} <Link to="/contact" className="font-semibold text-brand-700 hover:underline">{t('auth.contactLink')}</Link></p>}
            <p><Link to={isAdmin ? '/login' : '/admin/login'} className="font-medium text-slate-600 hover:text-slate-900 hover:underline">{t(isAdmin ? 'auth.studentLink' : 'auth.adminLink')}</Link></p>
          </div>
        </div>
      </main>
    </div>
  );
}
