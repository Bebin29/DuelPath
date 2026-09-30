# Ruling-Mechaniken für DuelPath (TCG)

Stand: 2026-09-30. Grundlage für die Tabelle `RulingMechanic`. Quellenkürzel wie [K1] oder [Y2] verweisen auf die Quellenliste am Ende.

## Zusammenfassung

- **Drei Arten von Negierung** mit unterschiedlichen Folgen: *Aktivierung negiert* (Chain Link verschwindet, Spell/Trap geht auf den Friedhof), *Effekt negiert* (Chain Link löst ohne Wirkung auf, Karte verhält sich sonst normal), *Beschwörung negiert* (Monster gilt nie als beschworen, geht vom Nicht-Feld auf den Friedhof). [Y2]
- **Kosten** (vor dem Semikolon) werden immer bezahlt und nie erstattet, egal welche Negierung. [K1][K4][Y3]
- **OPT-Verbrauch hängt am Wortlaut:** "use" und "Once per turn:" zählen auch negierte Aktivierungen, "activate" zählt nur nicht negierte Aktivierungen. Effekt-Negierung (Ash, Imperm, Veiler) verbraucht in allen Varianten den OPT, weil die Aktivierung erfolgreich war. [Y1][Y2][Y8]
- **Hard OPT** (mit Kartenname) gilt pro Spieler und Kartenname und überlebt das Verlassen des Feldes. **Soft OPT** ("Once per turn:" ohne Namen) gilt pro Kopie und setzt sich zurück, wenn die Karte ihren Ort verlässt oder verdeckt wird. [Y1][Y12]
- **Fast alles davon ist deterministisch** berechenbar, wenn beim Import pro Effekt Wortlaut, Effekttyp, Kostenteil und OPT-Klausel erkannt werden. Nur Kontext taugen: Konjunktionen in Einzelfällen, Ortswechsel-Sonderfälle, kartenspezifische Rulings und Namensänderungen.
- Die meisten detaillierten Rulings auf Yugipedia stammen aus der **OCG-Datenbank**. Das TCG folgt diesen in der Regel, eine explizite Konami-TCG-Bestätigung dafür habe ich nicht gefunden (Unsicherheit, siehe Abschnitt 6).

## 1. Negierung: Aktivierung vs. Effekt vs. Beschwörung

### 1.1 Aktivierung negieren

**Regel.** Die Aktivierung wird so behandelt, als hätte die Karte bzw. der Effekt nicht aufgelöst. Der Chain Link verschwindet und löst nicht auf. [Y2][Y5]

- **Spell/Trap:** Karte geht auf den Friedhof, gilt aber *nicht* als vom Feld auf den Friedhof geschickt. Das gilt auch für Continuous, Field und Equip. [Y2][Y7]
- **Monstereffekt:** Die Karte bleibt, wo sie ist, außer der negierende Effekt bewegt sie (z. B. "and if you do, destroy that card"). [Y2]
- **Kosten:** nicht erstattet. [Y2][K1]
- **OPT:** "activate"-Klauseln zählen die negierte Aktivierung *nicht*, "use"-Klauseln und "Once per turn:" zählen sie. [Y1][Y2][Y8]
- **Timing:** Für Missing the Timing ist das Letzte, was passiert, das Negieren (plus ggf. Zerstören) bzw. der vorherige Chain Link. [Y2][Y5]

**Beispielkarten** (TCG-Text [D1]):
- *Solemn Judgment*: "When a monster(s) would be Summoned, OR a Spell/Trap Card is activated: Pay half your LP; negate the Summon or activation, and if you do, destroy that card." Kann keine Monstereffekte negieren. [Y18]
- *Solemn Strike*: Special Summon **oder** Aktivierung eines Monstereffekts, 1500 LP. Negiert keine Normal Summons.
- *Solemn Warning*: jede Beschwörung **oder** eine Aktivierung, die einen Special-Summon-Effekt enthält, 2000 LP. [Y19]
- *Magic Jammer* (Spell-Aktivierung, Kosten: 1 Karte abwerfen), *Ghost Belle & Haunted Mansion* ("negate that activation", ohne Zerstören), *Apollousa* (Once per Chain, negiert Aktivierung, ohne Zerstören) [Y20].
- Counter Traps müssen direkt auf das reagieren, was sie kontern. Ein zweiter Solemn in derselben Chain gegen dieselbe Beschwörung geht nicht. [Y19]

**Deterministisch:** ja. Zielort, OPT-Zählung und Kosten folgen aus Kartentyp und Klausel.

### 1.2 Effekt negieren

**Regel.** Ein negierter Effekt, der einen Chain Link bildet, löst ohne Wirkung auf. Die Aktivierung bleibt gültig. Continuous Effects gelten einfach nicht mehr. [Y2]

- **Kosten:** bezahlt, nicht erstattet. [Y2]
- **OPT:** in allen Varianten verbraucht (die Aktivierung war erfolgreich). [Y1][Y8]
- **Karte:** bleibt an ihrem Ort. Ash auf *Danger!? Jackalope?*: Die Karte bleibt auf der Hand. Ash auf *Dark Magical Circle* (Continuous Spell): Die Karte bleibt in der Spell & Trap Zone. [Y13]
- Normal/Quick-Play/Ritual Spell und Normal/Counter Trap gehen nach der Chain regulär auf den Friedhof. [Y7][Y10]
- **Einschränkungen im Kartentext außerhalb des Effekts** ("You cannot Special Summon ... the turn you activate this effect") gelten trotzdem. Ruling Ash vs. *Ascator, Dawnwalker*. [Y13] (OCG-FAQ 22687)
- Ein Effekt löst immer an dem Ort auf, an dem er aktiviert wurde. Wurde *Exiled Force* von Veiler getroffen und tributet sich selbst als Kosten, wird der Effekt trotzdem negiert. Gegenstück: *Skill Drain* negiert nur, solange das Monster auf dem Feld ist, also greift es nicht, wenn das Monster sich als Kosten vom Feld entfernt hat. [Y10][Y14][Y3]
- Ist ein Effekt bereits negiert (z. B. durch Skill Drain), kann Ash nicht dagegen aktiviert werden, und Imperm kann ein bereits von Veiler negiertes Monster nicht als Ziel wählen. [Y13][Y15]

