# DuelPath: UX-Plan

Stand: 30.09.2026 · Grundlage für das UI-Rework. Erst wenn dieser Plan steht, wird das UI gestaltet.

Dieser Plan beschreibt, **wie sich DuelPath anfühlen und bedienen lassen soll**. Farben, Typografie und Komponenten folgen im UI-Plan und müssen sich an diesem Dokument messen lassen. Technische Grundlagen (Datenmodell, `stateAt`, Jev, Rulings) stehen in `Projektplan-Umbau.md`; dieser Plan setzt darauf auf und nennt in Abschnitt 16, was dort noch fehlt.

## 1. Für wen wir bauen

### Hauptpersona: Jonas, 27, Turnierspieler seit 10 Jahren

- Spielt Locals, regionale Turniere und YCS. Testet jeden Abend mehrere Stunden in EDOPro oder DuelingBook, schaut Top-Decklisten und Replays.
- Denkt in **Lines**: „Normal Summon Aluber, Branded Fusion suchen, Fusion in Albion …“. Schreibt sie heute als Stichpunkte in Discord oder Notizen und verliert dabei den Überblick über Zustände und Verzweigungen.
- Kennt die Karten auswendig, nennt sie beim Spitznamen (Ash, Imperm, Nib, Called, Droll, Belle) und liest PSCT flüssig auf Englisch.
- Seine eigentliche Frage ist nie „Wie geht die Combo?“, sondern: **„Wo kann der Gegner mich stoppen, und was bleibt dann übrig?“** Er sucht Choke Points, Extender und das beste Endboard gegen jede Unterbrechung.
- Hat keine Geduld für Formulare, Dialoge und Klick-Ketten. Wenn eine Eingabe länger dauert als der Zug im Spiel, benutzt er das Tool nicht.

### Nebenpersona: Mia, 19, Locals-Spielerin, lernt gerade ein neues Deck

- Spielt seit zwei Jahren wöchentlich im Laden. Hat sich ein Deck nach einer Topliste gebaut und lernt die Lines aus Videos und Guides.
- Kennt die gängigen Handtraps, aber nicht jede Karte des neuen Decks und nicht jeden Spitznamen. Liest Kartentexte noch nach.
- Will vor allem **nachspielen und verstehen**: Warum ist dieser Schritt ein Choke Point? Welchen Extender spiele ich, wenn Ash kommt?
- Nutzt keine Tastenkürzel, sucht Funktionen über das, was sie sieht.

Jonas bestimmt, wie schnell die Eingabe sein muss. Mia bestimmt, wie auffindbar und erklärend die Oberfläche sein muss. Wenn beide kollidieren, gewinnt Jonas bei der Eingabe und Mia beim Nachspielen.

### Für wen wir nicht bauen

- Einsteiger, die die Regeln erst lernen. DuelPath erklärt Rulings nicht von Grund auf.
- Spieler, die gegen andere spielen wollen. DuelPath ist kein Simulator, es gibt keinen Gegner, der selbst entscheidet.
- OCG- und Master-Duel-Spieler. Kartenpool und Banlist sind TCG (siehe Projektplan, Abgrenzung).

### Was Jonas von DuelPath erwartet

1. Eine Line **so schnell eingeben, wie er sie im Kopf hat**.
2. An jeder Stelle **„Was, wenn Ash hier?“** fragen können, mit einem Griff.
3. Jederzeit **sehen, wie das Board steht**, ohne es sich vorzustellen.
4. Am Ende wissen: **Endboard, Unterbrechungen, Schwachstellen**.
5. Das alles in einer Umgebung, die sich wie das Spiel anfühlt, nicht wie eine Tabellenkalkulation.

## 2. Jobs to be done (nach Häufigkeit)

| #   | Job                                                       | Wie oft            | Heute in DuelPath                                                                 |
| --- | --------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------- |
| 1   | Eine neue Line aus einer Starthand eingeben (Goldfish)    | täglich, mehrfach  | möglich, aber jeder Schritt braucht Auswahlfelder und manuelle Bewegungen         |
| 2   | Eine Line gegen Handtraps stresstesten und Zweige anlegen | täglich            | möglich über Gegner-Knoten, aber umständlich und nur an vorher angelegten Stellen |
| 3   | Eine gespeicherte Line nachspielen, um sie zu lernen      | mehrmals pro Woche | nur durch Klicken im Baum, kein echtes Nachspielen                                |
| 4   | Endboard und Ressourcen einer Line vergleichen            | mehrmals pro Woche | nicht vorhanden                                                                   |
| 5   | Prüfen, welche Starthände eines Decks eine Line haben     | pro Deck-Änderung  | nicht vorhanden                                                                   |
| 6   | Nach einer Deck-Änderung prüfen, welche Lines noch gehen  | pro Deck-Änderung  | nicht vorhanden; entfernte Karten fallen erst beim Öffnen der Combo auf           |
| 7   | Deck bauen oder per YDK übernehmen                        | pro Deck           | vorhanden, altes Design                                                           |
| 8   | Eine Line mit Teamkollegen teilen                         | gelegentlich       | nicht vorhanden, bewusst nicht geplant (Abschnitt 18)                             |

Die UX wird für Job 1 und 2 optimiert. Alles andere darf sie nicht bremsen.

## 3. Sprache und mentales Modell

Die App spricht die Sprache der Community. Fachbegriffe bleiben englisch, auch in der deutschen Oberfläche, weil jeder Spieler sie so kennt.

| Begriff in der App     | Bedeutung                                                                 | Ersetzt heute                 |
| ---------------------- | ------------------------------------------------------------------------- | ----------------------------- |
| **Schritt**            | Eine Handlung des Spielers oder des Gegners, eine Zeile in der Line-Liste | Knoten                        |
| **Line**               | Folge von Schritten von der Starthand bis zum Endboard                    | „Combo“ als einzelner Pfad    |
| **Hauptline**          | Die Line, die ohne Unterbrechung gespielt wird (Goldfish)                 | „Keine Reaktion“-Zweig        |
| **Combo**              | Sammlung von Lines zu einer Starthand, mit allen Zweigen                  | Combo                         |
| **Branch**             | Abzweig, wenn der Gegner reagiert oder man anders spielt                  | Gegner-Knoten mit Kindern     |
| **Choke Point**        | Schritt, an dem eine Unterbrechung die Line stoppt oder stark schwächt    | nicht vorhanden               |
| **Staple / Handtrap**  | Gängige Unterbrechung aus der Hand oder vom Feld (Ash, Imperm, Solemn …)  | Staple-Liste im Gegner-Knoten |
| **Endboard**           | Zustand am Ende einer Line                                                | „Endboard“-Knoten             |
| **Interruptions**      | Anzahl Unterbrechungen auf dem Endboard                                   | nicht vorhanden               |
| **Starter / Extender** | Karte, die eine Line startet / fortsetzt, wenn sie gestoppt wurde         | nicht vorhanden               |
| **HOPT / SOPT**        | Hard / Soft Once per Turn                                                 | „OPT“ mit Textbeschreibung    |
| **Chain Link (CL)**    | Glied der Chain                                                           | vorhanden                     |
| **Goldfish**           | Line ohne gegnerische Reaktion                                            | „Keine Reaktion“              |

**Das mentale Modell:** Eine Combo ist eine **Hauptline** (Goldfish), von der an Choke Points **Branches** abgehen. Der Baum ist das Abbild davon, nicht umgekehrt. Nutzer denken nicht in „Knotentypen“, sondern in Aktionen: _Normal Summon, Aktivieren, Beschwören, Chain, Gegner reagiert, Endboard_.

**Abbildung auf das Datenmodell** (für die Umsetzung, nicht für die Oberfläche):

