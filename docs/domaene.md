# Begriffe

Dieses Dokument erklärt die Fachbegriffe, die im Code und in den Plänen vorkommen. Wer Yu-Gi-Oh! kennt, überspringt den ersten Teil.

## Grundhaltung

Zwei Regeln ziehen sich durch die ganze Anwendung:

1. **Die App verbietet nichts, sie sagt es.** Ein Deck mit 38 Karten lässt sich speichern. Es gibt einen Hinweis, keine Sperre. Dasselbe gilt für Regelverstösse in einer Combo: sie werden als Warnung gemeldet.
2. **Was nicht sicher ist, wird nicht behauptet.** Die Zerlegung von Kartentexten ist eine Heuristik. Unsichere Fälle werden markiert, nicht geraten.

## Combo

Eine **Combo** ist eine Zugfolge, die zu einem bestimmten Endboard führt. In DuelPath ist sie ein **Baum**, keine Liste.

**Schritt** (`ComboNode`): eine einzelne Handlung. Ein Monster normal beschwören, einen Effekt aktivieren, eine Chain auflösen, oder eine Reaktion des Gegners.

**Line**: ein Pfad durch den Baum, von der Wurzel bis zu einem Knoten und danach immer über das erste Kind weiter. Das erste Kind ist das mit dem kleinsten Rang. Die Line mit lauter Rang 0 ist die **Hauptline**.

**Branch**: eine Abzweigung. Sie entsteht, wenn es ab einem Schritt mehr als eine Fortsetzung gibt, zum Beispiel „Gegner reagiert nicht“ und „Gegner aktiviert Ash Blossom“.

**Startzustand**: Starthand und optional das Board des Gegners. Alles andere wird daraus berechnet.

**Karteninstanz** (`instanceId`): eine einzelne Kopie einer Karte. Drei Kopien derselben Karte im Deck sind drei Instanzen. Nur so lässt sich sagen, welche davon gerade auf dem Feld liegt und welche noch im Deck steckt.

**Endboard**: das Feld am Ende einer Line, ausgewertet nach Unterbrechungen auf Feld und Hand, verbliebenen Ressourcen und bezahlten Kosten.

## Regelbegriffe

**PSCT** (Problem-Solving Card Text): die genormte Sprache der englischen Kartentexte. Semikolon, Doppelpunkt und Wortstellung haben feste Bedeutungen. Darum ist der englische Text die Grundlage für die Effektzerlegung und nicht der deutsche.

**OPT** (once per turn): eine Beschränkung, wie oft ein Effekt in einem Zug genutzt werden darf. Unterschieden werden:

- **Soft OPT**: „You can only use this effect of [Name] once per turn.“ Gilt je Karteninstanz.
- **Hard OPT** (HOPT): „You can only use this effect once per turn.“ Gilt für alle Kopien zusammen.
- **Card OPT**: „You can only activate 1 [Name] per turn.“

Die Unterscheidung steht in `src/lib/cards/effects.ts` und wird beim Berechnen des Zustands geprüft.

**Chain**: Die Reihenfolge, in der aktivierte Effekte auflösen. Zuletzt aktiviert löst zuerst auf. Ein `RESOLVE`-Schritt löst die offene Chain auf.

**Spell Speed**: bestimmt, worauf man antworten darf. Wichtig für die Frage, ob eine Reaktion an dieser Stelle überhaupt legal ist.

**Negierung**: ein Effekt, eine Aktivierung, eine Beschwörung oder eine ganze Karte wird aufgehoben. Welche Art gemeint ist, steht am Knoten in `negates`.

**Handtrap**: eine Karte, die der Gegner von der Hand aus nutzt, um den Zug zu stören. Ash Blossom, Effect Veiler, Nibiru, Infinite Impermanence.

**Staple**: eine Karte, die in sehr vielen Decks steckt. In DuelPath ist die Staple-Liste die Grundlage des Stresstests. Sie lässt sich in den Einstellungen ändern.

**Banlist**: die Liste beschränkter Karten. Forbidden ist 0 Kopien, Limited 1, Semi-Limited 2. Die aktuelle Liste steht an der Karte in `banTcg`; von wann sie ist, sagt der Eintrag `current` in `Banlist`. Daneben darf eine zweite Liste stehen, `next`, in die nur die angekündigten Änderungen eingetragen werden. Der Deck-Check nennt den Stand und schaltet zwischen beiden Listen um.

Die kuratierten Regel-Mechaniken mit Quellenangabe stehen in `src/lib/rulings/mechanics.ts`. Die Recherche dahinter liegt in [research/rulings.md](research/rulings.md). Jede Mechanik ist dort markiert, wie weit sie sich berechnen lässt: `yes` rechnet die Zustandslogik direkt, `partial` nur teilweise, `no` geht nur als Kontext an Jev.

## Werkzeuge der Werkbank