**Beispielkarten:**
- *Ash Blossom & Joyous Spring*: Quick Effect aus der Hand, Kosten: sich selbst abwerfen, "negate that effect". Negiert nur den Effekt, auf den direkt gechaint wurde, und zielt nicht. HOPT mit "use". [Y13]
- *Infinite Impermanence*: "Target 1 face-up monster your opponent controls; negate its effects (until the end of this turn)". Die Negierung bleibt bis Zugende auf dem Monster. Ist ein Effekt des Monsters schon in der Chain und das Monster bei Auflösung von Imperm noch offen auf dem Feld, löst dieser Effekt ohne Wirkung auf (abgeleitet aus [Y10][Y14], keine direkte TCG-Quelle gefunden). Der Spalten-Teil gilt nur, wenn die Karte vorher gesetzt war und bei Auflösung noch auf dem Feld ist.
- *Effect Veiler*: wie Imperm, aber nur in der Main Phase des Gegners. Kosten: sich selbst von der Hand auf den Friedhof schicken. Wird das Ziel verdeckt, endet die Negierung, auch wenn es später wieder aufgedeckt wird. [Y14] Beim Verlassen des Feldes gilt dasselbe, weil die Karte danach als neue Karte zählt (abgeleitet, nicht explizit belegt).
- *Called by the Grave*: verbannt ein Monster aus dem gegnerischen Friedhof. Bis zum Ende des **nächsten** Zuges werden dessen Effekte sowie die aktivierten Effekte und Effekte auf dem Feld aller Monster mit demselben Originalnamen negiert. Wird Called auf einen Hand-Effekt gechaint, der sich als Kosten auf den Friedhof schickt (z. B. *Maxx "C"*), wird dieser Effekt negiert. [Y16]
- *Crossout Designator*: Namenssperre bis Zugende, betrifft Karten aller Arten und Effekte, die auf dem Feld oder in Hand und Friedhof aktiviert werden. "You can only activate 1 ... per turn". [Y17]

**Deterministisch:** ja für Einzelnegierung in der Chain (Ash-Typ). Ja für Namenssperren mit fester Dauer (Called: bis Ende des nächsten Zuges, Crossout: bis Zugende). Teilweise für bleibende Negierung auf Monstern (Imperm/Veiler), weil Verdecken und Verlassen des Feldes sauber als Kartenbewegung modelliert sein müssen.

### 1.3 Beschwörung negieren

**Regel.** [Y2]
- Negierbar sind nur Beschwörungen über Spielmechanik oder Beschwörungsverfahren (Normal, Flip, Pendulum, Synchro, Xyz, Link, eingebaute Special Summons wie *Cyber Dragon*), und nur außerhalb einer Chain. Fusion Summons und Beschwörungen durch auflösende Effekte sind nicht negierbar.
- In PSCT steht "would be Summoned". Solche Karten können nur als Chain Link 1 gegen die Beschwörung aktiviert werden.
- Das Monster wird aus der Zone entfernt, meist durch Zerstören. Kann das nicht angewendet werden, geht es auf den Friedhof. Es war nie auf dem Feld (Ausnahme: Flip Summon, Gemini). Es gilt nicht als "vom Feld auf den Friedhof geschickt". [Y2][Y18]
- Eine negierte Normal Summon verbraucht trotzdem die Normal Summon des Zuges. Eine negierte Pendulum Summon verbraucht die Pendulum Summon. [Y2][Y18]
- Kosten und Materialien der Beschwörung sind verbraucht. [Y2]
- Ein Special Summon Monster, dessen korrekte Beschwörung negiert wurde, gilt als nicht korrekt beschworen und kann nicht per Effekt wiederbelebt werden (z. B. *Black Rose Dragon*). [Y2][Y18]
- "You can only Special Summon X once per turn" und "cannot Summon the turn you activate": Es zählen nur **erfolgreiche** Beschwörungen (TCG-Klarstellung). [K2]
- Trigger nach der Beschwörung ("If this card is Summoned") aktivieren nicht. Material-Trigger, die eine erfolgreiche Beschwörung voraussetzen, aktivieren nicht (*Quick-Span Knight*). [Y18] Trigger von Materialien müssen warten, bis die Beschwörung erfolgreich war oder negiert wurde. [Y19]
- Beschwörungen mit "immediately after this effect resolves" sind nur negierbar, wenn der Effekt als Chain Link 1 auflöst. [Y2][Y8]

**Deterministisch:** ja für Kartenort, Verbrauch der Normal Summon und Ausbleiben der Summon-Trigger. Nur als Kontext taugen Trigger vom Typ "sent to the GY" bei negierter Beschwörung (etwa *Electric Snake*) und Material-Trigger, weil das je nach Formulierung unterschiedlich entschieden wird.

### 1.4 Übersicht

| Fall | Chain Link | Kosten | OPT "use" / "Once per turn:" | OPT "activate" | Spell/Trap danach | Monster danach |
|---|---|---|---|---|---|---|
| Aktivierung negiert | verschwindet | bezahlt | verbraucht | nicht verbraucht | Friedhof (nicht "vom Feld") | bleibt am Ort, außer der negierende Effekt bewegt es |
| Effekt negiert | löst ohne Wirkung auf | bezahlt | verbraucht | verbraucht | Normal/QP/Ritual/Normal Trap/Counter: Friedhof; Continuous/Field: bleibt | bleibt am Ort |
| Beschwörung negiert | keiner (Beschwörung startet keine Chain) | bezahlt, Materialien weg | n/a (Normal Summon verbraucht, "SS once per turn" nicht) | n/a | n/a | Friedhof bzw. Zerstörung, war nie auf dem Feld |

## 2. OPT-Varianten

Häufigkeiten aus einem Abgleich mit der YGOPRODeck-Datenbank (14.362 Karten ohne Skills und Token, TCG- und OCG-Texte, 2026-09-30) [D1]. Die Zahlen dienen nur zur Einordnung.

