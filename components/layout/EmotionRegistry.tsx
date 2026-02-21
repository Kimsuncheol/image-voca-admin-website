'use client';

import { useState } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';

export default function EmotionRegistry({ children }: { children: React.ReactNode }) {
  const [cache] = useState(() => {
    const c = createCache({ key: 'mui' });
    c.compat = true;
    return c;
  });

  useServerInsertedHTML(() => {
    const entries = (cache as unknown as { inserted: Record<string, string> }).inserted;
    if (!entries || Object.keys(entries).length === 0) return null;

    const styles = Object.values(entries).join('');
    const dataEmotionAttr = `${cache.key} ${Object.keys(entries).join(' ')}`;

    // Clear inserted cache to prevent duplicates
    (cache as unknown as { inserted: Record<string, string> }).inserted = {};

    return (
      <style
        key={cache.key}
        data-emotion={dataEmotionAttr}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}
