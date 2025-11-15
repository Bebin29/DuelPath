import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { SWRProvider } from "@/components/providers/SWRProvider";
import { I18nProvider } from "@/components/common/I18nProvider";
import { Navigation } from "@/components/common/Navigation";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { ToastProvider } from "@/components/components/ui/toast";
import { GlobalErrorBoundary } from "@/components/error/GlobalErrorBoundary";
import { OfflineProvider } from "@/components/providers/OfflineProvider";
import { PerformanceProvider } from "@/components/providers/PerformanceProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DuelPath - Yu-Gi-Oh! Deck-Verwaltung und Kombo-Editor",
  description: "DuelPath ist eine Webanwendung für Yu-Gi-Oh!-Spieler, die Kombos visualisieren und ausführen sowie eigene Decks verwalten möchten.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <I18nProvider>
            <GlobalErrorBoundary>
              <SWRProvider>
                <ToastProvider>
                  <PerformanceProvider>
                    <OfflineProvider>
                      <div className="min-h-screen flex flex-col">
                        <header>
                          <Navigation />
                          <div className="container mx-auto px-4 py-2 flex justify-end">
                            <LanguageSwitcher />
                          </div>
                        </header>
                        <main className="flex-1">{children}</main>
                      </div>
                    </OfflineProvider>
                  </PerformanceProvider>
                </ToastProvider>
              </SWRProvider>
            </GlobalErrorBoundary>
          </I18nProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
