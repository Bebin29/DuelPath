# DuelPath: UX-Plan

Stand: 30.09.2026 · Grundlage für das UI-Rework. Erst wenn dieser Plan steht, wird das UI gestaltet.

Dieser Plan beschreibt, **wie sich DuelPath anfühlen und bedienen lassen soll**. Farben, Typografie und Komponenten folgen im UI-Plan und müssen sich an diesem Dokument messen lassen.

## 1. Für wen wir bauen

### Persona: Jonas, 27, Turnierspieler seit 10 Jahren

- Spielt Locals, regionale Turniere und YCS. Testet jeden Abend mehrere Stunden in EDOPro oder DuelingBook, schaut Top-Decklisten und Replays.
- Denkt in **Lines**: „Normal Summon Albaz, discard, Fusion in Mirrorjade …“. Schreibt sie heute als Stichpunkte in Discord oder Notizen und verliert dabei den Überblick über Zustände und Verzweigungen.
- Kennt die Karten auswendig, nennt sie beim Spitznamen (Ash, Imperm, Nib, Called, Droll, Belle) und liest PSCT flüssig auf Englisch.
- Seine eigentliche Frage ist nie „Wie geht die Combo?“, sondern: **„Wo kann der Gegner mich stoppen, und was bleibt dann übrig?“** Er sucht Choke Points, Extender und das beste Endboard gegen jede Unterbrechung.
- Hat keine Geduld für Formulare, Dialoge und Klick-Ketten. Wenn eine Eingabe länger dauert als der Zug im Spiel, benutzt er das Tool nicht.

### Was er von DuelPath erwartet

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
| 6   | Deck bauen oder per YDK übernehmen                        | pro Deck           | vorhanden, altes Design                                                           |
| 7   | Eine Line mit Teamkollegen teilen                         | gelegentlich       | nicht vorhanden                                                                   |

Die UX wird für Job 1 und 2 optimiert. Alles andere darf sie nicht bremsen.

## 3. Sprache und mentales Modell

Die App spricht die Sprache der Community. Fachbegriffe bleiben englisch, auch in der deutschen Oberfläche, weil jeder Spieler sie so kennt.

| Begriff in der App     | Bedeutung                                                              | Ersetzt heute              |
| ---------------------- | ---------------------------------------------------------------------- | -------------------------- |
| **Line**               | Folge von Schritten von der Starthand bis zum Endboard                 | „Combo“ als einzelner Pfad |
| **Combo**              | Sammlung von Lines zu einer Starthand, mit allen Zweigen               | Combo                      |
| **Branch**             | Abzweig, wenn der Gegner reagiert oder man anders spielt               | Gegner-Knoten mit Kindern  |
| **Choke Point**        | Schritt, an dem eine Unterbrechung die Line stoppt oder stark schwächt | nicht vorhanden            |
| **Endboard**           | Zustand am Ende einer Line                                             | „Endboard“-Knoten          |
| **Interruptions**      | Anzahl Unterbrechungen auf dem Endboard                                | nicht vorhanden            |
| **Starter / Extender** | Karte, die eine Line startet / fortsetzt, wenn sie gestoppt wurde      | nicht vorhanden            |
| **HOPT / SOPT**        | Hard / Soft Once per Turn                                              | „OPT“ mit Textbeschreibung |
| **Chain Link (CL)**    | Glied der Chain                                                        | vorhanden                  |
| **Goldfish**           | Line ohne gegnerische Reaktion                                         | „Keine Reaktion“           |

**Das mentale Modell:** Eine Combo ist eine **Hauptline** (Goldfish), von der an Choke Points **Branches** abgehen. Der Baum ist das Abbild davon, nicht umgekehrt. Nutzer denken nicht in „Knotentypen“, sondern in Aktionen: _Normal Summon, Aktivieren, Beschwören, Chain, Gegner reagiert, Endboard_.

## 4. UX-Prinzipien

Jede Designentscheidung wird gegen diese Prinzipien geprüft.