| UX-Begriff      | Datenmodell heute                                  | Was sich ändert                                                            |
| --------------- | -------------------------------------------------- | -------------------------------------------------------------------------- |
| Schritt         | `ComboNode` mit `ACTION`, `ACTIVATE` oder `END`    | `RESOLVE` erscheint nicht als eigener Schritt, sondern als Folge der Chain |
| Line            | Pfad von der Wurzel bis zu einem Blatt             | keine                                                                      |
| Hauptline       | nicht modelliert                                   | Reihenfolge der Kinder, das erste Kind ist die Hauptline                   |
| Branch          | Kind eines `OPPONENT`-Knotens, Name in `edgeLabel` | jeder Knoten darf mehrere Kinder haben, `OPPONENT` wird überflüssig        |
| Gegner reagiert | `ACTIVATE` mit `player = opponent` und `negates`   | keine                                                                      |

## 4. UX-Prinzipien

Jede Designentscheidung wird gegen diese Prinzipien geprüft.

1. **Board first.** Das Spielfeld ist der Mittelpunkt. Karten werden dort gespielt, wo sie liegen, nicht in Formularen ausgewählt.
2. **Eine Aktion, eine Geste.** Normal Summon ist ein Klick oder eine Taste, kein Dialog. Die App kennt Zonen und Kartentypen und erzeugt die Bewegungen selbst.
3. **Goldfish zuerst, Stresstest danach.** Die Hauptline wird ohne Unterbrechung durchgespielt. Branches entstehen hinterher dort, wo sie gebraucht werden.
4. **Tastatur und Maus gleichwertig.** Alles geht mit der Maus. Wer schneller sein will, nimmt die Tastatur. Nichts ist nur per Tastatur und nichts ist nur per Drag erreichbar.
5. **Vertraut wie das Spiel.** Feldaufbau, Chain-Anzeige und Kartenvorschau orientieren sich an Master Duel und EDOPro. Kein neues Vokabular, wo es schon eines gibt.
6. **Alles sehen, nichts verbieten.** Regelverstöße werden sichtbar markiert, aber nie blockiert. Der Spieler weiß es oft besser als die Engine, und manche Rulings sind unklar.
7. **Was hat sich geändert?** Nach jedem Schritt ist sofort erkennbar, welche Karten sich bewegt haben. Ohne diese Hervorhebung ist ein Board mit 20 Karten unlesbar.
8. **Undo überall.** Jede Aktion ist mit Strg+Z rückgängig zu machen. Wer keine Angst vor Fehlern hat, probiert mehr aus.
9. **Zurückgehen ist gefahrlos.** Wer an einem früheren Schritt etwas anderes spielt, legt einen Branch an und überschreibt nichts. Ersetzen ist möglich, aber nie der Standard.
10. **Dicht, aber ruhig.** Viel Information pro Bildschirm, aber klare Hierarchie. Kartenbilder tragen die Wiedererkennung, Text ergänzt.
11. **Automatik ist korrigierbar.** Alles, was die App aus dem Kartentext ableitet (Effekte, Suchziele, Interruptions, Choke Points), ist ein Vorschlag, den der Nutzer an Ort und Stelle ändern kann.
12. **Jev berät, entscheidet nicht.** Vorschläge sind Abkürzungen, keine Pflicht. Sie erscheinen, wo man hinschaut, und stören nie beim Eingeben.

## 5. Informationsarchitektur

```
DuelPath
├── Start            Zuletzt bearbeitete Combos, Schnellstart aus Deck, erste Schritte
├── Combos           Bibliothek: nach Deck, Starter, Tags, Status filtern
│   └── Combo        Workbench: Board-Modus und Baum-Modus
├── Decks            Deckliste, Deckbau, YDK, Hand-Tester, Combos des Decks
├── Karten           Kartensuche mit Filtern und Kartenansicht (auch als Overlay überall)
└── Einstellungen    Kartensprache, Oberflächensprache, Design, Staple-Auswahl
```

- **Start statt Marketing.** Wer die App öffnet, sieht seine zuletzt bearbeiteten Combos und startet mit zwei Klicks eine neue aus einem Deck. „Weiter bearbeiten“ öffnet die letzte Combo am zuletzt gewählten Schritt. Keine Marketing-Startseite für angemeldete Nutzer.
- **„Workbench“ meint nur den Combo-Editor.** Die Startseite heißt „Start“, damit der Begriff eindeutig bleibt.
- **Deck und Combo sind verbunden.** Jede Deckseite zeigt ihre Combos. Jede Combo zeigt ihr Deck. Wechsel in beide Richtungen mit einem Klick.
- **Kartensuche ist global.** Strg+K öffnet überall Suche und Befehle. Die Kartenansicht ist ein Overlay, kein Seitenwechsel.
- **Adressen merken sich den Ort.** Die URL einer Combo enthält den gewählten Schritt und den Modus (`/combos/<id>?step=<node>&view=board`). Neu laden, Zurück-Taste und Lesezeichen landen an derselben Stelle.

## 6. Die Combo-Workbench

Hier verbringt der Nutzer 90 % seiner Zeit.

### 6.1 Aufbau: zwei Modi

Die Workbench hat zwei Vollbild-Modi, zwischen denen der Nutzer mit **V** oder einem Schalter im Kopf wechselt. Beide zeigen dieselbe Combo; der ausgewählte Schritt bleibt beim Wechsel erhalten. In den Skizzen steht `!` für einen Choke Point und `△` für Warnungen.

