# DuelPath: Deckbau-Plan

Stand: 02.10.2026 · D-1 bis D-4 umgesetzt

Dieser Plan beschreibt, wie DuelPath vom Deck-Editor zum Werkzeug für **Ratios** wird. Er baut auf dem UX-Plan auf (Hand-Tester 7.3, Deck-Abgleich 7.4) und ändert nichts an der Workbench.

## 1. Ausgangslage

Der Editor kann heute Karten suchen und hinzufügen, Anzahlen ändern, Karten ins Side Deck schieben, YDK importieren und exportieren und Deckregeln prüfen (`deck-rules.ts`). Der Hand-Tester zieht Hände, findet passende Combos und schätzt die **Abdeckung** über 2000 simulierte Hände (`hand-tester.ts`).

Was fehlt: Eine Liste lässt sich pflegen, aber nicht **abwägen**. Die App beantwortet nicht, ob die dritte Golden Rule mehr bringt als die zweite Called by the Grave, ob 41 Karten etwas kosten oder wie oft die Hand nur aus Bricks besteht.

## 2. Wie ein Profi ein Deck baut

Damit die Funktionen die richtigen Fragen beantworten, hier die Denkweise, an der sich der Plan misst.

**Engine und Non-Engine.** Ein Deck besteht aus der Engine (die Karten, die die Combo machen) und dem Non-Engine-Teil (Handtraps, Boardbreaker, generische Karten). Die erste Frage ist immer: Wie groß muss die Engine sein, damit ich fast immer eröffne, und wie viel Platz bleibt für Interaktion?

**Starter zählen, nicht Karten.** Entscheidend ist die Zahl der Karten, die allein oder mit fast jeder zweiten Karte die Combo starten. Suchkarten zählen dabei als Starter: Crystal Bond ist so gut wie ein Sapphire Pegasus, weil sie ihn holt. Ein Profi rechnet „ich habe 15 Starter in 40“ und nicht „ich habe 3 Pegasus“.

**Zwei gleiche Karten sind kein zweiter Starter.** Zieht man zwei Kopien eines Starters mit hartem Once per Turn, ist die zweite meist tot. Eine Hand mit 2× Pegasus ist schlechter als Pegasus plus Extender. Jede Rechnung, die Kopien einfach zusammenzählt, überschätzt das Deck.

**Hände in Stufen denken.** Eine Hand ist nicht „geht“ oder „geht nicht“:

| Stufe    | Erster Zug                                   | Zweiter Zug                        |
| -------- | -------------------------------------------- | ---------------------------------- |
| Brick    | kein Starter                                 | kein Starter und kein Boardbreaker |
| Spielbar | ein Starter                                  | ein Starter oder zwei Boardbreaker |
| Gut      | Starter plus Extender oder Handtrap          | Starter plus Boardbreaker          |
| Sehr gut | Combo durch eine Unterbrechung plus Handtrap | Combo plus zwei Boardbreaker       |

**Erster und zweiter Zug sind zwei Decks.** Going first zählen Handtraps und eine Combo, die Unterbrechungen übersteht. Going second zählen Boardbreaker (Evenly Matched, Dark Ruler No More, Forbidden Droplet, Triple Tactics Talent, Lightning Storm). Dieselbe Karte hat je nach Position einen anderen Wert. Mit 6 Karten steigt außerdem jede Wahrscheinlichkeit deutlich.

**Garnets.** Manche Karten braucht die Combo im Deck, auf der Hand sind sie aber tot (Rainbow Dragon in Crystal Beast, Normalmonster für Suchen). Ein Profi spielt davon so wenige wie möglich und weiß genau, wie oft er einen zieht.

**Deckgröße ist eine Entscheidung.** 40 Karten ist der Standard, weil jede Karte darüber die guten Karten verdünnt. Bei mehr Karten sinkt vor allem die Chance auf eine bestimmte Karte: 3 Kopien in 40 Karten ziehen in 5 Karten zu 33,8 %, in 60 Karten nur zu 23,3 %. Decks wie die Crystal-Beast-Liste mit 60 Karten haben dafür einen Grund (sieben verschiedene Crystal Beasts für Rainbow Dragon), und der sollte sichtbar sein.