**Stresstest**: Prüft, welche Staples welchen Schritt einer Line treffen. Zuerst deterministisch aus Kartentext und Zustand, unsichere Fälle gehen an Jev. Standardtiefe ist eine Unterbrechung; eine Line, in der der Gegner schon reagiert hat, wird nicht nochmal geprüft. Einzelne Treffer lassen sich an einem Schritt entfernen, wenn sie nicht stimmen (`ignoredHits`).

**Wirkungsmuster**: Das Muster, das `src/lib/combo/effect-results.ts` im Kartentext erkennt. Daraus entsteht die Frage in der Schrittleiste: „Was hast du gesucht?“, „Was hast du beschworen?“. Wenn kein Muster passt, bleibt die freie Bewegung am Board.

**Ziel** (target): Bei PSCT wird das Ziel vor dem Semikolon gewählt, also bei der Aktivierung. Beim Auflösen wird geprüft, ob es noch gültig ist. Hat die Karte den Ort gewechselt, ist sie kein gültiges Ziel mehr. Was mit dem Ziel geschieht, steht hinter dem Semikolon.

**Befehlszeile**: Eingabe in Strg+K statt Klicken. `ns aluber` beschwört normal, `act aluber 1` aktiviert den ersten Effekt, `ss albion` beschwört spezial, `res` löst die Chain auf, `o ash` lässt den Gegner mit Ash Blossom unterbrechen, `end` beendet.

## Deckbau

**Rolle**: Jede Karte im Deck bekommt genau eine Rolle. Genau eine, damit die Rollen das Deck sauber aufteilen und die Quoten exakt bleiben. Die Rollen sind:

| Rolle      | Bedeutung                                                          |
| ---------- | ------------------------------------------------------------------ |
| `starter`  | Startet allein eine Combo                                          |
| `extender` | Führt eine begonnene Combo weiter                                  |
| `handtrap` | Stört den Zug des Gegners                                          |
| `breaker`  | Bricht ein fertiges Board des Gegners, zum Beispiel Evenly Matched |
| `garnet`   | Soll im Deck bleiben und nicht in der Starthand liegen             |
| `other`    | Alles andere                                                       |

Die App schlägt Rollen vor: Starter aus 1-Card-Combos, Extender aus grösseren Starthänden, Breaker aus einer gepflegten Liste. Die Breaker-Liste steht in den Einstellungen und lässt sich wie die Staples ändern; ohne eigene Liste gilt die Standardliste aus `src/lib/deck/roles.ts`. Die Zuordnung bleibt Sache des Nutzers.

**Quoten**: Wahrscheinlichkeiten für die Starthand, hypergeometrisch berechnet über Klassen von Karten (`src/lib/deck/odds.ts`). Exakt gerechnet, nicht simuliert. Darum springen die Zahlen nicht und eine Änderung am Deck zeigt sofort ihre Wirkung.

**Hand-Tester**: zieht echte Hände aus dem Main Deck, sucht passende Combos und schätzt über viele Hände, wie gut das Deck abgedeckt ist. Hier wird simuliert, weil es um konkrete Hände geht.

**Übungsmodus**: zehn Zufallshände hintereinander, die der Nutzer selbst an der Werkbank spielt. Gezogen wird nur, wozu es eine gespeicherte Line gibt; welche das ist, bleibt bis zur Auswertung verborgen. Danach steht das erreichte Endboard neben dem besten bekannten Ende der Line, dazu die fehlenden Karten und die gebrauchte Zeit. Anforderungen und Endboard stammen immer aus demselben Pfad. Vorbilder benötigen kein Startboard und ihre eingesetzten Karten müssen in ausreichender Zahl im aktuellen Main/Extra Deck vorhanden sein. Unbenutzte Handkarten des Vorbilds werden durch die zusätzlichen Karten der Zufallshand ersetzt, sodass Handtraps allein keinen Fortschritt ergeben. Beide Seiten zählen automatisch erkannte Unterbrechungen ohne manuelle Korrektur. Ein Lauf wird nicht gespeichert: geübt wird gegen die eigene Line, nicht gegen eine Bestenliste.

**Version**: ein gespeicherter Stand eines Decks. Zwei Versionen lassen sich vergleichen, eine ältere lässt sich zurückholen.

**Side-Plan**: je Matchup und Zugfolge, welche Karten aus dem Side Deck hinein und welche aus dem Main Deck heraus gehen. Gespeichert am Deck.

**Going first / going second**: ob man den ersten oder zweiten Zug hat. Das ändert, welche Karten gut sind: going first zählen Starter, going second zählen Breaker.

**YDK**: das Deck-Dateiformat von EDOPro und YGOPRODeck. Eine Liste von Passcodes. Karten ohne Passcode fehlen beim Export.

## Jev

Jev ist ein Modell, das typisierte Fragen mit Wahrscheinlichkeiten beantwortet statt mit Text. Es wird nur dort eingesetzt, wo die Regel-Logik nicht sicher entscheiden kann: welcher Effekt jetzt legal ist, ob eine Effektzerlegung plausibel ist, und unsichere Fälle im Stresstest. Jev entscheidet nichts allein; seine Antwort ist ein Vorschlag mit einer Wahrscheinlichkeit.
