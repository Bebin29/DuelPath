# Gegnerboard-Abnahme: Kartenaktivierung

Stand: 04.10.2026, Nachprüfung zu DUE-43/DUE-46 auf dem zusammengeführten Code.

## Gefundene und behobene Lücke

Die Trefferprüfung für `SPELL_ACTIVATION`, `TRAP_ACTIVATION` und
`SPELL_TRAP_ACTIVATION` wertete bisher nur den Kartentyp aus. Damit erhielt auch
ein aktivierter Effekt einer bereits offenen Zauber-/Fallenkarte oder aus dem
Friedhof einen Treffer. Jetzt verwendet sie zusätzlich `ChainLink.cardActivation`
aus der Zustandsmaschine. Damit gelten dieselben Kriterien wie bei der Auflösung
einer negierten Kartenaktivierung, einschließlich des tatsächlichen Aktivierungseffekts.

Naturia Beast antwortet auf die Aktivierung einer **Zauberkarte**. Sein Kartentext
verlangt außerdem, dass es beim Aktivieren und Auflösen offen auf dem Feld liegt.
Quelle: [offizielle TCG-Kartendatenbank](https://www.db.yugioh-card.com/yugiohdb/card_search.action?cid=7969&ope=2&request_locale=en).
Die Kartenaktivierung legt eine Zauber-/Fallenkarte offen aufs Feld; ein Effekt
einer bereits offenen Karte ist davon zu unterscheiden. Quelle:
[Konami Beginner's Guide](https://www.yugioh-card.com/en/downloads/rulebook/YS17_BG_EN.pdf).

## Automatisiert geprüfter Umfang

`tests/lib/combo/board-acceptance.test.ts` prüft:

- Naturia Beast wird auch aus dem echten Text über den Effektparser richtig erkannt.
- Eine Line mit Beschwörung und Monstereffekt erhält keine Treffer von Naturia Beast.
- Zauberkartenaktivierungen aus Hand und verdecktem Feld erhalten Treffer;
  Effekte offener Karten, Friedhofseffekte und Fallenaktivierungen nicht.
- Nach Entfernen oder Verdecken von Naturia Beast entfallen spätere Treffer.
- Mehrere Treffer einer ungestörten Line sind alternative Eingriffspunkte. Ein
  gewählter Unterbrechungsbranch verwendet die vorhandene Boardinstanz und verhindert
  weitere Treffer im Standardmodus. Die Trefferzahl ist keine Anzahl gleichzeitig
  angewendeter Negierungen.
- Auch reine Fallen- und kombinierte Zauber-/Fallenkarten-Antworten unterscheiden
  Kartenaktivierung von Effekten offener oder im Friedhof liegender Karten.

## Grenzen der Abnahme

Diese Korrektur erweitert die automatische Klassifizierung nicht auf beliebige
Zauber-/Falleneffekte. Floodgates und reine Entfernung bleiben in der bestehenden
Board-Erkennung `uncomputed` und werden in der Leiste als nicht berechnet angezeigt.
Skill Drain und Rivalry sind damit keine automatisch simulierten Zugrestriktionen;
S:P wird nicht als automatische Negierung behandelt. Die vollständige Abnahme
aller Karten aus DUE-46 sowie eine Simulation dieser dauerhaften Einschränkungen
sind durch diese Nachprüfung nicht abgeschlossen.
