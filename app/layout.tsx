import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono, Kalam } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { SWRProvider } from '@/components/providers/SWRProvider';
import { I18nProvider } from '@/components/common/I18nProvider';
import { ToastProvider } from '@/components/ui/toast';
import { GlobalErrorBoundary } from '@/components/error/GlobalErrorBoundary';
import { THEME_COOKIE, parseTheme } from '@/lib/theme';

const instrumentSans = Instrument_Sans({ variable: '--font-instrument-sans', subsets: ['latin'] });
const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
});
const jetbrainsMono = JetBrains_Mono({ variable: '--font-jetbrains-mono', subsets: ['latin'] });
const kalam = Kalam({ variable: '--font-kalam', subsets: ['latin'], weight: ['400', '700'] });

export const metadata: Metadata = {
  title: 'DuelPath',
  description: 'Yu-Gi-Oh!-Lines planen, stresstesten und nachspielen.',
};

// viewport-fit=cover, damit die Leiste unten auf dem Handy die Safe-Area kennt
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const fonts = [instrumentSans, instrumentSerif, jetbrainsMono, kalam]
    .map((f) => f.variable)
    .join(' ');

  return (
    <html lang="de" className={`${theme} ${fonts}`} suppressHydrationWarning>
      <body>
        <SessionProvider>
          <I18nProvider>
            <GlobalErrorBoundary>
              <SWRProvider>
                <ToastProvider>{children}</ToastProvider>
              </SWRProvider>
            </GlobalErrorBoundary>
          </I18nProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
