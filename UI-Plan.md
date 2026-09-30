# DuelPath: UI-Plan

Stand: 30.09.2026 · Setzt `UX-Plan.md` in eine konkrete Oberfläche um. Abschnittsverweise wie „UX 6.4“ beziehen sich auf den UX-Plan.

Der UX-Plan legt fest, **was** die Oberfläche können muss und **wie** sie sich bedienen lässt. Dieser Plan legt fest, **wie sie aussieht und aufgebaut ist**: Design-Tokens, Raster, Komponenten, Screens, Zustände und Barrierefreiheit. Jede Entscheidung hier muss sich an den UX-Prinzipien (UX 4) und an den beiden Personas (UX 1) messen lassen.

## 1. Grundlagen und Maßstäbe

Das UI folgt etablierten Regeln, statt eigene zu erfinden:

| Maßstab                          | Was er für DuelPath heißt                                                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WCAG 2.2, Stufe AA**           | Text mindestens 4,5:1, Bedienelemente und Fokus mindestens 3:1, Zielgröße mindestens 24 × 24 px, jede Drag-Geste hat eine Alternative (2.5.7), Fokus wird nie verdeckt (2.4.11) |
| **Nielsens Heuristiken**         | Systemstatus sichtbar (Speichern, Chain, HOPT), Wiedererkennen statt Erinnern (Kürzel stehen am Knopf), Fehler verhindern (Branch statt Überschreiben), Undo                    |
| **Fitts' Gesetz**                | Aktionen erscheinen an der Karte, nicht in einer fernen Seitenleiste; häufige Knöpfe sind groß und nah am Board                                                                 |
| **Hicks Gesetz**                 | Menüs zeigen nur, was an dieser Stelle Sinn ergibt (UX 6.3); die Schrittleiste zeigt höchstens drei Hauptaktionen                                                               |
| **Gestaltgesetze**               | Nähe und gemeinsame Fläche gruppieren (eigene Seite, Gegnerseite, Chain); gleiche Bedeutung hat überall gleiche Farbe und Form                                                  |
| **Progressive Offenlegung**      | Kurzform zuerst, Details beim Überfahren oder Aufklappen; Kürzel sichtbar, aber leise                                                                                           |
| **Design-Tokens in drei Stufen** | Grundwerte, Bedeutungen, Komponenten (Abschnitt 4); Komponenten verwenden nie Grundwerte direkt                                                                                 |
| **Vorhandene Bausteine**         | Radix/shadcn für zugängliche Grundkomponenten, React Flow für den Baum, dnd-kit für Drag mit Tastatur-Sensor                                                                    |

## 2. Bestandsaufnahme des heutigen UI

Vor dem Neuaufbau das, was heute im Code steht und dem UX-Plan im Weg ist:

| Befund                                                                                                   | Ort                                             | Folge                                                                           |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `body { font-family: Arial }` steht außerhalb der Tailwind-Layer und überschreibt Geist                  | `app/globals.css`                               | Geist wird geladen, aber nie angezeigt                                          |
| Dark-Mode-Tokens existieren, aber es gibt keinen Umschalter und keine `.dark`-Klasse im Layout           | `app/globals.css`, `app/layout.tsx`             | Dunkles Design ist nicht erreichbar                                             |
| Im Dark Mode hat `--primary` auf `--background` nur **1,3:1** Kontrast, der Fokusring ist noch schwächer | `app/globals.css` (`.dark`)                     | Hauptknöpfe und Fokus sind im Dunkeln praktisch unsichtbar (WCAG 1.4.11, 2.4.7) |
| Zwei Kopfzeilen (Navigation 64 px und eine eigene Zeile nur für den Sprachschalter)                      | `app/layout.tsx`                                | rund 110 px Höhe gehen verloren, bevor die Workbench beginnt                    |
| Zwei verschachtelte `<main>`-Elemente                                                                    | `app/layout.tsx`, `app/(dashboard)/layout.tsx`  | Bildschirmleser finden zwei Hauptbereiche                                       |
| Jede Seite steckt in `container mx-auto py-8`, der Editor rechnet mit `h-[calc(100vh-12rem)]`            | `app/(dashboard)/layout.tsx`, `ComboEditor.tsx` | Workbench kann nie die volle Breite und Höhe nutzen                             |
| Startseite ist eine Hero-Seite mit Willkommenstext, auch für angemeldete Nutzer                          | `app/page.tsx`                                  | widerspricht UX 5 („Start statt Marketing“)                                     |
| Schritte werden in einem Formular mit nativen `select`-Feldern bearbeitet (562 Zeilen)                   | `NodeEditor.tsx`                                | widerspricht UX-Prinzip 1 und 2; entfällt in der neuen Workbench                |
| Farbschema stammt aus einer Recherche für ein helles Design (Beige-Hintergrund)                          | `FARBSCHEMA.md`                                 | taugt nicht als Grundlage für ein dunkles Standard-Design (UX 12)               |

Was bleibt: Tailwind 4 mit CSS-Variablen, shadcn im Stil „new-york“, lucide-Icons, Geist als Schrift, dnd-kit, React Flow, `@tanstack/react-virtual`.

## 3. Die Personas als Prüfmaßstab

Jonas und Mia (UX 1) stellen unterschiedliche Anforderungen an dieselbe Oberfläche. Die Tabelle legt fest, wie das UI beide bedient. Sie ist die Checkliste für jedes Review.

| Aspekt           | Jonas braucht                  | Mia braucht               | Antwort im UI                                                                                                                 |
| ---------------- | ------------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Dichte           | viel auf einem Bildschirm      | nicht erschlagen werden   | kompakte Standarddichte, aber strenge Hierarchie: drei Textstufen, eine Akzentfarbe pro Bereich, Details erst beim Überfahren |
| Eingabeweg       | Tastatur und Drag              | Maus und sichtbare Knöpfe | jede Aktion ist ein sichtbarer Knopf **mit dem Kürzel daneben** (`Kbd`); Mia sieht die Kürzel und lernt sie nebenbei          |
| Vokabular        | Spitznamen, Kurzformen         | volle Kartennamen         | Line-Liste zeigt Kurzform, Tooltip den vollen Namen; Suche findet beides                                                      |
| Kartentext       | kennt ihn, will ihn nur prüfen | liest ihn nach            | Inspector folgt dem Mauszeiger ohne Klick; PSCT-Gliederung macht Bedingung, Kosten und Wirkung sichtbar (7.2.6)               |
| Rückmeldung      | so wenig wie möglich           | Erklärungen               | Warnungen und Choke Points als Symbol, Begründung im Tooltip; Hinweise erscheinen nur einmal                                  |
| Fehlerangst      | gering                         | hoch                      | Undo und Redo als Knöpfe in der Kopfzeile, nicht nur als Kürzel; „Als Branch angelegt“ statt stillem Überschreiben            |
| Ziel beim Lernen | Choke Points auf einen Blick   | verstehen, warum          | Choke-Point-Symbol mit Grund („Ash trifft: add from Deck“); Notizen beim Nachspielen groß im Inspector                        |
| Bildschirm       | 27 Zoll, 1920 px oder mehr     | Laptop, 1280 bis 1440 px  | drei Breitenstufen (6.2); die kleinste bleibt voll bedienbar                                                                  |

**Wenn beide kollidieren**, gilt die Regel aus UX 1: Bei der Eingabe gewinnt Jonas (Dichte, Tempo), beim Nachspielen gewinnt Mia (Erklärung, Lesbarkeit). Konkret heißt das: Im Nachspielen werden Notizen und Gründe größer und ausführlicher gezeigt als beim Eingeben.

## 4. Design-Tokens

### 4.1 Aufbau

Tokens liegen als CSS-Variablen in `app/globals.css` und werden über `@theme inline` für Tailwind registriert, wie heute. Neu ist die Trennung in drei Stufen:

1. **Grundwerte** (`--gray-3`, `--gold-8`, `--red-7` …): reine Farbwerte in OKLCH, ohne Bedeutung. Nur in `globals.css` verwendet.
2. **Bedeutungen** (`--surface-1`, `--text-muted`, `--self`, `--opponent`, `--chain` …): verweisen auf Grundwerte und unterscheiden sich zwischen dunklem und hellem Design.
3. **Komponenten** (`--zone-border`, `--card-ring-selected` …): nur, wo eine Komponente eigene Werte braucht.

Komponenten verwenden ausschließlich Stufe 2 und 3. Die shadcn-Namen (`--background`, `--primary`, `--muted` …) bleiben als Aliase auf die neuen Bedeutungen erhalten, damit vorhandene Komponenten weiter funktionieren.

