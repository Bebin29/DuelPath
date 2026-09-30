# DuelPath: Projektplan Umbau

Stand: 30.09.2026 · Branch `feat/combo-tree-rebuild`

Dieser Plan beschreibt den Neuaufbau von DuelPath. Die bestehende `Projektplanung.md` bleibt als Grundlage erhalten; einzelne Abschnitte daraus werden nach und nach durch die Entscheidungen hier ersetzt.

## 1. Ziel

DuelPath wird ein Werkzeug, um Yu-Gi-Oh!-Combos als **Baumdiagramm auf einem Canvas** zu planen. Jeder Schritt zeigt den **Gamestate** (Hand, Feld, Friedhof, Verbannt, Deck, offene Chain). An jedem Punkt kann die Combo sich verzweigen, zum Beispiel wenn der Gegner einen Effekt negiert. Beim Bauen schlägt **Jev** aktivierbare Effekte vor.

## 2. Abgrenzung

- **Nur TCG.** OCG und Master Duel entfallen, inklusive Banlist und Kartenpool.
- **Nur lokal.** Kein Hosting, kein Deployment. Datenbank ist PostgreSQL lokal.
- **Ein Zug pro Combo.** Eine Combo deckt genau einen eigenen Zug ab. Kein Zugwechsel, kein Phasenmodell über den Zug hinaus.
- **Keine vollständige Regel-Engine.** DuelPath prüft nicht jeden Zug auf Legalität. Eindeutige Mechaniken (OPT, Negierungsarten, Chain-Auflösung) werden berechnet; alles andere beschreibt der Nutzer.
- **Kein Duellmodus** als eigene Seite. Die alten Spielfeld-Komponenten sind entfernt; das Zustandspanel wird in M5 neu auf `GameState` gebaut (Vorlage in der Git-Historie).
- **Auth bleibt.** NextAuth bleibt unverändert, damit ein späteres Hosting ohne Umbau möglich ist.

## 3. Bestandsaufnahme

**Bleibt:**

- Next.js 16, React 19, TypeScript, Tailwind 4, Radix/shadcn UI
- Prisma (Provider wechselt von SQLite auf PostgreSQL, Upgrade von Prisma 5 auf 7 in M1)
- NextAuth mit Prisma-Adapter
- Kartenimport (`card-import.service.ts`) und Kartensuche (`card-search.service.ts`)
- Deckverwaltung (`src/components/deck`, `deck.actions.ts`)
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

PostgreSQL 18 lokal per Docker (`npm run db:up`), eine `docker-compose.yml` mit einem einzigen Service auf Port 5433 (5432 ist lokal oft belegt). Prisma 7 mit `@prisma/adapter-pg`, Client wird nach `src/generated/prisma` erzeugt, Konfiguration in `prisma.config.ts`. `DATABASE_URL`, `AUTH_SECRET` und `OPENROUTER_API_KEY` in `.env`, Vorlage in `.env.example`.

### 4.2 Kartendatenbank

Quelle bleibt die YGOPRODeck-API (`cardinfo.php?misc=yes`).

- **TCG-Filter:** Nur Karten mit `tcg_date` werden importiert. Banlist aus `banlist_info.ban_tcg`.
- **Sprache:** Englisch ist die Grundlage für Effektzerlegung, Rulings und Jev. Deutsche Namen und Texte werden zusätzlich importiert (`language=de`, Spalten `nameDe`, `descDe`) und sind in der Anzeige umschaltbar.
- **Effekte zerlegen:** Beim Import wird der englische Kartentext in `src/lib/cards/effects.ts` in einzelne Effekte geteilt und als `effects` (JSON, `ParsedEffects`) gespeichert:
  ```ts
  type CardEffect = {
    index: number;
    section?: 'pendulum' | 'monster';
    text: string;
    activated: boolean; // Chain Link; sonst Continuous Effect o. ä.
    opt?: {
      kind: 'SOFT' | 'HARD';
      wording: 'use' | 'activate' | 'activateCard' | 'apply' | 'shared';
      per: 'turn' | 'duel';
      limit: number; // twice/thrice per turn
      group?: string; // gemeinsamer Zähler, z. B. Maxx "C"
    };
    patterns: PatternKey[]; // erkannte PSCT-Muster aus src/lib/rulings/mechanics.ts
  };
  ```
  Die Zerlegung ist eine Heuristik über die PSCT-Struktur (Sätze mit `:` und `;`, OPT-Klauseln, Aufzählungen, Pendel-Abschnitte, Materialzeilen). Karten, bei denen der Parser unsicher ist, bekommen `effectsReview = true`; nach dem ersten Import waren das 259 von 14.135 Karten (1,8 %), fast alle mit altem Kartentext ohne Doppelpunkt und Semikolon.
