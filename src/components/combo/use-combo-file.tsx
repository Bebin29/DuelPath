'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/hooks';
import { downloadFile } from '@/lib/utils/deck.utils';
import { Button } from '@/components/ui/button';
import { TimedNotice } from '@/components/ui/timed-notice';
import { exportCombo, importCombo, type ImportError } from '@/server/actions/combo.actions';

const NOTICE_MS = 8000;

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
  | { id: number; kind: 'imported'; comboId: string; missing: string[] }
  | { id: number; kind: 'error'; message: string };

/**
 * Combos als JSON sichern und einlesen (UX-Plan 7.2). Bibliothek und Workbench benutzen dasselbe:
 * einen versteckten Dateiwähler und einen Hinweis, der von selbst wieder geht.
 *
 * Der Import legt immer eine neue Combo an, nie in eine bestehende hinein. Gewechselt wird nicht
 * von selbst — der Hinweis bietet das Öffnen an, damit ungesicherte Änderungen nicht untergehen.
 * `onImported` ist für Listen, die sich danach nachladen müssen.
 */
export function useComboFile(onImported?: (comboId: string) => void) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const fail = (message: string) => setNotice({ id: Date.now(), kind: 'error', message });

  const message = (error: ImportError): string =>
    error.code === 'version'
      ? t('combo.file.error.version', { version: error.version })
      : error.code === 'invalid'
        ? t('combo.file.error.invalid', { detail: error.detail })
        : t(`combo.file.error.${error.code}`);

  const save = async (comboId: string, title: string) => {
    const result = await exportCombo(comboId);
    if (!result.data) return fail(t('combo.file.error.denied'));
    downloadFile(JSON.stringify(result.data, null, 2), comboFileName(title), 'application/json');
  };

  const read = async (file: File) => {
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
    });
    onImported?.(result.data.id);
  };

  return {
    /** Combo herunterladen */
    exportCombo: save,
    /** Dateiwähler öffnen */
    pick: () => fileRef.current?.click(),
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
      <TimedNotice
        key={notice.id}
        duration={NOTICE_MS}
        onExpire={() => setNotice(null)}
        className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 shadow-[0_18px_40px_rgb(0_0_0/0.45)]"
      >
        <span className="mr-2 text-sm">
          {notice.kind === 'error'
            ? notice.message
            : notice.missing.length === 0
              ? t('combo.file.imported')
              : `${t('combo.file.imported')} · ${t('combo.file.missing', {
                  count: notice.missing.length,
                  names: notice.missing.join(', '),
                })}`}
        </span>
        {notice.kind === 'imported' && (
          <Button asChild variant="text" size="sm">
            <Link href={`/combos/${notice.comboId}`}>{t('start.open')}</Link>
          </Button>
        )}
      </TimedNotice>
    ),
  };
}
