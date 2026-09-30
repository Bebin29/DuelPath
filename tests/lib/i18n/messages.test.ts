// @vitest-environment node
import { describe, it, expect } from 'vitest';
import de from '../../../messages/de.json';
import en from '../../../messages/en.json';

type Messages = { [key: string]: string | Messages };

const entries = (o: Messages, prefix = ''): [string, string][] =>
  Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'string' ? [[prefix + k, v] as [string, string]] : entries(v, `${prefix}${k}.`)
  );

describe('messages', () => {
  it('Deutsch und Englisch haben dieselben Schlüssel', () => {
    const deKeys = entries(de)
      .map(([k]) => k)
      .sort();
    const enKeys = entries(en)
      .map(([k]) => k)
      .sort();
    expect(enKeys).toEqual(deKeys);
  });

  it('Platzhalter nutzen die i18next-Schreibweise {{name}}', () => {
    const single = [...entries(de), ...entries(en)].filter(([, v]) =>
      /(^|[^{])\{\w+\}(?!\})/.test(v)
    );
    expect(single).toEqual([]);
  });
});
