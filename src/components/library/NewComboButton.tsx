'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createCombo } from '@/server/actions/combo.actions';

/**
 * „Neue Combo“ (UX-Plan 7.1): Deck wählen, die Workbench öffnet mit dem Deck im Startzustand.
 * Der Titel ist ein Vorschlag, den man in der Workbench überschreibt.
 */
export function NewComboButton({
  decks,
  variant = 'default',
}: {
  decks: { id: string; name: string }[];
  variant?: 'default' | 'line';
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const create = async (deckId?: string) => {
    setBusy(true);
    const result = await createCombo(t('library.untitled'), deckId);
    if (result.data) router.push(`/combos/${result.data.id}`);
    else setBusy(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} disabled={busy}>
          <Plus />
          {t('start.newCombo')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('library.chooseDeck')}</DropdownMenuLabel>
        {decks.map((d) => (
          <DropdownMenuItem key={d.id} onSelect={() => create(d.id)}>
            {d.name}
          </DropdownMenuItem>
        ))}
        {decks.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem onSelect={() => create()}>{t('library.withoutDeck')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
