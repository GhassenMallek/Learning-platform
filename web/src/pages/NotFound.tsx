import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/data';
import { buttonClass } from '@/components/ui/primitives';
import { useI18n } from '@/i18n';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="container-page">
      <EmptyState icon={Compass} className="py-32" title={t('notFound.title')} text={t('notFound.text')} action={<Link to="/" className={buttonClass()}>{t('notFound.home')}</Link>} />
    </div>
  );
}