- **Jev prüft mit:** `npm run cards:check-effects` fragt pro Karte per `noul`, ob die Zerlegung plausibel ist, und speichert die Bewertung in `effectsJev`. Zur manuellen Prüfung gehören Karten mit `effectsReview` oder `effectsJev < 0,3`. Die Schwelle stammt aus einem Test mit 20 Karten und absichtlich verfälschten Zerlegungen (korrekt im Schnitt 0,66, zusammengelegt 0,25, zerteilt 0,08). Eine Zählfrage („wie viele Effekte?“) war unzuverlässig, weil Jev Materialzeilen mitzählt. Manuelle Korrekturen kommen, sobald es eine Oberfläche dafür gibt.
- **Bilder lokal:** YGOPRODeck untersagt Hotlinking. `/api/card-images/<passcode>.jpg` (bzw. `_small.jpg`) lädt ein Bild beim ersten Abruf herunter und legt es in `CARD_IMAGE_DIR` ab, standardmäßig `~/.duelpath/card-images`. Alle Bilder vorab zu laden wären über 1 GB, die OneDrive sonst mitsynchronisieren würde.

### 4.3 Combo als Baum

Kernentscheidung: **Der Gamestate wird nicht gespeichert, sondern berechnet.** Jeder Knoten speichert nur, was er auslöst. Der Zustand an einem Knoten ist der Startzustand plus alle Knoten auf dem Pfad von der Wurzel bis dorthin.

```prisma
model Combo {
  id         String      @id @default(cuid())
  title      String
  userId     String
  deckId     String?
  startState Json        // Starthand, optional Gegnerboard
  nodes      ComboNode[]
}

model ComboNode {
  id           String      @id @default(cuid())
  comboId      String
  parentId     String?     // null = Wurzel
  kind         String      // ACTION | ACTIVATE | OPPONENT | RESOLVE | END
  player       String      // SELF | OPPONENT
  edgeLabel    String?     // "Keine Reaktion", "Ash Blossom", ...
  cardId       String?
  effectIndex  Int?
  costMoves    Json        // CardMove[], bei Aktivierung
  resolveMoves Json        // CardMove[], bei Auflösung
  negates      Json?       // { nodeId, type: 'ACTIVATION' | 'EFFECT' | 'SUMMON' }
  optOverride  Boolean?    // manueller Eingriff, falls die Regel nicht passt
  note         String?
  combo        Combo       @relation(fields: [comboId], references: [id], onDelete: Cascade)
  parent       ComboNode?  @relation("Tree", fields: [parentId], references: [id], onDelete: Cascade)
  children     ComboNode[] @relation("Tree")
}
```

```ts
type Zone = 'HAND' | 'DECK' | 'EXTRA' | 'MONSTER' | 'SPELL_TRAP' | 'FIELD' | 'GY' | 'BANISHED';
type CardMove = {
  instanceId: string;
  from: Zone;
  to: Zone;
  slot?: number;
  position?: CardPosition;
};

type GameState = {
  self: PlayerState;
  opponent: PlayerState;
  chain: ChainLink[]; // offene Chain, CL1 zuerst
  usedEffects: OptUsage[]; // für OPT-Tracking
  normalSummonUsed: boolean;
};

function stateAt(combo: Combo, nodeId: string): GameState; // reine Funktion, voll getestet
```

**Knotentypen:**

| Typ        | Bedeutung                                                                            | Wirkung in `stateAt`                                                             |
| ---------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `ACTION`   | Handlung ohne Chain: Normal Summon, Special Summon per Beschwörungsverfahren, Setzen | `resolveMoves` sofort anwenden                                                   |
| `ACTIVATE` | Effekt aktivieren, bildet einen Chain Link                                           | `costMoves` sofort, Link auf die Chain legen, OPT eintragen                      |
| `OPPONENT` | Verzweigungspunkt: Gegner kann reagieren                                             | keine; Kinder sind die Eventualitäten, beschriftet über `edgeLabel`              |
| `RESOLVE`  | Chain wird aufgelöst                                                                 | Links rückwärts auflösen, `resolveMoves` je Link, negierte Links gemäß `negates` |
| `END`      | Endboard                                                                             | keine                                                                            |

**Chains explizit:** Aktivierungen stapeln sich als Chain Links (CL1, CL2, ...), bis ein `RESOLVE`-Knoten kommt. Auf dem Canvas wird eine offene Chain als Gruppe dargestellt. Gegnerische Reaktionen (Ash Blossom, Imperm, Nibiru, ...) sind `ACTIVATE`-Knoten mit `player = OPPONENT` und `negates`.

