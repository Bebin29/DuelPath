'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/hooks';
import { Button } from '@/components/components/ui/button';
import { cn } from '@/lib/utils';
import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

/**
 * Hauptnavigation mit Links zu Decks, Kombos, Duell
 *
 * Active Link States: Nutzt --accent für aktive/hover Links
 * Focus Styles: Sichtbarer Focus-Ring (2px, --ring) für Tastaturnutzer
 * Responsive: Sidebar auf Desktop, Hamburger-Menu auf Mobile
 */
export function Navigation() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/', label: t('navigation.home') },
    { href: '/decks', label: t('navigation.decks') },
    { href: '/combos', label: t('navigation.combos') },
    { href: '/duel', label: t('navigation.duel') },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <Link
            href="/"
            className="text-xl font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t('common.appName')}
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md',
                  isActive(item.href)
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {item.label}
              </Link>
            ))}

            {session ? (
              <Button variant="outline" size="sm" onClick={() => signOut()} className="ml-4">
                {t('auth.signOut')}
              </Button>
            ) : (
              <Link href="/auth/signin">
                <Button variant="default" size="sm" className="ml-4">
                  {t('auth.signIn')}
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'block px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md',
                  isActive(item.href)
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-4 px-3">
              {session ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full"
                >
                  {t('auth.signOut')}
                </Button>
              ) : (
                <Link href="/auth/signin" className="block">
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('auth.signIn')}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
