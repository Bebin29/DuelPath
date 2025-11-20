'use client';

import { useTranslation } from '@/lib/i18n/hooks';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/components/ui/card';
import { Library, Zap, Swords } from 'lucide-react';

/**
 * Startseite mit Willkommensnachricht und Schnellzugriff auf Hauptfunktionen
 */
export default function Home() {
  const { t } = useTranslation();
  const { data: session } = useSession();

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      <section className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
          {t('dashboard.welcome')}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {session
            ? 'Verwalte deine Decks, erstelle Kombos und teste sie im Duellmodus.'
            : 'Melde dich an, um deine Yu-Gi-Oh! Decks zu verwalten und Kombos zu erstellen.'}
        </p>
      </section>

      {/* Quick Access Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardHeader>
            <Library className="w-8 h-8 text-primary mb-2" />
            <CardTitle>{t('navigation.decks')}</CardTitle>
            <CardDescription>Erstelle und verwalte deine Yu-Gi-Oh! Decks</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/decks">
              <Button variant="default" className="w-full">
                {session ? t('deck.createDeck') : t('navigation.decks')}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Zap className="w-8 h-8 text-primary mb-2" />
            <CardTitle>{t('navigation.combos')}</CardTitle>
            <CardDescription>Erstelle und visualisiere Kombos Schritt für Schritt</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/combos">
              <Button variant="default" className="w-full">
                {session ? t('combo.createCombo') : t('navigation.combos')}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Swords className="w-8 h-8 text-primary mb-2" />
            <CardTitle>{t('navigation.duel')}</CardTitle>
            <CardDescription>Teste deine Decks und Kombos im Duellmodus</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/duel">
              <Button variant="default" className="w-full">
                {t('duel.startDuel')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Auth Section */}
      {!session && (
        <section className="text-center">
          <p className="text-muted-foreground mb-4">{t('auth.noAccount')}</p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/signin">
              <Button variant="default">{t('auth.signIn')}</Button>
            </Link>
            <Link href="/auth/signup">
              <Button variant="secondary">{t('auth.signUp')}</Button>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
