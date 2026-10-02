import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthProvider';
import { PwaUpdater } from './components/PwaUpdater';
import { ToastProvider } from './components/ui/overlays';
import { I18nProvider } from './i18n';
import './index.css';
import { ApiError } from './lib/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Never retry client errors (401/403/404/422…); retry network blips and 5xx twice.
      retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
    },
    mutations: { retry: false },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <App />
              <PwaUpdater />
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
);
