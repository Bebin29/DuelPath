# Motion-System: Tinte und Rotstift

Live-Prototypen der Bewegungssprache von DuelPath. Sie laufen in pen.dev als Browser-Knoten im Rahmen „Motion-System“ und lassen sich auch direkt im Browser öffnen. Grundlage sind `UX-Plan.md`, `UI-Plan.md` (Abschnitt 4.7) und die Tokens aus `design/DuelPath.pen`.

## Prinzipien

1. **Tinte zeichnet.** Neues entsteht als Strich, der sich zieht: Illustration, Kanten, Häkchen, Unterstriche.
2. **Rotstift korrigiert.** Was der Gegner tut oder wo die Line bricht, markiert die Hand: Kreis, Strich, Stempel, Notiz.
3. **Karten haben Gewicht.** Federn statt Kurven. Karten heben sich, neigen sich im Zug und rasten ein.
4. **Chains lesen sich.** Links stapeln sich sichtbar und lösen rückwärts auf, in der Reihenfolge der Regeln.
5. **Werkzeug ruhig, Ergebnis feiert.** In der Workbench höchstens 250 ms und keine Choreografie. Start, Stresstest und Endboard dürfen inszenieren (UX 12).
6. **Nie allein.** Bewegung ist nie die einzige Rückmeldung. Bei `prefers-reduced-motion` steht sofort der Endzustand.

## Szenen

| Datei                   | Szene                                                 | Fläche    |
| ----------------------- | ----------------------------------------------------- | --------- |
| `01-start.html`         | Illustration zeichnet sich, Wechselwort mit Rotstift  | selten    |
| `02-karte-spielen.html` | Karte ziehen, einrasten, Trigger, Suchziel            | Workbench |
| `03-handtrap.html`      | Ash auf Schritt 2, Branch, Chain rückwärts, Negierung | Workbench |
| `04-stresstest.html`    | Rotstift liest Korrektur, Choke Points, Auswertung    | selten    |
| `05-moduswechsel.html`  | Board ↔ Baum mit denselben Schritten                  | Workbench |
| `06-endboard.html`      | Karten geben, Unterbrecher einkreisen, Vergleich      | selten    |
| `07-aktionsmenue.html`  | Menü wächst aus der Karte                             | Workbench |
| `08-mikro.html`         | Tabs, Speichern, Warnung, Schalter, Rückgängig, Zahl  | überall   |

## Aufbau

- `shared/tokens.css`: Farben, Schriften, Karten, Zonen, Knöpfe, Geister-Cursor.
- `shared/helpers.js`: Bewegungs-Tokens (Dauer, Kurven, Federn) und Helfer: `draw` (Strich ziehen), `write` (Handschrift), `swapText` (Zahl austauschen), `flip`, `cursor` (führt die Bedienung vor), `loop`.
- `shared/illustration.js`: die Illustration „Am Spieltisch“ aus pen.dev, als SVG in Zeichenreihenfolge.
- motion.dev kommt per ESM vom CDN, Schriften von Google Fonts, Kartenbilder aus `design/assets/` (siehe `design/README.md`).

Die Helfer sind klassische Skripte, damit die Seiten auch über `file://` laden.

## Prüfen

`film.mjs` nimmt eine Szene in Echtzeit mit Chrome auf und speichert Screenshots zu festen Zeitpunkten:

```bash
node design/motion/film.mjs "$PWD/design/motion/02-karte-spielen.html" s2 1500,3000,5200
```

In pen.dev laufen Browser-Knoten außerhalb des sichtbaren Bereichs gedrosselt. Für Zeitpunkt-genaue Prüfungen ist `film.mjs` verlässlicher.
