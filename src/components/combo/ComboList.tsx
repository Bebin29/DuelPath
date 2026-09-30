'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n/hooks';
import { createCombo, deleteCombo } from '@/server/actions/combo.actions';

interface ComboSummary {
  id: string;
  title: string;
  updatedAt: Date;
  deckName: string | null;
}

export function ComboList({ combos }: { combos: ComboSummary[] }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createCombo(title);
    if (!result.data) return setError(result.error ?? '');
    router.push(`/combos/${result.data.id}`);
  };

  const remove = async (id: string) => {
    if (!confirm(t('combo.confirmDelete'))) return;
    await deleteCombo(id);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-3xl font-bold">{t('combo.title')}</h1>
        <p className="text-muted-foreground">{t('combo.subtitle')}</p>
      </div>

      <form onSubmit={create} className="flex max-w-lg gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('combo.titlePlaceholder')}
          required
        />
        <Button type="submit">{t('combo.create')}</Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {combos.length === 0 ? (
        <p className="text-muted-foreground">{t('combo.empty')}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {combos.map((combo) => (
            <li key={combo.id} className="flex items-center justify-between gap-2 p-3">
              <Link href={`/combos/${combo.id}`} className="min-w-0 flex-1 hover:underline">
                <div className="truncate font-medium">{combo.title}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(combo.updatedAt).toLocaleString(i18n.language)}
                  {combo.deckName && ` · ${combo.deckName}`}
                </div>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove(combo.id)}
                title={t('combo.delete')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