**Grenznutzen.** Die Frage am Ende jeder Liste lautet: Welche Karte bringt pro Slot am meisten, welche am wenigsten? „+1 Pegasus: +2,1 % Abdeckung“ gegen „−1 Kyoutou: −0,3 %“ ist die Entscheidung, die Profis heute im Kopf oder in Tabellen treffen.

**Extra Deck nach Nutzung.** Jeder der 15 Plätze muss sich rechtfertigen: Welche Line braucht die Karte, und gibt es eine, die sie nie braucht?

## 3. Funktionen

### 3.1 Rollen

Jede Karte im Deck bekommt **eine Rolle**:

| Rolle        | Bedeutung                                          | Vorschlag der App                                                 |
| ------------ | -------------------------------------------------- | ----------------------------------------------------------------- |
| Starter      | startet eine Combo allein oder sucht einen Starter | Karte steht in der Starthand einer 1-Card-Combo dieses Decks      |
| Extender     | verlängert eine Combo, startet sie aber nicht      | Karte steht in einer 2-Card-Starthand neben einem Starter         |
| Handtrap     | Interaktion im Zug des Gegners                     | Karte steht in der Staple-Liste (`reactions.ts`)                  |
| Boardbreaker | räumt ein gegnerisches Feld ab                     | kleine feste Liste bekannter Breaker, erweiterbar wie die Staples |
| Garnet       | muss im Deck sein, ist auf der Hand tot            | kein Vorschlag, nur von Hand                                      |
| Sonstige     | alles andere                                       | Standard                                                          |

- **Eine Rolle pro Karte**, keine Mehrfachrollen. Nur so bilden die Rollen eine Aufteilung des Decks und die Rechnung bleibt exakt. Wer Called by the Grave als Handtrap führt, entscheidet das bewusst.
- **Vorschläge sind nur Vorschläge.** Die App zeigt sie gestrichelt an, ein Klick übernimmt sie. Nichts wird ohne Bestätigung gesetzt (UX-Prinzip: die App sagt es, sie verbietet nichts).
- **Pro Deck**, nicht pro Karte global: Ash Blossom ist im einen Deck Handtrap, im anderen vielleicht Extender (Ash als Tuner).
- Im Tab „Ratios“ stehen die Karten nach Rolle gruppiert; die Deckliste bleibt nach Kartentyp sortiert.

### 3.2 Wahrscheinlichkeiten

Ein Feld neben der Deckliste rechnet mit, während die Liste sich ändert. Umschalter für erster oder zweiter Zug (5 oder 6 Karten).

| Kennzahl                             | Beispiel (40 Karten, 12 Starter, 9 Handtraps) |
| ------------------------------------ | --------------------------------------------- |
| mindestens 1 Starter                 | 85,1 %                                        |
| Starter plus Handtrap                | 61,0 % (6 Karten: 71,7 %)                     |
| Brick (kein Starter)                 | 14,9 %                                        |
| mindestens 1 Garnet                  | je nach Deck                                  |
| Going second: Starter oder 2 Breaker | je nach Deck                                  |
| Stufen aus Abschnitt 2               | Balken mit Anteil je Stufe                    |

- **Exakt statt simuliert.** Die Rechnung ist hypergeometrisch über die Rollen. Bei sechs Rollen und 5 oder 6 Handkarten sind das wenige tausend Fälle, sie laufen im Browser in Millisekunden. Keine springenden Zahlen, kein Zufall.
- **Doppelte Starter mit OPT zählen einmal.** Für Stufen wie „Starter plus Extender“ werden Starter und Extender nicht als Topf, sondern als einzelne Karten gezählt (bis etwa 20 verschiedene Karten, C(20,6) = 38.760 Fälle, weiter schnell). Eine zweite Kopie eines Starters mit hartem OPT gilt dann als Sonstige. Ob eine Karte hartes OPT hat, steht schon in den zerlegten Effekten (`Card.effects`, OPT-Klauseln).
- **Unterschied zum Vergleichsstand.** Jede Zahl zeigt die Änderung gegenüber dem Stand beim Öffnen: „85,1 % +2,3“. Ein Knopf setzt den jetzigen Stand als neuen Vergleich. Der gespeicherte Stand taugt dafür nicht, weil die Seite nach jeder Änderung automatisch speichert.

