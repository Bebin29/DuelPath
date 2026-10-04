import { describe, expect, it } from 'vitest';
import {
  detectFormat,
  parseDeckList,
  parseYdke,
  parseYgoprodeckHtml,
  toYdke,
  ygoprodeckSlug,
} from '@/lib/deck/import-text';

// Mit Python (struct.pack('<I')) unabhängig erzeugt
const LINK = 'ydke://ryPeAK8j3gCjPGwA!17SNBQ==!PqRxAQ==!';

describe('detectFormat', () => {
  it('erkennt alle vier Formate', () => {
    expect(detectFormat(`  ${LINK}\n`)).toBe('ydke');
    expect(detectFormat('https://ygoprodeck.com/deck/mitsurugi-clown-crew-735999')).toBe('url');
    expect(detectFormat('#created by EDOPro\n#main\n14558127')).toBe('ydk');
    expect(detectFormat('3 Ash Blossom & Joyous Spring')).toBe('list');
  });

  it('nimmt nur YGOPRODeck-Deckseiten als URL', () => {
    expect(ygoprodeckSlug('https://www.ygoprodeck.com/deck/abc-123/')).toBe('abc-123');
    expect(ygoprodeckSlug('https://ygoprodeck.com.evil.example/deck/abc')).toBeNull();
    expect(ygoprodeckSlug('https://ygoprodeck.com/deck/../../admin')).toBeNull();
  });
});

describe('parseYdke', () => {
  it('liest Passcodes als 32-Bit little endian', () => {
    expect(parseYdke(LINK)).toEqual({
      main: ['14558127', '14558127', '7093411'],
      extra: ['93172951'],
      side: ['24224830'],
    });
  });

  it('schreibt denselben Link zurück und lehnt kaputte ab', () => {
    expect(toYdke(parseYdke(LINK)!)).toBe(LINK);
    expect(parseYdke('ydke://abc!')).toBeNull();
    expect(parseYdke('ydke://AAA!!!')).toBeNull();
  });
});

describe('parseYgoprodeckHtml', () => {
  it('liest die eingebetteten Listen', () => {
    const html = `<script>var maindeckjs = '["14558127","14558127"]';
      var extradeckjs = '["93172951"]';
      var sidedeckjs = '[]';</script>`;
    expect(parseYgoprodeckHtml(html)).toEqual({
      main: ['14558127', '14558127'],
      extra: ['93172951'],
      side: [],
    });
    expect(parseYgoprodeckHtml('<html>keine Liste</html>')).toBeNull();
  });
});

describe('parseDeckList', () => {
  it('liest Anzahlen vorne und hinten und wechselt bei Überschriften den Bereich', () => {
    const text = `Monster (6)
3 Crystal Beast Sapphire Pegasus
- 2x Crystal Bond
Link Spider
Trap Hole x2
7 Colored Fish

Extra Deck: 15
Number 41: Bagooska the Terribly Tired Tapir
Side
1 Evenly Matched`;
    expect(parseDeckList(text)).toEqual({
      main: [
        { name: 'Crystal Beast Sapphire Pegasus', quantity: 3 },
        { name: 'Crystal Bond', quantity: 2 },
        { name: 'Link Spider', quantity: 1 },
        { name: 'Trap Hole', quantity: 2 },
        { name: '7 Colored Fish', quantity: 1 },
      ],
      extra: [{ name: 'Number 41: Bagooska the Terribly Tired Tapir', quantity: 1 }],
      side: [{ name: 'Evenly Matched', quantity: 1 }],
    });
  });
});
