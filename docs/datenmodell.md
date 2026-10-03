# Datenmodell

Quelle ist `prisma/schema.prisma`. Dieses Dokument erklärt, wofür die Modelle da sind und warum sie so aussehen. Die genauen Felder stehen im Schema.

## Übersicht

```
User ─┬─ Deck ─┬─ DeckCard ── Card
      │        ├─ DeckVersion
      │        └─ Combo
      ├─ Combo ── ComboNode (Baum, Eltern/Kinder)
      ├─ ApiToken
      ├─ Account / Session      (NextAuth)
      └─ settings (JSON)

JevCache                         (ohne Bezug zum Nutzer)
```

## Nutzer und Anmeldung

**`User`** ist der Nutzer. `settings` ist ein JSON-Feld mit den Nutzereinstellungen: Design, Kartensprache, Staples, Abspieltempo, eigene Spitznamen, gesehene Hinweise. Die Form ist in `src/lib/settings.ts` als zod-Schema festgelegt. Als JSON, weil die Einstellungen oft wachsen und eine Spalte je Einstellung jedes Mal eine Migration bedeuten würde.

**`Account`**, **`Session`** und **`VerificationToken`** gehören zu NextAuth. Sie werden nicht von Hand angefasst.

**`ApiToken`** ist ein persönlicher Zugang zur REST-API. Gespeichert wird nur `tokenHash` (SHA-256) und `prefix` zum Wiedererkennen. Das Token selbst wird nie gespeichert. `revokedAt` setzt ein Token ausser Kraft, es wird nicht gelöscht, damit `lastUsedAt` nachvollziehbar bleibt.

## Karten

**`Card`** ist eine TCG-Karte aus dem YGOPRODeck-Import. Ein Nutzer legt keine Karten an; die Tabelle wird nur durch `npm run cards:import` gefüllt.

Felder, die über die reinen Kartendaten hinausgehen:

| Feld              | Zweck                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| `initials`        | Kürzel aus Anfangsbuchstaben für die Suche, zum Beispiel `bewd`        |
| `effects`         | Automatische Zerlegung des Kartentexts in einzelne Effekte             |
| `effectsOverride` | Von Hand geprüfte Zerlegung. Hat Vorrang und bleibt beim Neuimport     |
| `effectsReview`   | Die Zerlegung war unsicher, die Karte soll geprüft werden              |
| `effectsJev`      | Bewertung der Zerlegung durch Jev, 0 bis 1                             |
| `passcode`        | Die ID von YGOPRODeck. Sie ist der Schlüssel nach aussen (YDK, Bilder) |
| `imageUrl`        | Pfad auf den lokalen Bild-Cache, nicht die Adresse bei YGOPRODeck      |
| `banTcg`          | Banlist-Stand: Forbidden, Limited, Semi-Limited oder leer              |
| `tcgDate`         | Erscheinungsdatum im TCG. Karten ohne das Feld werden nicht importiert |

Der `passcode` ist wichtig: Decks, YDK-Dateien, Rollen und Side-Pläne verweisen über den Passcode auf eine Karte, nicht über die interne `id`. Die interne `id` ändert sich bei einem Neuimport, der Passcode nicht.

Gesucht wird nach Name mit ILIKE ohne Trigramm-Index. Bei etwa 14.000 Karten reicht das. Wenn die Suche spürbar langsamer wird, ist ein GIN-Index über `pg_trgm` der nächste Schritt.

## Banlist

**`Banlist`** hält den Stand einer Liste: `key` ist `current` oder `next`, `effectiveOn` sagt, von wann sie ist. Die aktuelle Liste selbst steht weiterhin an den Karten in `banTcg`; der Eintrag `current` kommt beim Kartenimport dazu und trägt nur das Datum. YGOPRODeck nennt kein Datum zur Liste, deshalb gilt der letzte Stand der Kartendatenbank. Er lässt sich in den Einstellungen nachtragen.

**`BanlistCard`** gehört zu `next` und enthält nur die Abweichungen von der aktuellen Liste: `status` ist Forbidden, Limited, Semi-Limited oder Unlimited, und Unlimited gibt eine Karte wieder frei. Was nicht eingetragen ist, bleibt wie auf der aktuellen Liste. Der Deck-Check auf der Deckseite schaltet zwischen beiden Listen um.

