# DuelPath: Projektplan Umbau

Stand: 30.09.2026 · Branch `feat/combo-tree-rebuild`

Dieser Plan beschreibt den Neuaufbau von DuelPath. Die bestehende `Projektplanung.md` bleibt als Grundlage erhalten; einzelne Abschnitte daraus werden nach und nach durch die Entscheidungen hier ersetzt.

## 1. Ziel

DuelPath wird ein Werkzeug, um Yu-Gi-Oh!-Combos als **Baumdiagramm auf einem Canvas** zu planen. Jeder Schritt zeigt den **Gamestate** (Hand, Feld, Friedhof, Verbannt, Deck). An jedem Punkt kann die Combo sich verzweigen, zum Beispiel wenn der Gegner einen Effekt negiert. Beim Bauen schlägt **Jev** aktivierbare Effekte vor.

## 2. Abgrenzung

- **Nur TCG.** OCG und Master Duel entfallen, inklusive Banlist und Kartenpool.
- **Nur lokal.** Kein Hosting, kein Deployment. Datenbank ist PostgreSQL lokal.
- **Keine Regel-Engine.** DuelPath prüft nicht, ob ein Zug regelkonform ist. Der Nutzer beschreibt, was passiert; das System rechnet den Zustand daraus aus und warnt nur bei offensichtlichen Fehlern (verbrauchter OPT, Karte nicht in der Zone).
- **Kein Duellmodus** als eigene Seite. Die Spielfeld-Komponenten werden für die Zustandsansicht weiterverwendet.

## 3. Bestandsaufnahme

**Bleibt:**

- Next.js 16, React 19, TypeScript, Tailwind 4, Radix/shadcn UI
- Prisma (Provider wechselt von SQLite auf PostgreSQL)
- NextAuth mit Prisma-Adapter
- Kartenimport (`card-import.service.ts`) und Kartensuche (`card-search.service.ts`)
- Deckverwaltung (`src/components/deck`, `deck.actions.ts`)
- Spielfeld-Darstellung (`DuelField`, `DuelHand`, `DuelCard`) als Basis für das Zustandspanel
- i18n (Deutsch/Englisch), Vitest

**Entfällt:**

- Duellmodus: `app/(dashboard)/duel`, `DuelBoard`, `DuelPhaseController`, `DuelLog`, `use-duel-*`, `duel.actions.ts`, Modell `Duel`
- Lineares Combo-Modell: `ComboStep`, `ComboVersion`, `ComboTimeline`, `ComboStepEditor`, `ComboStepItem`, `ComboPlayMode`, `ComboVersionHistory`
- Offline-Schicht: `OfflineProvider`, `use-offline-*`, `offline-storage.ts`, `service-worker.ts`
- Monitoring: `PerformanceProvider`, `src/lib/monitoring`
- Nicht mehr genutzte Hooks und Caches, die nur an den obigen Teilen hängen

**Aufräumen:**

- `prisma/dev.db`, `prisma/dev.db-journal` und `prisma/prisma/dev.db` aus Git entfernen
- `src/components/components/ui` nach `src/components/ui` verschieben
- SQLite-spezifische Hilfsspalten (`nameLower`, `typeLower`, ...) durch PostgreSQL-Mittel ersetzen (`mode: 'insensitive'`, `pg_trgm`-Index für die Namenssuche)

## 4. Architektur

### 4.1 Datenbank

PostgreSQL lokal per Docker (`docker compose up -d`), eine `docker-compose.yml` mit einem einzigen Service. `DATABASE_URL` in `.env`.

### 4.2 Kartendatenbank

Quelle bleibt die YGOPRODeck-API (`cardinfo.php?misc=yes`).

- **TCG-Filter:** Nur Karten mit `tcg_date` werden importiert. Banlist aus `banlist_info.ban_tcg`.
- **Effekte zerlegen:** Beim Import wird der Kartentext in einzelne Effekte geteilt und als `effects` (JSON) gespeichert:
  ```ts
  type CardEffect = {
    index: number;
    text: string;
    opt: 'NONE' | 'SOFT' | 'HARD'; // HARD = "of \"<Name>\" once per turn"
    optGroup?: string; // bei "each effect ... once per turn" gemeinsame Gruppe
  };
  ```
  Die Zerlegung ist eine Heuristik über die PSCT-Struktur (Sätze mit `:` und `;`, Klauseln wie „You can only use this effect of … once per turn“). Pro Karte manuell korrigierbar.
