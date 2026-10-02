import { RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/overlays';
import { useI18n } from '@/i18n';

const HOUR = 60 * 60 * 1000;

/**
 * Registers the service worker. A new deploy installs in the background and waits; this banner lets the user
 * reload when it suits them (never in the middle of editing a course or a lesson).
 */
export function PwaUpdater() {
  const { t } = useI18n();
  const toast = useToast();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    // Long-lived tabs and installed apps check for a new version every hour.
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => registration.update().catch(() => undefined), HOUR);
    },
  });

  useEffect(() => {
    if (!offlineReady) return;
    toast.success(t('common.offlineReady'));
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady, t, toast]);

  if (!needRefresh) return null;
  return (
    <div role="status" className="fixed inset-x-4 bottom-4 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 pl-4 shadow-lg sm:inset-x-auto sm:right-4">
      <p className="flex-1 text-sm font-medium text-slate-800">{t('common.updateReady')}</p>
      <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>{t('common.close')}</Button>
      <Button size="sm" iconLeft={<RefreshCw className="h-4 w-4" aria-hidden />} onClick={() => updateServiceWorker(true)}>{t('common.updateReload')}</Button>
    </div>
  );
}