1. **Board first.** Das Spielfeld ist der Mittelpunkt. Karten werden dort gespielt, wo sie liegen, nicht in Formularen ausgewählt.
2. **Eine Aktion, eine Geste.** Normal Summon ist ein Klick oder eine Taste, kein Dialog. Die App kennt Zonen und Kartentypen und erzeugt die Bewegungen selbst.
3. **Goldfish zuerst, Stresstest danach.** Die Hauptline wird ohne Unterbrechung durchgespielt. Branches entstehen hinterher dort, wo sie gebraucht werden.
4. **Tastatur und Maus gleichwertig.** Alles geht mit der Maus. Wer schneller sein will, nimmt die Tastatur. Nichts ist nur per Tastatur erreichbar.
5. **Vertraut wie das Spiel.** Feldaufbau, Chain-Anzeige und Kartenvorschau orientieren sich an Master Duel und EDOPro. Kein neues Vokabular, wo es schon eines gibt.
6. **Alles sehen, nichts verbieten.** Regelverstöße werden sichtbar markiert, aber nie blockiert. Der Spieler weiß es oft besser als die Engine, und manche Rulings sind unklar.
7. **Was hat sich geändert?** Nach jedem Schritt ist sofort erkennbar, welche Karten sich bewegt haben. Ohne diese Hervorhebung ist ein Board mit 20 Karten unlesbar.
8. **Undo überall.** Jede Aktion ist mit Strg+Z rückgängig zu machen. Wer keine Angst vor Fehlern hat, probiert mehr aus.
9. **Dicht, aber ruhig.** Viel Information pro Bildschirm, aber klare Hierarchie. Kartenbilder tragen die Wiedererkennung, Text ergänzt.
10. **Jev berät, entscheidet nicht.** Vorschläge sind Abkürzungen, keine Pflicht. Sie erscheinen, wo man hinschaut, und stören nie beim Eingeben.

## 5. Informationsarchitektur

```
DuelPath
├── Workbench        Letzte Combo öffnen, zuletzt bearbeitet, Schnellstart aus Deck
├── Combos           Bibliothek: nach Deck, Starter, Tags, Status filtern
│   └── Combo        Workbench: Board, Lines/Baum, Inspector
├── Decks            Deckliste, Deckbau, YDK, Hand-Tester, Combos des Decks
└── Karten           Kartensuche mit Filtern und Kartenansicht (auch als Overlay überall)
```

- **Startseite = Workbench.** Wer die App öffnet, landet bei seiner zuletzt bearbeiteten Combo oder startet mit zwei Klicks eine neue aus einem Deck. Keine Marketing-Startseite für angemeldete Nutzer.
- **Deck und Combo sind verbunden.** Jede Deckseite zeigt ihre Combos. Jede Combo zeigt ihr Deck. Wechsel in beide Richtungen mit einem Klick.
- **Kartensuche ist global.** Strg+K öffnet überall Suche und Befehle. Die Kartenansicht ist ein Overlay, kein Seitenwechsel.

## 6. Die Combo-Workbench

Hier verbringt der Nutzer 90 % seiner Zeit.