| Formulierung | Anzahl | Bereich | Negierte Aktivierung zählt? | Reset beim Verlassen des Feldes? | Quelle |
|---|---|---|---|---|---|
| `Once per turn:` (Soft OPT, ohne Namen) | ca. 1840 | pro Kopie, solange die Karte offen an ihrem Ort ist (das ganze Feld zählt als ein Ort) | ja | ja, auch beim Verdecken | [Y1][Y2] |
| `You can only use this effect of "X" once per turn` | ca. 1940 | pro Spieler, alle Karten namens X, nur dieser Effekt | ja | nein | [Y1][Y8] |
| `You can only use each effect of "X" once per turn` (auch "each of the following effects") | ca. 1780 + 450 | pro Spieler und Name, jeder Effekt mit eigenem Zähler | ja | nein | [Y1][Y8] |
| `You can only use 1 "X" effect per turn, and only once that turn` (auch "1 of these effects") | ca. 250 | pro Spieler und Name, **ein gemeinsamer** Zähler für alle Effekte | ja | nein | [Y1] |
| `You can only activate 1 "X" per turn` | ca. 925 | pro Spieler und Name, Aktivierung der Karte selbst (meist Spell/Trap) | **nein** | nein | [Y1] |
| `You can only activate this/each effect of "X" once per turn` | 4 | wie "use", aber negierte Aktivierungen zählen nicht | **nein** | nein | [Y1][Y8] |
| `You can only apply this effect of "X" once per turn/Duel` | selten | zählt nur, wenn der Effekt tatsächlich angewendet wurde; bei Negierung darf man erneut | nein | nein | [Y1] |
| `You can only use the previous effect of "X" once per turn` | 7 | bezieht sich auf den vorangehenden Effekt (z. B. *Baronne de Fleur*) | ja | nein | [D1] |
| `... once per Duel` | ca. 60 | wie oben, aber für das ganze Duell | je nach "use"/"activate" | nein | [Y1] |
| `twice per turn` / `thrice per turn` | selten | Zähler mit Limit 2 bzw. 3 | wie "use" | nein | [D1] |
| `Once per Chain` | ca. 60 | pro Kopie und Chain; im selben Zug mehrfach möglich (*Apollousa*) | ja (vermutlich, keine explizite Quelle) | n/a | [Y20] |
| `Once while face-up on the field` | 5 | pro Kopie, solange sie offen auf dem Feld ist | ja | ja | [Y2][Y21] |
| `Once per opponent's turn` | ca. 20 | Soft OPT, nur im Zug des Gegners | ja | ja | [Y8] |
| `(You can only gain this effect once per turn.)` | ca. 60 | pro Spieler, über **alle** Karten mit diesem Satz hinweg (Extra-Normal-Summon usw.) | n/a (keine Aktivierung) | n/a | [Y1] |
| `You can only Special Summon "X" once per turn (this way)` | ca. 260 | pro Spieler und Name, nur erfolgreiche Beschwörungen | nein | nein | [K2] |

Weitere Regeln:
- Hard OPT hängt am Namen in der Klausel und ändert sich nicht durch spätere Namensänderung (*Fairy Archer* + *Hero Mask*). [Y1]
- Soft OPT: Zwei Kopien dürfen je einmal. Nach einem Ortswechsel (z. B. zerstört und wiederbelebt) darf dieselbe Kopie erneut. Ausnahme: Monster, die sich selbst verdecken (*Swarm of Locusts*). [Y1][Y12]
- Beim Hard OPT ist die Karte dagegen egal: *Rescue Rabbit* darf nach Verbannen und Zurückholen im selben Zug nicht erneut. [Y12]
- Die Normal Summon/Set bleibt eine Spielregel (1 pro Zug). Eine negierte Normal Summon zählt. [K1][Y2]

**Deterministisch:** ja. Der Zähler-Schlüssel ist `(Spieler, Kartenname, Effektindex | "shared" | "card")` für Hard OPT und `(Karteninstanz, Ortsepoche, Effektindex)` für Soft OPT. Die Ortsepoche erhöht sich bei jedem Ortswechsel und beim Verdecken. Nur als Kontext taugen die Zuordnung von "this effect" in Karten mit mehreren Effekten (siehe Abschnitt 7) und Namensänderungen.

## 3. Kosten, Aktivierungsbedingungen, Einschränkungen

**Struktur (PSCT):** `BEDINGUNG : AKTIVIERUNG ; AUFLÖSUNG`. [K3][Y8]
- **Vor dem Doppelpunkt** stehen die Aktivierungsbedingungen: wann und wie oft. Sie müssen nur beim Aktivieren erfüllt sein (*Fuh-Rin-Ka-Zan*). Bedingungen, die auch beim Auflösen gelten sollen, stehen als eigener Satz (*Zombie Master*: "This card must remain face-up on the field to activate and to resolve this effect."). [K4][Y4]
- **Zwischen Doppelpunkt und Semikolon** stehen Kosten und Zielwahl. Pay, discard, Tribute, banish, send, detach an dieser Stelle sind Kosten. [K4]
- **Nach dem Semikolon** steht die Auflösung.
- **Kein Doppelpunkt und kein Semikolon:** Der Effekt bildet keinen Chain Link (Continuous Effect, eingebaute Beschwörung wie *Cyber Dragon*). Ausnahme: Die Aktivierung einer Spell/Trap bildet immer einen Chain Link. [K3][Y8]

**Kostenregeln:**
- Kosten werden vor der Aktivierung bezahlt und nie erstattet, auch nicht bei negierter Aktivierung. [K1][Y3]
- Können Kosten nicht vollständig bezahlt werden, ist keine Aktivierung möglich (z. B. "send to GY" unter *Macro Cosmos*). [Y3]
- Kosten sind kein Effekt: Eine als Kosten bewegte Karte löst keine Trigger vom Typ "by card effect" aus (*Shaddoll Dragon*). Ein Effekt, der von Skill Drain betroffen ist, kann trotzdem aktiviert werden. [Y3]
- Kosten zählen für Missing the Timing nicht als das Letzte, was passiert (*Jinzo - Returner* als Kosten für *Lightning Vortex*). [Y5]
- Kosten sind keine Aktion, auf die man chainen kann. [K1]
- **Effekt statt Kosten:** Was nach dem Semikolon steht, passiert erst beim Auflösen und entfällt bei Negierung (*Fire Sorcerer*, *Sangan* "but you cannot activate cards ... with that name"). [Y18][D1]
- **Einschränkungen im eigenen Satz** ("You cannot Special Summon ... the turn you activate this effect") gelten ab Aktivierung, auch wenn der Effekt negiert wird. [Y13] Ob sie auch bei negierter *Aktivierung* gelten, ist nicht klar belegt. **Unsicher**, daher als Kontext behandeln.

