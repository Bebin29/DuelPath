'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { LogOut, Settings } from 'lucide-react';
import { useLanguage, useTranslation } from '@/lib/i18n/hooks';
import { parseTheme } from '@/lib/theme';
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
 * Die Workbench hat ihre eigene Kopfzeile und nutzt diese hier nicht.
 */
export function AppHeader() {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { settings, update } = useSettings();

  const items = [
    { href: '/', label: t('navigation.home') },
    { href: '/combos', label: t('navigation.combos') },
    { href: '/decks', label: t('navigation.decks') },
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
      <header className="flex h-14 items-center gap-7 border-b border-line px-8">
        <Link href="/" className="font-display text-2xl leading-none text-ink">
          {t('common.appName')}
        </Link>
        <nav aria-label={t('shell.mainNavigation')} className="flex h-full items-stretch gap-5">
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center text-sm transition-colors duration-(--motion-fast)',
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
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t('shell.userMenu')}
              className="grid size-8 place-items-center rounded-full border border-line font-display text-base text-ink hover:bg-surface-3"
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
    </>
  );
}
