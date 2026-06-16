import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export default function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isStandaloneDisplay());

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }

    function handleInstalled() {
      setInstallPrompt(null);
      setInstalled(true);
    }

    const displayModeQuery = window.matchMedia?.('(display-mode: standalone)');
    const handleDisplayModeChange = () => setInstalled(isStandaloneDisplay());

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    if (displayModeQuery?.addEventListener) {
      displayModeQuery.addEventListener('change', handleDisplayModeChange);
    } else {
      displayModeQuery?.addListener?.(handleDisplayModeChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      if (displayModeQuery?.removeEventListener) {
        displayModeQuery.removeEventListener('change', handleDisplayModeChange);
      } else {
        displayModeQuery?.removeListener?.(handleDisplayModeChange);
      }
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    setInstallPrompt(null);
  }

  if (installed || !installPrompt) return null;

  return (
    <button type="button" className="pwa-install-button" onClick={installApp}>
      <Download className="h-4 w-4" />
      <span>Install App</span>
    </button>
  );
}