## Decks

**`Deck`** gehört einem Nutzer. Zwei Felder sind JSON:

- `roles`: Passcode auf Rolle im Deck, zum Beispiel Starter, Extender, Handtrap. Siehe [domaene.md](domaene.md).
- `sidePlans`: Side-Plan je Matchup und Zugfolge.

**`DeckCard`** verbindet Deck und Karte mit `quantity` und `deckSection` (MAIN, EXTRA, SIDE). Der eindeutige Schlüssel ist `(deckId, cardId, deckSection)`. Dieselbe Karte kann also gleichzeitig im Main und im Side Deck stehen, und das ist auch gewollt.

**`DeckVersion`** ist ein gespeicherter Stand eines Decks zum Vergleichen und Zurückholen. Sie hält die Kartenliste als JSON (`entries`), nicht als Beziehungen. Grund: eine Version ist eine Momentaufnahme und soll sich nicht ändern, wenn das Deck sich ändert.

Die Aufzählungen (MAIN, EXTRA, SIDE) sind Strings und keine Postgres-Enums. Sie werden mit zod validiert. Das spart Migrationen, wenn ein Wert dazukommt.

## Combos

**`Combo`** ist der Kopf. Sie gehört einem Nutzer und optional einem Deck. Wird das Deck gelöscht, bleibt die Combo erhalten (`SetNull`).

- `startState` ist ein JSON mit der Starthand und optional dem Gegnerboard.
- `tags` sind freie Schlagworte wie `1-Card` oder `Going Second`.
- `status` ist DRAFT, TESTED oder TOURNAMENT.
- `revision` steigt mit jedem Speichern. Schreibt ein Client mit einer alten `revision`, antwortet der Server mit 409 CONFLICT. Das verhindert, dass ein Agent im Hintergrund die Änderungen aus dem Browser still überschreibt.

**`ComboNode`** ist ein Schritt im Baum. `parentId` zeigt auf den Elternknoten, `null` ist die Wurzel. `rank` ordnet Geschwister; Rang 0 ist die Hauptline.

| Feld            | Bedeutung                                                                |
| --------------- | ------------------------------------------------------------------------ |
| `kind`          | ACTION, ACTIVATE, OPPONENT, RESOLVE oder END                             |
| `player`        | `self` oder `opponent`                                                   |
| `edgeLabel`     | Beschriftung der Kante, zum Beispiel „Keine Reaktion“ oder „Ash Blossom“ |
| `instanceId`    | Welche Karteninstanz handelt. Nicht die Karte, sondern die Kopie         |
| `effectIndex`   | Welcher Effekt der Karte, Index in die zerlegten Effekte                 |
| `costMoves`     | Kartenbewegungen bei der Aktivierung                                     |
| `resolveMoves`  | Kartenbewegungen beim Auflösen                                           |
| `targets`       | Ziele, bei der Aktivierung gewählt, als Instanz-IDs                      |
| `negates`       | Was dieser Schritt negiert                                               |
| `optOverride`   | Manueller Eingriff in die OPT-Regel                                      |
| `ignoredHits`   | Treffer im Stresstest, die der Nutzer an diesem Schritt entfernt hat     |
| `interruptions` | Endboard: von Hand gesetzte Unterbrechungen, überschreibt die Erkennung  |

Beachte: **es gibt keine Spalte mit dem Spielzustand.** Der Zustand nach einem Schritt wird aus dem Startzustand und allen Knoten auf dem Pfad berechnet. Siehe [architektur.md](architektur.md).

Karteninstanzen (`instanceId`) sind ebenfalls nicht gespeichert, sondern entstehen beim Aufbau des Startzustands aus dem Deck: je Kopie einer Karte eine Instanz. Deshalb lässt sich unterscheiden, welche der drei Kopien gerade auf dem Feld liegt.

## Jev-Cache

**`JevCache`** speichert Antworten von Jev unter dem SHA-256 der Anfrage (Modell, Zustand, Fragen). Gleiche Frage, gleiche Antwort, keine zweiten Kosten. Der Cache lässt sich jederzeit leeren; die Anwendung fragt dann neu.

## Migrationen

Migrationen liegen in `prisma/migrations/` und werden mit `npm run db:migrate` erzeugt und angewendet. Das Schema wird nie von Hand in der Datenbank geändert.
