'use client';

import { useRef, useState } from 'react';
import { FileUp } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { detectFormat } from '@/lib/deck/import-text';

/**
 * Deck importieren: ydke-Link, YGOPRODeck-URL, YDK-Inhalt oder eine eingefügte Kartenliste,
 * alternativ eine YDK-Datei. `onImport` liefert einen Fehlerschlüssel oder null bei Erfolg.
 */
export function ImportDeckDialog({
  open,
  onOpenChange,
  onImport,
  replaces,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (text: string) => Promise<string | null>;
  /** Hinweis, dass der Import das jetzige Deck ersetzt */
  replaces?: boolean;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const format = text.trim() ? detectFormat(text) : null;

  const submit = async (value: string) => {
    setBusy(true);
    setError(null);
    const problem = await onImport(value);
    setBusy(false);
    if (problem) setError(problem);
    else {
      setText('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-1 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">
            {t('decks.import.title')}
          </DialogTitle>
          <DialogDescription className="text-text-muted">
            {t('decks.import.text')}
            {replaces && ` ${t('decks.import.replaces')}`}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) void submit(text);
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={9}
            maxLength={50000}
            spellCheck={false}
            aria-label={t('decks.import.field')}
            placeholder={
              'ydke://…\nhttps://ygoprodeck.com/deck/…\n\n3 Crystal Beast Sapphire Pegasus\n3 Crystal Bond\nExtra Deck\n1 Rainbow Overdragon'
            }
            className="min-h-40 rounded-md border border-line bg-transparent p-2.5 font-mono text-xs outline-none focus-visible:border-line-strong"
          />
          <p className="min-h-4 font-mono text-2xs text-text-subtle" aria-live="polite">
            {error ? (
              <span className="text-warning">{t(`decks.import.error.${error}`)}</span>
            ) : (
              format && t(`decks.import.format.${format}`)
            )}
          </p>
          <DialogFooter className="items-center gap-2 sm:justify-between">
            <input
              ref={fileRef}
              type="file"
              accept=".ydk,text/plain"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) await submit(await file.text());
              }}
            />
            <Button
              type="button"
              variant="text"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              <FileUp />
              {t('decks.import.file')}
            </Button>
            <Button type="submit" disabled={busy || !text.trim()}>
              {t('decks.import.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
