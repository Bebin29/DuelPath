# DuelPath

Eine Webanwendung für Yu-Gi-Oh!-Spieler, um Decks zu bauen und Kombos zu planen.

Eine Kombo ist in DuelPath kein Zettel mit einer Liste von Schritten, sondern ein **Baum**. Jeder Schritt kann sich verzweigen: was passiert, wenn der Gegner mit Ash Blossom unterbricht, und was, wenn nicht. Der Spielzustand wird dabei nicht gespeichert, sondern aus dem Startzustand und den Schritten berechnet. Darum zeigt jede Änderung an einem Schritt sofort, was danach anders läuft.

Die App verbietet nichts. Sie sagt, was ihr auffällt, und lässt dich weitermachen.

## Was es kann

**Decks**

- Über 13.000 TCG-Karten, lokal gehalten, Suche nach Name, deutschem Namen, Kürzel oder Spitzname
- Hinweise statt Sperren: Grösse der Bereiche, drei Kopien, TCG-Banlist
- Rollen je Karte (Starter, Extender, Handtrap, Breaker, Garnet) als Grundlage der Kennzahlen
- Quoten für die Starthand, exakt gerechnet statt simuliert
- Hand-Tester: Hände ziehen und sehen, welche Kombos damit laufen
- Versionen speichern und vergleichen, Side-Pläne je Matchup und Zugfolge
- YDK-Import und -Export

**Kombos**

- Werkbank mit Spielfeld: die Karte anfassen und tun, was du im Spiel tun würdest
- Baum mit Verzweigungen, Lines und Branches
- Regelprüfung im Hintergrund: OPT, Chain, Spell Speed, Ziele. Unklares wird als Warnung gemeldet
- Endboard-Auswertung: Unterbrechungen, Ressourcen, Kosten
- Stresstest: welche Handtrap trifft welchen Schritt
- Befehlszeile in Strg+K statt Klicken: `ns aluber`, `act aluber 1`, `res`
- Abspielmodus, Schritt für Schritt

**Zugänge**

- REST-API unter `/api/v1` mit OpenAPI-Beschreibung, damit Agenten dieselbe Regel-Logik nutzen können
- Oberfläche auf Deutsch oder Englisch, Kartensprache unabhängig davon
- Design dunkel oder hell

## Technik

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui auf Radix UI, React Flow für den Baum, SWR zum Laden, i18next für Sprachen. Server: Next.js Server Actions, Prisma 7, PostgreSQL, NextAuth v5. Tests mit Vitest und React Testing Library.

Für Vorschläge und für die Prüfung von Kartentexten wird Jev genutzt, ein Modell von TypeSafe über OpenRouter. Das ist optional; ohne Schlüssel läuft alles andere.

## Loslegen

Voraussetzungen: Node 24 und Docker.

```bash
cp .env.example .env     # AUTH_SECRET eintragen: npx auth secret
npm install
npm run db:up            # Postgres per Docker, Port 5433
npm run db:migrate
npm run db:seed          # Test-Nutzer test@duelpath.local / Test1234!
npm run cards:import     # Karten von YGOPRODeck, dauert etwa zwei Minuten
npm run dev
```

Die Einzelheiten stehen in [SETUP.md](SETUP.md).

## Dokumentation

| Dokument                                   | Inhalt                                              |
| ------------------------------------------ | --------------------------------------------------- |
| [docs/architektur.md](docs/architektur.md) | Aufbau, Schichten, Routen, Datenfluss               |
| [docs/datenmodell.md](docs/datenmodell.md) | Prisma-Modelle und ihre Bedeutung                   |
| [docs/domaene.md](docs/domaene.md)         | Begriffe: Combo-Baum, OPT, Endboard, Rollen, Quoten |
| [docs/api.md](docs/api.md)                 | REST-API und Server Actions                         |
| [docs/entwicklung.md](docs/entwicklung.md) | Befehle, Tests, Code-Stil, Commits, CI              |
| [SETUP.md](SETUP.md)                       | Einrichten                                          |
| [docs/README.md](docs/README.md)           | Übersicht über alle Dokumente, auch die Pläne       |

## Mitarbeiten

Gearbeitet wird in Branches und Pull Requests, Commits nach [Conventional Commits](https://www.conventionalcommits.org/). Vor dem Pull Request:

```bash
npm run type-check && npm run lint && npm run format:check && npm run test
```

Mehr dazu in [docs/entwicklung.md](docs/entwicklung.md).

## Lizenz

Noch nicht festgelegt.

Yu-Gi-Oh! ist eine Marke von Konami. Dieses Projekt steht in keiner Verbindung zu Konami. Kartendaten und Kartenbilder stammen von [YGOPRODeck](https://ygoprodeck.com/); Kartenbilder werden lokal zwischengespeichert und nicht mit dem Repository verteilt.