### 3.3 Abdeckung durch die eigenen Combos

Das kann nur DuelPath, weil die Combos am Deck hängen. Heute ist die Abdeckung eine Simulation über 2000 Hände. Neu:

- **Exakt.** Karten, die in keiner Starthand vorkommen, sind für die Abdeckung gleichwertig und fallen in eine Klasse „übrige Karten“. Übrig bleiben die Karten aus Starthänden (meist unter 15) plus diese eine Klasse. Über diese Klassen lässt sich jede Hand als Multimenge aufzählen: Bei 15 Klassen und 5 Karten sind das 3003 Fälle, jeweils mit ihrer hypergeometrischen Wahrscheinlichkeit. Die Simulation entfällt.
- **Grenznutzen pro Karte.** Für jede Karte im Main Deck: Abdeckung mit einer Kopie mehr und einer weniger. In der Deckliste steht das als kleine Zahl an der Karte („+1: +2,1 %“), sortierbar.
- **Streichkandidaten.** Die drei Karten, deren Entfernen die Abdeckung am wenigsten senkt, getrennt nach Engine und Non-Engine. Das ist die Antwort auf „ich muss auf 40, was fliegt raus?“.
- **Deckgröße.** „Mit 41 Karten: −0,9 %“ als Hinweis, sobald das Main Deck über 40 liegt.
- **Grenze offen zeigen.** Die Abdeckung kennt nur die Combos, die gespeichert sind. Liegt sie deutlich unter „mindestens 1 Starter“, fehlen vermutlich Combos. Die App sagt das in einem Satz, statt eine zu niedrige Zahl unkommentiert stehen zu lassen.

### 3.4 Extra Deck nach Nutzung

- An jeder Extra-Deck-Karte: in wie vielen Combos sie vorkommt.
- Karten ohne Line werden markiert („in keiner Combo“), mit dem Hinweis, dass sie auch für Going second oder als Antwort gedacht sein können.
- Karten, die eine Line braucht, die aber nicht im Extra Deck stehen, kommen schon aus dem Deck-Abgleich (`deck-check.ts`) und erscheinen hier mit.

### 3.5 Versionen und Vergleich (Phase D-3)

- **Version speichern** mit Namen („vor Locals“, „0 Gallant“). Gespeichert wird die Liste mit Rollen, nicht die Kennzahlen; die rechnet die App bei Bedarf neu.
- **Vergleich** des jetzigen Stands mit einer Version, dem Stand beim Öffnen oder einem Zwischenstand: Differenzliste (+1 Golden Rule, −1 Kyoutou) und alle Kennzahlen mit ihrer Änderung. Zwei ältere Versionen vergleicht man, indem man eine zurückholt; Strg+Z nimmt das zurück.
- **Zurückholen** ersetzt die Liste und die Rollen durch die der Version. **Löschen** zeigt einige Sekunden „Rückgängig“ an und legt die Version dabei mit Inhalt und Datum neu an.
- **Keine Varianten als eigene Decks.** Eine Version leistet dasselbe („3 Gallant“ sichern, umbauen, vergleichen), ohne dass sich Combos auf zwei Decks verteilen.

### 3.6 Side-Plan pro Matchup (Phase D-4)

