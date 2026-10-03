# API

Es gibt drei Wege zum Server. Welcher gilt, hängt davon ab, wer fragt.

| Weg                         | Für wen                        | Anmeldung                 |
| --------------------------- | ------------------------------ | ------------------------- |
| Server Actions              | Die eigene Oberfläche          | Browser-Session           |
| REST-API `/api/v1`          | Agenten, Skripte, andere Tools | Bearer-Token oder Session |
| Interne Routen unter `/api` | Die eigene Oberfläche          | Browser-Session           |

## REST-API `/api/v1`

Die vollständige Beschreibung liefert der Server selbst:

```bash
curl http://localhost:3000/api/v1                 # Einstieg
curl http://localhost:3000/api/v1/openapi.json    # OpenAPI 3.1
```

Die OpenAPI-Datei ist die Quelle der Wahrheit. Sie wird aus `src/server/api/openapi.ts` erzeugt und mit den Routen zusammen geändert. Dieses Dokument erklärt nur, wie die API gedacht ist.

### Anmeldung

Ein persönliches Token in **Einstellungen > API-Tokens** anlegen. Es beginnt mit `dp_` und ist genau einmal sichtbar. Gespeichert wird nur sein SHA-256-Hash.

```bash
curl -H "Authorization: Bearer dp_..." http://localhost:3000/api/v1/decks
```

Ein Token lässt sich auch auf der Kommandozeile anlegen:

```bash
npm run api:token
```

Ohne Token greift die Browser-Session. Das ist praktisch zum Ausprobieren in der Entwicklung.

### Antworten und Fehler

Erfolg steckt immer in `data`:

```json
{ "data": { "id": "...", "title": "..." } }
```

Fehler immer in `error`:

```json
{ "error": { "code": "CONFLICT", "message": "...", "details": {} } }
```

| Code           | HTTP | Bedeutung                                          |
| -------------- | ---- | -------------------------------------------------- |
| `INVALID`      | 400  | Die Eingabe passt nicht zum Schema                 |
| `UNAUTHORIZED` | 401  | Kein gültiges Token und keine Session              |
| `NOT_FOUND`    | 404  | Gibt es nicht, oder gehört einem anderen Nutzer    |
| `CONFLICT`     | 409  | Die `revision` ist veraltet. Neu laden und nochmal |
| `NOT_POSSIBLE` | 422  | Regeln oder Board lassen das nicht zu              |
| `RATE_LIMITED` | 429  | Mehr als 300 Anfragen pro Minute                   |
| `INTERNAL`     | 500  | Fehler auf dem Server                              |

Das Rate-Limit liegt im Arbeitsspeicher des Prozesses. Für lokale Agenten reicht das. Es ersetzt kein Gateway.

### Schutz vor Überschreiben

Schreibende Aufrufe nehmen optional eine `revision`. Passt sie nicht zum gespeicherten Stand, kommt 409 CONFLICT. So überschreibt ein Agent im Hintergrund nicht still die Änderungen, die gerade im Browser gemacht wurden.

### Der übliche Ablauf für einen Agenten

Die API ist so gebaut, dass ein Agent eine Combo Schritt für Schritt bauen kann. Der Server wendet dieselbe Regel-Logik an wie die Werkbank.

1. `GET /decks`, oder `POST /decks` mit einer Kartenliste.
2. `POST /combos` mit `deckId` und `startHand`.
3. `POST /combos/{id}/steps` mit einem Befehl:
   - `ns aluber` normal beschwören
   - `act aluber 1` den ersten Effekt aktivieren
   - `ss albion` spezial beschwören
   - `res` die offene Chain auflösen
   - `o ash` der Gegner unterbricht mit Ash Blossom
   - `end` beenden
4. Nennt die Antwort offene Fragen (`prompts`), dann `POST /combos/{id}/steps/{stepId}/answer` mit einer Wahl aus den Kandidaten.
5. `state.warnings` und `triggers` prüfen und weitermachen. Am Ende `GET /combos/{id}/endboard` und `GET /combos/{id}/stress`.

Jede Antwort auf einen Schritt enthält das Board danach, offene Fragen, ausgelöste Effekte und Warnungen. Der Agent muss den Zustand nicht selbst mitführen.

### Endpunkte

| Pfad                                       | Zweck                             |
| ------------------------------------------ | --------------------------------- |
| `GET /cards`                               | Karten suchen                     |
| `GET POST /decks`                          | Decks auflisten, Deck anlegen     |
| `GET PATCH DELETE /decks/{id}`             | Ein Deck lesen, ändern, löschen   |
| `GET PUT /decks/{id}/roles`                | Rollen der Karten im Deck         |
| `GET /decks/{id}/odds`                     | Quoten für die Starthand          |
| `GET POST /combos`                         | Combos auflisten, Combo anlegen   |
| `GET PATCH DELETE /combos/{id}`            | Eine Combo lesen, ändern, löschen |
| `GET /combos/{id}/state`                   | Zustand an einem Schritt          |
| `GET /combos/{id}/line`                    | Eine Line als Folge von Schritten |
| `GET /combos/{id}/stress`                  | Stresstest einer Line             |
| `GET /combos/{id}/endboard`                | Auswertung des Endboards          |
| `POST /combos/{id}/steps`                  | Einen Schritt anfügen             |
| `PATCH DELETE /combos/{id}/steps/{stepId}` | Einen Schritt ändern oder löschen |
| `POST /combos/{id}/steps/{stepId}/answer`  | Eine offene Frage beantworten     |

Der Abfrageparameter `step` wählt den Schritt. `start` meint die Starthand. Ohne Angabe gilt das Ende der Hauptline.

## Server Actions

Der übliche Weg aus der Oberfläche. Sie liegen in `src/server/actions/` und geben wie die API `{ data }` oder `{ error }` zurück, nie eine geworfene Ausnahme.

| Datei                   | Inhalt                              |
| ----------------------- | ----------------------------------- |
| `auth.ts`               | Registrierung                       |
| `deck.actions.ts`       | Decks, Versionen, Side-Pläne, YDK   |
| `deck-view.actions.ts`  | Deckinhalt für die Anzeige          |
| `combo.actions.ts`      | Combos, Knoten, Bibliothek          |
| `card.actions.ts`       | Karten holen und suchen             |
| `suggestion.actions.ts` | Effektvorschläge über Jev           |
| `settings.actions.ts`   | Nutzereinstellungen                 |
| `api-token.actions.ts`  | API-Tokens anlegen und zurückziehen |
| `palette.actions.ts`    | Daten für die Befehlspalette        |

## Interne Routen

Diese Routen gehören zur Oberfläche und sind nicht für andere Tools gedacht. Sie sind nicht Teil der stabilen API und dürfen sich ändern.

| Route                         | Zweck                                                                  |
| ----------------------------- | ---------------------------------------------------------------------- |
| `GET /api/cards`              | Kartensuche für die Oberfläche, mit Filtern, Seiten und Autocomplete   |
| `GET /api/card-images/[file]` | Bild-Cache. Lädt beim ersten Abruf von YGOPRODeck und legt es lokal ab |
| `POST /api/pending-delete`    | Löschen beim Schliessen des Tabs über `navigator.sendBeacon`           |
| `/api/auth/[...nextauth]`     | NextAuth                                                               |

`GET /api/cards` setzt ETag und `Cache-Control`, damit wiederholte Abrufe derselben Karte nicht erneut die Datenbank treffen.