- **Bilder lokal:** YGOPRODeck untersagt Hotlinking. Bilder werden einmalig heruntergeladen und unter `public/cards/<passcode>.jpg` abgelegt (nicht in Git).

### 4.3 Combo als Baum

Kernentscheidung: **Der Gamestate wird nicht gespeichert, sondern berechnet.** Jeder Knoten speichert nur die Kartenbewegungen, die er auslöst. Der Zustand an einem Knoten ist der Startzustand plus alle Bewegungen auf dem Pfad von der Wurzel bis dorthin.

```prisma
model Combo {
  id         String      @id @default(cuid())
  title      String
  userId     String
  deckId     String?
  startState Json        // Starthand, optional vorbelegtes Feld
  nodes      ComboNode[]
}

model ComboNode {
  id          String      @id @default(cuid())
  comboId     String
  parentId    String?     // null = Wurzel
  kind        String      // ACTION | OPPONENT | END
  edgeLabel   String?     // "Keine Reaktion", "Ash Blossom", ...
  cardId      String?
  effectIndex Int?
  moves       Json        // CardMove[]
  note        String?
  combo       Combo       @relation(fields: [comboId], references: [id], onDelete: Cascade)
  parent      ComboNode?  @relation("Tree", fields: [parentId], references: [id], onDelete: Cascade)
  children    ComboNode[] @relation("Tree")
}
```

```ts
type Zone = 'HAND' | 'DECK' | 'EXTRA' | 'MONSTER' | 'SPELL_TRAP' | 'FIELD' | 'GY' | 'BANISHED';
type CardMove = { instanceId: string; from: Zone; to: Zone; slot?: number; position?: CardPosition };

function stateAt(combo: Combo, nodeId: string): GameState; // reine Funktion, voll getestet
```

**Knotentypen:**

| Typ | Bedeutung | Kinder |
|---|---|---|
| `ACTION` | eigener Schritt: Karte, Effekt, Bewegungen | nächster Schritt oder `OPPONENT` |
| `OPPONENT` | Verzweigungspunkt: Gegner kann reagieren | ein Kind pro Eventualität, beschriftet über `edgeLabel` |
| `END` | Endboard | keine |

Gegnerische Reaktionen (Ash Blossom, Imperm, Nibiru, ...) sind normale Knoten mit Bewegungen, zum Beispiel „Ash Blossom: Hand → Friedhof“ beim Gegner und „Effekt von X wird negiert“ als Markierung. Der Gamestate kennt dafür auch die Gegnerseite.

**Once per Turn:** `GameState` führt `usedEffects` mit (Kartenname + Effektindex bzw. `optGroup`). `stateAt` trägt jeden Effekt ein, der auf dem Pfad aktiviert wurde. Ein negierter Effekt gilt je nach Kartentext trotzdem als verbraucht; das ist die Voreinstellung und pro Knoten umschaltbar.

### 4.4 Canvas

- **React Flow (`@xyflow/react` v12)** für Canvas, Zoom, Pan, Minimap und eigene Knoten-Komponenten
- **`@dagrejs/dagre`** für das automatische Baumlayout (Top-down). Kein manuelles Positionieren nötig; Layout wird bei jeder Änderung neu berechnet.
- Eigene Knoten: Kartenbild, Kartenname, Effekt-Kurztext, OPT-Warnung. `OPPONENT`-Knoten optisch abgesetzt.

**Layout des Editors:**

```
┌──────────────────────────────────┬───────────────────────┐
│                                  │  Zustand am Knoten    │
│        Baum (React Flow)         │  Gegner: Feld / GY    │
│                                  │  ───────────────────  │
│                                  │  Eigenes Feld         │
│                                  │  Hand · GY · Banished │
├──────────────────────────────────┴───────────────────────┤
│  Vorschläge (Jev): aktivierbare Effekte für diesen Knoten │
└───────────────────────────────────────────────────────────┘
```

Klick auf einen Knoten setzt das Zustandspanel auf `stateAt(combo, node)`. Neuer Schritt: Effekt aus den Vorschlägen wählen oder frei eine Karte suchen, dann Bewegungen per Drag & Drop im Zustandspanel festlegen.

### 4.5 Effektvorschläge mit Jev