**Deterministisch:** ja für das Aufteilen in Kosten und Effekt am Semikolon und für die Regel, dass Kosten bei Negierung bleiben. Die Zuordnung der Kostenaktion zu einer Kartenbewegung (welche Karte wohin) muss der Nutzer im Baum als Bewegung erfassen. Sie ist nicht allein aus dem Text ableitbar.

## 4. Trigger-Effekte

### 4.1 "When ... : You can" vs. "If ... : You can" (Missing the Timing)
- **Optionale "When"-Trigger** können nur aktiviert werden, wenn ihr Auslöser das **Letzte** war, was passiert ist. Sonst verpassen sie das Timing. [Y5][Y9]
- **Optionale "If"-Trigger** (auch "each time") und **alle Pflicht-Trigger** aktivieren in der nächsten möglichen Chain, egal was danach passiert ist. [Y5] Seit PSCT stehen Pflicht-Trigger immer mit "If". [Y8]
- **Das Letzte, was passiert** ist bei einer Aktion ohne Chain die Aktion selbst (Summon, Set, Angriff). Nach einer Chain ist es die Auflösung von Chain Link 1. Bei Material für eine Beschwörung ist es die Beschwörung, nicht das Schicken auf den Friedhof (*Laval Volcano Handmaiden*). [Y5]
- **Konjunktionen:** Bei "and", "and if you do" und "also" zählen beide Teile als das Letzte. Bei "then" zählt nur der zweite Teil, außer dieser ist optional und wird nicht ausgeführt. [K6][Y5][Y8]
- Aktionen durch Continuous Effects stören das Timing nicht (*Maxx "C"*: Summon und Ziehen sind beide das Letzte). [Y5]

**Deterministisch:** teilweise. Ob ein optionaler "When"-Trigger aktivieren kann, ist berechenbar, wenn der Auslöser in Chain Link 1 oder als Aktion ohne Chain stattfand (dann ja) oder in Chain Link 2+ (dann nein). Die Feinanalyse innerhalb eines Effekts ("then" vs. "and") gehört in den Kontext.

### 4.2 SEGOC (TCG)
Gleichzeitig ausgelöste Spell-Speed-1-Trigger bilden eine Chain in dieser Reihenfolge [K1][Y6]:
1. Pflicht-Trigger des Zugspielers
2. Pflicht-Trigger des Gegners
3. Optionale Trigger des Zugspielers
4. Optionale Trigger des Gegners

Innerhalb einer Stufe wählt der Spieler die Reihenfolge. Danach dürfen Fast Effects folgen, beginnend bei dem Spieler, der den letzten Link gelegt hat, nicht. [Y6][K7]
Ausnahme: Pro Chain kann nur ein Trigger eines Monsters aktiviert werden, das sich selbst von der Hand als Special Summon beschwört (*Gorz* + *Tragoedia*). [Y6]

**Deterministisch:** ja für die Reihenfolge der Stufen. Die Reihenfolge innerhalb einer Stufe ist eine Nutzerwahl und wird im Baum explizit festgehalten.

### 4.3 Trigger während der Chain-Auflösung
- Während eine Chain auflöst, kann nichts aktiviert werden. Trigger, die dabei ausgelöst werden, warten bis nach der Chain und bilden dann per SEGOC eine neue Chain. [Y7][K1]
- **TCG-Klarstellung:** Wechselt die Karte mit einem wartenden Trigger zwischendurch ihren Ort (Feld, Friedhof, Hand, verbannt, Deck), aktiviert der Trigger nicht. [K2]
- Optionale "When"-Trigger aus Chain Link 2+ verpassen das Timing (siehe 4.1).
- Trigger nach einer Beschwörung, die in Chain Link 2+ passiert ("immediately after" gilt dort nicht), warten bis nach der Chain. [Y2][Y19]

### 4.4 Trigger bei negierten Aktionen
- Negierte Beschwörung: keine Trigger vom Typ "If this card is Summoned" und keine Trigger, die eine erfolgreiche Beschwörung voraussetzen (siehe 1.3).
- Negierte und zerstörte Spell/Trap zählt als "destroyed" (z. B. für *Fairy Guardian*). Nur negiert ohne Zerstören heißt: per Regel auf den Friedhof, nicht zerstört. [Y18][Y2]
- Trigger-Effekte, deren Effekt negiert wurde, verbrauchen trotzdem den OPT (siehe Abschnitt 2).

**Deterministisch:** ja für Stufen, Warteschlange und Ortswechsel-Verfall. Ob eine Aktion einen Trigger auslöst ("destroyed" vs. "sent", "by card effect" vs. Kosten), hängt vom Trigger-Text ab. Das Grundschema (Ort vorher und nachher, Grund: Effekt, Kosten, Regel, Kampf, Material) lässt sich im Code auswerten. Sonderfälle gehören in den Kontext.

## 5. Chain-Grundlagen

**Spell Speeds** [K1]:

| Spell Speed | Karten und Effekte |
|---|---|
| 1 | Normal-, Equip-, Continuous-, Field- und Ritual-Spells; Ignition-, Trigger- und Flip-Effekte |
| 2 | Normal- und Continuous-Traps, Quick-Play-Spells, Quick Effects von Monstern |
| 3 | Counter Traps |

- Ein neuer Chain Link braucht Spell Speed ≥ 2 und ≥ dem vorherigen Link. Spell Speed 1 geht nur als Chain Link 1 oder per SEGOC. [K1][Y7]
- Aktionen, die keine Chain starten (Summon, Tribut, Positionswechsel, Kosten), kann man nicht chainen. Auf eine Beschwörung darf man aber per "would be Summoned" (Negierung) oder per Trigger danach reagieren. [K1][K7]
- **Auflösung rückwärts** vom höchsten Link bis Chain Link 1. Während der Auflösung kann nichts aktiviert werden. [K1][Y7]
- **Nach der Chain** gehen auf den Friedhof, gleichzeitig mit dem letzten Teil der Auflösung von Chain Link 1 [Y7]:
  - Normal-, Quick-Play- und Ritual-Spells und Normal- und Counter-Traps (außer Karten, die sich selbst auf dem Feld halten, wie *Swords of Revealing Light* oder *Blast with Chain*)
  - Spells und Traps, deren Aktivierung negiert wurde
  - Monster, deren Beschwörung negiert wurde