**Board-Modus: spielen und nachspielen**

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ◀ Combos  Aluber 1-Card · Deck: Branded Despia ▾   [Board | Baum]   △ 1   ✓ gespeichert  │
├────────────────┬─────┬──────────────────────────────────────────────┬────────────────────┤
│ LINES          │ HT  │                    GEGNER                    │ INSPECTOR          │
│                │     │  Hand ▢▢▢▢▢       GY 0  Banish 0  Deck 35    │                    │
│ ● Goldfish   3 │ Ash │  S/T  ▢ ▢ ▢ ▢ ▢   Feld ▢                     │ Karte unter der    │
│  1 NS Aluber   │ Imp │  MZ   ▢ ▢ ▢ ▢ ▢                              │ Maus: Bild, Text,  │
│  2 Aluber: +BF │ Nib │          EMZ ▢   ▢                           │ Effekte einzeln    │
│    ! Ash Imp   │ Vei │  MZ   ▢ ▢ ▣ ▢ ▢       ┌ CHAIN ──────┐        │ mit HOPT-Status    │
│    ├ B: Ash  1 │ Drl │  S/T  ▢ ▢ ▢ ▢ ▢       │ CL1 Aluber  │        │                    │
│    └ C: Imp  2 │ Blle│  Feld ▢               └─────────────┘        │ HOPT-TRACKER       │
│  3 BF ⇒ Albion │ Crow│  Hand ▣ ▣ ▣ ▣                                │ Aluber   genutzt   │
│  4 …           │ …   │  GY 0  Banish 0  Extra 15  Deck 35           │ B. Fusion   frei   │
│                │     │                     ICH                      │                    │
│ ○ Alt ab 1     │     │                                              │ NACH AUFLÖSUNG     │
│                │     │ ◀ Schritt 2 von 9 ▶   Auflösen ⏎ · Chainen   │ ▣ Br. Fusion ▮▮▮▯  │
│                │     │   Gegner reagiert (O)                        │ (Jev) 2 ausgebl.   │
└────────────────┴─────┴──────────────────────────────────────────────┴────────────────────┘
```

- **Mitte: Board.** Das Spielfeld beider Spieler wie im Spiel (Details in 6.2). Eigene Seite unten, Gegner oben gespiegelt. Die offene Chain liegt als Stapel daneben, der oberste Link oben.
- **Links: Lines.** Die aktuelle Line als nummerierte Schrittliste, so wie Spieler sie aufschreiben (Details in 6.6). Branches hängen an ihrem Schritt und sind aufklappbar. Darunter die anderen Lines der Combo. Die Zahl hinter einer Line ist die Anzahl Interruptions ihres Endboards.
- **Schmale Leiste: Staples (HT).** Die Handtraps und Unterbrechungen aus den Einstellungen als Kartensymbole. Sie werden auf einen Schritt gezogen (6.8). Beim Überfahren zeigt jedes Symbol, an welchen Schritten der aktuellen Line die Karte treffen würde.
- **Rechts: Inspector.** Zeigt die Karte unter dem Mauszeiger oder die ausgewählte Karte in groß, mit vollem Text, einzelnen Effekten und HOPT-Status. Darunter der HOPT-Tracker und die Vorschläge von Jev für den nächsten Schritt. Ist keine Karte gewählt, zeigt er den gewählten Schritt mit Notiz und Warnungen.
- **Unten: Schrittleiste.** „Schritt 2 von 9“ mit Vor und Zurück sowie den naheliegenden nächsten Aktionen als Knöpfe. Bei offener Chain: _Auflösen_, _Chainen_, _Gegner reagiert_.

**Baum-Modus: Überblick und Struktur**

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ◀ Combos  Aluber 1-Card · Deck: Branded Despia ▾   [Board | Baum]   △ 1   ✓ gespeichert  │
├─────────────────────────────────────────────────────────────────────┬────────────────────┤
│                       [Starthand: Aluber]                           │ SCHRITT 2          │
│                               │                                     │ Aluber: Suche      │
│                          [NS Aluber]                                │                    │
│                               │                                     │ Mini-Board         │
│                   [Aluber: +Branded Fusion] !                       │  ▢ ▢ ▣ ▢ ▢         │
│              ┌────────────────┼────────────────┐                    │  ▣ ▣ ▣ ▣           │
│          Goldfish            B: Ash          C: Imperm              │                    │
│              │                 │                 │                  │ Warnungen  0       │
│     [BF ⇒ Albion] !      [Extender …]      [Branch C …]             │ HOPTs      2       │
│              │                 │                                    │ Notiz              │
│         [Endboard 3]      [Endboard 1]                              │                    │
└─────────────────────────────────────────────────────────────────────┴────────────────────┘
```

- **Mitte: Baum** auf dem Canvas mit allen Lines und Branches. Die Hauptline läuft als gerade Achse, Branches zweigen seitlich ab. Knoten sind kompakt: Kartenbild, Kurzform der Aktion, Choke-Point-Symbole, Endboard-Interruptions an den Blättern.
- **Rechts: Schritt-Detail** mit einem kleinen Board des gewählten Knotens, Warnungen, HOPT-Stand und Notiz. So bleibt der Zustand sichtbar, ohne den Modus zu wechseln.
- **Doppelklick** auf einen Knoten (oder Enter) springt in den Board-Modus an genau diesen Schritt.
- Im Baum-Modus werden Branches umbenannt, zusammengeklappt, zur Hauptline befördert und gelöscht. Gespielt wird im Board-Modus.
- **Große Bäume:** Branches, die tiefer als zwei Ebenen gehen, sind standardmäßig zugeklappt und zeigen nur ihr Endboard. Die Minimap bleibt aus React Flow erhalten.

Warum zwei Modi statt einer geteilten Ansicht: Das Board braucht die volle Breite, damit 12 Zonen je Spieler lesbar bleiben. Der Baum braucht die volle Fläche, sobald eine Combo mehr als drei Branches hat. Ein schneller Wechsel ist besser als zwei halbe Ansichten.

### 6.2 Das Board im Detail

- **Zonen wie im TCG:** 5 Monsterzonen, 2 Extra Monster Zones, 5 Zauber/Fallen-Zonen, Spielfeldzone, dazu die Stapel Deck, Extra Deck, Friedhof und Verbannt je Spieler. Die äußeren Zauber/Fallen-Zonen sind zugleich Pendelzonen und zeigen die Scale, sobald dort ein Pendelmonster liegt.
- **Link-Pfeile** werden an Link-Monstern gezeichnet, verlinkte Zonen leicht hervorgehoben. Wird ein Link- oder Pendelmonster aus dem Extra Deck in eine Zone ohne Pfeil gelegt, erscheint eine Warnung (keine Sperre, siehe Prinzip 6).
- **Stapel öffnen:** Ein Klick auf Friedhof, Verbannt, Extra Deck oder Deck öffnet die Karten als Bildreihe über dem Board. Aus dieser Reihe wird gezogen oder per Kontextmenü gespielt. Verdeckt Verbanntes und das gegnerische Deck bleiben verdeckt.
- **Positionen:** Angriff, Verteidigung und verdeckt sind an der Karte ablesbar (gedreht, Rückseite). Gesetzte eigene Karten zeigen ihr Bild abgedunkelt, damit man sie trotzdem erkennt.
- **Xyz-Materialien** liegen sichtbar unter dem Monster, die Anzahl steht an der Karte.
- **Spielmarken** (Tokens) haben ein neutrales Bild mit Name und Werten und verschwinden beim Verlassen des Feldes.
- **Lebenspunkte** stehen neben jedem Spieler und ändern sich bei Kosten wie „Pay 1500 LP“.
- **Zonen voll:** Liegt schon eine Karte in der Zielzone, weicht die App auf die nächste freie Zone aus und markiert das. Sind alle Zonen belegt, erscheint eine Warnung.
- **Negierte Karten** tragen ein Symbol, solange die Negierung gilt (Imperm, Veiler, Called), beim Überfahren steht die Quelle.

### 6.3 Einen Schritt spielen

**Der Grundsatz:** Der Nutzer macht mit der Karte, was er im Spiel machen würde. Die App leitet daraus den Schritt ab.

**Klick und Hover:** Überfahren zeigt die Karte im Inspector. Ein Klick wählt die Karte aus (für Tastenkürzel) und öffnet die Aktionen direkt an der Karte, wie in Master Duel. Rechtsklick öffnet dasselbe Menü. Jede Aktion aus der Tabelle ist damit auch ohne Drag erreichbar.

| Geste                                        | Ergebnis                                                                                                                                                                                                                           |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Handkarte auf eine Monsterzone ziehen        | Normal Summon (oder Set, wenn mit gedrückter Umschalttaste abgelegt). Ist der Normal Summon schon verbraucht, bietet die Schrittleiste „Special Summon“ an                                                                         |
| Handkarte auf eine Zauber/Fallen-Zone ziehen | Zauber aktivieren bzw. Falle setzen. Mit Umschalttaste wird auch ein Zauber gesetzt                                                                                                                                                |
| Handkarte auf die Spielfeldzone ziehen       | Spielfeldzauber aktivieren                                                                                                                                                                                                         |
| Klick oder Rechtsklick auf eine Karte        | Aktionen, die für diese Karte in dieser Zone Sinn ergeben: ihre Effekte (mit HOPT-Status), Normal Summon, Set, Special Summon, Position ändern, auf den Friedhof, verbannen, zurück auf die Hand, ins Deck (oben, unten, gemischt) |
| Effekt im Menü oder im Inspector wählen      | Aktivierung mit Chain Link. Kosten, die sich aus dem Text ableiten lassen (abwerfen, diese Karte verbannen, LP zahlen), fragt die App gezielt ab (6.4)                                                                             |
| Karte aus dem Extra Deck auf das Feld ziehen | Extra-Deck-Beschwörung: Die App fragt nach den Materialien, der Nutzer klickt sie auf dem Feld an, bestätigt mit Enter. Materialien gehen auf den Friedhof, Xyz-Materialien unter das Monster, Link-Materialien zählen Link-Rating |
| Karte zwischen beliebige Zonen ziehen        | freie Bewegung für alles, was keine Regel kennt. In der Line-Liste steht dann „Aluber → GY“                                                                                                                                        |