Zugang über **OpenRouter**, Modell `typesafe/jev-1.13` (fest gepinnt, nicht `~typesafe/jev-latest`, damit sich das Verhalten nicht unbemerkt ändert). Jev läuft über die **Decisions API** (`POST https://openrouter.ai/api/alpha/decisions`), nicht über den Chat-Endpunkt; das OpenAI-SDK funktioniert dafür nicht. Kontextfenster 32k Tokens, abgerechnet werden nur Input-Tokens.

**Ablauf pro Knoten:**

1. **Vorfilter ohne Jev.** Kandidaten sind Effekte von Karten in Hand, Feld, Friedhof und Verbannt. Effekte mit verbrauchtem OPT fallen raus.
2. **Eine Anfrage pro Knoten.** `state` = kompakt serialisierter Gamestate, `questions` = je Kandidat ein `noul` („Kann Effekt n von Karte X in diesem Zustand aktiviert werden?“ plus Effekttext). Alle Kandidaten in einer Anfrage spart Input-Tokens, weil der State nur einmal gesendet wird.
3. **Schwellwert.** Vorschlag nur bei Wahrscheinlichkeit ≥ 0,8 (einstellbar), sortiert nach Wahrscheinlichkeit.
4. **Cache.** Antworten werden über einen Hash aus State und Kandidaten zwischengespeichert (Tabelle `JevCache`).
5. **Nur serverseitig.** Aufruf über eine Server Action, `OPENROUTER_API_KEY` bleibt auf dem Server. Ohne Key läuft der Editor normal weiter, nur ohne Vorschläge.

**Qualitätsprüfung:** Vor dem Einschalten ein Testset aus etwa 30 bekannten Situationen (State, Effekt, erwartetes Ja/Nein) anlegen und Trefferquote sowie sinnvollen Schwellwert messen. Die Leistungsangaben stammen vom Hersteller und sind unabhängig noch nicht bestätigt.

## 5. Meilensteine

| # | Inhalt | Fertig, wenn |
|---|---|---|
| **M0** | Aufräumen: Entfallendes löschen, `dev.db` aus Git, UI-Ordner verschieben, Abhängigkeiten aktualisieren | `npm run build`, `lint`, `test` grün |
| **M1** | PostgreSQL per Docker, Prisma-Provider umstellen, Migrationen neu anlegen | App startet gegen lokales Postgres |
| **M2** | Kartenimport nur TCG, Effektzerlegung mit OPT-Erkennung, lokale Bilder | alle TCG-Karten mit `effects` in der DB, Suche funktioniert |
| **M3** | Combo-Schema, `GameState`, `stateAt` inklusive OPT-Tracking | Unit-Tests für Bewegungen, Verzweigungen, OPT grün |
| **M4** | Canvas: React Flow, dagre-Layout, eigene Knoten, Zustandspanel | Combo mit Verzweigung anlegen, speichern, Zustand pro Knoten sichtbar |
| **M5** | Gegner-Knoten: Handtrap-Auswahl, Negierung, Zweige beschriften | Combo mit „Keine Reaktion“ und „Ash Blossom“-Zweig darstellbar |
| **M6** | Jev: Server Action, Vorfilter, Cache, Testset, Schwellwert | Vorschläge erscheinen im Editor, Trefferquote dokumentiert |
| **M7** | Deck-Anbindung: Combo einem Deck zuordnen, Starthand aus dem Deck wählen | Combo aus einem Deck heraus starten |

## 6. Risiken

| Risiko | Umgang |
|---|---|
| Effektzerlegung aus dem Kartentext ist ungenau | Heuristik plus manuelle Korrektur pro Karte; später Jev als `choice` zur Zuordnung |
| Jev ist Early Access, API als `alpha` markiert | Integration in einer einzigen Datei kapseln, Modell-ID pinnen, Editor funktioniert auch ohne |
| Jev-Trefferquote reicht nicht | Testset vor dem Einschalten, Schwellwert anheben oder Vorschläge nur als Hinweis zeigen |
| Bewegungen per Hand erfassen ist mühsam | häufige Muster als Schnellaktionen (Suchen, Beschwören, Senden, Verbannen) |

## 7. Offen

- Welche Handtraps stehen in der Schnellauswahl für Gegner-Knoten? Vorschlag: aus den aktuellen TCG-Staples fest hinterlegt, erweiterbar.
- Sollen Combos später teilbar sein (Export als Bild oder Link)? Aktuell nicht geplant.