- Continuous-, Field- und Equip-Karten bleiben liegen, auch wenn ihr Aktivierungseffekt negiert wurde (*Dark Magical Circle*). [Y10][Y13]
- Ein Continuous Spell/Trap muss zum Auflösen eines aktivierten Feld-Effekts noch offen auf dem Feld sein. Sonst löst der Effekt ohne Wirkung auf. [Y11]
- Ein Equip Spell, der nicht ausrüsten kann, geht auf den Friedhof. Dazu gibt es Hinweise in [Y3] (*Premature Burial*), aber keine allgemeine Primärquelle für den Fall "Effekt negiert". **Unsicher**, daher als Kontext behandeln.
- **Ziele:** "that target" heißt, das Ziel muss beim Auflösen noch passen. "it/them" heißt, es musste nur beim Anvisieren passen. "both" heißt, alle Ziele müssen noch passen, sonst entfällt der Effekt. [K4][Y8]

**Deterministisch:** ja für Spell Speed, Reihenfolge, Auflösung und Aufräumen nach der Chain. Die Ziel-Semantik ist teilweise berechenbar ("that target" vs. "it" ist per Regex erkennbar, aber die Anforderungen prüft der Nutzer).

## 6. TCG vs. OCG (nur Hinweise)

- **SEGOC:** Im OCG gibt es laut Perfect Rulebook 2017 eine zusätzliche Stufe. Nicht öffentliche optionale Trigger (Hand, verdeckt) kommen nach den öffentlichen. Im TCG gibt es diese Stufe nicht. Quellen sind nur sekundär ([Y6][D2]), die Primärquelle (japanisches Perfect Rulebook) habe ich nicht geprüft. Für DuelPath gilt die TCG-Reihenfolge aus 4.2.
- **Ortswechsel bei wartenden Triggern:** im TCG klargestellt [K2]. Laut [D2] hat das OCG diese Regel mit Master Rule 2020 übernommen.
- **Kartentexte:** Das OCG nummeriert Effekte (①②③) und nutzt 使用 ("use") und 発動 ("activate") für die OPT-Klauseln. Das TCG nummeriert nicht, daher muss "this effect" über die Satzposition zugeordnet werden. Vereinzelt unterscheiden sich TCG- und OCG-Texte inhaltlich (Beispiel *Gandora-X*). Für den Import immer den TCG-Text verwenden. [Y1][D2]
- **Ruling-Quellen:** Die meisten Q&A-Rulings auf Yugipedia sind OCG-FAQ-Einträge der Konami-Datenbank. Dass das TCG sie generell übernimmt, ist in der Praxis üblich, aber nicht als offizielle Konami-TCG-Aussage belegt. **Unsicher.**
- **Rulebook:** Konami verlinkt als aktuelles TCG-Rulebook weiterhin Version 10 [K1]. Die Änderungen von 2021 [K2] sollen laut Konami in ein kommendes Update einfließen, das ich nicht gefunden habe.

## 7. Automatische Erkennung beim Import (PSCT-Muster)

Vorverarbeitung:
1. Typografische Anführungszeichen normalisieren (`“ ”` zu `"`).
2. Pendulum-Karten an `[ Pendulum Effect ]` und `[ Monster Effect ]` aufteilen. OPT-Klauseln gelten jeweils nur für ihren Abschnitt, es gibt auch "each Pendulum Effect" bzw. "each monster effect".
3. OPT-Klauseln entfernen und merken, dann den Rest in **Effekte** zerlegen. Heuristik: ein Satz bzw. Satzverbund, der einen Doppelpunkt oder ein Semikolon enthält, ist ein aktivierbarer Effekt. Ein Satz ohne beides ist ein Continuous Effect oder eine Beschwörungsbedingung. Die erste Zeile bei Fusion/Synchro/Xyz/Link sind Materialien.
4. **"this effect"** bezieht sich auf den direkt vorangehenden Effekt, **"each effect"** auf alle Effekte des Abschnitts, **"previous effect"** auf den Effekt vor der Klausel. Bei Unsicherheit das Flag `needsReview` setzen und den Kontext an Jev geben.

Die Muster wurden an der YGOPRODeck-Datenbank geprüft [D1], die Treffer stehen in Abschnitt 2. `X` steht für einen Kartennamen in Anführungszeichen. Kartennamen können selbst Anführungszeichen enthalten (*Maxx "C"*, *"A Case for K9"*), daher ist `"(.+?)"` vor einem Schlüsselwort robuster als `"[^"]+"`.

