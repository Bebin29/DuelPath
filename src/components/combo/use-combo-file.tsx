'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/hooks';
import { downloadFile } from '@/lib/utils/deck.utils';
import { Button } from '@/components/ui/button';
import {
  PORTABLE_MAX_BYTES,
  cardRefsOf,
  type PortableWarning,
  type PortableCombo,
} from '@/lib/combo/portable';
import { exportCombo, importCombo, type ImportError } from '@/server/actions/combo.actions';

/** Dateiname aus dem Titel: nichts, was ein Dateisystem stört */
export function comboFileName(title: string): string {
  const base = title
    .trim()
    .replace(/[^\p{L}\p{N} _-]+/gu, '')
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return `${base || 'combo'}.json`;
}

type Notice =
  | {
      id: number;
      kind: 'imported';
      comboId: string;
      missing: string[];
      warnings: PortableWarning[];
    }
  | { id: number; kind: 'error'; message: string }
  | { id: number; kind: 'exported'; names: string[] };

/**
 * Combos als JSON sichern und einlesen (UX-Plan 7.2). Bibliothek und Workbench benutzen dasselbe:
 * einen versteckten Dateiwähler und einen schließbaren Importbericht.
 *
 * Der Import legt immer eine neue Combo an, nie in eine bestehende hinein. Gewechselt wird nicht
 * von selbst — der Hinweis bietet das Öffnen an, damit ungesicherte Änderungen nicht untergehen.
 * `onImported` ist für Listen, die sich danach nachladen müssen.
 */
export function useComboFile(onImported?: (comboId: string) => void) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const fail = (message: string) => setNotice({ id: Date.now(), kind: 'error', message });

  const message = (error: ImportError): string =>
    error.code === 'version'
      ? t('combo.file.error.version', { version: error.version })
      : error.code === 'invalid'
        ? t('combo.file.error.invalid', { detail: error.detail })
        : t(`combo.file.error.${error.code}`);

  const save = async (comboId: string, title: string, snapshot?: PortableCombo) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = snapshot ? { data: snapshot } : await exportCombo(comboId);
      if (!result.data) return fail(t('combo.file.error.denied'));
      const names = [
        ...new Set(
          cardRefsOf(result.data)
            .filter((c) => !c.passcode)
            .map((c) => c.name)
        ),
      ];
      let contents = JSON.stringify(result.data, null, 2);
      if (new TextEncoder().encode(contents).length > PORTABLE_MAX_BYTES)
        contents = JSON.stringify(result.data);
      if (new TextEncoder().encode(contents).length > PORTABLE_MAX_BYTES)
        return fail(t('combo.file.error.size'));
      downloadFile(contents, comboFileName(title), 'application/json');
      if (names.length) setNotice({ id: Date.now(), kind: 'exported', names });
    } catch {
      fail(t('combo.file.error.request'));
    } finally {
      setBusy(false);
    }
  };

  const read = async (file: File) => {
    if (busy) return;
    if (file.size > PORTABLE_MAX_BYTES) return fail(t('combo.file.error.size'));
    setBusy(true);
    try {
      let json: unknown;
      try {
        json = JSON.parse(await file.text());
      } catch {
        return fail(t('combo.file.error.format'));
      }
      const result = await importCombo(json);
      if (result.error) return fail(message(result.error));
      setNotice({
        id: Date.now(),
        kind: 'imported',
        comboId: result.data.id,
        missing: result.data.missing.map((c) => c.name),
        warnings: result.data.warnings,
      });
      onImported?.(result.data.id);
    } catch {
      fail(t('combo.file.error.request'));
    } finally {
      setBusy(false);
    }
  };

  return {
    /** Combo herunterladen */
    exportCombo: save,
    /** Dateiwähler öffnen */
    pick: () => {
      if (!busy) fileRef.current?.click();
    },
    /** Gehört einmal in den Baum, zusammen mit `noticeNode` */
    input: (
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void read(file);
          e.target.value = '';
        }}
      />
    ),
    noticeNode: notice && (
      <div
        key={notice.id}
        role="status"
        className="fixed bottom-6 left-1/2 z-50 w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-line bg-surface-2 p-4 shadow-[0_18px_40px_rgb(0_0_0/0.45)]"
      >
        <p className="break-words text-sm">
          {notice.kind === 'error'
            ? notice.message
            : notice.kind === 'exported'
              ? t('combo.file.noPasscode', { names: notice.names.join(', ') })
              : t('combo.file.imported')}
        </p>
        {notice.kind === 'imported' && notice.missing.length > 0 && (
          <p className="mt-2 break-words text-sm">
            {t('combo.file.missing', {
              count: notice.missing.length,
              names: notice.missing.join(', '),
            })}
          </p>
        )}
        {notice.kind === 'imported' && notice.warnings.some((w) => w.code === 'effects') && (
          <ul className="my-2 max-h-48 overflow-auto break-words text-sm">
            {notice.warnings
              .filter((w) => w.code === 'effects')
              .map((w) => (
                <li key={w.nodeId}>
                  <Link className="underline" href={`/combos/${notice.comboId}?step=${w.nodeId}`}>
                    {t('combo.file.effectDiff', { step: w.step, name: w.card.name })}
                  </Link>
                </li>
              ))}
          </ul>
        )}
        {notice.kind === 'imported' && (
          <Button asChild variant="text" size="sm">
            <Link href={`/combos/${notice.comboId}`}>{t('start.open')}</Link>
          </Button>
        )}
        <Button variant="text" size="sm" onClick={() => setNotice(null)}>
          {t('workbench.close')}
        </Button>
      </div>
    ),
  };
}
