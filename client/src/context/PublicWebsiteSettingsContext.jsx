import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getPublicWebsiteSettings } from '../utils/publicApi.js';
import { defaultPublicWebsiteSettings, mergePublicWebsiteSettings } from '../utils/publicWebsiteDefaults.js';

const PublicWebsiteSettingsContext = createContext(null);

export function PublicWebsiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultPublicWebsiteSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    getPublicWebsiteSettings()
      .then((data) => {
        if (!mounted) return;
        setSettings(mergePublicWebsiteSettings(data.settings || {}));
        setError('');
      })
      .catch((err) => {
        if (!mounted) return;
        setSettings(defaultPublicWebsiteSettings);
        setError(err.message || 'Unable to load public website settings');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const title = settings.seo?.websiteTitle || defaultPublicWebsiteSettings.seo.websiteTitle;
    document.title = title;
    updateMeta('description', settings.seo?.metaDescription || defaultPublicWebsiteSettings.seo.metaDescription);
    updateMeta('keywords', settings.seo?.keywords || defaultPublicWebsiteSettings.seo.keywords);
    updateMeta('og:title', title, 'property');
    updateMeta('og:description', settings.seo?.metaDescription || defaultPublicWebsiteSettings.seo.metaDescription, 'property');
    updateMeta('og:image', settings.seo?.socialSharingImage || defaultPublicWebsiteSettings.seo.socialSharingImage, 'property');
  }, [settings]);

  const value = useMemo(() => ({
    settings,
    loading,
    error,
    contact: settings.contact || defaultPublicWebsiteSettings.contact,
    booking: settings.booking || defaultPublicWebsiteSettings.booking,
    branding: settings.branding || defaultPublicWebsiteSettings.branding
  }), [error, loading, settings]);

  return (
    <PublicWebsiteSettingsContext.Provider value={value}>
      {children}
    </PublicWebsiteSettingsContext.Provider>
  );
}

export function usePublicWebsiteSettings() {
  const value = useContext(PublicWebsiteSettingsContext);
  if (!value) {
    return {
      settings: defaultPublicWebsiteSettings,
      loading: false,
      error: '',
      contact: defaultPublicWebsiteSettings.contact,
      booking: defaultPublicWebsiteSettings.booking,
      branding: defaultPublicWebsiteSettings.branding
    };
  }
  return value;
}

function updateMeta(name, content, attribute = 'name') {
  if (!content) return;
  let tag = document.head.querySelector(`meta[${attribute}="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}
