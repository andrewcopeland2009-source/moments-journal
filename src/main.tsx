import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/cormorant-garamond/300.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource-variable/fraunces/index.css';
import '@fontsource-variable/fraunces/wght-italic.css';
import '@fontsource-variable/newsreader/index.css';
import '@fontsource-variable/newsreader/wght-italic.css';
import '@fontsource-variable/inter/index.css';
import './index.css';
import { App } from './App';
import { JournalProvider } from './state/journal';
import { SettingsProvider } from './state/settings';
import { UIProvider } from './state/ui';

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <JournalProvider>
        <UIProvider>
          <App />
        </UIProvider>
      </JournalProvider>
    </SettingsProvider>
  </StrictMode>,
);

// Let the boot mark linger just long enough to feel intentional, then dissolve.
const boot = document.getElementById('boot');
if (boot) {
  const t0 = performance.now();
  const hide = () => {
    boot.classList.add('gone');
    setTimeout(() => boot.remove(), 700);
  };
  document.fonts.ready.then(() => setTimeout(hide, Math.max(0, 420 - (performance.now() - t0))));
}
