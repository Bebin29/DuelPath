# DuelPath: UI-Sweep und Plan für Mobil und Feinschliff

Stand 1. Oktober 2026. Grundlage sind UX-Plan und UI-Plan; dieser Plan ergänzt sie um das, was ein Durchgang durch die fertige Oberfläche gezeigt hat.

## 1. Vorgehen

- **Seiten:** Start, Combos (Bibliothek), Neue Combo mit Starthand-Auswahl, Decks, Deckseite mit den Tabs Deckliste, Combos und Hand-Tester, Einstellungen, Workbench im Board- und Baum-Modus, Anmelden, Registrieren, eine unbekannte URL (404).
- **Zustände der Workbench:** Starthand, Endboard gewählt, Stresstest an, Befehlspalette, Tastaturhilfe, Vergleich, Kartenansicht, helles Design.
- **Breiten:** Desktop 1440 × 900, kompakt 1280 × 800, Tablet 820 × 1180 und Handy 390 × 844. Tablet und Handy wurden mit Touch-Emulation geprüft.
- **Messung je Seite:** Breite des Dokuments gegenüber dem Fenster, Tippflächen unter 32 px und Text unter 12 px. Dazu kamen ganzseitige Screenshots, die jeweils als Ganzes betrachtet wurden.
- **Code:** Die Komponenten nutzen fast keine Breakpoints. In `workbench`, `decks`, `library`, `settings`, `combo` und `common` steht keine einzige responsive Klasse. Alle 27 Treffer verteilen sich auf `ui`, `cards`, `start` und `dev`.

## 2. Gesamtbild

**Desktop ab 1440 px** ist stimmig. Stil D trägt, die Seiten sind ruhig, Workbench, Stresstest, Vergleich und Befehlspalette wirken fertig. Die Schwächen sind hier Feinschliff: Hinweise liegen über dem Board, der Startzustand im Inspector wirkt wie ein Werkzeug für Entwickler, und der Baum ist zu blass.

**Kompakt mit 1280 px** bricht die Workbench. Die Zonen des Boards überlappen sich, weil das Board feste Breiten hat und die Line-Liste nicht wie im UI-Plan 6.2 vorgesehen zum Overlay wird.

**Tablet mit 820 px:**

- Die Verwaltungsseiten funktionieren größtenteils.
- In der Bibliothek verschwindet die Spalte „Titel“, deshalb kann man die Combos nicht unterscheiden.
- Die Workbench zeigt nur „Für die Workbench bitte mindestens 1280 px breit“ und bietet keinen Weg zurück.

**Handy mit 390 px** ist derzeit nicht nutzbar:

- Die Kopfzeile ist rund 700 px breit, deshalb werden alle Verwaltungsseiten 525 bis 804 px breit. Der Browser zoomt heraus oder scrollt seitlich.
- Darin drücken Flex-Zeilen Inhalte auf null Breite: Der Deckname verschwindet, Kennzahlen stehen ein Wort pro Zeile, und Karten liegen übereinander.

**Kurz:** Der Desktop braucht Feinschliff, ab 1280 px abwärts fehlt die Responsivität als Ganzes. Laut UX-Plan war die mobile Lese- und Nachspielansicht „nach UX-6“ geplant; dieser Punkt ist jetzt erreicht.

## 3. Befunde je Seite

Schwere: **A** = blockiert die Nutzung, **B** = deutlich störend, **C** = Feinschliff.

### 3.1 Kopfzeile (alle Verwaltungsseiten)

| Breite | Befund                                                                                                                                                                                         | Schwere |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Handy  | Logo, drei Bereiche, Suchfeld mit fester Breite (`w-64`), Nutzermenü und `px-8` ergeben rund 700 px. Das Suchfeld bricht über drei Zeilen, der Knopf des Nutzermenüs wird auf 8 px gequetscht. | A       |
| Handy  | `main` hat `px-8`, auf 390 px gehen 64 px an Rand verloren.                                                                                                                                    | B       |
| alle   | Der Next-Dev-Indikator „N“ unten links liegt über Inhalt und über der Minimap im Baum. Er erscheint nur in der Entwicklung, stört aber beim Prüfen.                                            | C       |

