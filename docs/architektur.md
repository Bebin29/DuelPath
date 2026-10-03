# Architektur

DuelPath ist eine Next.js-Anwendung mit App Router. Server und Browser teilen sich denselben TypeScript-Code. Die Daten liegen in PostgreSQL, der Zugriff läuft über Prisma.

## Schichten

```
app/                Routen und Seiten (Server Components)
src/components/     React-Komponenten (Oberfläche)
src/server/actions/ Server Actions, der übliche Weg vom Browser zum Server
src/server/api/     REST-API /api/v1 für Agenten und Skripte
src/server/services/Datenzugriff und externe Dienste
src/lib/            Fachlogik ohne Datenbank und ohne React
prisma/             Schema, Migrationen, Skripte
```

Die wichtigste Regel: **`src/lib/` kennt weder Prisma noch das Netz.** Dort stehen reine Funktionen. Deshalb sind sie leicht zu testen, und dieselbe Regel-Logik läuft im Browser und auf dem Server. Alles, was eine Datenbank oder einen externen Dienst braucht, steht in `src/server/`.

## Routen der Oberfläche

| Route          | Gruppe        | Inhalt                                                     |
| -------------- | ------------- | ---------------------------------------------------------- |
| `/`            | `(dashboard)` | Startseite für angemeldete Nutzer, zuletzt genutzte Combos |
| `/decks`       | `(dashboard)` | Liste der Decks                                            |
| `/decks/[id]`  | `(dashboard)` | Deckseite mit Tabs: Liste, Quoten, Side, Combos, Hand      |
| `/combos`      | `(dashboard)` | Bibliothek aller Combos mit Filtern in der Adresse         |
| `/combos/new`  | `(dashboard)` | Neue Combo anlegen                                         |
| `/combos/[id]` | `(workbench)` | Werkbank: Combo bauen, lesen und abspielen                 |
| `/settings`    | `(dashboard)` | Einstellungen: Design, Spitznamen, Staples, Boardbreaker, API-Tokens |
| `/auth/signin` | `auth`        | Anmelden                                                   |
| `/auth/signup` | `auth`        | Registrieren                                               |
| `/dev/ui`      | -             | Musterbibliothek der Komponenten, nur für Entwicklung      |

Die Werkbank hat eine eigene Route-Gruppe, weil sie ein anderes Layout braucht als das Dashboard. Sie nutzt die volle Bildschirmfläche.

Zustand, der zu einer Ansicht gehört, steht in der Adresse: der Tab einer Deckseite, die Filter der Bibliothek, der gewählte Schritt in der Werkbank. Ein Link öffnet damit genau diese Ansicht.

## Vom Klick zur Datenbank

Der übliche Weg ist eine Server Action:

```
Komponente → src/server/actions/*.ts → src/server/services/*.ts → Prisma → PostgreSQL
```

Die Server Actions prüfen die Anmeldung und validieren die Eingabe mit zod (`src/lib/validations/`). Sie geben immer `{ data }` oder `{ error }` zurück, nie eine geworfene Ausnahme.

Daneben gibt es die REST-API unter `/api/v1`. Sie nutzt dieselben Services, ist aber für Agenten und Skripte gedacht und braucht ein persönliches Token. Siehe [api.md](api.md).

Lesen im Browser läuft über SWR (`src/lib/swr-config.ts`). SWR fasst gleiche Anfragen zusammen und zeigt alte Daten weiter an, während neue geladen werden.

## Der Combo-Baum und der berechnete Zustand

Das ist der Kern der Anwendung und der Punkt, an dem sich DuelPath von einer Schritt-Liste unterscheidet.

Eine Combo ist ein **Baum** aus `ComboNode`. Jeder Knoten ist ein Schritt: beschwören, aktivieren, auflösen, eine Reaktion des Gegners. Verzweigungen sind kein Sonderfall, sondern der Normalfall. So lässt sich festhalten, was passiert, wenn der Gegner mit Ash Blossom unterbricht.

**Der Spielzustand wird nicht gespeichert.** `stateAt` in `src/lib/combo/state.ts` berechnet ihn aus dem Startzustand und allen Knoten auf dem Pfad von der Wurzel bis zum gewählten Knoten. Das hat Folgen, die man kennen muss:

- Ein geänderter Knoten ändert sofort alle Schritte danach. Es gibt keine veralteten Kopien.
- Die Datenbank bleibt klein und die Migrationen einfach.
- Die Regel-Logik muss schnell sein, weil sie bei jedem Schrittwechsel neu läuft.

Was die Regeln nicht eindeutig entscheiden können, wird als **Warnung** gemeldet und nicht verboten. Die App sagt dem Nutzer, was auffällt, und lässt ihn weitermachen.

Die Module dazu:

| Datei                             | Aufgabe                                                     |
| --------------------------------- | ----------------------------------------------------------- |
| `src/lib/combo/state.ts`          | Spielzustand berechnen, Regeln anwenden, Warnungen melden   |
| `src/lib/combo/tree.ts`           | Knoten anlegen, Baum verwalten                              |
| `src/lib/combo/lines.ts`          | Lines und Branches aus dem Baum ableiten                    |
| `src/lib/combo/board.ts`          | Feste Plätze auf dem Spielfeld                              |
| `src/lib/combo/play.ts`           | Aus einem Handgriff am Board wird ein Knoten                |
| `src/lib/combo/command.ts`        | Befehlszeile, zum Beispiel `ns aluber` oder `act ash 2`     |
| `src/lib/combo/targets.ts`        | Ziele eines Effekts aus dem Kartentext lesen und prüfen     |
| `src/lib/combo/effect-results.ts` | Wirkungsmuster: welche Frage die Schrittleiste stellen muss |
| `src/lib/combo/endboard.ts`       | Endboard auswerten: Unterbrechungen, Ressourcen, Kosten     |
| `src/lib/combo/stress.ts`         | Stresstest: welche Staples treffen welchen Schritt          |
| `src/lib/combo/suggestions.ts`    | Vorschläge, welcher Effekt jetzt legal ist                  |
| `src/lib/combo/summary.ts`        | Kennzahlen einer Combo für Bibliothek und Startseite        |
| `src/lib/rulings/mechanics.ts`    | Kuratierte Regel-Mechaniken, Quelle für OPT und Negierungen |

## Karten

Die Kartendatenbank kommt von YGOPRODeck und wird lokal gehalten (`src/server/services/card-import.service.ts`). Nur TCG-Karten, OCG-only wird übersprungen. Der Import holt englische und deutsche Texte.

Beim Import zerlegt `src/lib/cards/effects.ts` den englischen Kartentext (PSCT) in einzelne Effekte und ordnet die OPT-Klauseln zu. Das ist eine Heuristik. Unsichere Fälle setzen `effectsReview`. Eine von Hand geprüfte Korrektur steht in `effectsOverride` und bleibt beim Neuimport erhalten.

Kartenbilder werden nicht direkt von YGOPRODeck eingebunden, weil das nicht erlaubt ist. `/api/card-images/<passcode>.jpg` lädt ein Bild beim ersten Abruf und legt es in `CARD_IMAGE_DIR` ab, standardmässig `~/.duelpath/card-images` ausserhalb des Repositorys.

Die Suche findet Karten über Name, deutschen Namen, Kürzel aus Anfangsbuchstaben (`bewd`) und gepflegte Spitznamen der Community (`src/lib/cards/nicknames.ts`). Nutzer können eigene Spitznamen in den Einstellungen anlegen.

## Jev

Jev ist ein Modell von TypeSafe, das über die OpenRouter Decisions API angesprochen wird. Es beantwortet typisierte Fragen mit Wahrscheinlichkeiten statt mit Text. Alle Aufrufe laufen über `src/server/jev.ts`, der Schlüssel bleibt auf dem Server.

Jev wird nur dort genutzt, wo die deterministische Logik nicht ausreicht:

- Vorschläge, welcher Effekt in einem Zustand legal ist (`suggestion.service.ts`)
- Prüfung, ob eine Effektzerlegung plausibel ist (`effect-check.service.ts`)
- Unsichere Fälle im Stresstest

Antworten werden in `JevCache` zwischengespeichert, damit dieselbe Frage nur einmal kostet. Ohne `OPENROUTER_API_KEY` läuft die Anwendung weiter, nur diese Funktionen fehlen.

## Anmeldung

NextAuth v5 mit Prisma-Adapter. Zurzeit gibt es nur E-Mail und Passwort (bcrypt). OAuth-Anbieter lassen sich später ergänzen. Die Konfiguration steht in `src/lib/auth/config.ts`.

Für die REST-API gibt es persönliche Tokens mit dem Präfix `dp_`. Gespeichert wird nur der SHA-256-Hash; das Token selbst sieht der Nutzer genau einmal beim Anlegen (`src/server/api/tokens.ts`).

## Oberfläche

- Tailwind CSS 4 und shadcn/ui auf Radix UI. Die Basis-Komponenten liegen in `src/components/ui/`.
- Design dunkel oder hell. Die Wahl liegt in einem Cookie, damit der Server sie beim ersten Rendern kennt und nichts aufblitzt (`src/lib/theme.ts`).
- Oberflächensprache Deutsch oder Englisch über i18next, Texte in `messages/de.json` und `messages/en.json`.
- Die Kartensprache ist davon unabhängig und standardmässig Englisch, weil Community, Turniere und PSCT englisch sind.
- Der Combo-Baum wird mit React Flow (`@xyflow/react`) gezeichnet, die Anordnung kommt von Dagre.
- Bewegung über `motion`. Lange Listen über `@tanstack/react-virtual`.
- Strg+K öffnet die Befehlspalette. Alle Tastenkürzel stehen in `src/lib/shortcuts.ts` und erscheinen in der Tastaturhilfe.
