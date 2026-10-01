'use client';

import { useState } from 'react';
import { Copy, KeyRound, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { relativeTime } from '@/lib/utils/relative-time';
import { Button } from '@/components/ui/button';
import {
  createApiToken,
  listApiTokens,
  revokeApiToken,
  type ApiTokenInfo,
} from '@/server/actions/api-token.actions';
import { Input } from '@/components/ui/input';

/**
 * API-Tokens für Agenten und Skripte (REST-API unter /api/v1). Das Token erscheint nur einmal
 * nach dem Anlegen; gespeichert ist nur sein Hash.
 */
export function ApiTokenSettings({ initial }: { initial: ApiTokenInfo[] }) {
  const { t, i18n } = useTranslation();
  const [tokens, setTokens] = useState(initial);
  const [name, setName] = useState('');
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = async () => {
    const result = await listApiTokens();
    if (result.data) setTokens(result.data);
  };
  const create = async () => {
    const result = await createApiToken(name || 'Agent');
    if (!result.data) return;
    setFresh(result.data.token);
    setCopied(false);
    setName('');
    await refresh();
  };

  return (
    <section id="api" className="mt-10 max-w-[720px] scroll-mt-20">
      <h2 className="mb-1 font-display text-2xl">{t('settings.api')}</h2>
      <p className="mb-3 text-text-muted">{t('settings.apiText')}</p>

      <div className="flex flex-wrap gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void create()}
          placeholder={t('settings.apiName')}
          aria-label={t('settings.apiName')}
          maxLength={60}
          className="flex-1 basis-48"
        />
        <Button onClick={create}>
          <KeyRound />
          {t('settings.apiCreate')}
        </Button>
      </div>

      {fresh && (
        <div role="status" className="mt-3 rounded-md border border-warning/40 bg-warning-tint p-3">
          <p className="mb-2 text-sm text-warning">{t('settings.apiOnce')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 basis-48 truncate rounded-sm bg-surface-2 px-2 py-1 font-mono text-xs">
              {fresh}
            </code>
            <Button
              variant="line"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(fresh);
                setCopied(true);
              }}
            >
              <Copy />
              {copied ? t('settings.apiCopied') : t('settings.apiCopy')}
            </Button>
          </div>
        </div>
      )}

      <ul className="mt-4 flex flex-col border-t border-line">
        {tokens.length === 0 && (
          <li className="py-3 text-sm text-text-subtle">{t('settings.apiNone')}</li>
        )}
        {tokens.map((token) => (
          <li
            key={token.id}
            className="flex min-h-11 flex-wrap items-center gap-x-3 border-b border-line py-1.5 text-sm"
          >
            <span className="min-w-0 flex-1 basis-32 truncate">{token.name}</span>
            <code className="font-mono text-xs text-text-subtle">{token.prefix}…</code>
            <span className="text-right font-mono text-2xs text-text-subtle sm:w-40">
              {token.lastUsedAt
                ? t('settings.apiUsed', {
                    time: relativeTime(new Date(token.lastUsedAt), new Date(), i18n.language),
                  })
                : t('settings.apiUnused')}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('settings.apiRevoke', { name: token.name })}
              title={t('settings.apiRevoke', { name: token.name })}
              onClick={async () => {
                await revokeApiToken(token.id);
                await refresh();
              }}
            >
              <X />
            </Button>
          </li>
        ))}
      </ul>
      <p className="mt-3 font-mono text-2xs text-text-subtle">{t('settings.apiDocs')}</p>
    </section>
  );
}
