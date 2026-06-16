import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PwaUpdatePrompt from './PwaUpdatePrompt.jsx';
import {
  cleanupStaffPwaArtifacts,
  ensureStaffManifestLink,
  isStaffInstallablePath,
  registerStaffServiceWorker
} from '../utils/pwaRegistration.js';

export default function PwaRouteManager() {
  const location = useLocation();
  const staffInstallableRoute = isStaffInstallablePath(location.pathname);

  useEffect(() => {
    let cancelled = false;

    async function syncPwaState() {
      try {
        if (staffInstallableRoute) {
          ensureStaffManifestLink();
          await registerStaffServiceWorker();
          return;
        }

        await cleanupStaffPwaArtifacts();
      } catch (error) {
        if (!cancelled) console.warn('Universal Systems PWA route sync failed.', error);
      }
    }

    syncPwaState();

    return () => {
      cancelled = true;
    };
  }, [staffInstallableRoute, location.pathname]);

  return staffInstallableRoute ? <PwaUpdatePrompt /> : null;
}