```text
# OPT-Klauseln (Satz endet mit Punkt)
OPT_USE_THIS        You can only use (?:this|the) effect of "(.+?)" (once|twice|thrice) per (turn|Duel)
OPT_USE_EACH        You can only use each (?:of the (?:following|preceding|previous|above|\w+) )?(?:Pendulum |monster )?effects? of "(.+?)" once per (turn|Duel)
OPT_USE_SHARED      You can only use 1 (?:of (?:these|the following|the preceding) effects of )?"(.+?)"(?: effect)? per turn, and only once that turn
OPT_USE_NTH         You can only use the (?:previous|preceding|above|following|1st|2nd|3rd|first|second|third) effect of "(.+?)" once per turn
OPT_ACTIVATE_CARD   You can only activate 1 "(.+?)" per (turn|Duel)
OPT_ACTIVATE_CARD2  You can only activate "(.+?)" once per (turn|Duel)
OPT_ACTIVATE_EFFECT You can only activate (?:this|each) effect of "(.+?)" once per turn
OPT_APPLY           You can only apply (?:this|the) effect of "(.+?)" once per (turn|Duel)
OPT_USE_CARD        You can only use 1 "(.+?)" per turn          # z. B. Maxx "C"
OPT_SOFT            (?:^|[.\n]\s*)Once per turn(?:, [^:]*)?:
OPT_SOFT_OPP        Once per (?:your )?opponent's turn
OPT_CHAIN           Once per Chain
OPT_FACEUP          Once while (?:this card is )?face-up on the field
OPT_GAIN            \(You can only gain this effect once per turn\.\)
OPT_SUMMON_NAME     You can only (?:Special|Link|Synchro|Xyz|Fusion) Summon "(.+?)" once per (turn|Duel)(?: this way)?
OPT_NO_SAME_CHAIN   cannot activate more than 1 in the same Chain

# Effektstruktur
HAS_CHAIN_LINK      [:;]                                   # im Effektsatz
CONDITION           ^(.*?):\s                              # Teil vor dem ersten ": "
COST_PART           :\s*(.*?);  bzw.  ^(You can [^:;]*?);  # zwischen ":" und ";"
COST_VERB           \b(discard|pay|Tribute|banish|send|detach|reveal|shuffle|return)\b   # nur im COST_PART
TARGETS             \btarget(s)?\b                         # im COST_PART
OPTIONAL            (?:^|:\s*)You can\b
QUICK               \(Quick Effect\)|During either player's turn|\(this is a Quick Effect\)
TRIGGER_WHEN_OPT    (?:^|[.\n]\s*)When [^:]*:\s*You can
TRIGGER_IF_OPT      (?:^|[.\n]\s*)If [^:]*:\s*You can
TRIGGER_MANDATORY   (?:^|[.\n]\s*)(?:If|When|Each time) [^:]*:\s*(?!You can)
IGNITION            (?:^|[.\n]\s*)(?:Once per turn:\s*)?You can [^:]*;   # ohne Zeitbedingung und ohne QUICK
FLIP                ^FLIP:

# Negierungsarten (im Auflösungsteil)
NEG_ACTIVATION      negate (?:the|that|its) activation
NEG_ACT_DESTROY     negate (?:the|that) (?:Summon or )?activation, and if you do, destroy
NEG_EFFECT_CHAINED  negate that effect|negate the effect\b
NEG_EFFECTS_LINGER  negate (?:its|their|the) effects(?: \(until the end of this turn\)|, until the end of this turn)?|(?:its|their) effects are negated
NEG_BY_NAME         as well as the activated effects and effects on the field of (?:monsters|cards) with the same original name
NEG_SUMMON          negate the (?:Normal |Special |Flip )?Summon|would be (?:Normal |Special |Flip )?Summoned
NEG_CONTINUOUS      ^Negate (?:all|the effects of all) .*(?:while|on the field)   # Skill Drain, Imperial Order
STILL_ACTIVATABLE   \(but their effects can still be activated\)

# Einschränkungen, Timing, Ziele
TURN_RESTRICTION    the turn you activate (?:this|either of this) (?:card|effect)
SUMMON_AFTER_RES    immediately after this (?:card|effect) resolves
RES_CONDITION       must remain face-up on the field to activate and to resolve
TARGET_STRICT       that target|those targets|both targets
CONJ_THEN           ,? then\b
CONJ_AND_IFYOUDO    , and if you do,
CONJ_ALSO_AFTER     , also, after that,
CONJ_ALSO           , also\b
```

Die Spell/Trap-Unterart (Normal, Continuous, Quick-Play, Field, Equip, Ritual, Counter) kommt aus den Stammdaten (YGOPRODeck-Feld `race`), nicht aus dem Text.

Grenzen:
- Ältere Karten ohne PSCT-Reprint haben teils alten Text ("During either player's turn", ca. 170 Treffer). Für diese Karten sind Doppelpunkt und Semikolon nicht verlässlich. [Y8]
- `TRIGGER_MANDATORY` erzeugt Fehltreffer bei Quick Effects mit "When" ("When a card or effect is activated ... (Quick Effect): You can"). Deshalb zuerst `QUICK` prüfen.
- Ob der Kostenteil wirklich Kosten enthält, zeigt sich zuverlässig nur am Semikolon. "then target" im Kostenteil ist Zielwahl, keine zweite Kosten.

## 8. Vorschlag `RulingMechanic`

### Felder

| Feld | Typ | Bedeutung |
|---|---|---|
| `key` | string (PK) | stabiler Bezeichner |
| `category` | enum | `negation`, `opt`, `cost`, `trigger`, `chain`, `summon`, `text` |
| `description` | string | Kurzregel (Deutsch) |
| `deterministic` | enum | `yes`, `partial`, `no` (bei `no` nur Kontext für Jev) |
| `optImpact` | string | Wirkung auf OPT-Zähler |
| `costImpact` | string | Wirkung auf Kosten |
| `cardImpact` | string | Wohin geht die Karte bzw. bleibt sie liegen |
| `triggerImpact` | string | Wirkung auf Trigger und Timing |
| `detectPattern` | string | Muster-Key aus Abschnitt 7 oder `engine` (Spielregel ohne Textmuster) |
| `sources` | string[] | Quellenkürzel |
| `notes` | string? | Unsicherheiten |

### Einträge

