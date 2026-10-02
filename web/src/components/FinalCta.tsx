import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { buttonClass } from './ui/primitives';

export function FinalCta() {
  const { t } = useI18n();
  return (
    <section className="pb-16 md:pb-24">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-3xl bg-brand-950 px-6 py-14 text-center sm:px-14 sm:py-20">
          <div className="absolute inset-0 opacity-70" style={{ backgroundImage: 'radial-gradient(60% 80% at 80% 0%, rgb(91 118 245 / 0.45), transparent 60%), radial-gradient(40% 60% at 0% 100%, rgb(66 88 232 / 0.35), transparent 60%)' }} aria-hidden />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">{t('cta.title')}</h2>
            <p className="mt-4 text-base leading-7 text-brand-100/90 sm:text-lg">{t('cta.text')}</p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/contact" className={buttonClass({ size: 'lg', className: 'bg-white text-brand-800 hover:bg-brand-50' })}>
                {t('cta.button')}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link to="/courses" className={buttonClass({ size: 'lg', className: 'border border-white/25 bg-white/10 text-white hover:bg-white/20' })}>{t('cta.secondary')}</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