**Kartentext unsicher:** Hat eine Karte `effectsReview` oder eine schwache Jev-Bewertung, bietet das Menü zusätzlich „Ganzen Kartentext aktivieren“ an. So bleibt jede Karte spielbar, auch wenn die Zerlegung falsch ist. Die Korrektur der Zerlegung liegt in der Kartenansicht (Abschnitt 8).

### 6.4 Ziele und Ergebnisse abfragen

Viele Effekte bewegen Karten, die der Nutzer auswählen muss: „add 1 Despia from your Deck“, „Special Summon 1 monster from your GY“, „send 1 card from your Deck to the GY“, „target 1 card on the field“. Die App fragt an genau einer Stelle danach:

- **Kosten bei der Aktivierung.** Abwerfen, Verbannen, Tributieren, LP zahlen. Die passenden Karten leuchten auf dem Board auf, ein Klick wählt sie.
- **Ziele bei der Aktivierung.** „target“ im Text: Die möglichen Ziele leuchten auf, auch auf der Gegnerseite.
- **Ergebnis bei der Auflösung.** „Was hast du gesucht?“, „Was hast du beschworen?“, „Was hast du gesendet?“. Die Schrittleiste zeigt die passenden Karten aus Deck, Friedhof oder Extra Deck als Bildreihe, gefiltert nach dem Kartentext. Ein Klick und die Karte liegt am Ziel. Mehrere Karten werden nacheinander angeklickt und mit Enter bestätigt.

Die Abfrage ist **nie ein Dialog**, sondern eine Zeile in der Schrittleiste. Wer sie überspringt (Esc), bekommt einen Schritt mit dem Hinweis „Ergebnis offen“, den er später im Inspector ergänzt. Passt der Filter nicht, zeigt „Alle Karten“ das ganze Deck bzw. den ganzen Friedhof. Das ersetzt die heutigen manuellen Bewegungen fast vollständig.

### 6.5 Chains und Trigger

- **Standard ist Auflösen.** Nach jeder Aktivierung bietet die Schrittleiste an: _Auflösen_ (Enter), _Chainen_, _Gegner reagiert_ (O). Spielt der Nutzer einfach den nächsten Schritt, wird die Chain vorher aufgelöst. Gechaint wird nur, wenn er es ausdrücklich wählt oder eine Handtrap auf den Schritt zieht. In der Hauptline muss er Chains also nie von Hand auflösen.
- **Chainen:** Nach „Chainen“ zeigen Board und Inspector nur Effekte mit passendem Spell Speed hervorgehoben. Die offene Chain wächst sichtbar, die Line-Liste rückt die Links ein.
- **Auflösung sichtbar machen:** Beim Auflösen einer Chain mit mehreren Links laufen die Links in umgekehrter Reihenfolge ab, jeder mit kurzer Hervorhebung. Beim Nachspielen ist jeder Link einzeln ansteuerbar.
- **Trigger anbieten:** Löst eine Beschwörung oder Auflösung einen „If … Summoned“-Effekt aus, zeigt die Schrittleiste „Trigger: Aluber (Suche)“ als ersten Knopf. Mehrere Trigger gleichzeitig werden als Gruppe angeboten, der Nutzer legt die Reihenfolge per Klick fest. Missing the Timing wird noch nicht geprüft (siehe Projektplan, noch nicht modelliert).

### 6.6 Die Line-Liste

Die Line-Liste ist die schriftliche Form der Line, so wie Spieler sie in Discord posten. Jede Zeile ist ein Schritt:

```
● Goldfish                              Endboard 3
  1  NS Aluber
  2  Aluber ⚡ → + Branded Fusion         ! Ash · Imperm · Droll
     ├ B: Ash auf 2                     Endboard 1
     └ C: Imperm auf 2                  Endboard 2
  3  Branded Fusion ⚡ → Albion           ! Ash
  4  …
○ Alternative ab 1
```

- **Kurzform:** Karte, Aktion, Ergebnis. Kosten und Ziele stehen beim Überfahren oder aufgeklappt darunter.
- **Chains** werden eingerückt: CL2 steht unter CL1, die Auflösung ist keine eigene Zeile.
- **Gegnerische Schritte** sind in der Gegnerfarbe markiert und tragen den Branch-Namen.
- **Notizen** (`note` am Knoten) stehen als kleines Symbol am Schritt und aufgeklappt darunter. Beim Nachspielen erscheinen sie im Inspector. Sie sind der Ort für „warum so und nicht anders“.
- **Warnungen** stehen als `△` am Schritt, beim Überfahren mit Grund.
- **Klick auf einen Schritt** springt das Board dorthin, Doppelklick öffnet die Bearbeitung im Inspector.

### 6.7 Frühere Schritte ändern

Der Nutzer ist an Schritt 3 einer Line mit 9 Schritten und spielt dort etwas anderes. Was passiert?

- **Standard: Branch.** Die neue Aktion wird als neuer Branch ab Schritt 3 angelegt. Die bisherige Line bleibt unverändert und ist weiter die Hauptline.
- **Rückfrage ohne Dialog:** Die Schrittleiste zeigt für einige Sekunden „Als Branch angelegt · stattdessen einfügen · stattdessen ersetzen“. _Einfügen_ setzt den neuen Schritt vor den bisherigen Schritt 4, die Folgeschritte bleiben erhalten. _Ersetzen_ verwirft die bisherigen Folgeschritte (mit Undo).
- **Einen Schritt bearbeiten** (anderes Suchziel, andere Kosten) geht im Inspector. Alle Folgeschritte werden neu berechnet.
- **Folgen sichtbar machen:** Schritte, die danach nicht mehr passen (Karte liegt nicht mehr dort, HOPT schon verbraucht), bekommen eine Warnung und werden in der Line-Liste markiert. Gelöscht wird nichts automatisch.
- **Hauptline wechseln:** Im Baum-Modus oder in der Line-Liste kann jeder Branch zur Hauptline befördert werden, etwa wenn sich eine Alternative als besser herausstellt.

### 6.8 Stresstest: „Was, wenn …?“

Der wichtigste Unterschied zu jedem anderen Tool.

- **Handtrap auf einen Schritt ziehen.** Aus der Staple-Leiste wird eine Karte auf einen Schritt in der Line-Liste oder auf eine Karte auf dem Board gezogen. An genau dieser Stelle entsteht ein Branch mit der passenden Aktivierung und Negierung (Voreinstellung aus `reactions.ts`, im Inspector änderbar). Das Board springt in diesen Branch. Per Tastatur: Schritt wählen, O, Staple per Name oder Nummer.
- **Gegnerboard nutzen.** Beim Going Second liegen die Karten des Gegners auf dem Board. Ein Klick auf eine gesetzte Falle des Gegners bietet „Hier aktivieren (Branch)“ an, genau wie die Staple-Leiste.
- **Choke-Point-Analyse.** Ein Knopf „Stresstest“ prüft für jeden Schritt der Line, welche Staples dort aktivierbar wären. Die Line-Liste zeigt danach an jedem Schritt kleine Symbole der Karten, die dort treffen, zum Beispiel „! Ash · Imperm“. Ein Klick auf ein Symbol legt den Branch an. So sieht der Spieler in Sekunden, wo seine Line verwundbar ist.
- **Antworten vorschlagen.** Entsteht ein Branch mit einer gegnerischen Unterbrechung und liegt eine passende Antwort auf der eigenen Hand (Called by the Grave, Crossout Designator), schlägt die Schrittleiste „Antworten mit Called“ als Unter-Branch vor.
- **Branch fortsetzen.** Im Branch spielt der Nutzer weiter wie in der Hauptline, oft mit einem Extender. Der Branch bekommt automatisch einen Namen wie „B: Ash auf 2“, den er ändern kann.
- **Vergleich.** Die Endboards von Hauptline und Branches lassen sich nebeneinander anzeigen (6.9).