- Pro Matchup (freier Name, etwa „Ryzeal“, „Snake-Eye“) und Position: Karten rein, Karten raus.
- Die App prüft, dass rein und raus gleich viele Karten sind und die Karten im Side bzw. Main Deck liegen. Sie verbietet nichts, sie sagt es.
- Rollen der Side-Deck-Karten (Ash als Handtrap, Evenly Matched als Breaker) setzt man im Side-Plan selbst, mit denselben Vorschlägen wie im Tab Ratios.
- Kennzahlen und Abdeckung lassen sich für die Liste nach dem Siden anzeigen: „Going second gegen Ryzeal: Starter oder 2 Breaker 78 %“.

### 3.7 Spielprotokoll am Deck (Phase D-5)

Ein Side-Plan ist ohne Rückmeldung eine Vermutung, die nie korrigiert wird. Man trägt ein, welche sieben Karten gegen Ryzeal rein und raus gehen, und erfährt nie, ob das gehalten hat. Dafür gibt es am Deck ein Protokoll, mehr nicht.

- Pro Spiel vier Werte: Matchup, Zugfolge, Ergebnis und eine kurze Notiz, dazu der Side-Plan, der anlag. Matchup und Zugfolge sind aus dem offenen Plan vorbelegt; nach „Spiel eintragen“ genügt im Normalfall ein Klick auf das Ergebnis.
- Eine Zeile ist **ein Spiel, kein Match.** Best of 3 wird nicht abgebildet, weil die Zugfolge sich pro Spiel ändert und genau sie die interessante Größe ist.
- Am Side-Plan steht danach die Bilanz: „5 zu 2 Going Second mit diesem Plan“. Gibt es keine Einträge, steht dort nichts.
- **Rohe Zahlen, nie eine Quote.** Eine Siegquote aus sieben Spielen behauptet mehr, als sie weiß. Was daraus folgt, entscheidet der Spieler; die App schlägt aufgrund des Protokolls keinen Side-Plan vor und ändert keinen.
- Anlegen und löschen, kein Bearbeiten. Ein Fehleintrag wird gelöscht und neu gesetzt.
- Das Matchup-Feld schlägt die am Deck schon benutzten Matchups vor und vergleicht ohne Groß- und Kleinschreibung, damit „Ryzeal“ und „ryzeal“ nicht auseinanderfallen.
- Die Grenze gehört dazu und steht in Abschnitt 7: kein Duellmodus, keine Statistik-Seite, keine Diagramme, keine Prozentangaben.

## 4. Technik

### 4.1 Datenmodell

- `Deck.roles Json @default("{}")`: Passcode auf Rolle. Ein Feld am Deck statt einer Spalte an `DeckCard`, weil dieselbe Karte in Main und Side Deck dieselbe Rolle hat und `DeckCard` pro Bereich eine Zeile hat. Beim Schreiben über ein Zod-Schema geprüft (Rollen als Enum, nur Karten, die im Deck liegen).
- D-3: Modell `DeckVersion` mit `deckId`, `name`, `entries Json`, `roles Json`, `createdAt`. Versionen liegen außerhalb des Verlaufs der Seite, weil Sichern und Löschen keine Bearbeitung der Liste sind.
- D-4: `Deck.sidePlans Json` statt eigenem Modell, Liste von `{ id, matchup, going, in, out }`. So laufen Side-Pläne durch denselben Autosave und dasselbe Strg+Z wie Liste und Rollen; geprüft mit Zod beim Speichern.
- D-5: Modell `DeckGame` mit `deckId`, `sidePlanId`, `matchup`, `going`, `result`, `note`, `playedAt`. Eigenes Modell statt eines weiteren Json-Felds am Deck, weil die Liste unbegrenzt wächst und ein Eintrag kein Bearbeiten der Liste ist: Er hängt an zwei eigenen Aktionen, nicht am Autosave der Seite, und Strg+Z oder das Zurückholen einer Version fassen ihn nicht an. Dieselbe Begründung wie bei `DeckVersion`.
- In eine Planbilanz zählen ausschließlich Einträge mit dessen ausdrücklicher `sidePlanId`, solange der Plan existiert. Ohne Planbezug oder mit verschwundenem Plan bleiben Spiele im deckweiten Protokoll sichtbar, zählen aber in keine Bilanz. Es gibt keinen Rückfall auf Matchup und Zugfolge. Der gespeicherte Bezug bleibt erhalten: Holt Strg+Z denselben Plan zurück, gehören die Spiele wieder dazu.