**Negierungsarten und OPT:** Ob ein OPT verbraucht ist, hängt davon ab, ob die Aktivierung, der Effekt oder die Beschwörung negiert wurde, und von der OPT-Formulierung (Beispiel: Solemn Judgment negiert die Beschwörung, der On-Summon-Effekt wurde nie aktiviert und bleibt nach einer weiteren Beschwörung verfügbar). Die Regeln dafür stammen aus `RULING_MECHANICS` (Abschnitt 4.6). `optOverride` erlaubt pro Knoten den manuellen Eingriff.

**Startzustand:** Starthand wird aus dem zugeordneten Deck gewählt, ohne Deck über die freie Kartensuche. Für Going Second kann das Gegnerboard vorbelegt werden.

### 4.4 Canvas

- **React Flow (`@xyflow/react` v12)** für Canvas, Zoom, Pan, Minimap und eigene Knoten-Komponenten
- **`@dagrejs/dagre`** für das automatische Baumlayout (Top-down). Kein manuelles Positionieren nötig; Layout wird bei jeder Änderung neu berechnet.
- Eigene Knoten: Kartenbild, Kartenname, Effekt-Kurztext, OPT-Warnung, Chain-Link-Nummer. `OPPONENT`-Knoten und gegnerische Aktivierungen optisch abgesetzt, offene Chains als Gruppe.

**Layout des Editors:**

```
┌──────────────────────────────────┬───────────────────────┐
│                                  │  Zustand am Knoten    │
│        Baum (React Flow)         │  Gegner: Feld / GY    │
│                                  │  Chain: CL1, CL2, ... │
│                                  │  ───────────────────  │
│                                  │  Eigenes Feld         │
│                                  │  Hand · GY · Banished │
├──────────────────────────────────┴───────────────────────┤
│  Vorschläge (Jev): aktivierbare Effekte für diesen Knoten │
└───────────────────────────────────────────────────────────┘
```

**Eingabe eines Schritts:**

1. Effekt aus den Vorschlägen wählen oder frei eine Karte suchen.
2. Bewegungen über **Schnellaktionen** festlegen (Suchen, Beschwören, Senden, Verbannen, Abwerfen, Zurück ins Deck).
3. Alles, was die Schnellaktionen nicht abdecken, per **Drag & Drop** im Zustandspanel.

**Gegnerreaktionen:** Am `OPPONENT`-Knoten gibt es eine Schnellauswahl gängiger TCG-Handtraps und Unterbrechungen (`src/lib/staples.ts`, fest hinterlegt, erweiterbar) und zusätzlich die freie Kartensuche.

### 4.5 Effektvorschläge mit Jev

Zugang über **OpenRouter**, Modell `typesafe/jev-1.13-20260917` (fest gepinnt, nicht `~typesafe/jev-latest`, damit sich das Verhalten nicht unbemerkt ändert; per `JEV_MODEL` überschreibbar). Eine Anfrage dauert etwa 0,6 Sekunden und kostet etwa 0,00003 US-Dollar. Jev läuft über die **Decisions API** (`POST https://openrouter.ai/api/alpha/decisions`), nicht über den Chat-Endpunkt; das OpenAI-SDK funktioniert dafür nicht. Kontextfenster 32k Tokens, abgerechnet werden nur Input-Tokens.

Jev wird an zwei Stellen genutzt: zur Prüfung der Effektzerlegung (4.2) und im Editor für Vorschläge. Beide Aufrufe laufen über dieselbe Datei `src/server/jev.ts`. Erfahrung aus der Zerlegungsprüfung: konkrete Ja/Nein-Fragen mit klaren Kriterien funktionieren, Zählfragen nicht; Absolutwerte streuen stark, daher Schwellen immer an einem Testset festlegen.

**Ablauf pro Knoten:**

1. **Vorfilter ohne Jev.** Kandidaten sind Effekte von Karten in Hand, Feld, Friedhof und Verbannt. Effekte mit verbrauchtem OPT fallen raus, ebenso Effekte, deren Spell Speed nicht zur offenen Chain passt.
2. **Eine Anfrage pro Knoten.** `state` = kompakt serialisierter Gamestate plus relevante Ruling-Hinweise der Kandidaten, `questions` = je Kandidat ein `noul` („Kann Effekt n von Karte X in diesem Zustand aktiviert werden?“ plus Effekttext). Alle Kandidaten in einer Anfrage spart Input-Tokens, weil der State nur einmal gesendet wird.
3. **Schwellwert.** Vorschläge unter 0,8 (einstellbar) werden ausgeblendet, der Rest nach Wahrscheinlichkeit sortiert.
4. **Cache.** Antworten werden über einen Hash aus State und Kandidaten zwischengespeichert (Tabelle `JevCache`).
5. **Nur serverseitig.** `OPENROUTER_API_KEY` bleibt auf dem Server. Ohne Key läuft der Editor normal weiter, nur ohne Vorschläge.

