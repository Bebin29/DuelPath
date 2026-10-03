# Dokumentation

Alle Dokumente zum Projekt an einer Stelle. Der Einstieg ist die [README](../README.md) im Wurzelverzeichnis.

## Laufende Dokumentation

Diese Dokumente beschreiben den Stand des Codes. Sie werden mit dem Code zusammen geändert.

| Dokument                                   | Inhalt                                                              |
| ------------------------------------------ | ------------------------------------------------------------------- |
| [architektur.md](architektur.md)           | Aufbau der Anwendung, Schichten, Routen, Datenfluss                 |
| [datenmodell.md](datenmodell.md)           | Prisma-Modelle und ihre Bedeutung                                   |
| [domaene.md](domaene.md)                   | Begriffe der Fachlogik: Combo-Baum, Zustand, OPT, Endboard, Deckbau |
| [api.md](api.md)                           | REST-API `/api/v1` und die internen Routen                          |
| [entwicklung.md](entwicklung.md)           | Arbeitsweise: Befehle, Tests, Code-Stil, Commits, CI                |
| [../SETUP.md](../SETUP.md)                 | Erstes Einrichten: Datenbank, Umgebungsvariablen, Kartenimport      |
| [research/rulings.md](research/rulings.md) | Recherche zu TCG-Regeln, Grundlage der Regel-Logik                  |

## Pläne

Diese Dokumente sagen, was gebaut werden soll. Sie sind Planung, nicht Beschreibung des Codes. Wenn ein Plan und der Code sich widersprechen, gilt der Code.

| Dokument                                        | Inhalt                                           |
| ----------------------------------------------- | ------------------------------------------------ |
| [Projektplan-Umbau.md](../Projektplan-Umbau.md) | Aktueller Plan. Hier zuerst nachsehen.           |
| [Deckbau-Plan.md](../Deckbau-Plan.md)           | Rollen, Quoten, Versionen, Side-Pläne            |
| [UX-Plan.md](../UX-Plan.md)                     | Abläufe und Verhalten der Oberfläche             |
| [UI-Plan.md](../UI-Plan.md)                     | Aufbau der Bildschirme und Komponenten           |
| [UI-Sweep-Plan.md](../UI-Sweep-Plan.md)         | Durchgang zum Angleichen der Oberfläche          |
| [FARBSCHEMA.md](../FARBSCHEMA.md)               | Farben und Design-Tokens                         |
| [Projektplanung.md](../Projektplanung.md)       | Erste, sehr lange Planung. Grossteils überholt.  |
| [../design/README.md](../design/README.md)      | Design-Dokument für pen.dev und die Kartenbilder |

Viele Code-Kommentare verweisen auf Abschnitte dieser Pläne, zum Beispiel „UX-Plan 6.8“. So findest du die Absicht hinter einer Stelle im Code.

## Regeln für Agenten

`AGENTS.md` und `CLAUDE.md` im Wurzelverzeichnis gelten für Agenten, die im Repository arbeiten.