| key | Beschreibung | det. | OPT | Kosten | Karte | Trigger | Erkennung |
|---|---|---|---|---|---|---|---|
| `NEGATE_ACTIVATION` | Aktivierung negiert, Chain Link verschwindet | yes | "use"/Soft: verbraucht; "activate": nicht verbraucht | bleiben bezahlt | S/T: Friedhof (nicht "vom Feld"); Monster: bleibt | Letztes Ereignis = Negierung | NEG_ACTIVATION |
| `NEGATE_ACTIVATION_DESTROY` | wie oben, zusätzlich "and if you do, destroy" | yes | wie oben | bleiben | zerstört (zählt als "destroyed") | "if destroyed"-Trigger möglich | NEG_ACT_DESTROY |
| `NEGATE_EFFECT_CHAINED` | Effekt des direkt gechainten Links löst ohne Wirkung auf (Ash-Typ) | yes | immer verbraucht | bleiben | Normal/QP/Ritual Spell, Normal/Counter Trap: Friedhof nach der Chain; Continuous/Field: bleibt; Monster: bleibt | Einschränkung "the turn you activate" gilt | NEG_EFFECT_CHAINED |
| `NEGATE_EFFECTS_LINGER` | Monster-Effekte bis Zugende negiert (Imperm, Veiler); negiert auch Effekte dieses Monsters in der Chain, die auf dem Feld auflösen | partial | verbraucht | bleiben | Ziel bleibt liegen; Negierung endet beim Verdecken bzw. Verlassen des Feldes | Continuous Effects gelten nicht mehr | NEG_EFFECTS_LINGER |
| `NEGATE_BY_NAME` | Namenssperre: aktivierte Effekte und Feld-Effekte mit gleichem Originalnamen negiert (Called: bis Ende des nächsten Zuges; Crossout: bis Zugende, alle Orte) | yes | Aktivierung weiter möglich und verbraucht OPT | bleiben | verbannte Karte ist weg; andere bleiben | Effekte lösen ohne Wirkung auf | NEG_BY_NAME |
| `NEGATE_CONTINUOUS_FIELD` | Dauerhafte Feld-Negierung (Skill Drain, Imperial Order); Aktivierung bleibt möglich | partial | verbraucht | bleiben | bleibt | greift nicht, wenn die Karte sich per Kosten vom Feld entfernt | NEG_CONTINUOUS, STILL_ACTIVATABLE |
| `NEGATE_SUMMON` | Beschwörung negiert (nur außerhalb der Chain, nur Chain Link 1) | yes | Normal Summon verbraucht; "SS X once per turn" nicht verbraucht | Kosten und Materialien verbraucht | Friedhof bzw. zerstört; war nie auf dem Feld; SS-Monster gilt nicht als korrekt beschworen | keine "If Summoned"-Trigger | NEG_SUMMON |
| `OPT_SOFT` | "Once per turn:" pro Kopie | yes | Zähler pro Instanz und Ortsepoche; negierte Aktivierung zählt | n/a | Reset bei Ortswechsel oder Verdecken | n/a | OPT_SOFT, OPT_SOFT_OPP |
| `OPT_HARD_USE` | "use this effect of X" | yes | pro Spieler, Name, Effekt; negierte Aktivierung zählt | n/a | kein Reset | n/a | OPT_USE_THIS, OPT_USE_NTH |
| `OPT_HARD_USE_EACH` | "use each effect of X" | yes | ein Zähler pro Effekt | n/a | kein Reset | n/a | OPT_USE_EACH |
| `OPT_HARD_SHARED` | "use 1 X effect per turn, and only once that turn" | yes | ein gemeinsamer Zähler für alle Effekte | n/a | kein Reset | n/a | OPT_USE_SHARED |
| `OPT_HARD_ACTIVATE_CARD` | "activate 1 X per turn" | yes | pro Spieler und Name; nur nicht negierte Aktivierungen zählen | n/a | kein Reset | n/a | OPT_ACTIVATE_CARD, OPT_ACTIVATE_CARD2 |
| `OPT_HARD_ACTIVATE_EFFECT` | "activate this/each effect of X" | yes | wie "use", aber negierte Aktivierung zählt nicht | n/a | kein Reset | n/a | OPT_ACTIVATE_EFFECT |
| `OPT_HARD_APPLY` | "apply this effect of X" | partial | zählt nur bei tatsächlicher Anwendung | n/a | kein Reset | n/a | OPT_APPLY |
| `OPT_USE_CARD` | "use 1 X per turn" (Maxx "C") | yes | wie OPT_HARD_SHARED | n/a | kein Reset | n/a | OPT_USE_CARD |
| `OPT_PER_DUEL` | Varianten mit "per Duel" | yes | Zähler über das ganze Duell | n/a | kein Reset | n/a | Gruppe 2 der OPT-Muster |
| `OPT_MULTI` | "twice/thrice per turn" | yes | Limit 2 bzw. 3 | n/a | kein Reset | n/a | Gruppe 1 von OPT_USE_THIS |
| `OPT_PER_CHAIN` | "Once per Chain" | yes | pro Kopie und Chain | n/a | n/a | n/a | OPT_CHAIN |
| `OPT_NO_SAME_CHAIN` | "cannot activate more than 1 in the same Chain" | yes | Chain-Sperre für den Namen | n/a | n/a | n/a | OPT_NO_SAME_CHAIN |
| `OPT_WHILE_FACEUP` | "Once while face-up on the field" | yes | pro Instanz und Feldepoche | n/a | Reset beim Verlassen des Feldes oder Verdecken | n/a | OPT_FACEUP |
| `OPT_GAIN_EFFECT` | "(You can only gain this effect once per turn.)" | yes | ein Zähler pro Spieler über alle Karten mit diesem Satz | n/a | n/a | n/a | OPT_GAIN |
| `SUMMON_LIMIT_NAME` | "Special Summon X once per turn (this way)" | yes | zählt nur erfolgreiche Beschwörungen | n/a | n/a | n/a | OPT_SUMMON_NAME |
| `NORMAL_SUMMON_LIMIT` | 1 Normal Summon/Set pro Zug (Spielregel) | yes | negierte Normal Summon zählt | n/a | n/a | n/a | engine |
| `COST` | Teil vor dem Semikolon wird bei Aktivierung bezahlt | yes | n/a | nie erstattet; nicht bezahlbar heißt nicht aktivierbar | als Bewegung mit Grund `cost` | kein "by card effect"; nicht das Letzte für Missing the Timing | COST_PART, COST_VERB |
| `ACTIVATION_CONDITION` | Teil vor dem Doppelpunkt, nur bei Aktivierung geprüft | yes | n/a | n/a | n/a | n/a | CONDITION |
| `RESOLUTION_CONDITION` | Bedingung muss auch beim Auflösen gelten (eigener Satz) | partial | n/a | n/a | n/a | sonst ohne Wirkung | RES_CONDITION |
| `TURN_RESTRICTION` | "the turn you activate this card/effect": gilt ab Aktivierung, auch bei Effekt-Negierung | partial | n/a | n/a | n/a | n/a | TURN_RESTRICTION |
| `TRIGGER_WHEN_OPTIONAL` | optionaler "When"-Trigger, kann das Timing verpassen | partial | n/a | n/a | n/a | nur aktivierbar, wenn der Auslöser das Letzte war (Chain Link 1 bzw. Aktion ohne Chain) | TRIGGER_WHEN_OPT |
| `TRIGGER_IF_OR_MANDATORY` | optionaler "If"-Trigger oder Pflicht-Trigger, verpasst das Timing nie | yes | n/a | n/a | n/a | aktiviert in der nächsten Chain | TRIGGER_IF_OPT, TRIGGER_MANDATORY |
| `SEGOC_TCG` | Reihenfolge gleichzeitiger Trigger im TCG | yes | n/a | n/a | n/a | Pflicht des Zugspielers, Pflicht des Gegners, optional Zugspieler, optional Gegner | engine |
| `SEGOC_HAND_SS_LIMIT` | nur ein "SS itself from hand"-Trigger pro Chain | partial | n/a | n/a | n/a | weitere entfallen | no (Kontext) |
| `TRIGGER_LOCATION_CHANGE` | wartender Trigger verfällt, wenn die Karte ihren Ort wechselt (TCG 2021) | yes | n/a | n/a | n/a | aktiviert nicht | engine |
| `TRIGGER_NEGATED_SUMMON` | keine Summon- und Erfolgs-Trigger bei negierter Beschwörung | partial | n/a | n/a | nicht "vom Feld" | "sent to GY"-Trigger kartenabhängig | engine + Kontext |
| `SPELL_SPEED` | SS1/2/3, Chain-Link-2+ nur mit SS ≥ 2 und ≥ vorherigem Link | yes | n/a | n/a | n/a | n/a | QUICK, Kartentyp, engine |
| `CHAIN_RESOLVE_REVERSE` | Auflösung vom höchsten Link zu Chain Link 1, keine Aktivierung während der Auflösung | yes | n/a | n/a | n/a | Trigger warten bis nach der Chain | engine |
| `CHAIN_CLEANUP` | nach der Chain auf den Friedhof: Normal/QP/Ritual Spell, Normal/Counter Trap, S/T mit negierter Aktivierung, Monster mit negierter Beschwörung | yes | n/a | n/a | siehe Beschreibung; Continuous/Field/Equip bleiben | gleichzeitig mit Chain Link 1 | Kartentyp |
| `CONTINUOUS_ST_MUST_REMAIN` | aktivierter Feld-Effekt einer Continuous S/T löst ohne Wirkung auf, wenn die Karte weg ist | yes | n/a | n/a | n/a | n/a | Kartentyp + HAS_CHAIN_LINK |
| `SUMMON_AFTER_RESOLVE` | "immediately after this effect resolves": nur als Chain Link 1 negierbar | yes | n/a | n/a | n/a | n/a | SUMMON_AFTER_RES |
| `CONJUNCTION` | then (nacheinander, A nötig), and (gleichzeitig, beides nötig), and if you do (gleichzeitig, A nötig), also (unabhängig) | partial | n/a | n/a | n/a | bestimmt das "Letzte" für Missing the Timing | CONJ_* |
| `TARGET_WORDING` | "that target" wird beim Auflösen erneut geprüft, "it" nicht | partial | n/a | n/a | n/a | n/a | TARGET_STRICT |
| `EQUIP_NEGATED` | Equip Spell mit negiertem Effekt | no | n/a | n/a | vermutlich Friedhof, unbelegt | n/a | Kontext |

