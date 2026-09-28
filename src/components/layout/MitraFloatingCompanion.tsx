import React from 'react';

interface MitraFloatingCompanionProps {
  apiBaseUrl?: string;
  stylesheetPath?: string;
  hostApp?: string;
}

export const MitraFloatingCompanion: React.FC<MitraFloatingCompanionProps> = ({
  apiBaseUrl = "https://mitra.blackholeinfiverse.com",
  stylesheetPath = "/mitra/styles/mitra-companion.css",
  hostApp = "shakti",
}) => {
  // Guard against duplicate element mounting if already attached in index.html
  if (typeof document !== 'undefined' && document.querySelector('mitra-companion')) {
    return null;
  }

  return React.createElement('mitra-companion', {
    'stylesheet-path': stylesheetPath,
    'api-base-url': apiBaseUrl,
    'host-app': hostApp,
  });
};
