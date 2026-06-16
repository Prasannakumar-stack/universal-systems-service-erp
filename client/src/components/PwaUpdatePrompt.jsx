import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { STAFF_SW_UPDATE_READY_EVENT, activateWaitingServiceWorker } from '../utils/pwaRegistration.js';

export default function PwaUpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState(null);

  useEffect(() => {
    function handleUpdateReady(event) {
      setWaitingWorker(event.detail?.worker || true);
    }

    window.addEventListener(STAFF_SW_UPDATE_READY_EVENT, handleUpdateReady);
    return () => window.removeEventListener(STAFF_SW_UPDATE_READY_EVENT, handleUpdateReady);
  }, []);

  if (!waitingWorker) return null;

  return (
    <div className="pwa-update-banner" role="status" aria-live="polite">
      <div className="pwa-update-banner-copy">
        <strong>New version available</strong>
        <span>Refresh when you are ready so unsaved work stays safe.</span>
      </div>
      <button type="button" className="pwa-update-refresh" onClick={() => activateWaitingServiceWorker(waitingWorker)}>
        <RefreshCw className="h-4 w-4" />
        <span>Update &amp; Refresh</span>
      </button>
      <button type="button" className="pwa-update-dismiss" onClick={() => setWaitingWorker(null)} aria-label="Dismiss update notice">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
