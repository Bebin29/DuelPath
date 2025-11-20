'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/hooks';
import { createDeck } from '@/server/actions/deck.actions';
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

/**
 * Dialog zum Erstellen eines neuen Decks
 */
export function CreateDeckDialog() {
  const { t } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    format: 'TCG' as 'TCG' | 'OCG' | 'Casual',
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await createDeck({
        name: formData.name,
        description: formData.description || undefined,
        format: formData.format,
      });

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      // Erfolg: Dialog schließen und zum Deck-Editor navigieren
      setOpen(false);
      setFormData({ name: '', description: '', format: 'TCG' });
      router.push(`/decks/${result.deck?.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('deck.errors.createFailed'));
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t('deck.createDeck')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('deck.createDeck')}</DialogTitle>
            <DialogDescription>Erstelle ein neues Yu-Gi-Oh! Deck</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="deck-name">{t('deck.deckName')}</Label>
              <Input
                id="deck-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="z.B. Dark Magician Deck"
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deck-description">{t('deck.description')}</Label>
              <Input
                id="deck-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optionale Beschreibung"
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deck-format">{t('deck.format')}</Label>
              <Select
                value={formData.format}
                onValueChange={(value: 'TCG' | 'OCG' | 'Casual') =>
                  setFormData({ ...formData, format: value })
                }
              >
                <SelectTrigger id="deck-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TCG">{t('deck.formatTCG')}</SelectItem>
                  <SelectItem value="OCG">{t('deck.formatOCG')}</SelectItem>
                  <SelectItem value="Casual">{t('deck.formatCasual')}</SelectItem>
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