### 3.2 Start

| Breite  | Befund                                                                                                                                                    | Schwere |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Desktop | Unter der ersten Bildschirmhöhe ist die Seite leer, die rechte Spalte endet nach einer Zeile. Das ist bei wenigen Combos in Ordnung, wirkt aber unfertig. | C       |
| alle    | In „Zuletzt bearbeitet“ steht die Endboard-Zahl („0“, „2“) ohne Beschriftung, und „zuletzt vor 2 Stunden“ bricht in zwei Zeilen.                          | C       |
| Handy   | Im Feld „Weiter bearbeiten“ stehen drei Kartenbilder neben dem Titel. Der Titel bricht deshalb als „Aluber 1- / Card / (Beispiel)“.                       | B       |

### 3.3 Combos (Bibliothek) und Tab „Combos“ im Deck

| Breite  | Befund                                                                                                                                                  | Schwere |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Tablet  | Die Spalte „Titel“ schrumpft auf null, die Kopfzeile liest sich als „TiteDeck“ und die Zeilen zeigen keinen Titel.                                      | A       |
| Handy   | Die Tabelle hat sieben Spalten. Titel fehlen, Lines, Endboard und Status liegen außerhalb des Bildschirms. Im Deck-Tab ist es genauso.                  | A       |
| Desktop | Status-Chips und Tag-Chips stehen in einer Reihe, nur ein dünner Strich trennt sie. Ohne Beschriftung ist nicht klar, dass das zwei Filtergruppen sind. | C       |
| Desktop | „Lines“ steht klein in Sans, „Endboard“ groß in der Display-Schrift. Gewollt ist das als Betonung, in der Tabelle wirkt es aber uneinheitlich.          | C       |
| Desktop | „Neue Combo“ steht weder auf der Höhe der Überschrift noch auf der Höhe der Filterzeile.                                                                | C       |

### 3.4 Decks

| Breite | Befund                                                                                                                                              | Schwere |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Handy  | Die Kennzahlen „Main 30 · Extra 4“ brechen Wort für Wort und überlagern „2 Combos“. „Neues Deck“ und „YDK importieren“ ragen über den rechten Rand. | A       |

### 3.5 Deckseite

