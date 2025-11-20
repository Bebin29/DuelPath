'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/hooks';
import { createCombo } from '@/server/actions/combo.actions';
import { getUserDecks } from '@/server/actions/deck.actions';
import { Button } from '@/components/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/components/ui/dialog';
import { Input } from '@/components/components/ui/input';
import { Label } from '@/components/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/components/ui/select';
import { Plus } from 'lucide-react';
import type { Deck } from '@prisma/client';

/**
 * Dialog zum Erstellen einer neuen Kombo
 */
export function CreateComboDialog() {
  const { t } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoadingDecks, setIsLoadingDecks] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deckId: '' as string | undefined,
  });

  // Lade Decks beim Öffnen des Dialogs
  useEffect(() => {
    if (open) {
      loadDecks();
    }
  }, [open]);

  async function loadDecks() {
    setIsLoadingDecks(true);
    try {
      const result = await getUserDecks();
      if (result.decks) {
        setDecks(result.decks);
      }
    } catch (err) {
      console.error('Failed to load decks:', err);
    } finally {
      setIsLoadingDecks(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Erstelle Kombo ohne Steps - Steps werden im Editor hinzugefügt
      const result = await createCombo({
        title: formData.title,
        description: formData.description || undefined,
        deckId: formData.deckId || undefined,
        steps: [], // Keine Steps beim Erstellen - werden im Editor hinzugefügt
      });

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      // Erfolg: Dialog schließen und zum Combo-Editor navigieren
      setOpen(false);
      setFormData({ title: '', description: '', deckId: '' });
      if (result.combo) {
        router.push(`/combos/${result.combo.id}`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create combo');
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t('combo.createCombo')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('combo.createCombo')}</DialogTitle>
            <DialogDescription>{t('combo.createDescription')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="combo-title">{t('combo.title')}</Label>
              <Input
                id="combo-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('combo.titlePlaceholder')}
                required
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="combo-description">{t('combo.description')}</Label>
              <Input
                id="combo-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('combo.descriptionPlaceholder')}
                maxLength={2000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="combo-deck">{t('combo.deck')} (Optional)</Label>
              <Select
                value={formData.deckId || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, deckId: value === 'none' ? undefined : value })
                }
                disabled={isLoadingDecks}
              >
                <SelectTrigger id="combo-deck">
                  <SelectValue
                    placeholder={isLoadingDecks ? t('common.loading') : t('combo.selectDeck')}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('combo.noDeck')}</SelectItem>
                  {decks.map((deck) => (
                    <SelectItem key={deck.id} value={deck.id}>
                      {deck.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('common.loading') : t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