**Wann trifft welcher Staple?** Die Analyse ist zuerst deterministisch und fragt Jev nur dort, wo die Muster nicht reichen. So bleibt sie schnell und nachvollziehbar.

| Staple                               | trifft einen Schritt, wenn …                                                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Ash Blossom                          | eine Karte oder ein Effekt aktiviert wird, der aus dem Deck sucht, aus dem Deck beschwört oder aus dem Deck auf den Friedhof legt           |
| Ghost Belle                          | ein Effekt Karten aus dem Friedhof auf die Hand, ins Deck oder Extra Deck bringt, aus dem Friedhof beschwört oder aus dem Friedhof verbannt |
| Infinite Impermanence, Effect Veiler | ein offenes Monster des Spielers auf dem Feld liegt, dessen Effekt die Line noch braucht; Veiler nur in der Main Phase                      |
| Ghost Ogre                           | ein Effekt einer Karte auf dem Feld aktiviert wird                                                                                          |
| PSY-Framegear Gamma                  | ein Monstereffekt aktiviert wird und der Gegner kein Monster kontrolliert                                                                   |
| Nibiru                               | der Spieler in diesem Zug fünf oder mehr Monster beschworen hat                                                                             |
| Droll & Lock Bird                    | eine Karte außerhalb der Draw Phase aus dem Main Deck auf die Hand kommt; bewertet wird der Rest der Line ohne weitere Suchen               |
| D.D. Crow                            | eine Karte im Friedhof liegt, die ein späterer Schritt braucht                                                                              |
| Mulcharmy Fuwalos, Purulia           | am Anfang des Zuges; bewertet wird, wie viele Karten der Gegner durch die Line zieht                                                        |
| Solemn Judgment, Strike, Warning     | nur mit Gegnerboard; an der Beschwörung oder Aktivierung, die die jeweilige Karte erlaubt                                                   |

- **Tiefe:** Standard ist eine Unterbrechung pro Branch. Optional prüft der Stresstest Paare („Ash und dann Imperm“), nur auf Knopfdruck, weil die Anzahl schnell wächst.
- **Staple-Auswahl:** Welche Staples Leiste und Stresstest verwenden, legt der Nutzer in den Einstellungen fest (Standard: die Liste aus dem Projektplan, verbotene Karten ausgenommen). So passt der Test zum aktuellen Format.
- **Grenzen offen zeigen:** Findet der Stresstest einen Treffer nur über Jev, trägt das Symbol einen Hinweis „unsicher“. Ein Rechtsklick auf ein Symbol entfernt den Treffer für diesen Schritt dauerhaft.

### 6.9 Endboard und Auswertung

Am Ende einer Line (letzter Schritt oder „Endboard“ markieren) zeigt die Workbench eine Zusammenfassung:

- **Board** als kompakte Kartenreihe.
- **Interruptions:** Anzahl und Liste der Unterbrechungen auf dem Feld und in der Hand. Das sind Quick Effects, Negierungen und Fallen, erkannt aus den PSCT-Mustern (`QUICK`, `NEG_*`). Der Nutzer kann jede Karte als Unterbrechung an- oder abwählen und die Anzahl pro Karte ändern (Prinzip 11).
- **Ressourcen:** Handkarten, Karten im Friedhof mit Effekten, übrig gebliebener Normal Summon, Lebenspunkte.
- **Kosten:** Wie viele Karten der Starthand wurden gebraucht („1-Card-Combo“).
- **HOPTs verbraucht:** Welche Namen sind für den Rest des Zuges gesperrt.
- **Schwachstellen:** Aus dem Stresstest, an welchen Schritten welche Staples die Line brechen und wie das Endboard dann aussieht.

**Vergleich** der Endboards nebeneinander, erreichbar über „Vergleichen“ in der Line-Liste:

```
┌──────────────────────┬──────────────────────┬──────────────────────┐
│ GOLDFISH             │ B: ASH AUF 2         │ C: IMPERM AUF 2      │
│ Unterbrechungen  3   │ Unterbrechungen  1   │ Unterbrechungen  2   │
│ Hand             2   │ Hand             1   │ Hand             2   │
│ ▣ ▣ ▣  ▣             │ ▣                    │ ▣ ▣                  │
│                      │ fehlt: 2 Karten      │ fehlt: 1 Karte       │
│ Starthand: 1         │ Starthand: 1         │ Starthand: 1         │
└──────────────────────┴──────────────────────┴──────────────────────┘
```

Karten, die im Branch gegenüber der Hauptline fehlen, sind ausgegraut markiert. So ist sofort klar, was eine Unterbrechung kostet.

### 6.10 Nachspielen und Lernen

- **Pfeiltasten** ← → gehen Schritt für Schritt durch die Line, das Board folgt mit kurzen Bewegungsanimationen.
- **Leertaste** spielt die Line automatisch ab, ein Schritt pro Sekunde. Das Tempo ist in der Schrittleiste einstellbar.
- **An Verzweigungen** zeigt die Schrittleiste „Branch B: Ash“ an. ↓ wechselt hinein, ↑ zurück.
- **Notizen** erscheinen beim Nachspielen im Inspector, damit die Begründung zum Schritt sichtbar ist.
- **Ohne Bearbeiten:** Beim Nachspielen erzeugt eine versehentliche Geste keinen Schritt. Erst die erste echte Aktion an einem früheren Schritt legt einen Branch an (6.7), und die Schrittleiste sagt das.
- Ideal zum Lernen vor einem Turnier: Line öffnen, einmal durchspielen, die Choke Points sehen.

## 7. Starthand und Combos verwalten

### 7.1 Neue Combo starten

1. Von der Startseite, aus der Bibliothek oder von einer Deckseite: **„Neue Combo“**.
2. Deck wählen (vorausgewählt, wenn man vom Deck kommt). Ohne Deck geht es über die freie Kartensuche.
3. **Starthand**: Das Deck liegt als Bildraster da, Starter aus vorhandenen Combos zuerst. Klick legt eine Karte auf die Hand, erneuter Klick nimmt sie zurück. Oben „1-Card“, „2-Card“, „5 Karten“ als Zähler. Optional **„Zufallshand“** für Übungssitzungen.
4. Optional: **Going Second** mit Gegnerboard. Karten des Gegners werden wie die eigenen per Suche auf seine Zonen gelegt, gesetzte Fallen standardmäßig verdeckt.
5. Los: Die Workbench öffnet sich im Board-Modus mit der Starthand.

Titel werden automatisch vorgeschlagen („Aluber 1-Card“), damit niemand vor dem ersten Schritt tippen muss. **Gibt es schon eine Combo mit derselben Starthand**, weist die App darauf hin und bietet an, sie zu öffnen oder eine neue Line darin anzulegen.

### 7.2 Bibliothek

- Liste aller Combos mit Kartenbildern der Starthand, Deck, Anzahl Lines und Branches, Endboard-Interruptions und Status.
- **Filter:** Deck, Starterkarte („alle Combos mit Aluber“), Tags (1-Card, Going Second, Grind), Status (Entwurf, getestet, turnierfest).
- **Suche** nach Kartennamen in der Line: „Wo benutze ich Called by the Grave?“
- **Warnhinweis** an Combos, deren Deck sich geändert hat und die Karten verwenden, die nicht mehr im Deck sind (7.4).
- **Aktionen:** öffnen, duplizieren (etwa um eine Line mit anderer Starthand zu probieren), löschen mit Undo.

