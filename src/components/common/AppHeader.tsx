'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { House, Layers, LogOut, Route, Search, Settings } from 'lucide-react';
import { useLanguage, useTranslation } from '@/lib/i18n/hooks';
import { parseTheme } from '@/lib/theme';
import { usePalette } from '@/components/command/CommandPalette';
import { Kbd } from '@/components/ui/kbd';
import { useSettings } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * App-Kopfzeile nach UI-Plan 6.1: eine Zeile, Wortmarke, Hauptbereiche, Nutzermenü.
 * Auf dem Handy wandern Bereiche und Suche in eine Leiste unten (UI-Sweep-Plan, Phase 1).
 * Die Workbench hat ihre eigene Kopfzeile und nutzt diese hier nicht.
 */
export function AppHeader() {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { settings, update } = useSettings();
  const palette = usePalette();

  const items = [
    { href: '/', label: t('navigation.home'), icon: House },
    { href: '/combos', label: t('navigation.combos'), icon: Route },
    { href: '/decks', label: t('navigation.decks'), icon: Layers },
  ];
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname?.startsWith(href));
  const initial = (session?.user?.name || session?.user?.email || '?').charAt(0).toUpperCase();

  return (
    <>
      <a
        href="#main"
        className="sr-only rounded-md bg-primary px-3 py-2 text-on-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50"
      >
        {t('shell.skipToContent')}
      </a>
      <header className="flex h-14 items-center gap-7 border-b border-line px-4 sm:px-8">
        <Link
          href="/"
          className="flex items-center font-display text-2xl leading-none text-ink pointer-coarse:min-h-10"
        >
          {t('common.appName')}
        </Link>
        <nav
          aria-label={t('shell.mainNavigation')}
          className="hidden h-full items-stretch gap-5 sm:flex"
        >
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center text-sm transition-colors duration-(--motion-fast) pointer-coarse:px-1.5',
                  active
                    ? 'font-semibold text-ink shadow-[inset_0_-1.5px_0_var(--ink)]'
                    : 'text-text-muted hover:text-ink'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex-1" />
        {session && (
          <button
            type="button"
            onClick={() => palette.open()}
            className="mr-4 hidden h-8 w-full max-w-64 items-center gap-2 rounded-md border border-line bg-surface-1 px-2.5 text-sm text-text-subtle hover:border-line-strong pointer-coarse:h-10 sm:flex"
          >
            <Search className="size-3.5" />
            <span className="flex-1 truncate text-left">{t('palette.open')}</span>
            <Kbd>{t('help.key.ctrl')} K</Kbd>
          </button>
        )}
        {session && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t('shell.userMenu')}
              className="grid size-8 shrink-0 place-items-center rounded-full border border-line font-display text-base text-ink hover:bg-surface-3 pointer-coarse:size-10"
            >
              {initial}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('shell.theme')}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={settings.theme}
                onValueChange={(value) => update({ theme: parseTheme(value) })}
              >
                <DropdownMenuRadioItem value="dark">{t('shell.themeDark')}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="light">{t('shell.themeLight')}</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t('shell.language')}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={currentLanguage}
                onValueChange={(value) => changeLanguage(value === 'en' ? 'en' : 'de')}
              >
                <DropdownMenuRadioItem value="de">Deutsch</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="en">English</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings />
                  {t('navigation.settings')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => signOut()}>
                <LogOut />
                {t('auth.signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>
      {/* Handy: Bereiche und Suche in Daumenreichweite, über der Safe-Area */}
      {session && (
        <nav
          aria-label={t('shell.mainNavigation')}
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm sm:hidden"
        >
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-14 flex-col items-center justify-center gap-1 text-xs',
                  active ? 'font-semibold text-ink' : 'text-text-muted'
                )}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => palette.open()}
            className="flex h-14 flex-col items-center justify-center gap-1 text-xs text-text-muted"
          >
            <Search className="size-5" />
            {t('shell.search')}
          </button>
        </nav>
      )}
    </>
  );
}
