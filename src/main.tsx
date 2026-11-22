import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Register auto-updating Service Worker so any installed user receives updates automatically
const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;

    // Check for new app builds every 45 seconds
    setInterval(() => {
      void registration.update();
    }, 45 * 1000);

    // Check immediately whenever the user re-opens or focuses the installed app
    const checkNow = () => {
      if (document.visibilityState === 'visible') {
        void registration.update();
      }
    };
    document.addEventListener('visibilitychange', checkNow);
    window.addEventListener('focus', checkNow);
  },
  onNeedRefresh() {
    // Immediately activate and reload into the latest build
    void updateSW(true);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