### 7.3 Hand-Tester auf der Deckseite

- „Hand ziehen“ zieht 5 zufällige Karten aus dem Deck (Going Second: 6).
- Darunter: **Welche gespeicherten Combos gehen mit dieser Hand?** Eine Combo passt, wenn ihre Starthand in der gezogenen Hand enthalten ist. Die übrigen Karten der Hand werden als mögliche Extender und Handtraps markiert.
- Passt keine, bietet die App „Neue Combo mit dieser Hand“ an.
- Über viele Züge ergibt das eine grobe **Abdeckung**: „In 68 % der Hände hast du eine gespeicherte Line.“ Die Abdeckung wird per Simulation über viele Hände berechnet, nicht nur über die gezogenen.

### 7.4 Deck ändert sich

- Nach dem Speichern eines Decks prüft die App alle verbundenen Combos: Welche Karten aus Starthand und Lines sind nicht mehr (oder seltener) im Deck?
- Die Deckseite zeigt „3 Combos betroffen“ mit Liste. In der Combo stehen die betroffenen Schritte mit Warnung.
- Nichts wird automatisch gelöscht oder umgebaut. Die Line bleibt als Dokumentation erhalten.

## 8. Kartensuche und Kartenansicht

- **Spitznamen und Kürzel.** „ash“, „imperm“, „nib“, „called“, „mst“, „bewd“ finden sofort die richtige Karte. Kürzel aus Anfangsbuchstaben werden automatisch erkannt, gängige Spitznamen kommen aus einer gepflegten Liste.
- **Deck zuerst.** In einer Combo erscheinen Karten aus dem eigenen Deck oben, dann Staples, dann der Rest.
- **Tippfehler-tolerant**, Treffer ab dem zweiten Buchstaben, Bild in jedem Treffer.
- **Kartenvorschau beim Überfahren**: großes Bild, voller Text, Effekte einzeln mit HOPT-Markierung, TCG-Banlist-Status. Kein Klick nötig. Im Inspector ist jeder Effekt anklickbar und aktiviert ihn direkt.
- **Kartensprache getrennt von der Oberflächensprache.** Standard sind englische Kartennamen und -texte, weil Community, Turniere und PSCT englisch sind. Deutsch ist per Schalter verfügbar. Die Oberfläche selbst ist Deutsch oder Englisch. Die Suche findet eine Karte unter beiden Namen.
- **Effekte korrigieren.** In der Kartenansicht zeigt ein Hinweis, wenn die Zerlegung unsicher ist. „Effekte bearbeiten“ erlaubt, Effekte zu teilen oder zusammenzulegen und die HOPT-Art zu ändern. Die Korrektur gilt für alle Combos und überlebt einen neuen Kartenimport.

## 9. Tastatur

Tastatur ist Beschleunigung, nie Voraussetzung. Ein Druck auf „?“ zeigt jederzeit alle Kürzel. Einzeltasten wirken nur, wenn kein Textfeld den Fokus hat.

**Karten per Tastatur wählen:** „/“ öffnet die Schnellauswahl. Wer „alub“ tippt, wählt Aluber auf dem Board, auf der Hand oder in einem Stapel. Danach wirken die Kürzel unten auf diese Karte. Damit geht eine ganze Line ohne Maus.

| Taste                    | Aktion                                                         |
| ------------------------ | -------------------------------------------------------------- |
| Strg+K                   | Suche und Befehle (Karten, Combos, Aktionen)                   |
| /                        | Schnellauswahl einer Karte auf dem Board, in Hand oder Stapeln |
| V                        | zwischen Board-Modus und Baum-Modus wechseln                   |
| ← →                      | vorheriger / nächster Schritt                                  |
| ↑ ↓                      | zurück zur übergeordneten Line / in einen Branch hinein        |
| Leertaste                | Line abspielen / anhalten                                      |
| N / S / A                | Normal Summon / Set / Aktivieren der ausgewählten Karte        |
| 1 bis 9                  | Effekt 1 bis 9 der ausgewählten Karte aktivieren               |
| P                        | Position der ausgewählten Karte ändern                         |
| M oder Kontextmenütaste  | Aktionsmenü der ausgewählten Karte öffnen                      |
| Enter                    | Chain auflösen bzw. Auswahl bestätigen                         |
| C                        | weiter chainen                                                 |
| Esc                      | Auswahl oder Abfrage abbrechen, Menü schließen                 |
| G / B / H / D            | auf den Friedhof / verbannen / auf die Hand / ins Deck         |
| O                        | Gegner reagiert: Staple-Leiste öffnen                          |
| E                        | Endboard markieren                                             |
| Strg+Z / Strg+Umschalt+Z | Rückgängig / Wiederholen                                       |
| Entf                     | Schritt löschen (mit allen Folgeschritten, rückgängig machbar) |

Später: Befehlszeile in Strg+K mit Kurzform, zum Beispiel „ns aluber“ oder „act ash 2“.

## 10. Feedback, Regeln und Jev

- **Warnungen sind leise.** Ein Regelverstoß (HOPT verbraucht, zweiter Normal Summon, falscher Spell Speed, Zone ohne Link-Pfeil) erscheint als kleines Symbol am Schritt und als Rahmen um die Karte. Beim Überfahren steht der Grund, mit der passenden Mechanik aus der Ruling-Tabelle. Ein Klick auf „trotzdem erlauben“ setzt den manuellen Eingriff (`optOverride`). Der Zähler im Kopf zeigt alle Warnungen der Combo, ein Klick springt zur ersten.
- **Nie ein Dialog, der den Fluss unterbricht,** außer bei destruktiven Aktionen (Deck per YDK ersetzen, Combo löschen). Selbst dann gibt es Undo.
- **HOPT-Tracker** im Inspector: Welche Namen sind in diesem Zug schon genutzt, welche noch frei. Profis zählen das im Kopf mit, die App nimmt es ihnen ab.
- **Jev-Vorschläge** erscheinen im Inspector als „Mögliche nächste Aktionen“ mit Kartenbild und einem dezenten Balken für die Sicherheit. Sie laden im Hintergrund und verschieben nie das Layout (fester Platz, Platzhalter beim Laden). Ein Klick übernimmt den Vorschlag als Schritt. Die Anzahl ausgeblendeter Vorschläge unter der Schwelle steht darunter.
- **Speichern** passiert automatisch, es gibt keinen Speichern-Knopf. Der Zustand ist im Kopf immer sichtbar, aber unauffällig: „gespeichert“, „speichert …“ oder, bei einem Fehler, deutlich „nicht gespeichert, erneut versuchen“.
- **Undo-Verlauf** gilt für die geöffnete Sitzung. Nach einem Neuladen beginnt er neu; das steht beim ersten Neuladen einmalig als Hinweis da.

## 11. Leere Zustände, Fehler und Einstieg

