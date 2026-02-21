import type { Metadata } from 'next';
import EmotionRegistry from '@/components/layout/EmotionRegistry';
import { AppThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import I18nProvider from '@/i18n/I18nProvider';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Image Voca Admin',
  description: 'Admin dashboard for Image Voca',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <EmotionRegistry>
          <AppThemeProvider>
            <AuthProvider>
              <I18nProvider>
                {children}
              </I18nProvider>
            </AuthProvider>
          </AppThemeProvider>
        </EmotionRegistry>
      </body>
    </html>
  );
}