## Quellen

**Konami (primär)**
- [K1] Konami, *Yu-Gi-Oh! TCG Official Rulebook Version 10*, Kapitel "Chains and Spell Speed" und "Other Rules" / Glossar ("Pay a Cost", "When multiple cards are activated simultaneously", "Actions which cannot be Chained to"): https://www.yugioh-card.com/en/downloads/rulebook/SD_RuleBook_EN_10.pdf (verlinkt über https://www.yugioh-card.com/en/rulebook/)
- [K2] Konami, *2021 Rules Update* (Ortswechsel bei wartenden Triggern, nur erfolgreiche Beschwörungen zählen): https://www.yugioh-card.com/en/play/2021_rules_update/
- [K3] Kevin Tewart, *PSCT Part 3: Conditions, Activations, and Effects*: https://www.yugioh-card.com/en/play/psct/psct-3/
- [K4] Kevin Tewart, *PSCT Part 4: The Clues on Your Cards*: https://www.yugioh-card.com/en/play/psct/psct-4/
- [K6] Kevin Tewart, *PSCT Part 7: 2012 Update, Conjunction Functions*: https://www.yugioh-card.com/en/play/psct/psct-7/
- [K7] Konami, *Fast Effects & Timing*: https://www.yugioh-card.com/en/play/fast-effect-timing/

**Yugipedia (sekundär, mit Verweisen auf Konami-FAQ und Judge-Forum)**
- [Y1] Once per turn: https://yugipedia.com/wiki/Once_per_turn
- [Y2] Negate: https://yugipedia.com/wiki/Negate
- [Y3] Cost: https://yugipedia.com/wiki/Cost
- [Y4] Activation condition: https://yugipedia.com/wiki/Activation_condition
- [Y5] If... You Can VS When... You Can (Missing the timing): https://yugipedia.com/wiki/Missing_the_timing
- [Y6] Simultaneous Effects (SEGOC): https://yugipedia.com/wiki/Simultaneous_Effects
- [Y7] Chain: https://yugipedia.com/wiki/Chain
- [Y8] Problem-Solving Card Text: https://yugipedia.com/wiki/Problem-Solving_Card_Text
- [Y9] Trigger Effect: https://yugipedia.com/wiki/Trigger_Effect
- [Y10] Resolve: https://yugipedia.com/wiki/Resolve
- [Y11] Continuous Spell Card: https://yugipedia.com/wiki/Continuous_Spell_Card
- [Y12] Limited activations: https://yugipedia.com/wiki/Limited_activations
- [Y13] Card Rulings: Ash Blossom & Joyous Spring: https://yugipedia.com/wiki/Card_Rulings:Ash_Blossom_%26_Joyous_Spring
- [Y14] Card Rulings: Effect Veiler: https://yugipedia.com/wiki/Card_Rulings:Effect_Veiler
- [Y15] Card Rulings: Infinite Impermanence: https://yugipedia.com/wiki/Card_Rulings:Infinite_Impermanence
- [Y16] Card Rulings: Called by the Grave: https://yugipedia.com/wiki/Card_Rulings:Called_by_the_Grave
- [Y17] Card Rulings: Crossout Designator: https://yugipedia.com/wiki/Card_Rulings:Crossout_Designator
- [Y18] Card Rulings: Solemn Judgment: https://yugipedia.com/wiki/Card_Rulings:Solemn_Judgment
- [Y19] Card Rulings: Solemn Warning: https://yugipedia.com/wiki/Card_Rulings:Solemn_Warning
- [Y20] Card Rulings: Apollousa, Bow of the Goddess: https://yugipedia.com/wiki/Card_Rulings:Apollousa,_Bow_of_the_Goddess
- [Y21] Once while face-up on the field: https://yugipedia.com/wiki/Once_while_face-up_on_the_field

**Weitere**
- [D1] YGOPRODeck API v7 (Kartentexte, Musterabgleich über alle Karten): https://db.ygoprodeck.com/api/v7/cardinfo.php
- [D2] Duelists Unite, *TCG vs OCG Rulings: The Story so Far*: https://forum.duelistsunite.org/t/tcg-vs-ocg-rulings-the-story-so-far/97