- **Erste Anmeldung:** Kein Tutorial-Marathon. Die Startseite zeigt drei Schritte zum Start: Deck per YDK importieren, Starthand wählen, ersten Schritt spielen. Erledigte Schritte werden abgehakt, danach verschwindet die Liste.
- **Keine Kartendatenbank:** Da DuelPath lokal läuft, kann die Kartentabelle leer sein. Dann zeigt die App statt leerer Suchergebnisse den Befehl `npm run cards:import` mit kurzer Erklärung.
- **Keine Decks:** „Deck per YDK importieren“ ist der Hauptknopf, weil fast jeder Spieler seine Liste schon in EDOPro oder YGOPRODeck hat. Unbekannte Passcodes werden nach dem Import aufgelistet.
- **Leere Combo:** Das Board zeigt die Starthand und im Inspector die Vorschläge für den ersten Schritt. Die erste Aktion ist also immer einen Klick entfernt.
- **Jev nicht verfügbar** (kein `OPENROUTER_API_KEY`, Netzfehler): Der Platz der Vorschläge zeigt einen Hinweis, alles andere funktioniert. Der Stresstest läuft dann nur mit den deterministischen Regeln und sagt das.
- **Kartenbild fehlt** (Download fehlgeschlagen): Platzhalter mit Kartenname und Rahmenfarbe des Kartentyps, damit das Board lesbar bleibt.
- **Hinweise im Kontext:** Beim ersten Mal erscheint an der Staple-Leiste einmalig der Hinweis „Zieh eine Handtrap auf einen Schritt, um einen Branch anzulegen“. Ebenso einmalig beim ersten Wechsel in den Baum-Modus und beim ersten Stresstest. Alle Hinweise lassen sich in den Einstellungen zurücksetzen.

## 12. Gestaltungsrahmen für das UI

Diese Punkte legt die UX fest. Die konkrete Gestaltung macht der UI-Plan.

- **Dunkles Design als Standard.** Lange Sessions am Abend, Kartenbilder wirken auf dunklem Grund besser. Helles Design bleibt verfügbar. Die Palette aus `FARBSCHEMA.md` (Dunkelgrün, Gold, Beige) ist für ein helles Design entworfen und muss für das dunkle Design im UI-Plan neu abgeleitet werden.
- **Feste Bedeutungsfarben:** eigene Seite, Gegner, offene Chain, Warnung, Choke Point und Jev haben je eine eigene Farbe, die überall gleich ist. Farbe ist nie das einzige Merkmal, es gibt immer auch Symbol oder Text. Eigene Seite und Gegner müssen auch bei Rot-Grün-Schwäche unterscheidbar sein.
- **Kartenbilder tragen die Wiedererkennung.** Auf dem Board, in der Line-Liste und in der Suche. Text ergänzt, ersetzt nie. Auf dem Board ist eine Karte mindestens so groß, dass das Artwork erkennbar ist (Richtwert 56 px breit bei 1440 px).
- **Bewegung mit Zweck:** kurze Bewegungen (etwa 150 ms), wenn Karten die Zone wechseln, damit das Auge folgen kann. Keine dekorativen Animationen. Mit „Bewegung reduzieren“ im Betriebssystem ersetzt ein kurzes Aufleuchten die Bewegung.
- **Desktop zuerst** (ab 1440 px, optimal 1920 px). Auf dem Laptop (1280 px) klappen die Seitenleisten ein und öffnen sich als Overlay. Auf Tablet und Handy gibt es später eine **Lese- und Nachspielansicht**, keine Eingabe (Phase „Später“).
- **Barrierearm:** vollständig per Tastatur bedienbar, jede Drag-Geste hat eine Menü-Alternative, ausreichender Kontrast (WCAG AA), sichtbarer Fokus, Bildschirmleser bekommen Kartennamen, Zonen und die Kurzform des Schritts.

## 13. Woran wir gute UX messen

Jede UI-Version muss diese Szenarien schaffen. Wir testen sie selbst mit der Stoppuhr, immer mit derselben Testcombo (eine bekannte 1-Card-Line mit 10 Schritten aus einem aktuellen Deck). Vor UX-1 messen wir jedes Szenario einmal im heutigen Editor, damit der Fortschritt belegbar ist.

| Szenario                                                 | Ziel                                   | Heute         |
| -------------------------------------------------------- | -------------------------------------- | ------------- |
| Neue Combo aus einem Deck mit 1-Karten-Starthand anlegen | unter 15 Sekunden                      | messen        |
| 10-Schritt-Goldfish-Line eingeben (bekannte Line)        | unter 2 Minuten                        | messen        |
| Ash-Branch an Schritt 3 anlegen                          | unter 3 Sekunden                       | messen        |
| Stresstest einer 10-Schritt-Line mit allen Staples       | Ergebnis in unter 10 Sekunden          | nicht möglich |
| Endboards von Hauptline und zwei Branches vergleichen    | unter 5 Sekunden, ohne Moduswechsel    | nicht möglich |
| Suchziel an Schritt 2 nachträglich ändern                | unter 10 Sekunden, Folgen sichtbar     | messen        |
| Line nachspielen und jeden Zustand verstehen             | ohne einen einzigen Klick in Formulare | nicht möglich |
| Eine Line komplett ohne Maus eingeben                    | möglich                                | nicht möglich |
| Neuer Nutzer legt seine erste Combo an                   | ohne Erklärung, unter 2 Minuten        | messen        |

Zusätzlich zur Stoppuhr zählen wir beim Eingeben der Testcombo **Klicks pro Schritt** (Ziel: im Schnitt höchstens 3) und **Warnungen, die falsch sind** (Ziel: keine in der Testcombo).

## 14. Was sich gegenüber heute ändert

| Heute                                                                       | Neu                                                                                 |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Baum im Zentrum, Board klein in der Seitenleiste                            | zwei Vollbild-Modi: Board mit Line-Liste und Baum mit Schritt-Detail, Wechsel per V |
| Schritt = Formular mit Auswahlfeldern, Bewegungen manuell                   | Schritt = Geste an der Karte, Bewegungen und Suchziele automatisch                  |
| Knotentypen (Aktion, Aktivierung, Gegner reagiert, Chain auflösen) sichtbar | Aktionen in Spielersprache; Chain-Auflösung meist automatisch                       |
| Branches nur an vorher angelegten Gegner-Knoten                             | Handtrap auf jeden Schritt ziehen; Stresstest findet Choke Points                   |
| Ändern früherer Schritte überschreibt                                       | Ändern früherer Schritte legt einen Branch an                                       |
| Kein Endboard-Überblick                                                     | Endboard-Auswertung mit Interruptions, Schwachstellen und Vergleich                 |
| Kein Nachspielen                                                            | Schritt für Schritt und Autoplay mit Animation und Notizen                          |
| Suchergebnisse nur über exakte Namen                                        | Spitznamen, Kürzel, Deck zuerst                                                     |
| Kartennamen folgen der Oberflächensprache                                   | Kartensprache eigene Einstellung, Standard Englisch                                 |
| Helles Design                                                               | Dunkles Design als Standard                                                         |

## 15. Übergang für bestehende Combos

Bestehende Combos müssen im neuen Editor ohne Handarbeit lesbar sein.

- **`OPPONENT`-Knoten** werden zu Branch-Punkten: Ihr Kind mit „Keine Reaktion“ wird die Hauptline, die übrigen Kinder werden Branches mit ihrem `edgeLabel` als Namen.
- **`RESOLVE`-Knoten** bleiben im Datenmodell, erscheinen aber nicht als eigene Zeile in der Line-Liste.
- **Bewegungen ohne Platz** (`slot` leer) werden beim Laden auf die erste freie Zone gelegt.
- Die Umstellung läuft als einmalige Migration mit Test an den vorhandenen Combos, nicht bei jedem Laden.

## 16. Technische Voraussetzungen aus der UX

Damit die UX funktioniert, braucht das Datenmodell einige Erweiterungen. In Klammern die Phase, die sie zuerst braucht.

**Board und Zustand**

