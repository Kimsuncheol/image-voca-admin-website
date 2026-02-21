'use client';

import { useState, useCallback } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token: string;
              error?: string;
            }) => void;
          }): { requestAccessToken(): void };
        };
      };
    };
  }
}

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

function loadGis(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts) return Promise.resolve();
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

export interface GoogleSheetsAuth {
  token: string | null;
  loading: boolean;
  configured: boolean;
  requestToken: () => Promise<string>;
  clearToken: () => void;
}

/**
 * Manages Google OAuth2 implicit grant for the Sheets readonly scope.
 * Requires NEXT_PUBLIC_GOOGLE_CLIENT_ID to be set.
 */
export function useGoogleSheetsAuth(): GoogleSheetsAuth {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const configured = Boolean(CLIENT_ID);

  const requestToken = useCallback((): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      setLoading(true);
      try {
        await loadGis();
        if (!window.google?.accounts) {
          reject(new Error('Google Identity Services failed to load'));
          return;
        }
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPE,
          callback: (response) => {
            setLoading(false);
            if (response.error) {
              reject(new Error(response.error));
            } else {
              setToken(response.access_token);
              resolve(response.access_token);
            }
          },
        });
        client.requestAccessToken();
      } catch (err) {
        setLoading(false);
        reject(err);
      }
    });
  }, []);

  const clearToken = useCallback(() => setToken(null), []);

  return { token, loading, configured, requestToken, clearToken };
}