### 4.2 Rechnung

- Neues Modul `src/lib/deck/odds.ts`: hypergeometrische Wahrscheinlichkeit für Bedingungen über Klassen (Rollen oder einzelne Karten), Aufzählung der Hände als Multimengen. Reine Funktionen ohne React, laufen auf Server und im Browser.
- `coverage` in `hand-tester.ts` wird auf die exakte Rechnung umgestellt. `drawHand` und `seededRandom` bleiben für das Ziehen einzelner Hände.
- Grenznutzen: pro Karte zwei Rechnungen (±1). Bei 30 verschiedenen Karten sind das 60 Rechnungen mit je wenigen tausend Fällen. Das reicht im Browser ohne Worker; falls nicht, wird die Rechnung erst nach 300 ms Ruhe ausgelöst.
- **Prüfung:** Tests in `tests/lib/deck/odds.test.ts` mit Werten, die sich von Hand nachrechnen lassen. Zum Beispiel 40 Karten, 9 Starter, 5 Karten: 1 − C(31,5)/C(40,5) = 74,18 %. Dazu ein Test, dass die exakte Abdeckung mit der bisherigen Simulation auf 1,5 Prozentpunkte übereinstimmt, und einer, dass zwei Kopien eines OPT-Starters nicht als „Starter plus Extender“ zählen.

### 4.3 Oberfläche

- Eigener Tab „Ratios“ neben Deckliste, Combos und Hand-Tester: Karten nach Rolle gruppiert, an jeder Karte Rollen-Chip (Klick öffnet die Auswahl), Grenznutzen als „−1 / +1“ und die Knöpfe für die Anzahl. So ändert man die Ratios dort, wo man die Wirkung sieht.
- Kennzahlen aus 3.2 und 3.3 ab 1024 px als mitlaufende Spalte rechts, darunter oberhalb der Liste. Tastaturkürzel für Rollen erst, wenn jemand sie vermisst.
- Zahlen mit tabellarischen Ziffern, Änderungen in `--self` (besser) und `--opponent` (schlechter), immer zusätzlich mit Vorzeichen, damit sie ohne Farbe lesbar bleiben (UI-Plan 10).

### 4.4 API

- `PATCH /api/v1/decks/:id/roles` und Rollen in `GET /api/v1/decks/:id`, damit Agenten Rollen setzen und Kennzahlen lesen können.
- `GET /api/v1/decks/:id/odds?going=first|second` liefert die Kennzahlen und den Grenznutzen. So kann ein Agent „schlag mir einen Cut auf 40 vor“ mit echten Zahlen beantworten.
- `&matchup=Ryzeal` rechnet für das Main Deck nach dem Side-Plan, die Zugfolge kommt dann aus dem Plan. Side-Pläne stehen auch in `GET /api/v1/decks/:id`. Versionen gibt es über die API nicht; dafür fehlt bisher ein Anlass.
- D-5: Jeder Side-Plan in `GET /api/v1/decks/:id` trägt `record` mit Siegen, Niederlagen und Unentschieden, damit ein Agent „welcher meiner Pläne hält nicht?“ beantworten kann. Rohe Zahlen auch hier, keine Quote. Eintragen geht nur in der App.

## 5. Phasen

| Phase                          | Inhalt                                                                                              | Nutzen                                    |
| ------------------------------ | --------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **D-1 Rollen und Kennzahlen**  | Rollen mit Vorschlägen, exakte Wahrscheinlichkeiten, Stufen, Unterschied zum Vergleichsstand        | „Wie konsistent ist meine Liste?“         |
| **D-2 Combos und Grenznutzen** | exakte Abdeckung, Grenznutzen pro Karte, Streichkandidaten, Deckgröße, Extra Deck nach Nutzung, API | „Welche Karte fliegt raus?“               |
| **D-3 Versionen**              | Versionen speichern, Vergleich, Zurückholen                                                         | „War die Liste von letzter Woche besser?“ |
| **D-4 Side-Plan**              | Side-Plan pro Matchup und Position, Kennzahlen nach dem Siden                                       | Vorbereitung auf ein Turnier              |
| **D-5 Spielprotokoll**         | Spiele am Deck eintragen, Bilanz je Side-Plan, `record` in der API                                  | „Hält mein Plan gegen Ryzeal?“            |

