import React, { useState } from 'react';
import { AppWindow } from 'lucide-react';

export const AppLogo = ({ app, size = 24 }) => {
  const [srcIndex, setSrcIndex] = useState(0);

  const getSources = () => {
    const sources = [];
    if (app && app.icon_url) sources.push(app.icon_url);
    if (app && app.url) {
      try {
        const urlObj = new URL(app.url);
        sources.push(`https://icons.duckduckgo.com/ip3/${urlObj.hostname}.ico`);
        sources.push(`https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`);
        sources.push(`${urlObj.origin}/favicon.ico`);
        sources.push(`${urlObj.origin}/logo192.png`);
        sources.push(`${urlObj.origin}/apple-touch-icon.png`);
      } catch {
        // Ignorer les URLs non conformes
      }
    }
    return sources;
  };

  const sources = getSources();

  if (srcIndex >= sources.length || sources.length === 0) {
    return <AppWindow size={size} />;
  }

  return (
    <img
      src={sources[srcIndex]}
      alt={app ? app.name : 'App'}
      onError={() => setSrcIndex((prev) => prev + 1)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: 'contain',
        borderRadius: '6px'
      }}
    />
  );
};

export default AppLogo;
