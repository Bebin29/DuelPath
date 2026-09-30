/** YDK-Datei (EDOPro, YGOPRODeck) aus den Deckeinträgen; Karten ohne Passcode fehlen */
export function toYdk(
  entries: { cardId: string; quantity: number; section: 'MAIN' | 'EXTRA' | 'SIDE' }[],
  passcodeOf: (cardId: string) => string | null | undefined
): string {
  const lines = (section: 'MAIN' | 'EXTRA' | 'SIDE') =>
    entries
      .filter((e) => e.section === section)
      .flatMap((e) => {
        const code = passcodeOf(e.cardId);
        return code ? Array<string>(e.quantity).fill(code) : [];
      });
  return [
    '#created by DuelPath',
    '#main',
    ...lines('MAIN'),
    '#extra',
    ...lines('EXTRA'),
    '!side',
    ...lines('SIDE'),
    '',
  ].join('\n');
}