D-1 und D-2 sind der Kern und gehören zusammen in einen Branch: Ohne Rollen fehlt den Kennzahlen die Grundlage, ohne Abdeckung fehlt der Teil, den es woanders nicht gibt.

## 6. Szenarien

Wie im UX-Plan (Abschnitt 13) mit der Stoppuhr geprüft, mit der Crystal-Beast-Liste als Testdeck:

| Szenario                                             | Ziel                                                      |
| ---------------------------------------------------- | --------------------------------------------------------- |
| Rollen für ein neues Deck mit Combos setzen          | unter 1 Minute, meist per Übernahme der Vorschläge        |
| Ablesen, wie oft die Hand going first ein Brick ist  | ohne Klick                                                |
| Eine Karte von 2 auf 3 erhöhen und die Wirkung sehen | unter 2 Sekunden, ohne Speichern                          |
| Von 43 auf 40 Karten kürzen                          | unter 1 Minute mit den Streichkandidaten                  |
| Zwei Versionen vergleichen (D-3)                     | unter 5 Sekunden                                          |
| Ein Spiel nach der Runde eintragen (D-5)             | Protokoll öffnen, Ergebnis wählen; übrige Werte vorbelegt |

## 7. Bewusst nicht enthalten

- **Automatischer Deckbau oder Ratio-Optimierer.** Die App rechnet und schlägt Streichkandidaten vor, sie baut keine Liste. Ein Optimierer würde Combos überbewerten, die gespeichert sind, und alles unterschätzen, was nur im Kopf des Spielers existiert.
- **Statistik-Seite, Diagramme und Prozentangaben zu Matchups.** Seit D-5 lassen sich Spiele am Deck eintragen (3.7), und die Bilanz steht als rohe Zahl am Side-Plan. Daraus wird keine Siegquote, keine Auswertung über Decks hinweg, kein Diagramm und keine eigene Seite. Eine Quote aus sieben Spielen behauptet mehr, als sie weiß, und eine Seite voller Zahlen lädt dazu ein, sie zu glauben.
- **Duellmodus, Replay und Turniermodell.** Ein Eintrag im Protokoll ist ein Ergebnis, kein Verlauf: kein Spielfeld, kein Gegnerboard, keine Gegnernamen, keine Orte, keine Matches. Ein Combo-Baum bleibt ein eigener Zug (Projektplan 2); das Protokoll rührt daran nicht, weil es keinen Zug speichert.
- **Andere Formate** (Genesys, alte Banlisten). Eigene Frage, eigener Plan.
- **Preise und Sammlung.** Andere Werkzeuge machen das gut.

## 8. Offen

| Frage                                       | Empfehlung                                                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Mehrfachrollen (Ash als Handtrap und Tuner) | nein; eine Rolle hält die Rechnung exakt und zwingt zu einer bewussten Einordnung                          |
| Zählt ein 2-Card-Starter halb?              | nein; 2-Card-Starthände gehen über die Abdeckung (3.3) ein, nicht über die Rollen                          |
| Liste der Boardbreaker                      | in den Einstellungen pflegbar, Standardliste als Vorgabe; Kaijus bleiben eine Regel im Code                |
| Stufen anpassbar?                           | vorerst fest wie in Abschnitt 2; eigene Bedingungen erst, wenn jemand sie vermisst                         |
| Ab wann gilt eine Karte als hartes OPT?     | aus den OPT-Klauseln der Effekte (`opt.kind = HARD`); ist die Zerlegung falsch, hilft die Effekt-Korrektur |