**Qualitätsprüfung:** Vor dem Einschalten ein Testset aus etwa 30 bekannten Situationen (State, Effekt, erwartetes Ja/Nein) anlegen und Trefferquote sowie sinnvollen Schwellwert messen. Die Leistungsangaben stammen vom Hersteller und sind unabhängig noch nicht bestätigt.

### 4.6 Rulings

Kuratierte Liste der **allgemeinen Mechaniken**, keine kartenbezogenen Einzelrulings. Grundlage ist die Recherche in `docs/research/rulings.md`.

Die Mechaniken liegen als typisierte Konstante in `src/lib/rulings/mechanics.ts`, nicht als Datenbanktabelle: Die Daten sind statisch, werden im Repo versioniert und von `stateAt` und der Jev-Anbindung direkt gelesen. Dort liegen auch die PSCT-Erkennungsmuster (`PATTERNS`, `detectPatterns`), die der Kartenimport in M3 nutzt.

```ts
interface RulingMechanic {
  key: string; // z. B. "NEGATE_ACTIVATION", "OPT_HARD_USE"
  category: 'negation' | 'opt' | 'cost' | 'trigger' | 'chain' | 'summon' | 'text';
  description: string;
  deterministic: 'yes' | 'partial' | 'no'; // no = nur Jev-Kontext
  opt?: string;
  cost?: string;
  card?: string;
  trigger?: string; // Auswirkungen
  detect: Detect[]; // Muster-Keys oder engine | cardType | context
  notes?: string; // Unsicherheiten
}
```

- **Deterministische Mechaniken** rechnet `stateAt` direkt. Die wichtigsten aus der Recherche:
  - **Aktivierung negiert:** Kosten bleiben bezahlt. OPT mit „use“ und „Once per turn:“ ist verbraucht, OPT mit „activate“ (auch „activate 1 X per turn“) nicht.
  - **Effekt negiert:** OPT ist in jeder Formulierung verbraucht, weil die Aktivierung erfolgreich war. Continuous- und Field-Karten bleiben liegen.
  - **Beschwörung negiert:** „If Summoned“-Trigger entstehen nicht. Eine negierte Normal Summon verbraucht trotzdem die Normal Summon des Zuges.
  - **Hard OPT** gilt pro Spieler und Kartenname und überlebt das Verlassen des Feldes. **Soft OPT** gilt pro Kopie und setzt sich bei Ortswechsel oder Verdecken zurück. `GameState` braucht dafür pro Karteninstanz einen Zähler für Ortswechsel.
  - **Trigger im TCG** verfallen, wenn die Karte vor dem Aufbau der Chain ihren Ort wechselt (Regel-Update 2021).
- **Nicht deterministische Mechaniken** gehen als kurzer Hinweistext in die Jev-Anfrage, ebenso alle Stellen, die die Recherche als unsicher markiert.
- Ein Test prüft, dass die 41 Einträge exakt der Tabelle in `docs/research/rulings.md` entsprechen und alle Erkennungsmuster existieren.

## 5. Meilensteine