- **Zonen mit Plätzen** (UX-1): Die 5 Monsterzonen, 2 Extra Monster Zones und 5 Zauber/Fallen-Zonen sind heute nur Listen. Für das Board brauchen Karten einen festen Platz (`slot` gibt es schon, er wird aber nicht genutzt). Dazu Zonenkapazität, die laut Projektplan noch nicht modelliert ist.
- **Link-Pfeile und Pendel-Scales** (UX-2): Die Tabelle `Card` hat heute weder `linkmarkers` noch `scale`. Beides liefert die YGOPRODeck-API und muss beim Import übernommen werden.
- **Xyz-Materialien** (UX-2): Karten unter einem Xyz-Monster (heute nicht abbildbar).
- **Spielmarken** (UX-2): Tokens anlegen (Nibiru, Scapegoat).
- **Lebenspunkte** (UX-2): für Kosten wie „Pay 1500 LP“ und für Endboard-Vergleiche.

**Baum und Lines**

- **Reihenfolge der Kinder** (UX-1): `ComboNode` braucht ein Feld für die Reihenfolge; das erste Kind ist die Hauptline. Heute ergibt sich die Reihenfolge nur aus `createdAt`.
- **Branches an jedem Knoten** (UX-2): Jeder Knoten darf mehrere Kinder haben, `edgeLabel` trägt den Branch-Namen. `OPPONENT` wird für neue Combos nicht mehr angelegt (Migration in Abschnitt 15).
- **Automatische Auflösung** (UX-2): Die App legt `RESOLVE`-Knoten selbst an, wenn der nächste Schritt keine Chain-Antwort ist.
- **Undo/Redo** (UX-1): über einen Verlauf der Combo-Änderungen im Editor. Autosave (800 ms) speichert weiter den ganzen Baum.

**Kartentext**

- **Wirkungsmuster** (UX-2): „add … from your Deck“, „Special Summon … from your GY“, „send … from your Deck to the GY“ und ähnliche als eigene Muster neben den vorhandenen Ruling-Mustern in `mechanics.ts`. Sie liefern den Filter für „Was hast du gesucht?“ (6.4) und die Trefferregeln des Stresstests (6.8).
- **Trefferregeln der Staples** (UX-3): In `reactions.ts` bekommt jeder Staple zusätzlich zur Aktivierungsart die Bedingung, wann er trifft, als Liste von Wirkungsmustern.
- **Interruption-Erkennung** (UX-3): aus den vorhandenen Mustern (`QUICK`, `NEG_*`), mit manueller Korrektur, die am Endboard-Knoten gespeichert wird.
- **Effekt-Korrektur** (UX-5): eine manuelle Zerlegung pro Karte, die Vorrang vor `effects` hat und beim Neuimport erhalten bleibt.
- **Spitznamen-Liste** (UX-1 als Grundstock, UX-6 Pflege): für die Suche.

**Verwaltung**

- **Tags und Status** an `Combo` (UX-4).
- **Deck-Abgleich** (UX-5): Karten einer Combo gegen die aktuelle Deckliste prüfen, ohne Schemaänderung aus `startState` und den Knoten ableitbar.
- **Nutzereinstellungen** (UX-1): Kartensprache, Design, Staple-Auswahl, gesehene Hinweise. Speicherort pro Nutzer in der Datenbank, damit sie ein späteres Hosting überleben.

## 17. Umsetzung in Phasen

| Phase                                                                                     | Inhalt                                                                                                                                                                                                                             | Nutzen               |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **UX-1 Fundament** (umgesetzt; offen: Spitznamen, Kartenvorschau außerhalb der Workbench) | Workbench-Aufbau (Board, Line-Liste, Inspector, Baum-Modus), Zonen mit Plätzen, Kartenvorschau, Kartensprache, Einstellungen, dunkles Design, Undo, Migration (15)                                                                 | Das neue Grundgefühl |
| **UX-2 Spielen am Board**                                                                 | Klick-Menü und Drag auf Zonen, Extra-Deck-Beschwörung mit Materialien, Ziele und Ergebnisse (6.4), automatische Auflösung, Trigger-Angebot, Änderungs-Hervorhebung, Tastatur-Schnellauswahl, Branch bei Aktion an früherem Schritt | Job 1 wird schnell   |
| **UX-3 Stresstest**                                                                       | Staple-Leiste mit Drag auf Schritte, Choke-Point-Analyse, Antworten, Endboard-Auswertung, Vergleich                                                                                                                                | Job 2 und 4          |
| **UX-4 Nachspielen und Bibliothek**                                                       | Schritt-Navigation, Autoplay, Notizen, frühere Schritte ändern (6.7), Bibliothek mit Filtern, Tags und Status                                                                                                                      | Job 3                |
| **UX-5 Deck und Hand-Tester**                                                             | Deckbau im neuen Design, Hand-Tester mit Abdeckung, neue Combo aus einer gezogenen Hand, Deck-Abgleich, Effekt-Korrektur                                                                                                           | Job 5, 6 und 7       |
| **UX-6 Tempo**                                                                            | Befehlszeile, Tastatur-Feinschliff, Spitznamen-Pflege, Staple-Paare im Stresstest                                                                                                                                                  | für Vielnutzer       |
| **Später**                                                                                | Lese- und Nachspielansicht für Tablet und Handy, Übungsmodus („nächsten Schritt raten“)                                                                                                                                            | Mia lernt unterwegs  |

Jede Phase endet mit den passenden Szenarien aus Abschnitt 13.

Die Reihenfolge von 6.7 (frühere Schritte ändern) ist bewusst früh gedacht: Das Verhalten „neue Aktion an früherem Schritt legt einen Branch an“ muss schon in UX-2 stimmen, sonst überschreibt der Nutzer versehentlich Lines. UX-4 ergänzt nur Einfügen, Ersetzen und das Befördern zur Hauptline.

## 18. Entscheidungen

| Frage                       | Entscheidung                                                                   |
| --------------------------- | ------------------------------------------------------------------------------ |
| Aufbau der Workbench        | zwei umschaltbare Vollbild-Modi: Board-Modus und Baum-Modus                    |
| Kartensprache               | Standard Englisch, Deutsch per Schalter, unabhängig von der Oberflächensprache |
| Zufallshand und Hand-Tester | aufgenommen (Abschnitt 7.3, Phase UX-5)                                        |
| Design                      | dunkel als Standard, hell umschaltbar                                          |
| Line als Text teilen        | nicht enthalten                                                                |
| Going-Second-Vorlagen       | nicht enthalten; Gegnerboard wird frei gesetzt                                 |
| Beispiel-Combo              | nicht enthalten; Einstieg über leere Zustände                                  |

## 19. Offen

Diese Punkte schlägt der Plan vor, sie sind aber noch nicht entschieden. Die Empfehlung steht jeweils dabei.

| Frage                                   | Empfehlung                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Name der Startseite                     | „Start“, damit „Workbench“ nur den Combo-Editor meint                                            |
| Neue Aktion an einem früheren Schritt   | legt einen Branch an; Einfügen und Ersetzen als Angebot in der Schrittleiste                     |
| `OPPONENT`-Knoten                       | für neue Combos abschaffen, bestehende per Migration umwandeln                                   |
| Stresstest-Tiefe                        | eine Unterbrechung pro Branch, Paare nur auf Knopfdruck                                          |
| Klick auf eine Karte                    | wählt aus und öffnet das Aktionsmenü an der Karte (wie Master Duel); Rechtsklick öffnet dasselbe |
| Speicherort der Einstellungen           | Datenbank pro Nutzer statt Browser-Speicher                                                      |
| Mobile Lese- und Nachspielansicht       | nach UX-6, weil DuelPath vorerst nur lokal läuft                                                 |
| Missing the Timing und wartende Trigger | vorerst nur als Hinweistext beim Trigger-Angebot, keine Prüfung                                  |
