import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@app/App';
import { ErrorBoundary } from '@app/infra/ErrorBoundary';
import '@/index.css';
import '@shared/i18n';

const rootElement = document.getElementById('app');
if (rootElement === null) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