| #      | Inhalt                                                                                                                                       | Fertig, wenn                                                                           |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **M0** | Aufräumen: Entfallendes löschen, `dev.db` aus Git, UI-Ordner verschieben, Abhängigkeiten aktualisieren (**erledigt**)                        | `npm run build`, `lint`, `test` grün                                                   |
| **M1** | PostgreSQL per Docker, Prisma 7 und Provider umstellen, Migrationen neu anlegen (**erledigt**)                                               | App startet gegen lokales Postgres                                                     |
| **M2** | `RULING_MECHANICS` und PSCT-Muster aus `docs/research/rulings.md` übernehmen (**erledigt**)                                                  | alle Mechaniken aus der Recherche im Code, Test grün                                   |
| **M3** | Kartenimport nur TCG, deutsche Texte, Effektzerlegung mit OPT-Erkennung, Jev-Client, Jev-Prüfung der Zerlegung, lokale Bilder (**erledigt**) | alle TCG-Karten mit `effects` in der DB, unsichere Karten markiert, Suche funktioniert |
| **M4** | Combo-Schema, `GameState`, `stateAt` mit Chains, Negierungsarten und OPT-Tracking                                                            | Unit-Tests für Bewegungen, Chains, Negierungen, OPT grün                               |
| **M5** | Canvas: React Flow, dagre-Layout, eigene Knoten, Chain-Gruppen, Zustandspanel, Schnellaktionen, Drag & Drop                                  | Combo mit Chain und Verzweigung anlegen, speichern, Zustand pro Knoten sichtbar        |
| **M6** | Gegner-Knoten: Staple-Liste, freie Suche, Gegnerboard im Startzustand                                                                        | Combo mit „Keine Reaktion“- und „Ash Blossom“-Zweig darstellbar                        |
| **M7** | Jev-Vorschläge: Vorfilter, Anfrage pro Knoten, Cache, Testset, Schwellwert                                                                   | Vorschläge erscheinen im Editor, Trefferquote dokumentiert                             |
| **M8** | Deck-Anbindung: Combo einem Deck zuordnen, Starthand aus dem Deck wählen, YDK-Import fertigstellen (bisher nur ein Platzhalter)              | Combo aus einem Deck heraus starten                                                    |

## 6. Risiken

| Risiko                                                   | Umgang                                                                                       |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Effektzerlegung aus dem Kartentext ist ungenau           | Heuristik, Jev-Prüfung, manuelle Korrektur pro Karte                                         |
| Ruling-Sonderfälle passen nicht in allgemeine Mechaniken | `optOverride` pro Knoten, Hinweistext an Jev, Tabelle bei Bedarf erweitern                   |
| Explizite Chains machen die Eingabe umständlich          | `RESOLVE` automatisch vorschlagen, sobald niemand mehr reagiert                              |
| Jev ist Early Access, API als `alpha` markiert           | Integration in einer einzigen Datei kapseln, Modell-ID pinnen, Editor funktioniert auch ohne |
| Jev-Trefferquote reicht nicht                            | Testset vor dem Einschalten, Schwellwert anheben                                             |

## 7. Entscheidungen

| Frage                  | Entscheidung                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zugumfang              | ein eigener Zug pro Combo                                                                                                                                                                                                                                                                                                                                                                                                         |
| Auth                   | bleibt                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Gegnerreaktionen       | Staple-Liste plus freie Suche. Handtraps: Ash Blossom, Imperm, Nibiru, Veiler, Ghost Belle, Ghost Ogre, Ghost Mourner, Droll, D.D. Crow, PSY-Framegear Gamma, Mulcharmy Fuwalos, Mulcharmy Purulia, Dimension Shifter. Feld: Solemn Judgment, Solemn Strike, Solemn Warning, Skill Drain, Evenly Matched. Eigene Seite: Called by the Grave, Crossout Designator, Forbidden Droplet. Verbotene Karten fallen über `ban_tcg` raus. |
| Eingabe der Bewegungen | Schnellaktionen plus Drag & Drop                                                                                                                                                                                                                                                                                                                                                                                                  |
| Starthand              | aus dem Deck wählen                                                                                                                                                                                                                                                                                                                                                                                                               |
| Going Second           | Gegnerboard im Startzustand möglich                                                                                                                                                                                                                                                                                                                                                                                               |
| Jev unter Schwellwert  | ausblenden                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Chains                 | explizit mit Chain Links                                                                                                                                                                                                                                                                                                                                                                                                          |
| OPT bei Negierung      | abhängig von Negierungsart und Formulierung, Regeln aus `RULING_MECHANICS`                                                                                                                                                                                                                                                                                                                                                        |
| Rulings                | allgemeine Mechaniken kuratiert; deterministisch im Code, sonst Jev-Kontext                                                                                                                                                                                                                                                                                                                                                       |
| Effektzerlegung        | Heuristik, Jev prüft mit                                                                                                                                                                                                                                                                                                                                                                                                          |
| Kartensprache          | Englisch, Deutsch umschaltbar                                                                                                                                                                                                                                                                                                                                                                                                     |
| Extras                 | deutsche Kartentexte; kein Bildexport, kein JSON-Export, kein Abspielmodus                                                                                                                                                                                                                                                                                                                                                        |

## 8. Offen

- Unsichere Rulings aus der Recherche: Gelten „the turn you activate“-Einschränkungen auch bei negierter Aktivierung? Endet die Negierung durch Imperm oder Veiler, wenn das Monster das Feld verlässt? Viele Detail-Rulings stammen aus der OCG-Datenbank. Diese Fälle laufen vorerst als Jev-Kontext und über `optOverride`.