**Design-Umschaltung:** Die Klasse `.dark` am `<html>`-Element (vorhandene `@custom-variant dark`), Standard ist dunkel. Dazu `color-scheme: dark` bzw. `light`, damit Scrollbalken und native Elemente passen. Die Wahl wird in den Nutzereinstellungen gespeichert (UX 16) und vor dem ersten Rendern gesetzt, damit nichts aufblitzt.

### 4.2 Farben: Flächen und Text

Das dunkle Design leitet sich aus der Markenfarbe ab: Die Flächen tragen einen leichten Stich des Dunkelgrüns (#194038, Farbton 180 bis 190), statt neutral grau zu sein. Kein reines Schwarz, weil Kartenbilder darauf zu hart wirken und Text flimmert.

| Token             | Dunkel (Standard)                  | Hell                              | Verwendung                                           |
| ----------------- | ---------------------------------- | --------------------------------- | ---------------------------------------------------- |
| `--bg`            | `oklch(0.17 0.012 190)` · #091111  | `oklch(0.975 0.008 85)` · #F9F6F1 | Seitenhintergrund                                    |
| `--surface-1`     | `oklch(0.205 0.012 190)` · #111918 | `oklch(0.955 0.01 85)` · #F3F0E9  | Seitenleisten, Kopfzeile, Schrittleiste              |
| `--surface-2`     | `oklch(0.245 0.012 190)` · #1A2222 | `oklch(0.995 0.003 85)` · #FEFDFB | Menüs, Popover, Karten in Listen                     |
| `--surface-3`     | `oklch(0.29 0.014 190)` · #242E2D  | `oklch(0.92 0.012 85)` · #E8E4DC  | Hover und aktive Zeilen                              |
| `--felt`          | `oklch(0.19 0.022 172)` · #091713  | `oklch(0.94 0.018 165)` · #E1EFE8 | Spielfeld, leicht grünlich wie eine Spielmatte       |
| `--border`        | `oklch(0.32 0.012 190)` · #2C3534  | `oklch(0.88 0.01 85)`             | Trennlinien (dekorativ, kein Kontrastziel)           |
| `--border-strong` | `oklch(0.56 0.012 190)` · #6D7776  | `oklch(0.60 0.012 190)` · #798382 | Eingabefelder, Knöpfe mit Rahmen (mindestens 3:1)    |
| `--zone`          | `oklch(0.52 0.02 172)` · #5E6D67   | `oklch(0.62 0.02 165)` · #7C8A83  | Umrisse leerer Zonen auf dem Feld (3,4:1 bzw. 3,0:1) |
| `--text`          | `oklch(0.95 0.005 190)` · #EBF0EF  | `oklch(0.22 0.015 190)` · #131D1C | Fließtext, Kartennamen                               |
| `--text-muted`    | `oklch(0.76 0.01 190)` · #AAB3B2   | `oklch(0.42 0.015 190)` · #44504F | Sekundärtext, Beschriftungen                         |
| `--text-subtle`   | `oklch(0.66 0.01 190)` · #8C9493   | `oklch(0.50 0.012 190)` · #5C6665 | Kürzel, Zähler, Platzhalter                          |

Gemessene Kontraste im dunklen Design: `--text` 14:1 auf `--surface-2`, `--text-muted` 6,6:1 und `--text-subtle` 4,5:1 auf der hellsten Fläche `--surface-3`. Damit besteht jede Textstufe auf jeder Fläche AA. Im hellen Design liegen alle drei Stufen ebenfalls über 4,5:1.

### 4.3 Farben: Bedeutungen

Jede Bedeutung aus UX 12 hat genau eine Farbe. Farbe ist nie das einzige Merkmal: Jede Bedeutung hat zusätzlich ein festes Symbol (4.8) oder eine feste Position.

| Token        | Bedeutung                                  | Dunkel                                   | Hell               | Symbol                     | Kontrast dunkel (auf `--surface-3` / `--bg`) |
| ------------ | ------------------------------------------ | ---------------------------------------- | ------------------ | -------------------------- | -------------------------------------------- |
| `--primary`  | Hauptaktion, Auswahl, Fokus                | Gold `oklch(0.82 0.12 84)` · #E9BD63     | Markengrün #113F37 | keins                      | 8,0 / 10,9                                   |
| `--self`     | eigene Seite                               | Blau `oklch(0.72 0.13 245)` · #56ACF0    | #0065B4            | Position unten             | 5,7 / 7,8                                    |
| `--opponent` | Gegner, gegnerische Schritte, Choke Points | Rot `oklch(0.71 0.16 22)` · #F57373      | #C2272D            | Position oben, `Crosshair` | 5,1 / 6,9                                    |
| `--chain`    | offene Chain, Chain Links                  | Violett `oklch(0.73 0.14 300)` · #B692F2 | #7444B4            | `Link`                     | 5,6 / 7,6                                    |
| `--warning`  | Regelwarnung                               | Orange `oklch(0.78 0.15 58)` · #FE9D4A   | #B45000            | `TriangleAlert`            | 6,8 / 9,2                                    |
| `--jev`      | Vorschläge von Jev                         | Türkis `oklch(0.78 0.10 185)` · #63CCC0  | #00736A            | `Sparkles`                 | 7,3 / 10,0                                   |
| `--danger`   | destruktive Aktion                         | wie `--opponent`                         | wie `--opponent`   | `Trash2`                   | nur in Menüs und Bestätigungen               |

**Begründungen:**

- **Gold als Hauptaktion im Dunkeln, Grün im Hellen.** Das Markengrün hat auf dunklem Grund keinen Kontrast (heute 1,3:1). Das Gold aus der Markenpalette (#D9B473, aufgehellt) erreicht 10,9:1 und bleibt markentypisch. Schrift auf Gold ist dunkel (`--bg`, 10,9:1).
- **Blau gegen Rot für die Seiten.** Das ist die vertraute Spielkonvention und bleibt bei Rot-Grün-Schwäche unterscheidbar, anders als Grün gegen Rot. Zusätzlich trennt die Position (Gegner immer oben).
- **Choke Points in Gegnerfarbe.** Ein Choke Point ist die Stelle, an der der Gegner eingreift. Deshalb gibt es keine eigene Farbe, sondern das Staple-Symbol in `--opponent` mit dem `Crosshair`-Symbol. Eine Farbe weniger, eine Bedeutung klarer.
- **Destruktiv teilt sich Rot mit dem Gegner.** Destruktive Aktionen erscheinen nie auf dem Board, sondern nur in Menüs und Bestätigungen mit Text und Symbol. Eine eigene zweite Rotstufe wäre kaum unterscheidbar.
- **Orange und Gold liegen nah beieinander.** Deshalb trägt eine Warnung immer das Dreieck und Gold erscheint nie mit einem Symbol. Gold ist Fläche (Knopf) oder Ring (Auswahl), Orange ist nur Symbol und Rahmen.

**Getönte Flächen** für Chips und hervorgehobene Zeilen: `oklch(0.30 0.05 <Farbton>)` im Dunkeln (zum Beispiel `--self-tint` #163045). Die Bedeutungsfarbe als Text darauf erreicht mindestens 5:1, `--text` mindestens 11:1.

**Verteilung:** Rund 90 % der Fläche sind Flächen und Kartenbilder, Bedeutungsfarben erscheinen nur als Ring, Symbol, Chip oder schmale Kante. Gold als Fläche gibt es pro Bereich höchstens einmal (ein Hauptknopf).

**Kartenrahmen:** Die Kartentypfarben (Effekt orange, Fusion violett, Synchro weiß, Xyz schwarz, Link blau, Zauber grün, Falle pink) kommen aus den Kartenbildern selbst und werden nicht nachgebaut. Nur Platzhalter für fehlende Bilder (UX 11) verwenden eine gedämpfte Rahmenfarbe nach Kartentyp.

### 4.4 Typografie

Schrift ist **Geist Sans** für alles, **Geist Mono** nur für Tastenkürzel und Passcodes. Beide werden schon geladen; die Arial-Regel in `globals.css` entfällt.

| Token       | Größe / Zeilenhöhe | Gewicht | Verwendung                                                                 |
| ----------- | ------------------ | ------- | -------------------------------------------------------------------------- |
| `text-2xs`  | 11 / 14 px         | 500     | nur Großbuchstaben-Beschriftungen mit Laufweite 0,04 em (LINES, INSPECTOR) |
| `text-xs`   | 12 / 16 px         | 400     | Zähler, Kürzel, Metadaten                                                  |
| `text-sm`   | 13 / 18 px         | 400     | Standard in der Workbench: Line-Liste, Menüs, Schrittleiste                |
| `text-base` | 14 / 21 px         | 400     | Kartentext im Inspector, Formulare, Verwaltungsseiten                      |
| `text-md`   | 16 / 24 px         | 600     | Kartenname im Inspector, Abschnittstitel                                   |
| `text-lg`   | 20 / 28 px         | 600     | Seitentitel                                                                |
| `text-xl`   | 24 / 32 px         | 600     | Endboard-Zahlen, Startseite                                                |

- **Zahlen tabellarisch** (`font-variant-numeric: tabular-nums`) überall, wo sie sich ändern: Zähler der Stapel, LP, Schrittnummern, Interruptions. Sonst springt das Layout beim Nachspielen.
- **Kartentext** mit höchstens 60 Zeichen pro Zeile im Inspector (320 px Breite ergibt etwa 48 Zeichen). Kartentext ist Englisch und bekommt `lang="en"`, damit Bildschirmleser ihn richtig aussprechen.
- **Keine Schrift unter 11 px**, und 11 px nur für Großbuchstaben-Beschriftungen.
- **Abschneiden statt umbrechen** in Listen: Lange Kartennamen enden mit „…“ und zeigen den vollen Namen im Tooltip.

### 4.5 Abstände, Raster und Größen

- **Grundraster 4 px.** Abstände: 4, 8, 12, 16, 24, 32, 48. Innerhalb der Workbench fast nur 4, 8 und 12; Verwaltungsseiten nutzen 16 bis 32.
- **Zeilenhöhen:** Listenzeilen 28 px (Line-Liste, Menüs), Knöpfe klein 28 px, normal 32 px, groß 40 px. Das erfüllt die Zielgröße von 24 px mit Reserve.
- **Symbole** 16 px in Zeilen, 20 px in Knöpfen der Kopfzeile, Strichstärke 1,75.

### 4.6 Radien, Rahmen und Tiefe

- **Radien klein**, weil das Werkzeug dicht ist: 4 px für Chips und Zonen, 6 px für Knöpfe und Eingabefelder, 8 px für Menüs und Panels. Kartenbilder behalten ihre eigene Form mit 3 px.
- **Tiefe über Helligkeit, nicht über Schatten.** Im dunklen Design ist eine höhere Ebene heller (`--surface-1` bis `--surface-3`). Schatten gibt es nur für schwebende Ebenen (Menüs, Overlays, gezogene Karte), dort kombiniert mit einem 1-px-Rahmen `--border`.
- **Ebenen (z-index):** Board 0, Seitenleisten 10, Schrittleiste 20, gezogene Karte 30, Popover und Menüs 40, Overlays 50, Toasts 60.

### 4.7 Bewegung

| Token            | Dauer  | Kurve                        | Verwendung                                                |
| ---------------- | ------ | ---------------------------- | --------------------------------------------------------- |
| `--motion-fast`  | 100 ms | `ease-out`                   | Hover, Fokus, Knopfzustände                               |
| `--motion-base`  | 150 ms | `cubic-bezier(0.2, 0, 0, 1)` | Karte wechselt die Zone (UX 12), Menüs öffnen             |
| `--motion-slow`  | 240 ms | `cubic-bezier(0.2, 0, 0, 1)` | Modus-Wechsel Board/Baum, Panels ein- und ausklappen      |
| `--motion-flash` | 600 ms | `ease-out`                   | Aufleuchten geänderter Karten nach einem Schritt (UX 4.7) |

- Animiert werden nur `transform` und `opacity`, damit es auch mit 20 Karten flüssig bleibt.
- **Kartenbewegung** als FLIP-Animation: Die Karte fliegt aus ihrer alten Zone in die neue. Beim Autoplay (UX 6.10) bleibt die Dauer gleich, nur die Pause zwischen den Schritten ändert sich.
- **`prefers-reduced-motion`:** Keine Flugbewegung, stattdessen erscheint die Karte am Ziel und leuchtet auf. Modus-Wechsel ohne Überblendung.

### 4.8 Symbole

lucide-Icons, feste Zuordnung. Ein Symbol hat überall dieselbe Bedeutung.

| Bedeutung    | lucide-Icon  | Bedeutung            | lucide-Icon          |
| ------------ | ------------ | -------------------- | -------------------- |
| Aktivierung  | `Zap`        | Warnung              | `TriangleAlert`      |
| Chain Link   | `Link`       | Choke Point          | `Crosshair`          |
| Branch       | `GitBranch`  | Endboard             | `Flag`               |
| HOPT genutzt | `Lock`       | HOPT frei            | `LockOpen`           |
| Negiert      | `Ban`        | Jev-Vorschlag        | `Sparkles`           |
| Notiz        | `StickyNote` | Gespeichert / Fehler | `Check` / `CloudOff` |
| Rückgängig   | `Undo2`      | Wiederholen          | `Redo2`              |
| Board-Modus  | `LayoutGrid` | Baum-Modus           | `Network`            |

Die Staple-Leiste und die Choke-Point-Chips zeigen **Kartenbilder** statt Symbolen, weil Spieler Handtraps am Artwork schneller erkennen als an einem Icon.

## 5. Die Karte als Grundbaustein

Kartenbilder sind das wichtigste Element (UX 4.10). Eine einzige Komponente `CardView` stellt Karten überall dar.

### 5.1 Größen

Seitenverhältnis 59 : 86 wie die echte Karte. Höhe = Breite × 1,458.

| Größe   | Breite          | Einsatz                                                  | Bildquelle   |
| ------- | --------------- | -------------------------------------------------------- | ------------ |
| `art`   | 24 px           | quadratischer Artwork-Ausschnitt in Line-Liste und Chips | `_small.jpg` |
| `xs`    | 32 px           | Chain-Stapel, Staple-Leiste, Mini-Board                  | `_small.jpg` |
| `sm`    | 44 px           | Bildreihen (Stapel öffnen, Suchergebnisse, Abfragen)     | `_small.jpg` |
| `board` | 56 / 64 / 72 px | Board je nach Breitenstufe (6.2)                         | `_small.jpg` |
| `lg`    | 120 px          | Starthand-Raster, Deckbau                                | `_small.jpg` |
| `xl`    | 240 px          | Inspector und Kartenansicht                              | volles Bild  |

Der **Artwork-Ausschnitt** schneidet aus dem kleinen Bild den Bildbereich der Karte aus (`object-fit: cover`, Ausschnitt oben mittig). So braucht es keine zusätzlichen Bilddateien.

### 5.2 Zustände

| Zustand                          | Darstellung                                                                                                                             |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| normal                           | Bild, 3 px Radius                                                                                                                       |
| Hover                            | 2 px Ring `--text-muted`, Inspector zeigt die Karte                                                                                     |
| ausgewählt                       | 2 px Ring `--primary` mit 2 px Abstand, bleibt bis Esc oder anderer Auswahl                                                             |
| Tastaturfokus                    | wie ausgewählt, zusätzlich sichtbar, wenn nur der Fokus darauf liegt (`:focus-visible`)                                                 |
| wählbar (Kosten, Ziel, Material) | pulsierender Ring `--primary` bei 50 % Deckkraft; nicht wählbare Karten auf 40 % abgedunkelt                                            |
| neu in der Zone                  | Aufleuchten `--motion-flash` in der Farbe des Besitzers (`--self` oder `--opponent`), kleiner Punkt oben links bis zum nächsten Schritt |
| Zone verlassen                   | gestrichelter Umriss am alten Platz bis zum nächsten Schritt                                                                            |
| negiert                          | `Ban`-Symbol oben rechts, Bild leicht entsättigt                                                                                        |
| gesetzt, eigene Karte            | Bild bei 55 % Helligkeit mit Rückseitenmuster am Rand, damit die Karte erkennbar bleibt                                                 |
| gesetzt, Gegner                  | Kartenrückseite                                                                                                                         |
| Verteidigung                     | um 90 Grad gedreht                                                                                                                      |
| Warnung                          | 1 px Rahmen `--warning`, `TriangleAlert` oben rechts                                                                                    |
| wird gezogen                     | Schatten, 4 % größer, Original bleibt als Umriss am Platz                                                                               |

### 5.3 Plaketten auf der Karte

Feste Ecken, damit das Auge weiß, wo es suchen muss:

- **oben links:** Chain-Link-Nummer (`CL2`) in `--chain`
- **oben rechts:** Negiert oder Warnung (Negiert hat Vorrang)
- **unten links:** Anzahl Xyz-Materialien
- **unten rechts:** HOPT-Status, nur im Inspector und im Aktionsmenü, nicht auf dem Board

Plaketten sind mindestens 16 px hoch, `text-2xs` auf getönter Fläche, und erscheinen erst ab Größe `board`. Unter `board` zeigt die Karte keine Plaketten.

### 5.4 Laden und Fehler

- Das Bild hat eine feste Größe und einen Platzhalter in `--surface-2`, damit nichts springt.
- Kleine Bilder werden mit `loading="lazy"` geladen, im Board sofort.
- Fehlt ein Bild (UX 11), zeigt der Platzhalter Kartenname und Kartentyp im Rahmen der Kartentypfarbe.
- Jede Karte hat einen zugänglichen Namen: „Aluber the Jester of Despia, Monsterzone 3, Angriff“.

## 6. Layout

### 6.1 App-Shell

Eine Kopfzeile von 44 px statt heute zwei Zeilen mit zusammen rund 110 px.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ DuelPath   Start  Combos  Decks  Karten       [ Suchen …          Strg K ]   ◐ B │
└──────────────────────────────────────────────────────────────────────────────────┘
```

- Links Logo und Hauptbereiche, aktiver Bereich mit 2 px Unterstrich in `--primary` und `aria-current="page"`.
- Mitte rechts das Suchfeld, das die Befehlspalette öffnet (Strg+K).
- Rechts ein Nutzermenü (Initiale): Design, Oberflächensprache, Kartensprache, Einstellungen, Abmelden. Der Sprachschalter verschwindet aus der Kopfzeile.
- **In der Workbench** ersetzt die Workbench-Kopfzeile die App-Kopfzeile (6.3). Die Hauptbereiche erreicht man über „◀ Combos“ und Strg+K. So gewinnt das Board die volle Höhe.
- **Ein einziges `<main>`** pro Seite, dazu `<header>` und `<nav>` als Landmarken. Ein „Zum Inhalt springen“-Link ist der erste fokussierbare Punkt.
- **Verwaltungsseiten** (Start, Combos, Decks, Karten, Einstellungen) nutzen eine Inhaltsbreite von höchstens 1280 px. **Die Workbench nutzt die ganze Fensterbreite.**

### 6.2 Breitenstufen

| Stufe         | Fensterbreite    | Line-Liste                                                                                                  | Staple-Leiste | Inspector | Karte auf dem Board | Chain-Stapel          |
| ------------- | ---------------- | ----------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------------------- | --------------------- |
| **weit**      | ab 1920 px       | 280 px                                                                                                      | 56 px         | 360 px    | 72 px               | Spalte rechts, 160 px |
| **Standard**  | 1440 bis 1919 px | 248 px                                                                                                      | 56 px         | 320 px    | 56 bis 64 px        | Spalte rechts, 104 px |
| **kompakt**   | 1280 bis 1439 px | als Overlay (L)                                                                                             | 48 px         | 288 px    | 56 px               | Spalte rechts, 104 px |
| **zu schmal** | unter 1280 px    | Hinweis „Für die Workbench bitte mindestens 1280 px breit“, Lese- und Nachspielansicht folgt später (UX 12) |

- Seitenleisten lassen sich in der Breite ziehen (Griff mit 8 px Trefferfläche), die Breite wird pro Nutzer gespeichert. Minimum und Maximum je Stufe verhindern, dass das Board zu klein wird.
- Die Kartengröße auf dem Board ergibt sich aus der verfügbaren Fläche (Container-Query), nicht aus der Fensterbreite allein.

### 6.3 Board-Geometrie

Das Board ist ein Raster aus 7 Spalten und 5 Reihen. Eine Zelle muss eine **gedrehte** Karte (Verteidigung) aufnehmen, also so breit sein wie die Karte hoch ist.

```
         Hand ▢ ▢ ▢ ▢ ▢                                 LP 8000
 ┌─────┐ ┌─────┬─────┬─────┬─────┬─────┐ ┌─────┐
 │Deck │ │ S/T │ S/T │ S/T │ S/T │ S/T │ │Extra│   GEGNER
 ├─────┤ ├─────┼─────┼─────┼─────┼─────┤ ├─────┤
 │ GY  │ │ MZ  │ MZ  │ MZ  │ MZ  │ MZ  │ │Feld │
 └─────┘ └─────┴─────┴─────┴─────┴─────┘ └─────┘
 ┌─────┐       ┌─────┐     ┌─────┐       ┌─────┐   ┌ CHAIN ┐
 │Bann.│       │ EMZ │     │ EMZ │       │Bann.│   │ CL2 ▣ │
 └─────┘       └─────┘     └─────┘       └─────┘   │ CL1 ▣ │
 ┌─────┐ ┌─────┬─────┬─────┬─────┬─────┐ ┌─────┐   └───────┘
 │Feld │ │ MZ  │ MZ  │ MZ  │ MZ  │ MZ  │ │ GY  │
 ├─────┤ ├─────┼─────┼─────┼─────┼─────┤ ├─────┤
 │Extra│ │P S/T│ S/T │ S/T │ S/T │P S/T│ │Deck │   ICH
 └─────┘ └─────┴─────┴─────┴─────┴─────┘ └─────┘
         Hand ▣ ▣ ▣ ▣ ▣                                 LP 8000
```

- Anordnung wie auf der offiziellen Spielmatte: eigene Spielfeldzone links, Friedhof rechts, Extra Deck links unten, Deck rechts unten. Der Gegner ist um 180 Grad gedreht. Die Extra Monster Zones liegen über der zweiten und vierten Monsterzone, daneben die Verbannt-Stapel beider Spieler.
- **Rechnung für die Standardstufe (1440 × 900):** Board-Breite 1440 − 248 − 56 − 320 = 816 px. Mit 56 px Kartenbreite ist die Karte 82 px hoch, die Zelle 90 px. 7 Zellen, 6 Abstände von 8 px und 16 px Rand ergeben 710 px; es bleiben 106 px für den Chain-Stapel. In der Höhe: Kopfzeile 44, Schrittleiste 56, fünf Reihen mit Abständen 482, Gegnerhand 40, eigene Hand 90, Rand 24, zusammen 736 px. Das passt in die rund 790 px, die ein Browserfenster bei 900 px Bildschirmhöhe übrig lässt.
- **Gegnerhand** ist eine schmale Reihe mit Kartenrücken in Größe `xs` (beim Going Second mit bekannten Karten deren Bilder). **Eigene Hand** in voller Board-Größe, ab 7 Karten überlappend.
- **Stapel** (Deck, Extra, GY, Verbannt) zeigen die oberste Karte und die Anzahl als Plakette. Ein Klick öffnet die Bildreihe (7.4.2).
- **Leere Zonen** haben einen 1 px Umriss in `--zone` und beim Ziehen einen gefüllten Zustand: gültiges Ziel `--primary` bei 20 %, ungültig (Warnung) `--warning`-Umriss gestrichelt.
- **Link-Pfeile** als kleine Dreiecke am Rand des Link-Monsters in `--self` bzw. `--opponent`; verlinkte leere Zonen bekommen eine feine Tönung.
- **Pendelzonen** tragen ein kleines „P“ und zeigen die Scale, sobald dort ein Pendelmonster liegt.

## 7. Screens

### 7.1 Workbench: Kopfzeile

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ◀  Aluber 1-Card  ·  Branded Despia ▾   [▦ Board | ⊶ Baum]  V   ↶ ↷   △ 1  ✓ gespeichert │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Titel** ist direkt editierbar (Klick oder F2), Deck als Auswahl daneben.
- **Modusschalter** als Radix Toggle Group mit Symbol und Text, das Kürzel V steht daneben.
- **Undo und Redo** als Symbolknöpfe mit Tooltip „Rückgängig (Strg+Z)“. Für Mia sichtbar, für Jonas per Kürzel.
- **Warnungen:** Zähler mit `TriangleAlert`, ein Klick springt zur ersten Warnung. Bei 0 ausgegraut, nicht ausgeblendet, damit das Layout stehen bleibt.
- **Speicherstatus** rechts: „✓ gespeichert“ in `--text-subtle`, „speichert …“ mit Spinner, bei Fehler „Nicht gespeichert · Erneut versuchen“ in `--danger` mit Knopf. Der Status ist eine `aria-live="polite"`-Region.
- Rechts außen ein Menü (`MoreHorizontal`) mit Stresstest, Vergleichen, Duplizieren, Tastenkürzel (?) und Löschen.

### 7.2 Workbench: Board-Modus

```
┌───────────────┬────┬───────────────────────────────────────────────┬────────────────────┐
│ LINES      ⊕  │    │                                               │ INSPECTOR          │
│ ● Goldfish  3 │ ▣  │                                               │ ┌────────────────┐ │
│  1 ▣ NS Aluber│ ▣  │                                               │ │                │ │
│  2 ▣ Aluber ↯ │ ▣  │                  BOARD (6.3)                  │ │   Kartenbild   │ │
│    ⌖ ▣▣▣      │ ▣  │                                               │ │     240 px     │ │
│    ├ B: Ash  1│ ▣  │                                               │ └────────────────┘ │
│    └ C: Imp  2│ ▣  │                                               │ Aluber the Jester… │
│  3 ▣ BF ⇒ Alb.│ ▣  │                                               │ ① If this card is… │
│  4 …          │ …  │                                               │ ② …                │
│               │    │                                               │ Aluber HOPT genutzt│
│ ○ Alt ab 1    │    ├───────────────────────────────────────────────┤ JEV                │
│               │    │ ◀ 2/9 ▶ │ Auflösen ⏎ │ Chainen C │ Gegner O    │ ▣ Br. Fusion ▮▮▮▯ │
└───────────────┴────┴───────────────────────────────────────────────┴────────────────────┘
```

#### 7.2.1 Line-Liste (links)

- **Kopf:** „LINES“ als Großbuchstaben-Beschriftung, Knopf ⊕ für eine neue Line ab der Starthand, Knopf „Vergleichen“ ab zwei Lines.
- **Zeile (28 px):** Schrittnummer (tabellarisch, `--text-subtle`), Artwork-Ausschnitt 24 px, Kurzform in `text-sm`. Rechts Plaketten: Choke-Point-Chips (Artwork der treffenden Staples, 16 px, `--opponent`-Rand), Warnung, Notiz.
- **Gewählter Schritt:** Fläche `--surface-3` und 2 px Kante links in `--primary`. Der gewählte Schritt scrollt immer in den sichtbaren Bereich.
- **Chains** eingerückt um 12 px, mit einer feinen violetten Linie links, die die Links einer Chain verbindet.
- **Gegnerische Schritte** mit 2 px Kante links in `--opponent` und dem Artwork der Karte.
- **Branches** unter ihrem Schritt, eingerückt, mit `GitBranch`-Symbol, Name und Endboard-Zahl rechts. Aufklappen mit Klick auf den Pfeil oder → auf der fokussierten Zeile.
- **Andere Lines** unter der aktuellen, als geschlossene Zeilen mit ○ und Endboard-Zahl.
- **Tastatur:** Die Liste ist ein `tree` nach ARIA (↑ ↓ bewegen, → ← auf- und zuklappen, Enter springt hin).

#### 7.2.2 Staple-Leiste (schmal)

- Senkrechte Spalte mit Staple-Artworks in Größe `xs`, Reihenfolge aus den Einstellungen, verbotene Karten ausgeblendet.
- **Überfahren:** Tooltip mit Kartenname und „trifft Schritt 2, 3“; die betroffenen Schritte in der Line-Liste bekommen gleichzeitig einen roten Punkt. Das verbindet beide Leisten ohne Pfeile.
- **Ziehen:** Das Artwork folgt dem Mauszeiger, gültige Schritte in der Line-Liste und gültige Karten auf dem Board heben sich hervor. Loslassen legt den Branch an (UX 6.8).
- **Tastatur:** O öffnet die Leiste als Liste mit Nummern und Suche; die Karte landet am gewählten Schritt.
- Unten ein Zahnrad-Knopf zur Staple-Auswahl in den Einstellungen.

#### 7.2.3 Board (Mitte)

Aufbau nach 6.3. Hinzu kommen:

- **Seitenkennung:** Ein schmaler Streifen am linken Board-Rand in `--opponent` (obere Hälfte) und `--self` (untere Hälfte), dazu „GEGNER“ und „ICH“ als Beschriftung. So ist die Seite auch ohne Farbe klar.
- **Chain-Stapel** rechts neben dem Raster in der mittleren Höhe: pro Link eine Zeile mit `CL`-Nummer, Artwork `xs` und Kurzname, der neueste Link oben. Gegnerische Links mit `--opponent`-Kante. Ohne offene Chain ist der Platz leer, nicht zusammengeschoben.
- **Drop-Ziele** erscheinen erst beim Ziehen. Die Zone unter dem Mauszeiger zeigt als Beschriftung, was passieren wird („Normal Summon“, „Setzen“, „Aktivieren“). Das ist die Vorschau, die Fehlgriffe verhindert.

#### 7.2.4 Schrittleiste (unten, 56 px)

Die Schrittleiste hat vier Zustände. Sie wechselt ihren Inhalt, aber nie ihre Höhe.

```
Normal       │ ◀ 2 / 9 ▶ │ Nächster Schritt: Karte spielen oder Vorschlag wählen          │
Chain offen  │ ◀ 2 / 9 ▶ │ [Auflösen ⏎]  [Chainen C]  [Gegner reagiert O]                 │
Abfrage      │ Was hast du gesucht?  ▣ ▣ ▣ ▣ ▣  [Alle Karten]  [Später Esc]               │
Angebot      │ ✓ Als Branch „Alt ab 3“ angelegt · [Einfügen]  [Ersetzen]   ▬▬▬▬▭ 5 s      │
```

- **Hauptaktion** in Gold (höchstens eine), weitere Aktionen als Knöpfe mit Rahmen. Jeder Knopf zeigt sein Kürzel als `Kbd` in `--text-subtle`.
- **Abfrage (UX 6.4):** Bildreihe in Größe `sm`, Zahlen 1 bis 9 über den Karten für die Tastatur. Mehrfachauswahl zeigt „2 von 2 gewählt · Enter“.
- **Angebot (UX 6.7):** Ein schmaler Fortschrittsbalken zeigt, wie lange das Angebot noch steht. Überfahren hält die Zeit an (WCAG 2.2.1). Die Meldung wird zusätzlich über `aria-live` angesagt.
- **Autoplay:** Beim Abspielen (Leertaste) zeigt die Leiste Pause, Tempo (0,5 × bis 2 ×) und den Fortschritt.

#### 7.2.5 Inspector (rechts)

Reihenfolge von oben nach unten, damit das Wichtigste ohne Scrollen sichtbar ist:

1. **Kartenbild** in Größe `xl` (bei der kompakten Stufe 200 px).
2. **Kartenname** in `text-md`, darunter Typ, Attribut, Stufe, ATK/DEF in `text-xs`, Banlist-Status als Chip.
3. **Effekte** als nummerierte Blöcke ①②③. Jeder Block ist klickbar (aktiviert den Effekt), zeigt rechts den HOPT-Status (`Lock` oder `LockOpen`) und das Kürzel (1 bis 9). Effekte, die gerade nicht gehen, sind nicht ausgegraut, sondern tragen den Grund („HOPT genutzt“), weil die App nichts verbietet (UX 4.6).
4. **HOPT-Tracker:** Liste der in diesem Zug genutzten Namen, zusammenklappbar.
5. **Jev-Vorschläge:** feste Höhe für drei Einträge, Platzhalter beim Laden. Jeder Eintrag: Artwork, Kartenname, Effektnummer, Balken aus vier Segmenten in `--jev`. Darunter „2 ausgeblendet“ als Link.

Ohne Karte unter dem Mauszeiger zeigt der Inspector den **gewählten Schritt**: Kurzform, Kosten, Ziele, Ergebnis (jeweils bearbeitbar), Notiz als Textfeld, Warnungen mit Begründung.

**Hover ohne Flackern:** Der Inspector wechselt erst nach 80 ms Verweilen auf einer neuen Karte und fällt 300 ms nach Verlassen auf die ausgewählte Karte zurück. Mit gedrückter Alt-Taste bleibt er stehen, damit man den Text in Ruhe lesen kann.

#### 7.2.6 Kartentext mit PSCT-Gliederung

Für Mia besonders wichtig, für Jonas ein schnellerer Blick. Die Effektzerlegung (Projektplan 4.2) kennt Bedingung (vor dem Doppelpunkt) und Kosten (vor dem Semikolon). Der Inspector zeigt das typografisch, ohne den Text zu verändern:

- **Bedingung** in `--text-muted`
- **Kosten** mit gepunkteter Unterstreichung und Tooltip „Kosten: werden auch bei Negierung bezahlt“
- **Wirkung** in `--text`
- **OPT-Klausel** am Ende in `--text-subtle` mit dem HOPT-Symbol

Beim Überfahren eines Choke-Point-Chips hebt der Inspector den Satzteil hervor, auf den die Handtrap reagiert (etwa „add 1 … from your Deck“ bei Ash). Das beantwortet Mias „Warum?“ direkt am Text.

### 7.3 Workbench: Baum-Modus

- **Canvas** in `--bg` mit Punktraster in `--border`, React Flow mit dagre wie heute.
- **Knoten** 224 × 56 px auf `--surface-2`, Radius 8:

```
┌──────────────────────────────────┐
│ ▣  2  Aluber · Suche           ↯ │
│       + Branded Fusion    ⌖ 3  △ │
└──────────────────────────────────┘
```

Artwork 32 px, Schrittnummer, Kurzform in zwei Zeilen, rechts Aktivierungs-, Choke-Point- und Warnsymbol. Gegnerische Knoten mit 3 px Kante links in `--opponent`, Endboard-Knoten mit `Flag` und großer Interruption-Zahl.

- **Kanten:** Hauptline als durchgehende 2-px-Linie in `--text-muted`, gerade nach unten. Branches als 1,5-px-Linie, die Beschriftung (Branch-Name) sitzt als Chip auf der Kante. Kanten zu gegnerischen Reaktionen in `--opponent`.
- **Gewählter Knoten:** Ring `--primary`. Der Pfad von der Wurzel bis dorthin wird hervorgehoben, alle anderen Knoten treten auf 60 % zurück. So ist die aktuelle Line auch in großen Bäumen sofort sichtbar.
- **Zugeklappte Branches** als einzelner Knoten mit „+ 6 Schritte · Endboard 1“.
- **Rechte Seitenleiste** wie der Inspector im Schrittmodus, mit Mini-Board (alle Zonen in Größe `art`).
- **Minimap** unten rechts, abschaltbar. Zoom-Knöpfe mit Tooltip, „Einpassen“ mit Taste 0.

### 7.4 Schwebende Ebenen

#### 7.4.1 Aktionsmenü an der Karte

Öffnet sich per Klick oder Rechtsklick direkt neben der Karte (Radix Dropdown Menu bzw. Context Menu), mit Pfeiltasten bedienbar, Esc schließt und gibt den Fokus an die Karte zurück.

```
┌───────────────────────────────────┐
│ Aluber the Jester of Despia       │
├───────────────────────────────────┤
│ ↯ ① Suche Branded   frei     1    │
│ ↯ ② Fusion Summon   frei     2    │
├───────────────────────────────────┤
│    Position ändern           P    │
│    Auf den Friedhof          G    │
│    Verbannen                 B    │
│    Auf die Hand              H    │
│    Ins Deck               ▸  D    │
├───────────────────────────────────┤
│    Kartenansicht öffnen           │
└───────────────────────────────────┘
```

- Effekte zuerst, weil sie am häufigsten gebraucht werden. Danach Beschwörungsarten, danach Bewegungen.
- Kürzel rechtsbündig in Geist Mono.
- Höchstens 12 Einträge; alles Weitere unter „Weitere“.
- Das Menü verdeckt nie die Karte selbst und weicht an Bildschirmrändern aus (Radix Collision Handling).

#### 7.4.2 Stapel-Ansicht

Friedhof, Verbannt, Extra Deck oder Deck öffnen sich als Leiste über dem Board, verankert am Stapel. Bildreihe in Größe `sm`, horizontal scrollbar, mit Filterfeld ab 10 Karten. Karten lassen sich direkt aus der Leiste ziehen oder per Klick-Menü spielen. Schließt mit Esc, Klick daneben oder erneutem Klick auf den Stapel.

#### 7.4.3 Befehlspalette und Schnellauswahl

Beide auf Basis von `cmdk` (shadcn Command):

- **Strg+K:** Karten, Combos, Decks und Aktionen in Gruppen, jede mit Symbol bzw. Artwork. Leer zeigt sie die zuletzt benutzten Einträge.
- **/ (Schnellauswahl):** Schmaleres Feld direkt über dem Board. Findet nur Karten der aktuellen Combo und zeigt, wo sie liegen („Hand“, „MZ 3“, „Deck“). Enter wählt die Karte aus, das Aktionsmenü öffnet sich.

#### 7.4.4 Kartenansicht

Overlay von rechts (Sheet, 480 px) mit großem Bild, vollem Text in beiden Sprachen, Effektliste, Banlist-Status, Rulings-Hinweisen und „Effekte bearbeiten“ (UX 8). Die Workbench bleibt dahinter sichtbar.

#### 7.4.5 Endboard und Vergleich

- **Endboard-Zusammenfassung** ersetzt am letzten Schritt den Inhalt des Inspectors: große Interruption-Zahl in `text-xl`, darunter die Karten als Reihe in Größe `sm` mit Häkchen „zählt als Unterbrechung“, dann Ressourcen, Kosten, HOPTs und Schwachstellen.
- **Vergleich** als Overlay über dem Board mit bis zu vier Spalten (Skizze in UX 6.9). Fehlende Karten gegenüber der Hauptline bei 40 % Deckkraft mit gestricheltem Umriss. Die Spalte mit den meisten Interruptions trägt einen dezenten Gold-Rand.

#### 7.4.6 Tastaturhilfe

? öffnet ein Overlay mit allen Kürzeln aus UX 9 in Gruppen (Navigation, Spielen, Chain, Bearbeiten). Die Kürzel sind als `Kbd` dargestellt, die Liste ist durchsuchbar.

### 7.5 Verwaltungsseiten

Diese Seiten sind seltener in Gebrauch und folgen einem ruhigeren, großzügigeren Raster (Inhaltsbreite bis 1280 px, Abstände 16 bis 32 px, `text-base`).

#### 7.5.1 Start

```
┌──────────────────────────────────────────────────────────────────┐
│ Weiter bearbeiten                                                │
│ ┌──────────────────────────────┐  ┌──────────────────────────┐   │
│ │ ▣▣  Aluber 1-Card            │  │ Neue Combo               │   │
│ │     Branded Despia · vor 2 h │  │ Deck ▾   [Starthand …]   │   │
│ │     Schritt 7 · Endboard 3   │  └──────────────────────────┘   │
│ └──────────────────────────────┘                                 │
│ Zuletzt bearbeitet                                               │
│ ▣ Albaz 2-Card        Branded Despia   4 Lines   Endboard 4      │
│ ▣ Aluber + Nadir      Branded Despia   2 Lines   Endboard 3      │
└──────────────────────────────────────────────────────────────────┘
```

- Beim ersten Besuch stattdessen die drei Einstiegsschritte als Checkliste (UX 11), mit dem YDK-Import als Hauptknopf.

#### 7.5.2 Bibliothek (Combos)

- **Filterleiste** oben: Deck, Starterkarte (Kartensuche), Tags, Status als Chips. Aktive Filter sind entfernbar, die URL enthält sie.
- **Liste** statt Kacheln, weil Spieler vergleichen: Starthand-Artworks, Titel, Deck, Lines, Branches, Endboard-Zahl, Status-Chip, zuletzt bearbeitet. Sortierbar nach jeder Spalte. Ab 50 Einträgen virtualisiert.
- **Warnhinweis** bei Deck-Änderungen als `TriangleAlert` am Titel (UX 7.4).
- **Leere Liste:** Erklärung in einem Satz und „Neue Combo“ als Hauptknopf; bei Filtern ohne Treffer „Filter zurücksetzen“.

#### 7.5.3 Neue Combo und Starthand

- Deckraster in Größe `lg`, gruppiert nach Starter, Extender, Handtraps, Rest (soweit aus vorhandenen Combos bekannt), sonst nach Kartentyp.
- Gewählte Karten erhalten den Gold-Ring und erscheinen oben in einer Starthand-Leiste mit Zähler „1-Card“ bis „5 Karten“.
- Schalter „Going Second“ blendet eine zweite, kleinere Leiste für das Gegnerboard ein.
- Hauptknopf „Los“ (Enter) unten rechts, immer sichtbar.

#### 7.5.4 Deckseite und Hand-Tester

- **Tabs:** Deckliste, Combos, Hand-Tester (Radix Tabs, URL enthält den Tab).
- **Deckliste:** Main, Extra, Side als Bildraster in Größe `lg` mit Anzahl-Plakette; Wechsel zu einer kompakten Textliste für Jonas. YDK-Import und Export oben rechts.
- **Hand-Tester:** gezogene Hand in Größe `lg`, darunter passende Combos als Liste; Abdeckung als große Zahl mit einem einfachen Balken und dem Hinweis, über wie viele Hände gerechnet wurde.

#### 7.5.5 Kartensuche

- Suchfeld mit Filtern (Typ, Attribut, Stufe, Archetyp, Banlist) als Chips.
- Ergebnis als Bildraster (Standard) oder Liste, virtualisiert.
- Überfahren zeigt eine Vorschau (Hover Card), Klick öffnet die Kartenansicht (7.4.4).

#### 7.5.6 Einstellungen

Eine Seite mit Abschnitten statt Unterseiten: Darstellung (Design, Oberflächensprache, Kartensprache), Staples (sortierbare Liste mit Schaltern), Workbench (Autoplay-Tempo, Hinweise zurücksetzen), Konto. Änderungen gelten sofort, ohne Speichern-Knopf.

## 8. Komponenten

### 8.1 Grundkomponenten

| Komponente                                      | Basis                             | Stand     | Anmerkung                                                                                                                 |
| ----------------------------------------------- | --------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------- |
| Button                                          | shadcn                            | anpassen  | Varianten: primär (Gold/Grün), Rahmen, Geist, Gefahr, Symbol; Größen 28, 32, 40 px                                        |
| Kbd                                             | eigene                            | neu       | Tastenkürzel, Geist Mono, `text-xs`, 1 px Rahmen                                                                          |
| Tooltip                                         | Radix Tooltip                     | neu       | 400 ms Verzögerung, in einer Gruppe danach sofort; nie der einzige Weg zu einer Information, die man zum Bedienen braucht |
| Toggle Group                                    | Radix                             | neu       | Board/Baum, Liste/Raster                                                                                                  |
| Dropdown Menu, Context Menu                     | Radix                             | neu       | Aktionsmenü an der Karte, Menüs der Kopfzeile                                                                             |
| Command                                         | cmdk (shadcn)                     | neu       | Befehlspalette, Schnellauswahl, Staple-Suche                                                                              |
| Alert Dialog                                    | Radix                             | neu       | nur für destruktive Aktionen (UX 10)                                                                                      |
| Tabs                                            | Radix                             | neu       | Deckseite                                                                                                                 |
| Hover Card                                      | Radix                             | neu       | Kartenvorschau außerhalb der Workbench                                                                                    |
| Resizable                                       | `react-resizable-panels` (shadcn) | neu       | Seitenleisten der Workbench                                                                                               |
| Sheet                                           | shadcn                            | vorhanden | Kartenansicht, Line-Liste in der kompakten Stufe                                                                          |
| Select                                          | shadcn                            | vorhanden | ersetzt alle nativen `select`-Felder                                                                                      |
| Popover, Scroll Area, Skeleton, Input, Checkbox | shadcn                            | vorhanden | Tokens anpassen                                                                                                           |
| Toast                                           | vorhanden                         | anpassen  | nur für Hintergrundereignisse (Import fertig, Speichern fehlgeschlagen), nie für den Spielfluss                           |

### 8.2 Fachkomponenten

| Komponente                             | Aufgabe                                           | Ersetzt heute                        |
| -------------------------------------- | ------------------------------------------------- | ------------------------------------ |
| `CardView`                             | Karte in allen Größen und Zuständen (Abschnitt 5) | Kartenbilder in mehreren Komponenten |
| `Board`, `ZoneSlot`, `PileStack`       | Spielfeld mit Zonen, Stapeln und Drop-Zielen      | `StatePanel`                         |
| `ChainStack`                           | offene Chain                                      | Chain-Liste im `StatePanel`          |
| `LineList`, `LineStep`                 | Line-Liste mit Branches, Chains und Plaketten     | nicht vorhanden                      |
| `StapleRail`                           | Staple-Leiste                                     | Schnellauswahl im `NodeEditor`       |
| `StepBar`, `PromptRow`                 | Schrittleiste mit ihren vier Zuständen            | nicht vorhanden                      |
| `Inspector`, `CardText`, `HoptTracker` | rechte Seitenleiste, PSCT-Gliederung              | `NodeEditor`                         |
| `SuggestionList`                       | Jev-Vorschläge mit fester Höhe                    | `SuggestionPanel`                    |
| `TreeNode`, `TreeEdge`                 | Knoten und Kanten im Baum-Modus                   | Knoten in `ComboCanvas`              |
| `EndboardSummary`, `CompareView`       | Endboard und Vergleich                            | nicht vorhanden                      |
| `SaveIndicator`, `WarningCount`        | Status in der Kopfzeile                           | Speichertext im `ComboEditor`        |
| `ShortcutHelp`                         | Tastaturhilfe                                     | nicht vorhanden                      |

Fachkomponenten liegen in `src/components/combo/` bzw. `src/components/cards/`. Grundkomponenten bleiben in `src/components/ui/`.

### 8.3 Neue Abhängigkeiten

| Paket                                                                                                    | Wofür                                | Warum nicht selbst bauen                                                                 |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------- |
| `cmdk`                                                                                                   | Befehlspalette, Schnellauswahl       | Tastaturführung, Filterung und ARIA sind fertig und erprobt                              |
| `@radix-ui/react-*` (tooltip, toggle-group, dropdown-menu, context-menu, alert-dialog, tabs, hover-card) | Grundkomponenten                     | Fokusführung und Screenreader-Verhalten sind der schwierige Teil                         |
| `react-resizable-panels`                                                                                 | Seitenleisten ziehbar                | Tastaturbedienung der Griffe und gespeicherte Breiten                                    |
| `motion`                                                                                                 | Kartenbewegung zwischen Zonen (FLIP) | Bewegung zwischen verschiedenen Containern ist mit reinem CSS mühsam; siehe Abschnitt 14 |

## 9. Zustände und Rückmeldung

### 9.1 Zustände jedes Bedienelements

Jede interaktive Komponente definiert alle diese Zustände, in beiden Designs:

| Zustand     | Regel                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------- |
| Hover       | Fläche eine Stufe heller (`--surface-3`), `--motion-fast`                                          |
| Fokus       | 2 px Ring `--primary` mit 2 px Abstand, nur bei `:focus-visible`; mindestens 3:1 gegen jede Fläche |
| Gedrückt    | Fläche eine Stufe dunkler, kein Verschieben                                                        |
| Ausgewählt  | wie Fokus, aber dauerhaft; zusätzlich `aria-selected` bzw. `aria-pressed`                          |
| Deaktiviert | 40 % Deckkraft und Tooltip mit Grund. Sparsam: Die App verbietet wenig (UX 4.6)                    |
| Lädt        | Platzhalter in fester Größe (Skeleton), nie ein Spinner, der das Layout verschiebt                 |
| Fehler      | Text in `--danger` mit Symbol und einem nächsten Schritt („Erneut versuchen“)                      |

### 9.2 Rückmeldung nach Wichtigkeit

1. **Im Fluss** (jeder Schritt): Kartenbewegung, Aufleuchten, neue Zeile in der Line-Liste. Kein Text.
2. **Hinweis** (Branch angelegt, Abfrage offen): Schrittleiste, verschwindet von selbst.
3. **Status** (Speichern, Warnungszahl): Kopfzeile, dauerhaft, unauffällig.
4. **Hintergrund** (Import fertig, Jev nicht erreichbar): Toast unten rechts, 5 Sekunden, mit Aktion.
5. **Bestätigung** (Combo löschen, Deck ersetzen): Alert Dialog. Einziger Fall, der den Fluss unterbricht.

### 9.3 Tempo als Anforderung

Die UX verspricht, dass Eingeben so schnell geht wie Denken. Das setzt harte Grenzen:

- **Reaktion auf eine Geste** (Karte abgelegt, Schritt gewechselt) unter 100 ms bis zur sichtbaren Änderung, gemessen als INP. `stateAt` läuft für den Pfad, nicht für den ganzen Baum.
- **Jev und Speichern** laufen im Hintergrund und blockieren nie eine Eingabe. Die Oberfläche wartet nie auf den Server (optimistische Aktualisierung, Autosave wie heute).
- **Baum-Modus** wird erst beim ersten Wechsel geladen; React Flow bleibt danach im Speicher, damit V sofort umschaltet.
- **Große Listen** (Deckraster, Suche, Bibliothek) sind virtualisiert.

## 10. Barrierefreiheit

- **Landmarken:** `header`, `nav`, ein `main`; in der Workbench zusätzlich benannte Bereiche („Lines“, „Staples“, „Spielfeld“, „Inspector“) als `region`. F6 springt zwischen den Bereichen.
- **Board:** Jede Zone ist ein fokussierbares Element mit Namen („Monsterzone 3, eigene Seite, Aluber the Jester of Despia, Angriff“ bzw. „leer“). Pfeiltasten bewegen den Fokus im Raster (roving tabindex), Enter öffnet das Aktionsmenü. Tab verlässt das Board.
- **Drag:** dnd-kit mit Tastatur-Sensor. Leertaste hebt eine Karte auf, Pfeiltasten wählen die Zone, Leertaste legt ab, Esc bricht ab. Zusätzlich hat jede Drag-Aktion einen Menüeintrag (WCAG 2.5.7).
- **Ansagen:** Eine `aria-live="polite"`-Region sagt nach jedem Schritt die Kurzform an („Schritt 3: Branded Fusion aktiviert, Chain Link 1“). Beim Nachspielen ebenso.
- **Fokus bleibt sichtbar:** Die Schrittleiste und schwebende Menüs verdecken nie das fokussierte Element (WCAG 2.4.11); die Line-Liste scrollt den Fokus mit Abstand in den sichtbaren Bereich.
- **Zoom:** Bei 200 % Browser-Zoom fällt die Workbench auf die kompakte Stufe zurück, Verwaltungsseiten bleiben ohne waagerechtes Scrollen lesbar.
- **Farbsehschwäche:** Alle Bedeutungen haben Symbol oder Position (4.3). Vor jeder Phase wird das UI mit einer Deuteranopie- und Protanopie-Simulation (Chrome DevTools) geprüft.
- **Sprache:** `lang="de"` bzw. `lang="en"` für die Oberfläche, `lang="en"` für englische Kartentexte.

## 11. Sprache und Texte in der Oberfläche

- **Du-Form**, knapp und im Ton eines Mitspielers: „Was hast du gesucht?“, nicht „Bitte wählen Sie die gesuchte Karte aus“.
- **Spielbegriffe bleiben englisch** (UX 3): Normal Summon, Chain, Branch, Endboard. Deutsche Wörter für alles, was kein Spielbegriff ist: Rückgängig, Einstellungen, Suchen.
- **Knöpfe sind Verben oder Ergebnisse:** „Neue Combo“, „Auflösen“, „Stresstest starten“; kein „OK“, kein „Absenden“.
- **Fehlermeldungen** sagen, was passiert ist und was jetzt geht: „Nicht gespeichert · Erneut versuchen“, „Jev nicht erreichbar · Vorschläge später“.
- **Leere Zustände** folgen demselben Muster: ein Satz, was fehlt, ein Knopf für den nächsten Schritt.
- **Nie „Knoten“** in der Oberfläche, immer „Schritt“ (UX 3).
- **Länge:** Deutsche Texte sind bis zu 30 % länger als englische. Knöpfe haben keine feste Breite, Beschriftungen in engen Bereichen (Line-Liste, Schrittleiste) werden in beiden Sprachen geprüft.
- Alle Texte liegen in `messages/` (i18next), auch Tooltips und Ansagen für Bildschirmleser.

## 12. Die Personas im Durchlauf

Jede Phase wird mit diesen vier Durchläufen geprüft. Sie ergänzen die Stoppuhr-Szenarien aus UX 13 um die Frage, ob die Oberfläche an jeder Stelle verständlich ist.

**Jonas gibt eine bekannte Line ein (nur Tastatur)**

1. Strg+K, „neue combo“, Enter. Starthand: „alub“, Enter, Enter. Die Workbench öffnet sich, der Fokus liegt auf dem Board.
2. `/` „alub“, Enter, N: Normal Summon. Die Schrittleiste bietet sofort „Trigger: Aluber (Suche)“ an, Enter.
3. Abfrage „Was hast du gesucht?“: Die Bildreihe zeigt die passenden Karten mit Nummern, 1 wählt Branded Fusion.
4. **Prüfpunkte:** Wird jeder Schritt angesagt und hervorgehoben? Steht an jedem Knopf das Kürzel? Muss er je zur Maus greifen?

**Jonas testet die Line gegen Handtraps**

1. Stresstest über das Menü der Kopfzeile. Die Line-Liste zeigt Choke-Point-Chips an den Schritten 2 und 3.
2. Klick auf den Ash-Chip an Schritt 2: Branch „B: Ash auf 2“ entsteht, das Board springt hinein, die Chain zeigt Ash als CL2 in Rot.
3. Er spielt den Extender, markiert das Endboard (E), öffnet den Vergleich.
4. **Prüfpunkte:** Sieht er ohne Moduswechsel, welche Line wie viel verliert? Ist klar, in welchem Branch er gerade ist (Kopf der Line-Liste, Kante der Schrittliste)?

**Mia lernt eine gespeicherte Line**

1. Bibliothek, Filter „Branded Despia“, Combo öffnen. Sie sieht die Line-Liste und den Inspector mit der Starthand.
2. Sie klickt „▶“ in der Schrittleiste (nicht die Leertaste, die sie nicht kennt). Das Board spielt ab, Notizen erscheinen groß im Inspector.
3. An Schritt 2 sieht sie den roten Ash-Chip, fährt darüber und liest „Ash trifft: add from Deck“, der Satzteil im Kartentext ist hervorgehoben.
4. **Prüfpunkte:** Findet sie Abspielen, Tempo und Branches ohne Kürzel? Versteht sie das Choke-Point-Symbol ohne Legende? Löst ein versehentlicher Klick aufs Board keinen neuen Schritt aus (UX 6.10)?

**Mia legt ihre erste eigene Combo an**

1. Startseite mit Checkliste, YDK-Import, Deck erscheint.
2. „Neue Combo“, sie klickt zwei Karten im Raster an, „Los“.
3. Sie zieht eine Karte auf eine Monsterzone; die Zone zeigt beim Ziehen „Normal Summon“. Ein Effekt kommt aus dem Klick-Menü.
4. Sie macht einen Fehler und findet den Rückgängig-Knopf in der Kopfzeile.
5. **Prüfpunkte:** Braucht sie an irgendeiner Stelle eine Erklärung? Sind die einmaligen Hinweise da, wo sie hinschaut, und nicht im Weg?

## 13. Umsetzung

### 13.1 Reihenfolge

Die UI-Arbeit läuft mit den Phasen des UX-Plans (UX 17), mit einer Phase davor:

| Phase              | UI-Inhalt                                                                                                                                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI-0 Grundlage** | Tokens in `globals.css` (Abschnitt 4), Arial-Regel entfernen, Design-Umschaltung, neue App-Shell (eine Kopfzeile, ein `main`, volle Breite für die Workbench), Grundkomponenten aus 8.1, `CardView`, Musterseite |
| **mit UX-1**       | Workbench-Raster mit Breitenstufen, Kopfzeile, Line-Liste, Inspector, Board mit Zonen, Baum-Modus mit neuen Knoten                                                                                               |
| **mit UX-2**       | Aktionsmenü, Drag und Drop mit Vorschau, Schrittleiste mit allen Zuständen, Stapel-Ansicht, Kartenbewegung, Schnellauswahl                                                                                       |
| **mit UX-3**       | Staple-Leiste, Choke-Point-Chips, PSCT-Hervorhebung, Endboard-Zusammenfassung, Vergleich                                                                                                                         |
| **mit UX-4**       | Autoplay-Steuerung, Notizen, Bibliothek, Startseite                                                                                                                                                              |
| **mit UX-5**       | Deckseite mit Tabs, Hand-Tester, Starthand-Raster, Kartenansicht mit Effekt-Korrektur                                                                                                                            |
| **mit UX-6**       | Tastaturhilfe, Befehlszeile, Feinschliff der Dichte                                                                                                                                                              |

Die **Musterseite** (`/dev/ui`, nur in der Entwicklung) zeigt alle Tokens und Komponenten in allen Zuständen, in beiden Designs nebeneinander. Sie ersetzt ein eigenes Storybook und ist der Ort für Reviews.

### 13.2 Fertig ist eine Komponente, wenn …

- alle Zustände aus 9.1 in beiden Designs umgesetzt und auf der Musterseite zu sehen sind,
- sie vollständig per Tastatur bedienbar ist und einen zugänglichen Namen hat,
- alle Texte in Deutsch und Englisch vorliegen und in beiden Sprachen passen,
- sie bei 1280, 1440 und 1920 px geprüft ist,
- `prefers-reduced-motion` berücksichtigt ist,
- beim Laden nichts springt,
- die betroffenen Persona-Durchläufe aus Abschnitt 12 bestanden sind.

### 13.3 Was mit alten Dateien passiert

- `FARBSCHEMA.md` wird durch Abschnitt 4 ersetzt und kann entfallen, sobald UI-0 umgesetzt ist.
- `NodeEditor.tsx` und `StatePanel.tsx` entfallen mit UX-2, `SuggestionPanel.tsx` geht in `SuggestionList` auf.
- `app/page.tsx` wird zur Startseite aus 7.5.1.

## 14. Offen

| Frage                                       | Empfehlung                                                                                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bibliothek für die Kartenbewegung           | `motion` mit gemeinsamen Layout-IDs; eigene FLIP-Lösung nur, wenn die Paketgröße stört                                                                        |
| Design-Umschaltung                          | eigene kleine Lösung mit Klasse am `<html>` und Wert aus den Nutzereinstellungen; `next-themes` nur, wenn das Aufblitzen beim Laden anders nicht verschwindet |
| Hauptfarbe im dunklen Design                | Gold (Abschnitt 4.3); Alternative wäre ein aufgehelltes Grün, das aber zu nah an `--jev` liegt                                                                |
| Einstellbare Dichte (kompakt / komfortabel) | nicht in UI-0; erst, wenn die Durchläufe mit Mia zeigen, dass kompakt zu eng ist                                                                              |
| Eigene Symbole für Spielbegriffe            | vorerst lucide; eigene Symbole nur für Chain Link und Choke Point, falls `Link` und `Crosshair` im Test nicht verstanden werden                               |
| Schrift                                     | Geist beibehalten; sie ist schon geladen und hat tabellarische Ziffern                                                                                        |
| Musterseite statt Storybook                 | Musterseite, weil sie ohne weiteres Werkzeug auskommt und mit den echten Tokens läuft                                                                         |