### 6.1 Aufbau

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ◀ Combos   Albaz 1-Card · Deck: Branded Despia ▾    Goldfish · 3 Branches   │
├──────────────┬───────────────────────────────────────────────┬──────────────┤
│ LINES        │                  GEGNER                       │ INSPECTOR    │
│              │  Hand ▢▢▢▢▢       GY 2  Banish 0  Deck 35     │              │
│ ● Goldfish   │  S/T  ▢ ▢ ▢ ▢ ▢                              │ Karte am     │
│  1 NS Albaz  │  MZ   ▢ ▢ ▢ ▢ ▢                              │ Cursor:      │
│  2 Albaz ⚡   │         EMZ ▢   ▢                             │ Bild, Text,  │
│   ├ Ash → B  │  MZ   ▢ ▢ ▣ ▢ ▢     ┌ CHAIN ─────────┐        │ Effekte mit  │
│  3 Fusion    │  S/T  ▢ ▢ ▢ ▢ ▢     │ CL2 Ash (Opp)  │        │ HOPT-Status  │
│  4 Mirrorjade│  Hand ▣ ▣ ▣ ▣       │ CL1 Albaz      │        │              │
│  …           │  GY 3  Banish 1  Extra 14  Deck 33 └────────┘ │ Vorschläge   │
│ ○ B: Ash     │                  ICH                          │ (Jev)        │
│ ○ C: Imperm  │                                               │              │
│ [Baum ⤢]     │  ◀ Schritt 2 von 9 ▶   Nächste: NS · Aktiv. · Chain auflösen  │
└──────────────┴───────────────────────────────────────────────┴──────────────┘
```

- **Mitte: Board.** Das Spielfeld beider Spieler wie im Spiel: 5 Monsterzonen, 2 Extra Monster Zones, 5 Zauber/Fallen-Zonen, Spielfeldzone, Stapel für Deck, Extra Deck, Friedhof und Verbannt. Eigene Seite unten, Gegner oben gespiegelt. Die offene Chain liegt als Stapel daneben.
- **Links: Lines.** Die aktuelle Line als nummerierte Schrittliste, so wie Spieler sie aufschreiben. Branches hängen an ihrem Schritt und sind aufklappbar. Darunter die anderen Lines der Combo. Ein Klick auf „Baum“ öffnet den Canvas als Vollbild-Übersicht mit allen Verzweigungen.
- **Rechts: Inspector.** Zeigt die Karte unter dem Mauszeiger oder die ausgewählte Karte in groß, mit vollem Text, einzelnen Effekten und HOPT-Status. Darunter die Vorschläge von Jev für den nächsten Schritt.
- **Unten: Schrittleiste.** „Schritt 2 von 9“ mit Vor und Zurück sowie den naheliegenden nächsten Aktionen als Knöpfe.

Warum Board in der Mitte statt Baum: Der Nutzer arbeitet am Zustand und schaut auf den Verlauf. Der Baum ist für die Übersicht und Navigation da, die Line-Liste für das Lesen und Bearbeiten. Beides sind Ansichten derselben Daten.

### 6.2 Einen Schritt spielen

**Der Grundsatz:** Der Nutzer macht mit der Karte, was er im Spiel machen würde. Die App leitet daraus den Schritt ab.

| Geste                                          | Ergebnis                                                                                                                                                                                                                |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Handkarte auf eine Monsterzone ziehen          | Normal Summon (oder Set, wenn verdeckt abgelegt). Hat er den Normal Summon schon verbraucht, fragt die App „Special Summon?“                                                                                            |
| Handkarte auf eine Zauber/Fallen-Zone ziehen   | Zauber aktivieren bzw. Falle setzen                                                                                                                                                                                     |
| Rechtsklick oder Klick auf eine Karte          | Kontextmenü mit genau den Aktionen, die für diese Karte in dieser Zone Sinn ergeben: ihre Effekte (mit HOPT-Status), Normal Summon, Set, Special Summon, auf den Friedhof, verbannen, zurück auf die Hand oder ins Deck |
| Effekt im Kontextmenü oder im Inspector wählen | Aktivierung mit Chain Link. Kosten, die sich aus dem Text ableiten lassen (abwerfen, diese Karte verbannen), fragt die App gezielt ab                                                                                   |
| Karte aus dem Extra Deck auf das Feld ziehen   | Extra-Deck-Beschwörung: Die App fragt nach den Materialien, der Nutzer klickt sie auf dem Feld an, bestätigt mit Enter. Materialien gehen auf den Friedhof, Xyz-Materialien unter das Monster                           |
| Karte zwischen beliebige Zonen ziehen          | freie Bewegung für alles, was keine Regel kennt                                                                                                                                                                         |

**Was nach der Auflösung passiert:** Viele Effekte holen Karten aus dem Deck oder Friedhof („add 1 Despia from your Deck“). Beim Auflösen fragt die App: _„Was hast du gesucht?“_ und zeigt die passenden Karten aus Deck oder Friedhof als Bildreihe. Ein Klick und die Karte liegt auf der Hand. Das ersetzt die heutigen manuellen Bewegungen fast vollständig.

**Chains:** Nach jeder Aktivierung bietet die Schrittleiste an: _Chain auflösen_ (Enter), _weiter chainen_, _Gegner reagiert_. Solange der Nutzer nichts anderes tut, gilt der nächste Schritt als Auflösung. In der Goldfish-Line muss er Chains also nie von Hand auflösen.

**Was hat sich geändert:** Nach jedem Schritt leuchten bewegte Karten kurz auf, neu auf dem Feld, vom Feld gegangen, auf die Hand genommen. In der Schrittliste steht die Kurzform, zum Beispiel „Albaz: discard Aluber, Fusion → Mirrorjade“.

### 6.3 Stresstest: „Was, wenn …?“

Der wichtigste Unterschied zu jedem anderen Tool.

- **Handtrap auf einen Schritt ziehen.** Rechts neben der Line-Liste liegt eine Leiste mit den Staples (Ash, Imperm, Nib, Veiler, Droll, Belle …). Ein Staple wird auf einen Schritt gezogen, und an genau dieser Stelle entsteht ein Branch mit der passenden Aktivierung und Negierung. Das Board springt in diesen Branch.
- **Choke-Point-Analyse.** Ein Knopf „Stresstest“ lässt Jev für jeden Schritt der Line prüfen, welche Staples dort aktivierbar wären. Die Line-Liste zeigt danach an jedem Schritt kleine Symbole der Karten, die dort treffen, zum Beispiel „⚡ Ash · Imperm“. Ein Klick auf ein Symbol legt den Branch an. So sieht der Spieler in Sekunden, wo seine Line verwundbar ist.
- **Branch fortsetzen.** Im Branch spielt der Nutzer weiter wie in der Hauptline, oft mit einem Extender. Der Branch bekommt automatisch einen Namen wie „B: Ash auf 2“, den er ändern kann.
- **Vergleich.** Die Endboards von Hauptline und Branches lassen sich nebeneinander anzeigen: Welche Line verliert wie viel?

### 6.4 Endboard und Auswertung

Am Ende einer Line (letzter Schritt oder „Endboard“ markieren) zeigt die Workbench eine Zusammenfassung:

- **Board** als kompakte Kartenreihe.
- **Interruptions:** Anzahl und Liste der Unterbrechungen auf dem Feld und in der Hand. Das sind Quick Effects, Negierungen und Fallen, erkannt aus den PSCT-Mustern.
- **Ressourcen:** Handkarten, Karten im Friedhof mit Effekten, übrig gebliebener Normal Summon.
- **Kosten:** Wie viele Karten der Starthand wurden gebraucht („1-Card-Combo“).
- **HOPTs verbraucht:** Welche Namen sind für den Rest des Zuges gesperrt.
- **Schwachstellen:** Aus dem Stresstest, an welchen Schritten welche Staples die Line brechen und wie das Endboard dann aussieht.

### 6.5 Nachspielen und Lernen

- **Pfeiltasten** ← → gehen Schritt für Schritt durch die Line, das Board folgt mit kurzen Bewegungsanimationen.
- **Leertaste** spielt die Line automatisch ab, ein Schritt pro Sekunde.
- **An Verzweigungen** zeigt die Schrittleiste „Branch B: Ash“ an. ↓ wechselt hinein.
- Ideal zum Lernen vor einem Turnier: Line öffnen, einmal durchspielen, die Choke Points sehen.

## 7. Starthand und Combos verwalten

### 7.1 Neue Combo starten

1. Aus der Workbench oder von einer Deckseite: **„Neue Combo“**.
2. Deck wählen (vorausgewählt, wenn man vom Deck kommt).
3. **Starthand**: Das Deck liegt als Bildraster da. Klick legt eine Karte auf die Hand, erneuter Klick nimmt sie zurück. Oben „1-Card“, „2-Card“, „5 Karten“ als Zähler. Optional **„Zufallshand“** für Übungssitzungen.
4. Optional: **Going Second** mit Gegnerboard. Zum Beispiel lassen sich bekannte Endboards wie „Baronne + Apollousa + Imperm gesetzt“ als Vorlage laden oder frei setzen.
5. Los: Die Workbench öffnet sich mit Board und Starthand.

Titel werden automatisch vorgeschlagen („Albaz 1-Card“), damit niemand vor dem ersten Schritt tippen muss.

### 7.2 Bibliothek

- Liste aller Combos mit Kartenbildern der Starthand, Deck, Anzahl Lines und Branches, Endboard-Interruptions und Status.
- **Filter:** Deck, Starterkarte („alle Combos mit Albaz“), Tags (1-Card, Going Second, Grind), Status (Entwurf, getestet, turnierfest).
- **Suche** nach Kartennamen in der Line: „Wo benutze ich Called by the Grave?“

### 7.3 Hand-Tester auf der Deckseite

- „Hand ziehen“ zieht 5 zufällige Karten aus dem Deck.
- Darunter: **Welche gespeicherten Combos gehen mit dieser Hand?** Eine Combo passt, wenn ihre Starthand in der gezogenen Hand enthalten ist.
- Passt keine, bietet die App „Neue Combo mit dieser Hand“ an.
- Über viele Züge ergibt das eine grobe **Abdeckung**: „In 68 % der Hände hast du eine gespeicherte Line.“

## 8. Kartensuche und Kartenansicht

- **Spitznamen und Kürzel.** „ash“, „imperm“, „nib“, „called“, „mst“, „bewd“ finden sofort die richtige Karte. Kürzel aus Anfangsbuchstaben werden automatisch erkannt, gängige Spitznamen kommen aus einer gepflegten Liste.
- **Deck zuerst.** In einer Combo erscheinen Karten aus dem eigenen Deck oben, dann Staples, dann der Rest.
- **Tippfehler-tolerant**, Treffer ab dem zweiten Buchstaben, Bild in jedem Treffer.
- **Kartenvorschau beim Überfahren**: großes Bild, voller Text, Effekte einzeln mit HOPT-Markierung, TCG-Banlist-Status. Kein Klick nötig.
- **Kartensprache getrennt von der Oberflächensprache.** Standard sind englische Kartennamen und -texte, weil Community, Turniere und PSCT englisch sind. Deutsch ist per Schalter verfügbar. Die Oberfläche selbst ist Deutsch oder Englisch.

## 9. Tastatur

Tastatur ist Beschleunigung, nie Voraussetzung. Ein Druck auf „?“ zeigt jederzeit alle Kürzel.

| Taste                    | Aktion                                                         |
| ------------------------ | -------------------------------------------------------------- |
| Strg+K                   | Suche und Befehle (Karten, Combos, Aktionen)                   |
| ← →                      | vorheriger / nächster Schritt                                  |
| ↑ ↓                      | in einen Branch hinein / zurück zur übergeordneten Line        |
| Leertaste                | Line abspielen / anhalten                                      |
| N / S / A                | Normal Summon / Set / Aktivieren der ausgewählten Karte        |
| 1 bis 9                  | Effekt 1 bis 9 der ausgewählten Karte aktivieren               |
| Enter                    | Chain auflösen bzw. Auswahl bestätigen                         |
| G / B / H / D            | auf den Friedhof / verbannen / auf die Hand / ins Deck         |
| O                        | Gegner reagiert: Staple-Leiste öffnen                          |
| E                        | Endboard markieren                                             |
| Strg+Z / Strg+Umschalt+Z | Rückgängig / Wiederholen                                       |
| Entf                     | Schritt löschen (mit allen Folgeschritten, rückgängig machbar) |
| F                        | Kartensuche fokussieren                                        |

Später: Befehlszeile in Strg+K mit Kurzform, zum Beispiel „ns albaz“ oder „act ash 2“.

## 10. Feedback, Regeln und Jev

- **Warnungen sind leise.** Ein Regelverstoß (HOPT verbraucht, zweiter Normal Summon, falscher Spell Speed) erscheint als kleines Symbol am Schritt und als Rahmen um die Karte. Beim Überfahren steht der Grund, mit der passenden Mechanik aus der Ruling-Tabelle. Ein Klick auf „trotzdem erlauben“ setzt den manuellen Eingriff.
- **Nie ein Dialog, der den Fluss unterbricht,** außer bei destruktiven Aktionen (Deck per YDK ersetzen, Combo löschen). Selbst dann gibt es Undo.
- **HOPT-Tracker** im Inspector: Welche Namen sind in diesem Zug schon genutzt, welche noch frei. Profis zählen das im Kopf mit, die App nimmt es ihnen ab.
- **Jev-Vorschläge** erscheinen im Inspector als „Mögliche nächste Aktionen“ mit Kartenbild und einem dezenten Balken für die Sicherheit. Sie laden im Hintergrund und verschieben nie das Layout. Ein Klick übernimmt den Vorschlag als Schritt.
- **Zustand des Speicherns** ist immer sichtbar, aber unauffällig. Speichern passiert automatisch, es gibt keinen Speichern-Knopf.

## 11. Leere Zustände und Einstieg

- **Erste Anmeldung:** Kein Tutorial-Marathon. Eine Beispiel-Combo ist vorinstalliert („Beispiel: Albaz-Line mit Ash-Branch“) und zeigt alle Konzepte in 30 Sekunden Nachspielen.
- **Keine Decks:** „Deck per YDK importieren“ ist der Hauptknopf, weil fast jeder Spieler seine Liste schon in EDOPro oder YGOPRODeck hat.
- **Leere Combo:** Das Board zeigt die Starthand und im Inspector die Vorschläge für den ersten Schritt. Die erste Aktion ist also immer einen Klick entfernt.
- **Hinweise im Kontext:** Beim ersten Mal erscheint an der Staple-Leiste einmalig der Hinweis „Zieh eine Handtrap auf einen Schritt, um einen Branch anzulegen“.

## 12. Gestaltungsrahmen für das UI

Diese Punkte legt die UX fest. Die konkrete Gestaltung macht der UI-Plan.

- **Dunkles Design als Standard.** Lange Sessions am Abend, Kartenbilder wirken auf dunklem Grund besser. Helles Design bleibt verfügbar.
- **Feste Bedeutungsfarben:** eigene Seite, Gegner, offene Chain, Warnung und Jev haben je eine eigene Farbe, die überall gleich ist. Farbe ist nie das einzige Merkmal, es gibt immer auch Symbol oder Text.
- **Kartenbilder tragen die Wiedererkennung.** Auf dem Board, in der Line-Liste und in der Suche. Text ergänzt, ersetzt nie.
- **Bewegung mit Zweck:** kurze Bewegungen (etwa 150 ms), wenn Karten die Zone wechseln, damit das Auge folgen kann. Keine dekorativen Animationen.
- **Desktop zuerst** (ab 1440 px, optimal 1920 px). Auf dem Laptop (1280 px) klappen die Seitenleisten ein. Auf Tablet und Handy gibt es eine **Lese- und Nachspielansicht**, keine Eingabe.
- **Barrierearm:** vollständig per Tastatur bedienbar, ausreichender Kontrast, sichtbarer Fokus, Bildschirmleser bekommen Kartennamen und Zonen.

## 13. Woran wir gute UX messen

Jede UI-Version muss diese Szenarien schaffen. Wir testen sie selbst mit der Stoppuhr.

| Szenario                                                 | Ziel                                   |
| -------------------------------------------------------- | -------------------------------------- |
| Neue Combo aus einem Deck mit 1-Karten-Starthand anlegen | unter 15 Sekunden                      |
| 10-Schritt-Goldfish-Line eingeben (bekannte Line)        | unter 2 Minuten                        |
| Ash-Branch an Schritt 3 anlegen                          | unter 3 Sekunden                       |
| Stresstest einer 10-Schritt-Line mit allen Staples       | Ergebnis in unter 10 Sekunden          |
| Line nachspielen und jeden Zustand verstehen             | ohne einen einzigen Klick in Formulare |
| Eine Line komplett ohne Maus eingeben                    | möglich                                |
| Neuer Nutzer spielt die Beispiel-Combo nach              | ohne Erklärung, unter 1 Minute         |

## 14. Was sich gegenüber heute ändert

| Heute                                                                       | Neu                                                               |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Baum im Zentrum, Board klein in der Seitenleiste                            | Board im Zentrum, Line-Liste links, Baum als Übersicht            |
| Schritt = Formular mit Auswahlfeldern, Bewegungen manuell                   | Schritt = Geste an der Karte, Bewegungen automatisch              |
| Knotentypen (Aktion, Aktivierung, Gegner reagiert, Chain auflösen) sichtbar | Aktionen in Spielersprache; Chain-Auflösung meist automatisch     |
| Branches nur an vorher angelegten Gegner-Knoten                             | Handtrap auf jeden Schritt ziehen; Stresstest findet Choke Points |
| Kein Endboard-Überblick                                                     | Endboard-Auswertung mit Interruptions und Schwachstellen          |
| Kein Nachspielen                                                            | Schritt für Schritt und Autoplay mit Animation                    |
| Suchergebnisse nur über exakte Namen                                        | Spitznamen, Kürzel, Deck zuerst                                   |
| Kartennamen folgen der Oberflächensprache                                   | Kartensprache eigene Einstellung, Standard Englisch               |
| Helles Design                                                               | Dunkles Design als Standard                                       |

## 15. Technische Voraussetzungen aus der UX

Damit die UX funktioniert, braucht das Datenmodell einige Erweiterungen:

- **Zonen mit Plätzen:** Die 5 Monsterzonen, 2 Extra Monster Zones und 5 Zauber/Fallen-Zonen sind heute nur Listen. Für das Board brauchen Karten einen festen Platz (`slot` gibt es schon, er wird aber nicht genutzt).
- **Xyz-Materialien:** Karten unter einem Xyz-Monster (heute nicht abbildbar).
- **Spielmarken:** Tokens anlegen (Nibiru, Scapegoat).
- **Lebenspunkte:** für Kosten wie „Pay 1500 LP“ und für Endboard-Vergleiche.
- **Suchziele aus dem Kartentext:** „add 1 Despia from your Deck“ als Filter für die Frage „Was hast du gesucht?“. Die Muster dafür gibt es teilweise schon.
- **Interruption-Erkennung** für die Endboard-Auswertung aus den vorhandenen PSCT-Mustern.
- **Undo/Redo** über einen Verlauf der Combo-Änderungen im Editor.
- **Spitznamen-Liste** für die Suche.

## 16. Umsetzung in Phasen

| Phase                               | Inhalt                                                                                                                                            | Nutzen               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **UX-1 Fundament**                  | Workbench-Aufbau (Board, Line-Liste, Inspector), Kartenvorschau, Kartensprache, dunkles Design, Undo                                              | Das neue Grundgefühl |
| **UX-2 Spielen am Board**           | Drag auf Zonen, Kontextmenü, Extra-Deck-Beschwörung mit Materialien, „Was hast du gesucht?“, automatische Chain-Auflösung, Änderungs-Hervorhebung | Job 1 wird schnell   |
| **UX-3 Stresstest**                 | Staple-Leiste mit Drag auf Schritte, Choke-Point-Analyse mit Jev, Endboard-Auswertung, Vergleich                                                  | Job 2 und 4          |
| **UX-4 Nachspielen und Bibliothek** | Schritt-Navigation, Autoplay, Bibliothek mit Filtern, Tags und Status                                                                             | Job 3                |
| **UX-5 Deck und Hand-Tester**       | Deckbau im neuen Design, Hand-Tester mit Abdeckung, neue Combo aus einer gezogenen Hand                                                           | Job 5 und 6          |
| **UX-6 Tempo**                      | Befehlszeile, Tastatur-Feinschliff, Spitznamen-Pflege, Beispiel-Combo                                                                             | für Vielnutzer       |

Jede Phase endet mit den passenden Szenarien aus Abschnitt 13.

## 17. Offene Entscheidungen

- Workbench-Aufbau: Board im Zentrum mit Line-Liste und Baum als Übersicht (Empfehlung), oder Baum im Zentrum wie bisher.
- Kartensprache Standard Englisch (Empfehlung) oder weiterhin nach Oberflächensprache.
- Zufallshand und Hand-Tester: aufnehmen (Empfehlung) oder bei der reinen Auswahl aus dem Deck bleiben.
- Teilen: Line als Text für Discord kopieren, zum Beispiel „1. NS Albaz 2. Albaz: discard, Fusion → Mirrorjade …“. Bisher ausgeschlossen, für Teams aber sehr nützlich.
- Dunkles Design als Standard (Empfehlung) oder hell.