| Breite  | Befund                                                                                                                                                                               | Schwere |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| Handy   | Der Deckname (h1) ist nicht zu sehen, weil Rückgängig, Wiederholen, Speicherstand und die YDK-Knöpfe ihn auf null Breite drücken.                                                    | A       |
| Tablet  | Der Deckname wird zu „Branded Despia (I“ abgeschnitten.                                                                                                                              | B       |
| Handy   | Die Kennzahlen stehen ein Wort pro Zeile. Der Umschalter „Raster“ liegt links außerhalb des Bildschirms, und der Hinweis „Klick: Main bzw. Extra“ überlagert die Überschrift „Main“. | A       |
| Handy   | Das Raster zeigt eine Spalte mit 240 px breiten Karten, die Seite wird dadurch rund 8700 px lang. Beim Scrollen erscheinen leere Platzhalter, bis die Bilder geladen sind.           | B       |
| Tablet  | Das Raster bekommt drei Spalten auf gut der Hälfte der Breite, die Kartensuche nimmt rechts 40 % ein und ist darunter leer.                                                          | B       |
| alle    | „Umschalt+Klick: Side“ gibt es auf Touch-Geräten nicht. Side-Karten lassen sich dort nicht hinzufügen.                                                                               | B       |
| Desktop | Rückgängig, Wiederholen, Speicherstand, Import und Export stehen als gleichrangige Reihe da, keiner der Knöpfe hat Vorrang.                                                          | C       |

### 3.6 Hand-Tester

| Breite  | Befund                                                                                                                                                                                          | Schwere |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Handy   | Die Karte „Abdeckung“ überlagert den Knopf „Hand ziehen“ und den Erklärtext. Die Tabs „Going First“ und „Going Second“ sind in die Karte gequetscht, und der Text daneben bricht Wort für Wort. | A       |
| Desktop | Bevor man zieht, stehen links nur ein Knopf und ein Satz. Hier könnte schon eine Beispielhand stehen oder die Liste der passenden Starthände.                                                   | C       |

### 3.7 Neue Combo (Starthand-Auswahl)

| Breite | Befund                                                                                                                                                                                           | Schwere |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| Handy  | Zwei Spalten mit sehr großen Karten. Für die Auswahl reichen kleine Karten in vier Spalten.                                                                                                      | B       |
| alle   | Die Leiste mit „Los“ steht fest am unteren Rand. Ob der letzte Abschnitt des Rasters unter ihr frei bleibt, muss geprüft werden; auf dem Handy braucht sie zusätzlich den Abstand der Safe-Area. | C       |

### 3.8 Einstellungen

| Breite  | Befund                                                                                                                                                         | Schwere |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Desktop | Eine schmale Spalte von etwa 680 px steht links in einem Container von 1280 px. Gut 45 % der Fläche bleiben leer, und die Seite wirkt dadurch nicht mittig.    | C       |
| Desktop | Die Staple-Liste zeigt 17 Zeilen offen und macht die Seite lang. Die Spitznamen darunter findet man erst nach viel Scrollen.                                   | C       |
| Handy   | Segmentschalter wie „Dunkel/Hell“ oder „0,5× 1× 2×“ sind 26 px hoch und zum Teil 16 px breit, zu klein für Finger.                                             | B       |
| Handy   | Das Spitznamen-Formular bleibt zweispaltig, das Kartensuchfeld wird zu schmal. „Token anlegen“ ragt über den Rand, Tokennamen werden zu „Clau…“ abgeschnitten. | B       |

### 3.9 Workbench im Board-Modus

| Breite        | Befund                                                                                                                                                                                                                                         | Schwere |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| unter 1280 px | Es erscheint nur ein Satz auf leerem Grund, ohne Zurück, ohne Navigation und ohne Inhalt. Wer einen Link auf dem Handy öffnet, landet in einer Sackgasse.                                                                                      | A       |
| 1280 px       | Die Zonen überlappen sich (Friedhof über MZ, Feld über S/T), weil Board und Chain-Spalte feste Breiten haben. Die Line-Liste ist nicht zum Overlay geworden, obwohl UI-Plan 6.2 das für die Stufe „kompakt“ vorsieht.                          | A       |
| Desktop       | Der rote Hinweis zur Staple-Leiste liegt über der Gegnerhand. Im Stresstest kommt ein zweiter Hinweis oben rechts dazu, und beide verdecken Board-Inhalt.                                                                                      | B       |
| Desktop       | Der Inspector zeigt beim Startzustand Chips zum Ziehen, zwei Selects, ein Suchfeld und darunter eine Zeile pro Kartenkopie („Effect Veiler · Gegner · Hand“ viermal). Die Liste läuft unten aus dem Bild und wirkt wie ein Entwicklerwerkzeug. | B       |
| Desktop       | Die Staple-Leiste zeigt nur Bilder mit roten Zählern. Die Namen stehen erst im Tooltip, und die Zähler sind 8,5 px groß.                                                                                                                       | C       |
| Desktop       | Viel Mikrotext liegt bei 9,5 bis 11 px: Zonenbeschriftungen, LP, Status-Chip, Tasten-Hinweise. Für Mono in Stil D ist das bewusst gewählt, liegt aber an der Grenze.                                                                           | C       |
| 1280 px       | Der Hinweistext in der Schrittleiste wird mit „…“ abgeschnitten.                                                                                                                                                                               | C       |

### 3.10 Workbench im Baum-Modus

| Breite  | Befund                                                                                                                                                  | Schwere |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Desktop | Steht der Cursor auf der Starthand, sind alle Knoten danach stark abgedunkelt. Der ganze Baum wirkt dadurch deaktiviert.                                | B       |
| Desktop | Titel und Untertitel sind oft gleich, etwa „Endboard / Endboard“, „Chain auflösen / Chain auflösen“ und „Gegner reagiert / Gegner reagiert“.            | B       |
| Desktop | Die Knotentexte sind bei Zoom 1 etwa 10 bis 11 px groß. Die Minimap unten links ist ein leeres schwarzes Feld, und der Baum steht nicht mittig im Bild. | C       |

### 3.11 Schwebende Ebenen

| Ebene                     | Befund                                                                                                                                               | Schwere |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Befehlspalette, Vergleich | stimmig, keine Befunde                                                                                                                               |         |
| Tastaturhilfe             | Die Liste wird unten abgeschnitten, ohne dass man erkennt, dass sie scrollt.                                                                         | C       |
| Kartenansicht             | Auf dem Desktop gut. Auf dem Handy hat die Seitenleiste eine feste Breite und wird rechts abgeschnitten; dort sollte sie die ganze Fläche einnehmen. | A       |

### 3.12 Anmelden, Registrieren, 404

| Seite                  | Befund                                                                                                                                                     | Schwere |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Anmelden, Registrieren | Sie folgen nicht Stil D: grau gefüllte Eingabefelder, eine kleine Überschrift in Sans und kein Logo. Der Text sagt „Kombos“, überall sonst steht „Combos“. | B       |
| 404                    | Die Standardseite von Next erscheint mit weißem Grund und schwarzem Text, die Kopfzeile darüber wirkt ausgebleicht. Sie bricht das dunkle Design.          | B       |

## 4. Zielbild

### 4.1 Breitenstufen für die ganze App

| Stufe       | Breite           | Verwaltungsseiten                                             | Workbench                                                                        |
| ----------- | ---------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Handy       | unter 640 px     | einspaltig, Listen statt Tabellen, Navigation unten           | Lese- und Nachspielansicht                                                       |
| Tablet hoch | 640 bis 1023 px  | einspaltig mit breiterem Raster, Tabellen mit weniger Spalten | Lese- und Nachspielansicht mit größerem Board                                    |
| Tablet quer | 1024 bis 1279 px | wie Desktop                                                   | kompakte Workbench: Line-Liste und Inspector als Overlay, das Board skaliert     |
| Desktop     | ab 1280 px       | wie heute                                                     | wie UI-Plan 6.2, mit der Stufe „kompakt“ von 1280 bis 1439 px wirklich umgesetzt |

Die Stufen entsprechen den Tailwind-Breakpoints `sm` (640), `lg` (1024) und `xl` (1280), es braucht also keine eigenen Werte.

### 4.2 Lese- und Nachspielansicht (Workbench unter 1024 px)

Auf dem Handy liest man eine Combo nach, man baut sie nicht. Die Ansicht nutzt die vorhandenen Bausteine weiter: `BoardView` nur zum Lesen, die Schritt-Beschriftungen aus `step-label.ts`, `EndboardSummary` und die Treffer des Stresstests.

```
┌──────────────────────────┐
│ ←  Aluber 1-Card    ⋯    │  Titel, zurück, Menü (Status, Notiz)
│ Line: Goldfish ▾         │  Line wählen, Branches als Liste
├──────────────────────────┤
│ Schritt 3 von 6          │
│ Branded Fusion ↯ 1       │  Beschriftung wie in der Line-Liste
│ Notiz …                  │
├──────────────────────────┤
│   [ Board, nur belegte   │  Gegner oben, eigene Seite unten,
│     Zonen, Karten xs ]   │  Tippen auf Karte öffnet Kartenansicht
│   Chain: 1 offen         │
├──────────────────────────┤
│ ‹ zurück   ▶   weiter ›  │  Daumenzone, Wischen wechselt Schritte
└──────────────────────────┘
```

- **Endboard:** Am Ende der Line stehen die Endboard-Zusammenfassung und die Schwachstellen aus dem Stresstest.
- **Bearbeiten:** Leichte Änderungen gehen auch hier, nämlich Notiz, Status und Tags. Alles, was Schritte verändert, verweist auf den Rechner („Bearbeiten ab 1024 px“).
- **Gleiche URL:** Die Ansicht kommt unter derselben URL wie die Workbench. Ein geteilter Link funktioniert damit überall.

### 4.3 Bedienung auf Touch-Geräten

- **Tippflächen:** mindestens 40 px auf Geräten mit grobem Zeiger, umgesetzt über die Tailwind-Variante `pointer-coarse:`. Auf dem Desktop bleibt die Dichte wie heute.
- **Ersatz für Hover, Rechtsklick und Umschalt+Klick:**
  - Langes Drücken öffnet das Kartenmenü.
  - Die Kartenvorschau öffnet sich beim Tippen.
  - Im Deck bekommen Treffer in der Kartensuche einen eigenen Knopf „Side“.
- **Seitenleisten (`Sheet`):** auf dem Handy von unten und über die volle Breite, ab `sm` rechts wie heute.
- **Text:** auf dem Handy mindestens 12 px. Mono-Mikrotext wächst dort eine Stufe.

## 5. Maßnahmen in Phasen

Aufwand: **S** bis ein halber Tag, **M** ein bis zwei Tage, **L** mehrere Tage.

### Phase 1: Fundament (M)

1. **AppHeader responsiv:**
   - Unter `sm` bleiben oben Logo und Nutzermenü.
   - Die drei Bereiche und die Suche wandern in eine Leiste unten mit Start, Combos, Decks und Suche. Sie berücksichtigt die Safe-Area.
   - Das Suchfeld bekommt eine flexible Breite (`w-full max-w-64`).
2. **Ränder:** `main` mit `px-4 sm:px-6 lg:px-8` und kleinerem Abstand oben.
3. **Wiederverwendbarer `PageHeader`:**
   - Er besteht aus Titel, Kennzahlen und Aktionen.
   - Der Titel bekommt `min-w-0`, damit er nie auf null schrumpft. Die Aktionen brechen unter den Titel um, seltene Aktionen wandern ins Menü „⋯“.
   - Combos, Decks, Deckseite, Einstellungen und Starthand-Auswahl nutzen ihn.
4. **`Sheet` responsiv:** von unten auf dem Handy, rechts ab `sm`. Das betrifft die Kartenansicht und alle späteren Seitenleisten.
5. **Größen für Touch:** `pointer-coarse:` für Button, Segmented, Tabs, Checkbox und Icon-Knöpfe, mit mindestens 40 px.
6. **404 und Fehlerseiten in Stil D:** `app/not-found.tsx` sowie die Fehlerseiten in `components/error` als Seiten mit Kopfzeile, kurzem Text und dem Weg zurück.
7. **Anmelden und Registrieren in Stil D:** Logo, Überschrift in der Display-Schrift, Eingabefelder wie im Rest der App.
8. **Sweep-Skript ins Repo:** `npm run ui:sweep` erzeugt Screenshots und einen Bericht für alle Seiten in vier Breiten (siehe 6).

### Phase 2: Verwaltungsseiten (M)

1. **Bibliothek:**
   - Die Tabelle wird ab `lg` zur Tabelle und darunter zur Liste. Jede Zeile hat dann eine Karte mit Starthand-Bildern, Titel, „Deck · Lines · Endboard“ und dem Status-Chip.
   - Auch in der Tabelle bekommt der Titel eine Mindestbreite.
   - Eine gemeinsame Komponente versorgt Bibliothek und Deck-Tab „Combos“.
   - Die Filter werden zu zwei beschrifteten Gruppen (Status, Tags). Auf dem Handy liegen sie in einem Filter-Sheet.
2. **Deckliste:** Zeilen mit `min-w-0`, die Kennzahlen in einer Zeile mit Kürzung, und die Aktionen im Menü „⋯“.
3. **Deckseite:**
   - Das Kartenraster bekommt `auto-fill` mit einer Mindestbreite von etwa 96 px, auf dem Handy also drei bis vier Spalten in Größe `md`.
   - Die Kartensuche wird unter `lg` zu einem Knopf „Karten hinzufügen“, der ein Sheet öffnet.
   - Raster und Liste werden als Segmented sichtbar umgeschaltet.
4. **Hand-Tester:** unter `lg` untereinander, zuerst Abdeckung, dann Tabs, Knopf und gezogene Hand. Vor dem ersten Ziehen erscheint gleich eine Beispielhand.
5. **Starthand-Auswahl:** Karten auf dem Handy in Größe `sm` und vier Spalten; die feste Leiste unten mit Safe-Area und Abstand für das Raster.
6. **Einstellungen:**
   - Die Spalte steht mittig, oder rechts kommt eine Abschnittsnavigation dazu.
   - Die Staple-Liste ist ab acht Einträgen einklappbar.
   - Auf dem Handy werden die Formulare einspaltig, und die Token-Zeile bricht um.
7. **Start:** „Weiter bearbeiten“ steht auf dem Handy untereinander mit Bildern über dem Titel, und die Endboard-Zahl bekommt eine Beschriftung.

### Phase 3: Workbench auf dem Desktop (M)

1. **Stufe „kompakt“ (1280 bis 1439 px) wie im UI-Plan:**
   - Die Line-Liste wird zum Overlay (Taste L).
   - Das Board skaliert per Container-Query über eine Variable für die Kartengröße, statt feste Zonenbreiten zu nutzen.
   - Die Chain-Spalte rückt unter das Board, wenn der Platz fehlt.
2. **Hinweise:**
   - Es erscheint immer nur einer, die übrigen folgen nacheinander.
   - Der Hinweis hängt mit einem Pfeil an dem Element, das er erklärt, und überdeckt kein Board.
   - Er verschwindet nach der ersten passenden Handlung.
3. **Inspector beim Startzustand:**
   - Gruppen je Seite und Zone mit Anzahl, etwa „Gegner · Hand: Ash Blossom, Effect Veiler × 4“.
   - Die Ziehen-Chips werden zu einer Suche mit Vorschlägen, die Selects zu einem Zonen-Segmented.
   - Alles bleibt innerhalb des Panels scrollbar.
4. **Baum:**
   - Knoten nach dem Cursor schwächer abdunkeln, sodass sie noch lesbar bleiben.
   - Der Untertitel entfällt, wenn er dem Titel gleicht.
   - Die Schrift hat bei Zoom 1 mindestens 12 px.
   - `fitView` beim Öffnen, und die Minimap erscheint erst ab etwa zehn Knoten und in Stil D.
5. **Staple-Leiste und Tastaturhilfe:** Die Zähler werden größer und lesbar. Die Tastaturhilfe zeigt eine sichtbare Scroll-Kante oder zwei Spalten ohne Scrollen.

### Phase 4: Lese- und Nachspielansicht (L)

1. Unter 1024 px rendert die Workbench-Seite die neue Ansicht `ComboReader` aus 4.2 statt der Sackgasse.
2. **Bausteine:**
   - `BoardView` bekommt einen Lesemodus, der nur belegte Zonen in Größe `xs` zeigt und nicht ziehbar ist.
   - Die Line-Auswahl nutzt `lineThrough`, `lineSteps` und `stepLabel`.
   - Am Ende steht `EndboardSummary`, dazu die Stresstest-Treffer als Liste.
3. **Bedienung:** Wischen und die Knöpfe in der Daumenzone wechseln Schritte. Abspielen nutzt das Tempo aus den Einstellungen.
4. **Bearbeiten:** Notiz, Status und Tags lassen sich auch hier ändern, mit Autosave und Revision wie in der Workbench.
5. Tablet quer (1024 bis 1279 px) bekommt die kompakte Workbench aus Phase 3 mit Inspector als Overlay, statt der Lese-Ansicht.

### Phase 5: Touch-Bedienung und Abschluss (S bis M)

1. Langes Drücken auf Karten öffnet das Kartenmenü, und die Kartenvorschau öffnet sich beim Tippen statt beim Überfahren.
2. In der Deck-Kartensuche bekommt jeder Treffer einen Knopf „Side“.
3. Im Startbereich: wenn wenige Combos da sind, eine kurze Liste „Als Nächstes“ (etwa ungetestete Lines, Decks ohne Combo), damit die Seite nicht leer endet.

Texte wie „Kombos“ gegenüber „Combos“ sind hier nur vermerkt. Sie gehören in die eigene Überarbeitung der Titel und Texte.

## 6. Prüfung und Abnahme

Das Sweep-Skript aus diesem Durchgang kommt als `scripts/ui-sweep.mjs` ins Repo. Es läuft gegen den Dev-Server mit dem Test-Nutzer und prüft jede Seite in 390, 820, 1280 und 1440 px.

**Abnahme jeder Phase:**

- Die Dokumentbreite ist auf allen Seiten und in allen vier Breiten gleich der Fensterbreite, es gibt also kein seitliches Scrollen.
- Auf Touch-Geräten ist keine Tippfläche unter 40 px, mit Ausnahme von Links im Fließtext.
- Auf dem Handy steht kein Text unter 12 px, mit Ausnahme der Tasten-Hinweise, die dort ohnehin verborgen werden.
- Es gibt keine Konsolenfehler.
- Die Screenshots werden als Gesamtbild durchgesehen, nicht nur Element für Element.

Das Skript braucht Datenbank und Server, deshalb läuft es lokal und nicht in der CI. Damit es keine Daten ändert, arbeitet es nur lesend oder setzt danach `npm run db:sample` zurück.

## 7. Entscheidungen

Am 1. Oktober 2026 entschieden, jeweils nach Empfehlung:

1. **Workbench auf Tablet quer (1024 bis 1279 px):** kompakte Bearbeitung, weil ein iPad quer genug Platz für das Board hat.
2. **Navigation auf dem Handy:** Leiste unten mit Start, Combos, Decks und Suche, alles mit dem Daumen erreichbar.
3. **Bearbeiten auf dem Handy:** zunächst nur Notiz, Status und Tags. Schritte über die Befehlszeile wären später möglich, weil `commandMatches` und die REST-API das schon können.
4. **Reihenfolge:** Phase 1, 2, 3, 4, 5.

## 8. Stand der Umsetzung

Alle fünf Phasen sind umgesetzt (1. Oktober 2026). Abweichungen vom Plan:

- **Phase 1:** Auf dem Handy steht die Suche nur in der Leiste unten, nicht zusätzlich oben. Das `Sheet` kommt ab `sm` von rechts, weil 480 px auf dem Tablet gut passen.
- **Phase 2:** Die Kachelaktionen im Deck bleiben auf dem Handy 32 px groß; drei Knöpfe zu 40 px passen nicht auf eine Karte in drei Spalten.
- **Phase 3:** Die Zonen des Boards bleiben 84 px groß. Statt zu skalieren, liegt die Line-Liste unter 1440 px als Overlay, und die Chain rückt bei wenig Platz unter das Board. Damit reicht die Workbench schon ab 1024 px.
- **Phase 4:** Der Reader zeigt nur belegte Reihen des Boards; die Position innerhalb einer Reihe bleibt wie am Tisch.
- **Phase 5:** Langes Drücken braucht es nicht: Antippen öffnet das Kartenmenü bereits. Die Kartenvorschau beim Überfahren ersetzt auf Touch-Geräten der Tipp, der die Kartenansicht öffnet. Ziehbare Karten setzen `touch-action: none`.
