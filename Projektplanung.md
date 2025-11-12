DuelPath – Projektplanung (Yu-Gi-Oh! Webtool)
1. Überblick und Zielsetzung

DuelPath ist eine geplante Webanwendung für Yu-Gi-Oh!-Spieler, die Kombos visualisieren und ausführen sowie eigene Decks verwalten möchten. Das Tool richtet sich an sowohl kompetitive Spieler (zur Optimierung komplexer Zugfolgen) als auch Casual-Spieler (zum Experimentieren mit Kartenkombinationen und Deck-Ideen). Die Kernziele sind Entwicklerfreundlichkeit, skalierbare Architektur und eine intuitive Benutzeroberfläche, um langfristig eine große Nutzerbasis bedienen zu können.

Zielsetzung: DuelPath soll es ermöglichen, einzelne Kartenkombinationen („Kombos“) Schritt für Schritt darzustellen und in einer Duell-ähnlichen Umgebung abzuspielen. Nutzer können eigene Decks mit Tausenden von Karten verwalten und erhalten eine interaktive Plattform, um ihre Züge zu planen. Dabei liegt ein Fokus auf Übersichtlichkeit – komplexe Interaktionen in Yu-Gi-Oh! sollen nachvollziehbar aufbereitet werden, ohne den Nutzer mit den vollen offiziellen Regelwerken zu überfordern. Die Anwendung wird zweisprachig (Deutsch/Englisch) angeboten, um sowohl die lokale als auch internationale Community anzusprechen. Insgesamt soll DuelPath die Brücke zwischen Deckbau, Kombo-Theorie und praktischer Umsetzung schlagen und dabei modernste Web-Technologien nutzen.

2. Vollständige Funktionsübersicht

Übersicht der Hauptfunktionen: DuelPath umfasst drei zentrale Funktionsbereiche – Deck-Verwaltung, Kombo-Editor und Duellmodus. Ergänzend dazu gibt es allgemeine Features wie Benutzerkonten, Kartendatenbank-Integration und Internationalisierung. Im Folgenden die geplanten Funktionen im Detail:

Deck-Verwaltung („Decks“)

Deck-Erstellung und -Management: Nutzer können beliebig viele Decks anlegen, benennen und verwalten. Jedes Deck besteht aus Main Deck, Extra Deck und Side Deck gemäß den Yu-Gi-Oh!-Regeln (z.B. 40–60 Karten im Main Deck, bis zu 15 im Extra und Side Deck
yourplaymat.com
). Das Tool überwacht Deckgrößen und Kartenbeschränkungen, um den Nutzer bei der Einhaltung offizieller Regeln zu unterstützen (z.B. keine verbotenen Karten, maximal 3 Kopien einer Karte, richtige Deck-Größen).

Kartensuche und -Filter: Eine integrierte Kartendatenbank (basierend auf der YGOPRODeck-API) erlaubt das Durchsuchen von über 11.000 Karten nach Name, Kartentyp, Attribut, etc. (die englischsprachige Kartendatenbank umfasste 2022 bereits ~11.145 Karten
yourplaymat.com
). Nutzer können Filter einsetzen (Monster, Zauber, Fallen, Atk/Def-Werte, Level, Archetypes usw.), um Karten schnell zu finden. Die API bietet hierfür zahlreiche Filterparameter – z.B. Suche nach Namensteilen oder ATK-Werten
ygoprodeck.com
ygoprodeck.com
 – die im Tool via UI zugänglich gemacht werden.

Deckaufbau per Drag & Drop: Aus Suchergebnissen können Karten direkt dem Deck hinzugefügt werden (Drag-&-Drop oder per „Hinzufügen“-Button). Die UI zeigt dabei live die aktuelle Deck-Zusammenstellung an, getrennt nach Main/Extra/Side-Deck. Hinzugefügte Karten werden mit Anzahl angezeigt, Duplikate hochgezählt (max. 3 automatisch limitiert). Optisch werden Kartennamen und ggf. Vorschaubilder angezeigt, um den Deckinhalt klar darzustellen.

Deck-Validierung: Das System validiert in Echtzeit, ob das Deck den Regeln entspricht (z.B. Mindestkartenzahl erreicht
yourplaymat.com
, verbotene Karten ausgeschlossen, Limitierungen eingehalten). In zukünftigen Erweiterungen kann auch die aktuelle Banned List berücksichtigt werden (die YGOPRODeck-API erlaubt Filter nach Banlist-Status
ygoprodeck.com
). So erhält der Nutzer schnelles Feedback, ob sein Deck turnierlegal ist.

Import/Export & Sharing: Geplant ist die Möglichkeit, Decklisten zu importieren (z.B. im YDK-Format von YGOPro) und zu exportieren, um sie extern zu teilen. Perspektivisch können Decks auch öffentlich geteilt werden: Nutzer könnten ihre Decks für andere sichtbar machen, eventuell mit Bewertungen oder Kommentaren (siehe Erweiterungen). Dieses Sharing-Feature fördert eine Community rund um Deckbau.

Kombo-Editor („Kombos“)

Kombosequenz Erstellung: Herzstück ist ein Editor, mit dem Nutzer Schritt-für-Schritt Kombos erstellen können. Eine Kombo ist dabei eine definierte Abfolge von Spielzügen (Normal Summon, Effekt aktivieren, Spezialbeschwörung, etc.), die in der richtigen Reihenfolge ausgeführt werden müssen. Im Editor kann der Nutzer jeden Schritt hinzufügen: aus einer Liste seiner Deck-Karten (oder allen Karten) wählt er die nächste Karte aus und definiert die Aktion (z.B. „beschwöre Monster X“, „aktiviere Effekt von Y und suche Karte Z“ usw.). Optional kann pro Schritt ein Kommentar oder eine Beschreibung hinzugefügt werden, um die Intention zu erläutern.

Visuelle Darstellung: Die Kombo-Schritte werden linear als Liste angezeigt – durchnummeriert und jeweils mit Kartennamen, Kartenbild und Aktionsbeschreibung. Während der Eingabe bietet die UI Autovervollständigung für Kartennamen und vordefinierte Aktionstypen (Summon, Activate, Set, Attack etc.), um konsistente Beschreibungen zu gewährleisten. Ziel ist es, dass der Ablauf für andere nachvollziehbar ist, weshalb jeder Schritt klar formuliert sein soll.

Ausführungsmodus („Play“): Nutzer können ihre erstellte Kombo abspielen lassen. Im Ausführungsmodus wird Schritt für Schritt animiert hervorgehoben, welche Aktion passiert – ähnlich einem Replay. Der Zustand des „Spielfelds“ verändert sich dabei entsprechend: z.B. wird eine beschworene Monsterkarte auf einem simulierten Feld angezeigt, oder gezogene Karten wandern auf die Hand. Dieser Modus dient sowohl der Überprüfung (habe ich die Reihenfolge korrekt?) als auch der Demonstration (anderen zeigen, wie die Kombo funktioniert).

Regelprüfung (optional): In einer späteren Ausbaustufe kann der Kombo-Editor Regelprüfungen durchführen, um offensichtliche illegale Züge zu erkennen. Beispielsweise könnte das System warnen, wenn ein Effekt zweimal im selben Zug genutzt wird, obwohl „einmal pro Spielzug“ auf der Karte steht. Vollständige Regelvalidierung ist komplex (siehe Abschnitt Algorithmische Herausforderungen), daher wird zu Beginn eher auf spielerische Freiheit gesetzt – das Tool nimmt an, dass der Nutzer weiß, was er tut, und ermöglicht auch experimentelle Züge, die in einem echten Duell vielleicht nicht erlaubt wären. Langfristig könnten aber häufige Regelverstöße automatisch erkannt und gemeldet werden, um die Korrektheit der Kombos zu erhöhen.

Duellmodus („Duel Mode“)

Interaktive Duellsimulation: Der Duellmodus erlaubt es, ein Duell-Szenario zu simulieren – primär um Kombos im Kontext eines richtigen Spiels zu testen. Zu Beginn wählt der Nutzer ein eigenes Deck (und optional ein Gegner-Deck, falls ein KI- oder Zweitspieler-Modus implementiert wird). Das System verteilt Starthände (zufällig 5 Karten vom eigenen Deck, optional auch gegnerisches Deck). Anschließend kann der Nutzer Zug-Phasen durchlaufen (Draw Phase, Main Phase etc.) und ähnlich wie im Kombo-Editor Aktionen ausführen (Karten ausspielen, Effekte aktivieren, Angreifen). Anders als im reinen Kombo-Editor wird hier jedoch ein Spielfeld mit Zonen visualisiert: Monsterzone, Zauber/Fallen-Zone, Friedhof, Hand des Spielers usw. – damit der Zustand eines Duells ersichtlich ist.

Einfacher Solitär-Modus: In der ersten Version ist der Duellmodus als Solomodus geplant („Solitär“), d.h. der Nutzer spielt Züge ohne echten Gegner, um Kombo-Setups zu testen. Es gibt also keinen KI-Gegner und keine gegnerischen Unterbrechungen. Dies reduziert die Komplexität erheblich und entspricht der Praxis vieler Spieler, Kombos „gegen eine Goldfisch“ (ohne Widerstand) zu testen. Der Nutzer kann so z.B. schauen, wie weit er mit seinen Karten kommt, ob er in einem Zug gewinnen könnte etc. Dabei werden Lebenspunkte verfolgt und ggf. vordefinierte einfache Aktionen des „Nicht-Gegners“ (wie Passieren jeder Phase) automatisch durchgeführt.

Zukunft: Zwei-Spieler oder KI-Gegner: Als Erweiterung ist vorstellbar, dass der Duellmodus später auch zwei interaktive Spieler unterstützt (Online-Duell zwischen zwei Nutzern, evtl. mit WebSockets für Echtzeit-Kommunikation) oder einen KI-Gegner bietet. Dies erfordert jedoch eine vollständige Regel-Engine und KI-Logik, was deutlich komplexer ist. In der Projektplanung bleibt dies vorerst optional und längerfristig. Prioritär ist, dass ein Spieler seine eigenen Züge durchspielen kann – ob um einen One-Turn-Kill auszuprobieren oder um die Synergien seines Decks zu verstehen.

Benutzeroberfläche im Duell: Die UI zeigt ein vereinfachtes Spielfeld mit Karten-Slots an. Karten, die gespielt werden, erscheinen als Thumbnails in den jeweiligen Zonen. Der Spieler kann per Klick auf eine Handkarte Aktionen wählen (ausspielen, abwerfen etc.), und das System gibt visuelles Feedback (z.B. animiertes Legen der Karte in die Monsterzone). Trotz Vereinfachung soll die Darstellung an das echte Kartenspiel angelehnt sein, um ein immersives Gefühl zu vermitteln. Ein Log-Fenster begleitet das Duell, protokolliert alle Aktionen in Textform (z.B. „Step 1: Spieler A beschwört Dunkler Magier im Angriffsmodus“), sodass man den Verlauf auch schriftlich nachvollziehen kann.

Weitere allgemeine Funktionen

Authentifizierung und Profile: Über NextAuth können sich Benutzer registrieren und einloggen (E-Mail/Passwort oder OAuth-Provider). Jeder Nutzer hat ein eigenes Profil mit seinen gespeicherten Decks und Kombos. Nicht eingeloggte Besucher können ggf. öffentliche Inhalte ansehen (z.B. Beispiel-Kombos), aber zum Erstellen eigener Inhalte ist ein Login erforderlich.

Internationalisierung: Die gesamte Benutzeroberfläche ist zweisprachig angelegt. Der Nutzer kann zwischen Deutsch und Englisch umschalten (ein Sprachwahlschalter in der Navigation) – alle UI-Texte, Buttons, Beschreibungen etc. sind übersetzt. Kartendaten werden vorzugsweise in englischer Sprache angezeigt, da dies in der Yu-Gi-Oh!-Community Standard ist. Optional könnte aber auch die YGOPRODeck-API mit language=de Parametern genutzt werden, um deutsche Kartennamen und -texte bereitzustellen
ygoprodeck.com
. (Die API liefert Übersetzungen in mehreren Sprachen, allerdings sind Kartenbilder nur in Englisch vorhanden
ygoprodeck.com
.) Für den MVP wird vermutlich Englisch für Kartendetails genutzt, aber die App-UI ist komplett lokalisiert.

Kartendaten-Updates: Die Integration der YGOPRODeck API ermöglicht es, die Kartendatenbank wöchentlich oder bei Bedarf zu aktualisieren. Alle relevanten Kartendetails (Name, Typ, ATK/DEF, Effekttext etc.) werden regelmäßig in unsere Datenbank gespiegelt, um Offline-Zugriff zu ermöglichen und API-Abfragen minimal zu halten. (YGOPRODeck empfiehlt ausdrücklich, einmal geholte Daten lokal zu speichern, um API-Aufrufe zu reduzieren
ygoprodeck.com
.) Somit bleibt die Kartenliste aktuell, inkl. neuen Karten und Änderungen. Dieser Import läuft z.B. als Cron-Job einmal pro Woche und lädt die komplette Kartendatenbank herunter (die API bietet eine komplette Abfrage aller Karten
ygoprodeck.com
). Anschließend werden unsere lokalen Daten abgeglichen (neue Karten eingefügt, veraltete aktualisiert).

Performance-Optimierungen für Kartendaten: Da potenziell über 10.000 Karten verwaltet werden, wird auf Pagination und gezielte Suche gesetzt, statt alle Karten auf einmal im Browser zu laden. Im Deck-Editor wird z.B. zunächst keine Karte angezeigt – erst wenn der Nutzer einen Suchbegriff eingibt oder Filter setzt, werden die passenden Karten vom Server (bzw. unserer lokalen Datenbank) geladen. Dies garantiert schnelle Ladezeiten und vermeidet unnötige Datenmengen im Frontend.

3. Tech-Stack und Architektur (aktualisiert)

DuelPath wird mit einem modernen, skalierbaren Tech-Stack entwickelt, der auf dem Next.js Enterprise Boilerplate von Vercel basiert. Dadurch profitieren wir von bewährten Enterprise-Patterns und vielen integrierten Tools out-of-the-box. Im Folgenden die Haupttechnologien und Architekturprinzipien:

Next.js (App Router) – Die Anwendung nutzt Next.js (aktuelle Version, App-Directory Router) als Fullstack-Framework. Der App Router ermöglicht Server-seitiges Rendering und React Server Components, was initiale Ladezeiten optimiert und die Entwicklung von klar strukturierten Routen vereinfacht. Next.js dient sowohl für die Frontend-Auslieferung (React-Komponenten) als auch für serverseitige Funktionen (API-Routen, Server Actions für Form-Handhabung, Authentifizierung etc.). Die Entscheidung für Next.js garantiert hohe Performance durch automatische Optimierungen (Code-Splitting, Bildoptimierung, Caching) und einfache Bereitstellung auf Vercel, was horizontale Skalierung ohne Infrastruktur-Aufwand erlaubt.

TypeScript – Sämtlicher Code (Frontend und Backend) wird in TypeScript geschrieben. Dies erhöht die Entwicklerproduktivität und Codequalität dank statischer Typprüfung. Mit Strict Mode werden potenzielle Fehler früh erkannt. Gerade bei komplexen Datenstrukturen (z.B. dem Karten- und Kombodatenmodell) hilft TypeScript, Konsistenz zu bewahren. Der Boilerplate bringt bereits eine optimierte TS-Konfiguration mit, sodass wir von Anfang an mit best practices (z.B. ts-reset für verbesserte Typdefinitionen) arbeiten können.

Prisma ORM & PostgreSQL – Für die Datenbank setzen wir serverseitig auf Prisma als ORM und PostgreSQL als Produktionsdatenbank. Prisma bietet eine deklarative Schema-Definition und Migrationstool, was die Datentabellen für Karten, Decks, Kombos etc. klar definiert und versioniert. In der Entwicklung kann SQLite als lokale DB verwendet werden (Prisma unterstützt mehrere DB-Treiber), um einfaches Setup zu ermöglichen. In Produktion wird auf PostgreSQL gewechselt – z.B. gehostet über Vercel/Postgres oder einen verwalteten Dienst. Die Konfiguration erfolgt per Environment Variables, sodass je nach Umgebung die passende DB angebunden ist. Das Prisma-ORM erlaubt uns einfache Abfragen (z.B. prisma.deck.findMany({ include: { cards: true } }) holt ein Deck mit allen zugehörigen Karten) und kümmert sich um sicherheitsrelevante Aspekte wie SQL-Injection-Vermeidung automatisch.

NextAuth (Auth.js) – Für Authentifizierung und Autorisierung nutzen wir NextAuth, das im Boilerplate bereits integriert ist. NextAuth unterstützt verschiedene Auth-Modelle (klassische Email/Passwort, OAuth mit Google/GitHub etc.). Zum Start setzen wir wahrscheinlich eine einfache E-Mail-Login oder Magic-Link Authentifizierung um, um Hürden gering zu halten. Die User-Daten werden mittels NextAuth nahtlos in Prisma/Postgres integriert – es gibt hierfür Adapter, die automatisch Tabellen für Benutzer, Sessions, OAuth Accounts etc. anlegen. Dadurch müssen wir das Rad nicht neu erfinden, was sichere Passwort-Speicherung, Session-Handling und Token-Management angeht. Mit NextAuth können wir auch Rollen/Rechte einführen (z.B. Admin-Accounts) falls nötig, und wir nutzen serverseitige Session-Prüfung, um API-Routen und Seiten zu schützen (z.B. nur eingeloggte Nutzer dürfen Decks editieren).

UI-Komponenten mit shadcn/ui und Tailwind CSS – Für die Benutzeroberfläche setzen wir auf eine Kombination aus Tailwind CSS und den Komponenten von shadcn/UI. Tailwind (bereits im Boilerplate) ermöglicht schnelles Styling via Utility-Klassen und ein konsistentes Design-System. Darauf aufbauend liefert shadcn/ui vorgefertigte, zugängliche UI-Komponenten (Buttons, Dialoge, Dropdowns, Tabs etc.), die mit Radix UI als Headless-Basis entwickelt wurden. Diese Komponenten sind anpassbar und harmonieren mit Tailwind-Klassen, sodass wir ein einheitliches Look&Feel mit minimalem CSS-Aufwand erreichen. Das Ergebnis ist eine moderne, responsive UI ohne von Grund auf jedes Element designen zu müssen. Beispielsweise können wir für Formulare, Menüs oder modale Dialoge direkt auf gut getestete Komponenten zurückgreifen, was Entwicklungszeit spart und Barrierefreiheit sicherstellt.

Icon-Bibliothek (lucide-react) – Für Icons in der Oberfläche (z.B. Bearbeiten, Löschen, verschiedene Kartentyp-Symbole) nutzen wir lucide-react. Lucide stellt über 1000 schlichte Icons bereit, die sich gut per CSS skalieren und einfärben lassen. Durch die React-Komponenten-Integration können Icons einfach eingebunden werden (z.B. <LucideIcon name="Plus" /> für ein Plus-Icon auf einem Button). So werden die UI-Elemente visuell ansprechender und besser verständlich (z.B. ein Deck-Icon neben dem Deck-Namen, ein Play-Icon für Kombo abspielen etc.).

Architektur und Modularität: Die App ist in verschiedene Module unterteilt, entsprechend den Hauptdomänen: deck, combo, duel, auth, common. Jedes Modul hat eigene Komponenten, Seiten und ggf. API-Routen. Beispielsweise gibt es einen Routen- und Service-Bereich für Decks (/decks/* Seiten, API-Routen unter /api/decks/*, Prisma-Client-Aufrufe in einem Deck-Service). Diese Kapselung erleichtert die Wartung und ermöglicht ggf. späteres Herauslösen einzelner Teile (z.B. ein isoliertes Kombos-Feature als Library). Außerdem achten wir auf saubere Trennung von Frontend und Backend-Logik: komplexe Berechnungen (etwa Regellogik) laufen serverseitig in API-Routen oder speziellen Service-Klassen, während das Frontend primär die Darstellung und Benutzerinteraktion handhabt. Dank Next.js können wir aber auch vieles via React-Server-Components vorab berechnen (z.B. Decklisten SSR rendern) und somit schnelle Reaktionszeiten erzielen.

Hosting und Deployment: Der Ziel-Deploy für DuelPath ist Vercel (passend zum Boilerplate). Vercel ermöglicht Continuous Deployment: jeder Push auf den Hauptbranch kann automatisch deployt werden. Das Boilerplate beinhaltet bereits CI/CL-Konfigurationen (GitHub Actions) für Linting, Tests und Build, was für Code-Qualität und Verlässlichkeit der Deploys sorgt. Vercel skaliert die Anwendung serverlos – d.h. bei hohem Traffic werden automatisch mehr Serverless Functions gestartet, ohne dass wir Instanzmanagement betreiben müssen. Die Global CDN von Vercel sorgt dafür, dass statische Assets (JS, CSS, Bilder) weltweit performant ausgeliefert werden. Für das Backend (API-Aufrufe) nutzen wir Vercel Functions, die ebenfalls global verteilt sind, und verbinden diese sicher mit der zentralen PostgreSQL-Datenbank.

Entwickler-Ergonomie: Da Entwicklerfreundlichkeit explizit ein Ziel ist, nutzen wir diverse Tools aus dem Boilerplate: ESLint und Prettier sind eingerichtet für konsistenten Code Style, Vitest und Testing Library erlauben Komponententests und ggf. Integrationstests unserer Logik. Storybook ist integriert, um UI-Komponenten isoliert zu entwickeln und zu dokumentieren – z.B. können wir dort unsere Kartenvorschau-Komponente entwickeln, bevor wir sie in den Deck-Editor einbauen. All diese Tools stellen sicher, dass das Projekt auch mit wachsendem Team sauber und effizient entwickelt werden kann. Durch Conventional Commits und ggf. automatische Releases behalten wir einen Überblick über Änderungen. Insgesamt legt die Architektur Wert auf Klarheit und Wartbarkeit, um das Projekt nachhaltig ausbauen zu können.

4. Datenmodell-Vorschlag (mit Prisma)

Für DuelPath wird ein relationales Datenmodell vorgeschlagen, das die wichtigsten Entitäten – Benutzer, Karten, Decks, Kombos und Duelle – abbildet. Prisma ORM ermöglicht es, dieses Modell zentral im Schema zu definieren, aus dem dann die entsprechenden Tabellen in PostgreSQL erzeugt werden. Hier ein Vorschlag für die zentralen Modelle und deren Beziehungen:

User (Benutzer): Enthält die Benutzerdaten. Wichtige Felder: id (Primärschlüssel), name (Anzeigename), email (E-Mail für Login, unikaler Index), password (falls E-Mail/Passwort genutzt; gehasht gespeichert) bzw. Felder für OAuth-Accounts via NextAuth. Zudem Zeitstempel createdAt. Beziehung: Ein User kann mehrere Decks und Kombos besitzen (1→N zu Deck und Combo). Anmerkung: NextAuth bringt eigene Modelle mit (Accounts, Sessions), die via Prisma Adapter implementiert werden – diese werden im Schema ergänzt, um Logins zu verwalten. Der Einfachheit halber gehen wir davon aus, dass NextAuth das User-Modell entweder mitnutzt oder spiegelt.

Card (Karte): Repräsentiert eine Yu-Gi-Oh! Karte aus der Datenbank. Felder orientieren sich an YGOPRODeck: id (Kartenschlüssel, meist die Passcode-ID), name (Name der Karte), type (z.B. Monster / Spell / Trap und weitere Typdetails), race (Monster-Typ oder Spell/Trap-Kategorie), attribute (bei Monstern das Attribut wie LIGHT, DARK etc.), level (Level/Rang/Linkzahl), atk, def (Werte, falls Monster), desc (Kartentext/Effektbeschreibung). Eventuell auch archetype (wenn vorhanden) und banlistInfo (Status verboten/limitiert). Zusätzlich speichern wir imageUrl oder Pfade zu Kartenbildern. Beziehung: Keine direkten Fremdschlüssel auf andere Modelle, da Karten global gültig sind. Allerdings wird Card von DeckCard und ComboStep referenziert (siehe unten). Die Card-Tabelle umfasst alle Karten und wird wöchentlich aktualisiert. Hinweis: Die API liefert auch Übersetzungen, ggf. könnte man ein Feld name_de oder desc_de aufnehmen, falls wir zweisprachige Kartentexte speichern möchten (da die API deutsche Übersetzungen liefert
ygoprodeck.com
). Anfangs reicht jedoch Englisch.

Deck: Ein Deck gehört zu einem User (userId FK) und hat Felder: id, name (vom Nutzer vergebener Deckname), optional description (Beschreibung oder Notizen zum Deck), format (z.B. „TCG“, „OCG“ oder „Casual“ – um verschiedene Regelwerke zu unterstützen, falls gewünscht) und Zeitstempel. Beziehung: 1 User → N Decks. Ein Deck selbst hat viele Karten: Hierfür nutzen wir eine Zwischentabelle DeckCard (Many-to-Many zwischen Deck und Card), da eine Karte in vielen Decks sein kann und ein Deck viele Karten enthält. Außerdem ermöglicht DeckCard, auch die Anzahl pro Karte im Deck zu speichern.

DeckCard: Felder: deckId (FK zum Deck), cardId (FK zur Card), quantity (Anzahl dieser Karte im Deck). quantity ist typischerweise 1–3 (da in Yu-Gi-Oh! max. 3 erlaubt, oder 0 falls entfernt). DeckCard bildet das Main Deck ab. Für Extra und Side Deck könnte man entweder ein Feld category hinzufügen (Main/Extra/Side) oder getrennte Modelle verwenden. Einfacher: ein Feld deckSection (Enum: MAIN, EXTRA, SIDE) in DeckCard, damit alle drei Deckbereiche in einer Tabelle modelliert sind. So kann ein Deck z.B. 40 DeckCard-Einträge mit deckSection=MAIN, bis zu 15 mit EXTRA usw. Primärschlüssel ist kombiniert (deckId, cardId, deckSection), sodass jede Karte pro Deck-Sektion max. einmal vorkommt.

Combo (Kombo): Modelliert eine vom Nutzer erstellte Kombo/Sequenz. Felder: id, userId (Ersteller, FK zu User), deckId (optional FK zum zugehörigen Deck, falls die Kombo an ein Deck gebunden ist – sinnvoll, da Kombos meist nur mit bestimmten Decks funktionieren), title (vom Nutzer vergebener Titel, z.B. „OTK mit Dark Magician“), description (optionale Beschreibung der Kombo, Strategie dahinter). Zusätzlich createdAt, updatedAt. Beziehung: 1 User → N Kombos; optional 1 Deck → N Kombos. Wichtig: Die eigentliche Abfolge der Züge wird in untergeordneten Steps gespeichert (siehe ComboStep).

ComboStep (Kombo-Schritt): Repräsentiert einen einzelnen Schritt innerhalb einer Kombo. Felder: id, comboId (FK zur Combo, gehört zu genau einer Kombo), order (Integer zur Reihenfolge, beginnend bei 1, 2, …), cardId (FK zur Card, die in diesem Schritt verwendet wird), actionType (Enum oder string, z.B. SUMMON, ACTIVATE, SET, ATTACK, DRAW etc.), description (Textdetails, z.B. „beschwört die Karte in Angriffsposition und aktiviert Effekt, um ...“ – hier kann der vom Nutzer eingegebene Freitext pro Schritt gespeichert werden). Evtl. zusätzliche Felder wie targetCardId (wenn z.B. Karte A aktiviert wird und Karte B als Ziel wählt – das abzubilden wäre aber Bonus). Die Schritte sind linear verknüpft via das order-Feld. Beim Laden einer Kombo werden alle Steps per ORDER BY order geladen und in dieser Reihenfolge angezeigt.

Duel (Duell) [optional]: Sollte in Zukunft ein Duell-Logging oder Speichern von Duellen nötig sein, könnte man ein Duell-Modell vorsehen. Für den MVP ist es nicht zwingend erforderlich, Duelle zu persistieren, da der Duellmodus eher zum Live-Testen dient. Falls doch: Felder wie id, userId (Initiator), opponentId (bei KI evtl. null), deckId (eigenes Deck), opponentDeckId (Deck des Gegners falls bekannt), result (Sieg/Niederlage/Abbruch), log (Speicherung der Zugfolge ggf. als JSON oder Textprotokoll), createdAt. Beziehung: N Duelle pro User. Dieses Modell könnte genutzt werden, um Statistiken zu erstellen (z.B. Siegquoten pro Deck), ist aber wie gesagt für die Kernfunktion nicht notwendig und daher zunächst zurückgestellt.

Weitere Modelle: NextAuth erfordert Tabellen wie Account (für OAuth-Logins), Session (für aktive Logins) und VerificationToken (für Magic-Link Logins). Diese werden via Prisma Adapter automatisch hinzugefügt. Für unsere Anwendung können wir ggf. einen Profile-Bereich (User-Profile erweitern um Avatar, Bio etc.) ergänzen, oder ein Community-Modell falls Nutzer miteinander interagieren (Kommentare, Likes auf Kombos/Decks). Diese kommen ggf. später hinzu und sind hier nicht im Detail ausgeführt.

Besonderheiten & Datenhaltung:

Kartenbilder: Da die YGOPRODeck API das Hotlinking von Bildern untersagt (Images müssen selbst gehostet werden, sonst droht Blacklist
ygoprodeck.com
), planen wir die Kartenbilder extern abzulegen. Mögliche Ansätze: a) Beim wöchentlichen Kartendaten-Import laden wir neue Kartenbilder herunter (die API gibt URL und ID aus
ygoprodeck.com
) und speichern sie z.B. in Cloud Storage (AWS S3 oder Cloudinary) von wo aus wir sie ausliefern. b) Alternativ nutzen wir Next.js Image Optimizer als Proxy: d.h. <Image> Komponenten von Next können so konfiguriert werden, dass sie die YGOPRODeck-URL einmalig ziehen und dann gecacht ausliefern. Variante a) wäre jedoch im Sinne von YGOPRODeck, da sie ausdrücklich bitten, die Bilder lokal zu speichern
ygoprodeck.com
. Im Datenmodell könnten wir daher in Card Felder imageFull, imageSmall aufnehmen, die Pfade zu unseren gehosteten Bildern (oder lokale filenames) enthalten. Somit ist die Anwendung unabhängig von externen Bildservern und performant, da die Bilder aus einem nahen CDN/Cache kommen.

Internationalisierung von Kartendaten: Wie erwähnt, ließe sich theoretisch pro Karte auch der deutsche Name/Text halten. Die API stellt pro Sprache über 9000 Karten bereit
ygoprodeck.com
. Denkbar wäre ein separates Modell CardTranslation mit Feldern cardId, language, name_translated, desc_translated. Vorerst wird dies nicht umgesetzt, um Redundanz zu vermeiden – wir belassen es bei englischen Kartentexten, was in der Szene üblich ist, zumal neu geleakte Karten oft erst später offizielle Übersetzungen erhalten
ygoprodeck.com
. Die App-UI hingegen bleibt durchgängig zweisprachig via getrennte Locale-Dateien für Deutsch/Englisch.

Leistung & Umfang: Das Datenmodell ist auf Effizienz getrimmt: Häufige Abfragen wie „Alle Decks des Benutzers X“ oder „Karten eines Decks“ sind durch Indizes (z.B. Index auf DeckCard(deckId)) performant. Prisma erlaubt mit Relations und Lazy Loading gezielt nur die Daten zu laden, die benötigt werden (z.B. Karten eines Decks ohne gleich alle Kombos zu laden, außer wenn gewünscht). Mit ca. 11k Karten ist die Card-Tabelle zwar groß, aber Abfragen nach Name/ID sind indexierbar und schnell. Auch der Speicherbedarf ist moderat (ein paar MB Textdaten). Für die Kombos wird erwartet, dass ein typischer User vielleicht dutzende Steps pro Kombo hat – also auch hier im niedrigen Umfang. Einzig die vielen Karten-Scripts (Regelwerke für Karten) werden nicht 1:1 in unserer DB abgebildet; stattdessen könnte man eine generische Regel-Engine nutzen (siehe unten), sodass wir nicht tausende Logik-Einträge pflegen müssen.

Zusammenfassend liefert dieses Datenmodell eine robuste Grundlage, um die Kernobjekte effizient zu verwalten, und ist zugleich flexibel genug, um Erweiterungen (weitere Felder oder Modelle für Community-Features) aufzunehmen.

5. Algorithmische Herausforderungen (z. B. Effektregeln)

Die Implementierung der Yu-Gi-Oh!-Regeln und Karten-Effekte stellt die größte algorithmische Herausforderung im DuelPath-Projekt dar. Yu-Gi-Oh! ist bekannt für seine komplexen Karteninteraktionen und Ausnahmeregeln – jedes Jahr kommen Hunderte neuer Karten mit einzigartigen Effekten hinzu. Im Folgenden werden die Hauptprobleme skizziert und Lösungsansätze diskutiert:

Volumen an Effekten: Es gibt über 11.000 unterschiedliche Karten, viele mit individuellen Effekten. Eine vollständige Simulation würde erfordern, jedes einzelne Kartenverhalten zu programmieren. Zum Vergleich: Fan-Projekte wie YGOPro nutzen für jede offizielle Karte ein eigenes Skript, insgesamt also etwa 12.000 Skriptdateien, um sämtliche Effekte abzubilden
github.com
. Dies verdeutlicht, dass ein generisches Regelsystem immens komplex ist. Für DuelPath bedeutet das: Wir können nicht von Anfang an jeden Effekt automatisiert prüfen. Stattdessen konzentrieren wir uns auf vereinfachte Regeln und allgemeine Mechaniken.

Spielzustand und Regeln: Ein Yu-Gi-Oh!-Duell hat vielfältige Zustände (Phasen, Zonen, Karten auf dem Feld/Hand/Friedhof, aktivierte Effekte, einmal-pro-Zug-Beschränkungen, Kettenreaktionen etc.). Einen solchen Zustand korrekt zu verwalten, erfordert eine umfassende Regel-Engine. Herausfordernd sind insbesondere:

Beschränkungen pro Zug: z.B. Normal Summon nur 1x pro Zug, bestimmte Karten nur einmal pro Spielzug aktivierbar. Diese Regeln müsste das System kennen und überwachen.

Timing und Kettensystem: Yu-Gi-Oh! hat ein Chain-System (Fast-Effekte, Reaktionen in Kette). Kombos im Solitär-Modus umgehen gegnerische Ketten, aber eigene Ketten (z.B. Trigger-Effekte nacheinander) können dennoch entstehen. Das korrekte Auflösen von Ketten in der richtigen Reihenfolge (LIFO) gehört zu den kompliziertesten Aspekten.

Kartenkosten vs. Effekte: Viele Karten haben Kosten (z.B. Karten abwerfen) und Effekte (z.B. Ziehen). Das System muss unterscheiden können, was Kosten und was Wirkung ist, um keine illegalen Aktionen zuzulassen (z.B. Effekt kann nicht aktiviert werden, wenn Kosten nicht bezahlt werden können).

Zustandsabhängige Effekte: Einige Effekte hängen vom Spielzustand ab (z.B. „wenn genau 2 Monster auf dem Feld sind, dann...“). Das System müsste solche Bedingungen evaluieren können.

Ansatz für MVP: Für die erste Version (Kombos im Editor und Solitär-Duell) gilt: Großzügige Auslegung der Regeln. Sprich, das Tool lässt fast alles durch und dient mehr als Notiz-/Visualisierungstool denn als strenger Schiedsrichter. Beispielsweise kann der Nutzer eine Karte auch dann als „aktiviert“ markieren, wenn die Voraussetzungen nicht erfüllt wären – das Tool führt es nicht wirklich aus, sondern der Nutzer steuert es manuell. Dieser Ansatz vermeidet Frustration, dass das Tool eine Kombo nicht zulässt, die der Nutzer experimentell austesten will. Validierung erfolgt vorerst nur bei sehr einfachen, formalen Regeln: Anzahl Normal Summons, Max. Karten auf der Hand (wenn wir Handlimit simulieren), vorhandene Ziele (z.B. kann ein Effekt, der „lege 1 Karte ab“ erfordert, markiert werden – aber wir überprüfen noch nicht, ob tatsächlich eine Karte abgeworfen wurde).

Schrittweise Regel-Engine: Mittel- bis langfristig kann DuelPath eine eigene Regel-Engine aufbauen. Eine Möglichkeit ist es, häufige generische Effekte als Module zu implementieren – z.B. „Ziehe X Karten“, „Zerstöre 1 Karte auf dem Feld“, „beschwöre ein Monster aus dem Friedhof“. Viele Karten lassen sich aus solchen Basiseffekten zusammensetzen. Das Tool könnte eine Bibliothek von Effekt-Bausteinen haben, die parametriert werden (z.B. Karte A hat Effekt „Zerstöre 1 Monster“ – dann wird der Baustein „destroy(targetType=Monster)“ angewandt). Dieses regelbasierte System könnte zumindest die häufigsten Interaktionen automatisch auswerten.

Nutzung externer Daten: Gegebenenfalls kann man auf bestehende offene Projekte zurückgreifen. YGOPro z.B. hat die Logik in C++ und Lua implementiert; es gibt Versuche, diese Kern-Engine auszulagern
ygoproscripting.miraheze.org
, aber die Integration in eine Webumgebung wäre sehr aufwändig. Alternativ gibt es eventuell Regelbeschreibungen (z.B. von Konami als Text), die maschinenlesbar sind – aktuell ist jedoch nichts offizielles verfügbar. Für DuelPath bleibt daher der gangbare Weg: vereinfachte Implementierung plus User-Eigenverantwortung. Die Nutzer werden das Tool primär nutzen, um ihre bekannten Kombos zu dokumentieren und zu visualisieren, nicht um völlig unbekannte Karten automatisch berechnen zu lassen.

Effekt-Validierung in der Praxis: Ein möglicher Algorithmus zur Kombo-Validierung könnte so aussehen: Wir halten einen internen Objekt-Graphen des Spielfelds (Monsterzonen, Graveyard etc.). Bei jedem KomboStep, der im Play-Modus ausgeführt wird, passen wir diesen Zustand an (z.B. Step: „Beschwöre Monster A“ -> wir fügen Monster A ins Feld-Array ein). Am Ende oder laufend könnten wir einfache Checks machen: War Monster A wirklich aus der Hand spielbar? (Dafür müsste es vorher auf der Hand gewesen sein, also im Zustand vorhanden). Solche State-Checks könnte man nach und nach ausbauen. Bei Widersprüchen könnte das System einen Hinweis ausgeben („Achtung: Monster A war nicht in deiner Hand verfügbar in Schritt 1“). Dies wäre schon ein großer Mehrwert, da es Nutzer auf Logikfehler in ihren Kombo-Abläufen hinweist. Solange diese Prüfungen optional oder informativ sind (und nicht strikt die Ausführung blockieren), bleibt das Tool flexibel benutzbar.

KI-Unterstützung bei Regeln: Ein längerfristiger Gedanke (siehe Erweiterungen) ist, KI einzusetzen, um bei der Regelauswertung zu helfen. Beispielsweise könnte man ein Language Model mit den Regeln einer Karte füttern und fragen: „Darf dieser Effekt jetzt aktiviert werden?“. Momentan ist das aber eher experimentell; wir erwähnen es der Vollständigkeit halber.

Zusammengefasst sind die algorithmischen Herausforderungen in DuelPath erheblich, aber durch Priorisierung (erst Visualisierung, dann nach und nach mehr Logik) und Teilautomatisierung (Generische Effekte implementieren, State-Checks) handhabbar. Wichtig ist, dem Nutzer die Kontrolle zu lassen und das Tool als Hilfe, nicht als Richter zu verstehen – zumindest in den ersten Versionen. So können wir Mehrwert bieten, ohne uns in unendliche Regel-Codierung zu verlieren.

6. UI/UX-Konzepte (Editor, Duellanzeige etc.)

Ein zentrales Anliegen von DuelPath ist eine intuitive und ansprechende Benutzeroberfläche, die es sowohl Einsteigern als auch erfahrenen Spielern leicht macht, das Tool zu nutzen. Hier werden die UI/UX-Konzepte für die Hauptfeatures beschrieben:

Kombo-Editor UX

Sequenzielle Timeline: Der Kombo-Editor präsentiert eine lineare Timeline aller Schritte. Jeder Schritt wird in einem Kartenähnlichen Kasten angezeigt, mit Schritt-Nummer, einer kleinen Vorschau des Kartenbildes und einem kurzen Text, der die Aktion beschreibt. Farbliche Hervorhebungen können Aktionstypen kennzeichnen (z.B. Beschwörungen in einer anderen Farbe als Effektaktivierungen), um die Übersicht zu erhöhen.

Interaktives Hinzufügen/Anpassen: Oben oder unten in der Kombo-Timeline befindet sich ein „+ Schritt hinzufügen“-Button. Klickt der Nutzer darauf, öffnet sich ein Schritt-Editor-Dialog: Hier kann er zunächst eine Karte auswählen. Die Auswahl erfolgt entweder via Suchfeld (Autocomplete auf Kartennamen) oder aus einer Liste der Karten des zugeordneten Decks. Nach Auswahl der Karte wählt man die Aktion aus einem Dropdown (z.B. „Normalbeschwörung“, „Effekt aktivieren“, „setzt Karte“ usw.). Zusätzlich kann der Nutzer einen freien Beschreibungstext eingeben, um Details zu ergänzen. Nach Bestätigen erscheint der neue Schritt in der Timeline. Bereits bestehende Schritte lassen sich per Klick bearbeiten (öffnet denselben Dialog zur Anpassung) oder per Drag & Drop in der Reihenfolge verschieben (die order-Nummern werden dann neu gesetzt).

Kontextuelle Feldansicht: Optional könnte rechts neben der Timeline eine schematische Feldansicht angezeigt werden, die sich bei Auswahl eines Schritts aktualisiert. Diese Feldansicht zeigt einen Snapshot des Spielfelds nach Ausführen dieses Schritts. So könnte der Nutzer visualisieren, welche Karten wo liegen. Beispiel: Schritt 3 = „Beschwöre Monster A in Angriffsposition“ -> In der Feldansicht taucht nach Schritt 3 Monster A auf der Monsterzone auf. Diese Live-Vorschau hilft, die Kombo räumlich einzuordnen. Für das MVP ist diese Feldvisualisierung nice-to-have – im Vordergrund steht zunächst die textuelle Sequenz.

Validierungs-Hinweise: Wie im vorherigen Abschnitt beschrieben, könnten bestimmte Hinweise/Warnings eingeblendet werden, wenn ein Schritt fragwürdig ist. Dies würde UI-mäßig z.B. als gelbes Warnsymbol am entsprechenden Schritt erscheinen, mit Tooltip „Diese Karte war zu diesem Zeitpunkt evtl. nicht verfügbar“ o.ä. Der Nutzer kann die Warnung ignorieren oder darauf reagieren (Anpassung der Kombo).

Mobile Nutzung: Das UI-Design berücksichtigt Responsive Design, insbesondere da viele Spieler evtl. am Smartphone Decks durchschauen. Die Kombo-Timeline würde auf schmalen Screens als vertikale Liste funktionieren, die kartenartig untereinander gestapelt ist. Der Schritt-Editor könnte als Vollbild-Overlay auf Mobile erscheinen.

Deck-Editor UX

Deck-Builder Layout: Der Bildschirm ist zweigeteilt: Links die Kartensuche, rechts die Deckliste. Links befindet sich ein Suchfeld mit Filter-Optionen (z.B. Dropdowns für Kartentyp, Attribut, Level). Darunter werden Suchergebnisse als Kartenvorschauzeilen gelistet: Jede Zeile zeigt den Kartenname, vielleicht ein kleines Thumbnail, Typ und ATK/DEF. Rechts sieht man die aktuelle Deckzusammenstellung: gegliedert in Main, Extra, Side. Unter jedem Bereich werden die Karten mit Anzahl angezeigt (z.B. „3x Blue-Eyes White Dragon“).

Karten hinzufügen/entfernen: Bei jeder Kartenvorschau links gibt es einen „+“ Button, um die Karte zum Deck hinzuzufügen. Vielleicht kann der Nutzer auch die Zeile rüberziehen nach rechts (Drag & Drop). Sobald hinzugefügt, erscheint die Karte rechts in der entsprechenden Sektion (Main/Extra/Side), standardmäßig Main Deck, außer es ist z.B. ein Fusions-/Synchro/Link-Monster, dann könnte das System automatisch Extra Deck vorschlagen. Für Side Deck gibt es in der UI einen Knopf „Verschieben zu Side Deck“ bei Karten in der Main-Liste. Entfernen erfolgt über einen kleinen „x“ Button neben der Karte im Deck. Die Anzahl erhöhen/reduzieren kann man durch wiederholtes Klicken auf „+“ oder einen kleinen Zähler-Spinner neben der Karteneintrag.

Deck-Infos und Regellayout: Oberhalb der Deckliste sieht der Nutzer Deckstatistiken: Anzahl Karten Main/Extra/Side, ggf. Warnungen falls Minimum/Maximum nicht erfüllt sind (z.B. „Main Deck hat nur 35 Karten – mindestens 40 erforderlich!“ in rot). Diese Hinweise aktualisieren sich dynamisch. Auch kann man an dieser Stelle das Format einstellen (TCG/OCG), was Einfluss auf erlaubte Karten haben könnte (z.B. unterschiedlicher Banlist). Falls Formatwechsel, könnte das Tool verbotene Karten hervorheben.

Kartendetails: Bei Klick auf einen Kartenname entweder links oder rechts öffnet sich eine Detail-Ansicht (z.B. Modal oder Drawer von rechts). Diese zeigt das große Kartenbild, alle Kartendetails (Typ, Atk, Effekttext etc.). So kann der Nutzer die Karte genauer lesen, ohne die Anwendung verlassen zu müssen. Gerade im deutschen Interface wird hier wohl der englische Kartentext angezeigt, da es keine offiziellen deutschen Texte in der API gibt (außer wir nutzen Übersetzungen).

UI-Komponenten: Dank shadcn/UI können wir für Listen, Dropdowns und Modals auf bestehende Komponenten zurückgreifen. Z.B. könnte die Kartensuche ein Kombinationsfeld sein (Autocomplete + Dropdown aus dem UI-Kit), das konsistent gestylt ist. Buttons für „Speichern Deck“ etc. sind Standardkomponenten. Tailwind hilft uns, z.B. die Karte im Deck je nach Typ farbig zu hinterlegen (Monstertypen vs Zauber/Fallen, ähnlich Farbcode wie im echten Kartenspiel).

Duellmodus UX

Spielfeld-Darstellung: Die Duelloberfläche zeigt ein abstrahiertes Yu-Gi-Oh!-Spielfeld in 2D. Wir nutzen eine vereinfachte Top-Down-Ansicht: In der Mitte ggf. ein Feld-Layout mit Plätzen für 5 Monster und 5 Zauber/Fallen pro Seite, Friedhof, Deckstapel, Extra-Deck-Stapel und Feldzauber-Zone. Der eigene Bereich ist unten, der (fiktive) Gegner oben gespiegelt. Da im Solitärmodus der Gegner nichts aktiv spielt, können wir den oberen Bereich stark reduziert darstellen oder nur als Ablage für z.B. erzwungene Karten (wie "Zielkarte vom Gegner vernichten" würde dann oben in den Friedhof wandern).

Karteninteraktion: Handkarten des Spielers werden als kleine Bilder am unteren Bildschirmrand gezeigt. Der Spieler kann auf eine Handkarte tippen/klicken – dadurch werden kontextabhängige Optionen eingeblendet: z.B. „Normal Beschwören“, „Verdeckt setzen“, „Abwerfen“ (falls zutreffend). Wählt er eine Option, animiert sich die Karte zum entsprechenden Feldbereich. Ähnlich, wenn ein Monster auf dem Feld angeklickt wird, erscheinen Optionen wie „Angreifen“ (im Battle Phase) oder „Effekt aktivieren“ (sofern es einen hat und die Phase stimmt). Diese Kontextmenüs kann man mit Radix UI popovers gestalten, um konsistentes Verhalten zu haben.

Phasensteuerung: Über dem Spielfeld gibt es eine Phasenleiste (Draw, Standby, Main1, Battle, Main2, End). Der aktuelle Phase wird hervorgehoben. Ein „Weiter“-Button erlaubt es, zur nächsten Phase zu springen. Im Solitärmodus überspringt dies auch gleich die gegnerische Phase (da Gegner nichts tut). Beispielsweise klickt der Nutzer nach seiner Main Phase auf „Battle Phase“, führt Angriffe durch, dann auf „End Phase“ – und das System wechselt direkt wieder zu seiner Draw Phase (neuer Zug).

Lebenspunkte & Grundinfos: Links oder rechts oben werden Lebenspunkte angezeigt (Standard 8000 vs 8000 zu Beginn). Es gibt Buttons, um LP zu verändern (z.B. -500, +1000 etc., oder manuell eingeben), da viele Effekte Schaden oder Heilung machen. Diese müssen im Solitärmodus manuell getriggert werden (z.B. wenn Nutzer eine Burn-Kombo testet, würde er selbst den LP-Abzug eintippen).

Log/History Panel: Am rechten Rand könnte ein Log-Bereich die Historie aller Aktionen in Textform listen. Jeder Eintrag hat z.B. den Phasenindikator und Aktion („Main Phase 1: Beschwöre Dark Magician“, „Battle Phase: Dark Magician greift direkt an (2500 Schaden)“ etc.). Dies dient als Kontrolle und lässt den Nutzer rückblickend sehen, was passiert ist. Außerdem kann dieser Log für Debugging der Engine helfen (intern).

Design und Feedback: Wichtig ist bei all dem, dass die UI trotz der Komplexität nicht überfrachtet wirkt. Durch Farbcodes (z.B. grüner Rand um Monster = Angriffsmodus, blauer = Verteidigung) und dezente Animationen soll der Nutzer intuitiv folgen können. Fehlbedienungen werden verhindert, indem z.B. Buttons ausgegraut sind, wenn sie nicht dran sind (man kann nur in Main Phase Monster beschwören etc.). Ein Tutorial oder Hilfetexte könnten Erstnutzern erklären, was zu tun ist (z.B. „Ziehe zuerst eine Starthand mit dem Button 'Starthand ziehen'“ oder „Tippe auf eine Handkarte, um Optionen zu sehen“). Insgesamt soll die UX einen Spiel-ähnlichen Charakter haben, aber als Tool im Browser einfach und schnell bedienbar bleiben.

Allgemeine UI Aspekte

Theming: Dank Tailwind können wir ein Theme definieren, z.B. dunkler Hintergrund (viele YGO-Apps nutzen Dark Mode wegen der Kartenillustrationen). Wir werden wahrscheinlich einen Dark Mode bevorzugen (schwarzer/blauer Hintergrund ähnelt Spielmatten), aber auch einen Light Mode anbieten für Lesbarkeit. Tailwind’s Konfig macht es leicht, beide Themes zu pflegen.

Responsive Design: Alle Ansichten (Deck-Editor, Kombo-Editor, Duell) werden responsive gestaltet. Auf Mobilgeräten erfolgen ggf. Darstellungswechsel (z.B. im Deck-Editor wird die Suche als Overlay über die Deckliste gelegt, statt nebeneinander, um Platz zu sparen).

Internationalisierung UI: Alle statischen Texte werden über ein i18n-System bereitgestellt (z.B. next-intl oder react-i18next). Wir organisieren Texte nach Komponenten/Funktionen, damit Übersetzer leicht die Strings finden. Darauf wird geachtet, damit Deutsch/Englisch sauber getrennt sind. Technisch könnte das z.B. so aussehen, dass wir JSON/YAML mit Übersetzungen haben und via <Trans> Komponente die Texte einfügen. Sprachumschaltung erfolgt clientseitig (oder serverseitig via Routing, je nach Next.js Strategy) – voraussichtlich einfacher: ein Zustand in der App, der die Sprache toggelt und dann werden Texte neu gerendert. Wir achten darauf, Texte knapp zu halten, um in beiden Sprachen im UI zu passen.

Accessibility: Durch Verwendung von Radix UI (shadcn) und semantischen HTML-Elementen wird Grund-Zugänglichkeit gewährleistet. Wir bemühen uns um Aria-Labels, Tastaturbedienbarkeit (z.B. Pfeiltasten in Listen) und Kontraste im Design, sodass auch Leute mit Einschränkungen das Tool nutzen können.

Insgesamt soll das UI/UX-Design von DuelPath spaßig und zugleich produktiv sein – der Nutzer soll sich fast wie in einem Digital Duel Simulator fühlen, aber mit der Freiheit, Dinge manuell zu setzen und zu experimentieren. Durch die klar strukturierte Oberfläche (Deckbau, Komboerstellung, Duell) und konsistente Design-Patterns (ähnliche Buttons, Dialoge, Listen-Layouts) findet sich der User schnell zurecht. Der Fokus liegt auf Usability für komplexe Inhalte: obwohl Yu-Gi-Oh!-Aktionen komplex sein können, soll die Darstellung in DuelPath diese Komplexität bestmöglich handhabbar machen.

7. Sicherheit und Performance

Bei einer Webanwendung wie DuelPath, die Benutzerdaten (Decks, Kombos, Profile) verwaltet und möglicherweise von vielen Spielern genutzt wird, sind Sicherheits- und Performance-Aspekte essenziell. Hier beschreiben wir, wie das Projekt diese Punkte adressiert:

Sicherheit

Authentifizierung & Autorisierung: Dank NextAuth ist das Login-System erprobt sicher. Passwörter (falls genutzt) werden gehasht gespeichert, Sessions sind durch HttpOnly-Cookies oder JWTs geschützt. Wir erzwingen HTTPS für alle Verbindungen, besonders da Auth-Cookies nur so sicher sind. Ferner implementieren wir Rollen, falls nötig (z.B. Admin), um Verwaltungsfunktionen abzugrenzen.

Zugriffskontrolle auf Daten: Alle sensiblen Routen (Deck speichern, Kombo erstellen, etc.) prüfen serverseitig den Session-User. Ein Nutzer kann nur seine eigenen Decks/Kombos abrufen oder ändern. Prisma-Abfragen filtern nach userId entsprechend der Session. Somit ist ausgeschlossen, dass jemand per direkten API-Call fremde Daten laden kann. (Öffentlich geteilte Inhalte wären explizit als solche markiert und ohne Login lesbar, aber standardmäßig ist alles privat.)

Eingabedaten validieren: User-Input wie Decknamen, Kombo-Beschreibungen etc. werden serverseitig validiert und bereinigt. Z.B. maximale Länge, verbotene Zeichen, um SQL-Injection (was Prisma aber ohnehin mitigiert) oder XSS zu verhindern. Insbesondere alle freien Texte werden entweder nur als reiner Text (ohne HTML-Rendering) ausgegeben oder durch eine Whitelist von erlaubten HTML-Tags gefiltert, um Cross-Site Scripting zu verhindern.

Verhinderung von XSS im Editor: Da das Tool evtl. auch Inhalt rendert, der vom Nutzer kommt (Kombo-Schritt-Beschreibungen könnten z.B. Kartennamen enthalten, die theoretisch Scripts sein könnten), werden wir hier vorsichtig sein. Im Zweifel escapen wir Benutzertexte vollständig. Das UI-Framework (React) escaped Strings in JSX standardmäßig, solange wir kein dangerouslySetInnerHTML verwenden. Wir vermeiden letzteres für User-Content.

Schutz der API-Schlüssel: Falls die App API-Keys (z.B. für YGOPRODeck Premium oder andere externe Dienste) benötigt, werden diese serverseitig in Umgebungsvariablen gehalten und niemals im Clientcode exponiert. Der Code ist Open Source (wahrscheinlich) – daher sollte nichts Sensibles im Repo stehen.

Ausfallsicherheit und Monitoring: Wir planen Logging von Fehlern (z.B. mit Sentry) und Monitoring der Anwendung. Bei kritischen Bugs kann schnell reagiert werden. Dank des Boilerplates könnten Telemetrie-Daten (OpenTelemetry) gesammelt werden, um Performance und eventuelle Attacken zu beobachten.

Vermeidung von Abuse: Möglicher Missbrauch könnte sein, dass jemand Spam-Accounts anlegt oder automatisiert Karten sucht. Wir können Rate Limiting auf bestimmte API-Routen setzen (z.B. Deck-Erstellung limitiert pro Minute) und Captcha bei Registrierung, sollte Spam auftreten. Vercel's Infrastruktur hat zudem DDoS-Schutz im Hintergrund.

Content Security Policy (CSP): Wir können eine strenge CSP konfigurieren (nur eigene Domains für Scripts, keine inline Scripts etc.), um die Angriffsfläche für XSS weiter zu senken. Da Next.js uns den <Head> steuern lässt, kann man entsprechende Header senden.

Kartenbilder-Hosting und Rechte: Yu-Gi-Oh!-Karten sind urheberrechtlich geschützte Bilder. Indem wir sie von YGOPRODeck beziehen (der eine Erlaubnis/Rechtfertigung dafür hat) und selbst hosten, sollten wir vorsichtig sein. Wir werden einen Disclaimer haben, dass die Kartenbilder und Namen Eigentum von Konami etc. sind. Sicherheitshalber könnte man ein CDN nutzen, das Geobeschränkungen erlaubt, falls rechtliche Probleme auftreten (z.B. Bilder nur abrufbar, wenn man die Seite besucht, nicht als offener Bilderserver). Dies ist mehr rechtliche „Sicherheit“ als technische, aber gehört in die Planung.

Performance und Skalierung

Serverless Skalierung: Durch den Einsatz von Next.js auf Vercel erhalten wir automatisch eine skalierbare Serverless-Architektur. Bei steigendem Traffic werden Anfragen parallel auf mehrere Lambda-Instances verteilt. Wichtig ist dabei, dass unser Code zustandslos ist – was erfüllt ist, da App-Server keinen eigenen State halten, die DB extern ist. Horizontale Skalierung ist somit unproblematisch. Sollte die Useranzahl massiv steigen, skaliert v.a. die Datenbank als Engstelle. Hier könnten wir frühzeitig optimieren: Verwendung von Connection Pooling (Vercel Postgres bietet z.B. Connection Pool oder Prisma Data Proxy, damit viele Lambda-Funktionen nicht zu viele Verbindungen öffnen), und gegebenenfalls Read Replicas oder Caching für oft gelesene Daten.

Datenbank-Optimierung: Wir legen Indizes auf häufige Abfrage-Felder (z.B. card.name, deck.userId, combo.deckId). Das Karten-Suchfeature könnte über einen Volltextindex (Postgres GIN Index auf Namen/Desc) oder eine externe Suchlösung (wie Algolia) nachdenken, falls die Textsuche langsam wird. Für den MVP reicht aber vermutlich Prisma mit contains Queries für Namen. Kartendaten werden, wie erwähnt, lokal gehalten, sodass keine Latenz zur externen API anfällt.

Caching: Next.js ermöglicht Incremental Static Generation und Caching von Seiten. Einige Bereiche könnten davon profitieren: z.B. eine öffentlich geteilte Kombo-Seite könnte statisch generiert werden und bei Updates invalidiert. Allerdings sind die meisten Kernfeatures user-spezifisch (nicht öffentlich cachenbar). Dennoch nutzen wir Next.js’ Image Optimizer für Kartenbilder – erste Anfragen werden komprimiert und anschließend im CDN gehalten. Auch API-Antworten von YGOPRODeck sind auf deren Seite gecacht (2 Tage)
ygoprodeck.com
, aber da wir ohnehin lokal speichern, ist das sekundär.

Client Performance: Da wir viele React-Komponenten haben, achten wir auf Code-Splitting (Next macht das automatisch auf Routenbasis) und ggf. Lazy Loading von schweren Komponenten. Zum Beispiel laden wir die Duell-Komponente (die evtl. groß ist) nur, wenn man im Duellmodus ist, nicht beim Deck-Editor. Großes statisches Datenobjekt (wie die gesamte Kartenliste) laden wir niemals komplett in den Browser, sondern paginieren. In Listen nutzen wir Virtualisierung bei Bedarf (z.B. wenn man durch alle 10000 Karten scrollt – aber realistischer ist Filterung).

Bilder und Assets: Kartenbilder sind die größten Assets. Wir verwenden die kleinen Thumbnails (jpeg ~ 5-20KB) für Listendarstellungen und laden die Fullsize-Version (vielleicht 100KB) nur in Detailansichten. So reduzieren wir Datentransfer. Tailwind CSS und unser JS werden minified und gzipped ausgeliefert; dank PurgeCSS enthält das CSS nur verwendete Klassen, obwohl Tailwind riesig ist. Somit bleibt der Payload gering.

Testing & Profiling: Vor Launch werden wir einen Last-Test durchführen – z.B. 100 gleichzeitige Nutzer, die Decks laden, Kombos abspielen – um Engpässe zu finden. Tools wie Autocannon oder k6 können unsere API-Routen belasten. Sollte die Duell-Simulation (wenn mal 2-Spieler-Echtzeit) ins Spiel kommen, würden wir auf WebSocket-Skalierung achten (wahrscheinlich über einen Service wie Ably oder Socket.IO Cluster, da Vercel Lambdas nicht dauerhaft Connections halten). Aber im MVP verzichten wir auf Echtzeit-Features, was die Performance-Probleme deutlich reduziert.

Memory & Leaks: In einer Node-Umgebung müssen wir aufpassen, keine Memory Leaks zu produzieren (z.B. große In-Memory-Caches ohne Limits). Da wir serverless sind, wird eine Funktion nach Verarbeitung gekillt, was Leaks eher verhindert. Dennoch achten wir bei eventuell globalen Singletons (Prisma Client wird als singleton verwendet) auf saubere Nutzung.

YGOPRODeck API Limits: Ein Performance-Aspekt ist die externe Kartendaten-API. Wir umgehen Engpässe, indem wir nicht pro User-Anfrage die API kontaktieren, sondern einmal wöchentlich (Batch). Dies verhindert, dass wir ins Rate-Limit laufen oder verzögerte Antworten bekommen. YGOPRODeck hat ein Limit von 20 Requests/Sekunde
ygoprodeck.com
 – sollten wir doch mal on-demand was laden (z.B. die allerneuesten Karten manuell), halten wir uns strikt daran und implementieren notfalls ein kleines Delay oder Zwischencache. So bleibt unsere Beziehung zur API gesund und die Performance für Nutzer hoch (lokale DB ist schneller als API-Aufruf).

Skalierung der Community-Funktionen: Falls später viele User öffentliche Inhalte nutzen, müssen wir die Last im Blick behalten. Z.B. ein "Combo des Tages" Feature auf der Startseite könnte zu hoher DB-Last führen, wenn jeder Pageview die größte Kombodaten zieht. Hier würden wir rechtzeitig cachen (im Memory oder via statische Generierung).

Insgesamt verfolgen wir eine Proactive-Performance-Strategie: Von vornherein gute Architektur, Caching wo sinnvoll, und regelmäßige Überwachung. Ebenso eine Security-First-Haltung: sichere Defaults aus dem Boilerplate nutzen und jede neue Funktion unter dem Aspekt der Sicherheit betrachten, damit Nutzerdaten geschützt sind und das System stabil bleibt.

8. Erweiterungsmöglichkeiten (Statistiken, Community, AI)

Neben den Kernfeatures bieten sich zahlreiche Erweiterungen an, um DuelPath in Zukunft noch mächtiger und attraktiver zu machen. Hier einige der spannendsten Ausbau-Ideen:

Spielerstatistiken & Analytics: Durch die gesammelten Daten können wir interessante Statistiken erstellen. Zum Beispiel: Win/Loss-Statistiken für Decks (falls Duellmodus gegeneinander kommt), Deck- und Kartenpopularität (welche Karten werden in vielen Decks verwendet), Kombo-Erfolgsraten etc. Selbst im Solitärmodus könnte man auswerten, wie oft ein Nutzer ein OTK (One Turn Kill) schafft oder in welchem Zug ein Duell endet. Ein Statistik-Dashboard könnte den Spielern helfen, ihre Performance zu analysieren. Ebenso könnten globale Trends sichtbar gemacht werden („Top 10 meistverwendete Karten in geteilten Decks“ usw.). Diese Analytics erhöhen den Wiedernutzungswert, da Spieler Verbesserungsmöglichkeiten sehen und vergleichen können.

Community-Features: Um DuelPath mehr zu einer Plattform zu machen, können verschiedene Community-Funktionen integriert werden:

Öffentliche Deck- & Kombo-Bibliothek: Nutzer haben optional die Möglichkeit, ihre erstellten Decks und Kombos mit der Community zu teilen. Diese erscheinen dann in einem öffentlichen Katalog. Andere Nutzer können dort nach Schlüsselwörtern oder Karten filtern (z.B. „zeige alle Kombos mit Dark Magician“). Ein Bewertungssystem (Likes/Stars) und Kommentare erlauben Feedback und Austausch. Dies fördert die Community-Bildung und den Wissenstransfer – ähnlich wie Foren oder YouTube-Kanäle, aber interaktiv im Tool selbst.

Foren/Chat/Discord-Integration: Man könnte ein simples Forum oder Q&A-Sektion anbieten, aber moderner wäre vielleicht eine Discord-Integration. Z.B. ein offizieller Discord-Bot, der neue Top-Kombos posted, oder ein In-App Link zu einer Diskussionsgruppe. Ein leichterer Community-Einstieg könnte eine Kommentarfunktion unter jeder geteilten Kombo sein, sodass Diskussion direkt am Objekt entsteht.

Turniere/Challenges: Denkbar sind von Zeit zu Zeit Challenges, z.B. „Schaffe mit dem vorgegebenen Deck in einem Zug 8000 Schaden“. Nutzer könnten ihre Lösungen als Kombos einreichen und vergleichen. Oder „Deckbau-Challenge: baue ein Deck nur aus Common-Karten“. Solche Gamification-Elemente halten die Community engagiert.

KI-Unterstützung (Artificial Intelligence): Der Einsatz von KI kann DuelPath auf verschiedene Weise bereichern:

KI-Deck-Assistent: Ein AI-Modul (z.B. auf Basis von GPT-4/ChatGPT) könnte Spielern helfen, Decklisten zu optimieren. Der Nutzer gibt etwa an: „Ich möchte ein Dark Magician Deck, Budget casual“ – die KI schlägt Karten vor oder ordnet vorhandene Karten. Sie könnte auch vorhandene Decks analysieren und Schwachstellen aufzeigen („Du hast wenige Möglichkeiten gegen Zauber, vielleicht füge Ash Blossom hinzu“).

Kombo-Generierung: Eine fortgeschrittene KI könnte aus einer Deckliste potenzielle Kombos automatisch finden. Sie könnte simulieren, welche Karten gezogen werden müssen für einen bestimmten Effekt und dem Spieler vorschlagen „Mit diesen 3 Karten auf der Starthand kannst du folgenden Spielzug machen...“. Das wäre extrem nützlich, da gerade Anfänger oft Kombinationsmöglichkeiten übersehen.

KI als Gegner: Im Duellmodus könnte eine KI den Gegner spielen. Dies erfordert aber, dass die KI Zugriff auf eine vereinfachte Simulation hat. Eine Regel-KI könnte mittels Reinforcement Learning oder heuristischer Ansätze (basierend auf YGOPro-AI-Skripten) implementiert werden. Kurzfristig ist das sehr ambitioniert, aber auf lange Sicht würde ein „Sparringspartner-AI“ das Tool zum vollwertigen Solo-Trainingstool machen.

Natürliche Sprachsteuerung: Ein experimentelles Feature könnte sein, dass Nutzer in natürlicher Sprache Aktionen eingeben: z.B. „Beschwöre Monster A, greife mit Monster A die Life Points an“. Eine NLP-Komponente könnte das in Spielaktionen umsetzen. Oder eine Sprachassistenz, die Fragen beantwortet („Wie funktioniert der Effekt von Karte X?“) – hier kann man auf ein LLM zugreifen, das auf Kartentexten trainiert wurde.

Mobile App / Offline-Modus: Als Erweiterung könnte man eine Mobile App entwickeln (React Native oder eine PWA) damit Nutzer auch offline oder native das Tool nutzen können. Eine PWA (Progressive Web App) könnte Offline-Caching der Kartendaten ermöglichen, sodass man z.B. unterwegs ohne Netz Decks bearbeiten kann. Die Sync passiert dann wieder online. Dies wäre für Turnierspieler praktisch, die vielleicht vor Ort kurz was nachschauen wollen.

Weitere Sprachversionen: Neben Deutsch/Englisch wären bei entsprechendem Erfolg weitere Sprachen möglich (Französisch, Spanisch, Italienisch etc.). Da das Grundgerüst mit i18n steht, wäre das hauptsächlich Übersetzungsaufwand.

Integration mit offiziellen Plattformen: Z.B. könnte man Master Duel (offizielles Spiel) oder DuelingBook integrieren, etwa Deck-Import/Export. Wenn Konami APIs anbieten sollte (derzeit nicht öffentlich bekannt), könnte man auch offizielle Inhalte einbinden. Zum Beispiel eine Live-Banlist-Aktualisierung von Konami. Oder Preisupdates von Cardmarket via API, um Deckkosten zu berechnen – so sehen Spieler, was ihr Deck ca. wert ist.

Finanzierung/Premium-Ideen: Sollte das Projekt expandieren, könnte man über Premium-Features nachdenken, die z.B. die AI-Funktionen betreffen (weil diese kostenintensiv sein können). Oder exklusive Designs, mehr Speicher für Decks etc., um die Serverkosten zu decken. Das Boilerplate ist eine SaaS-Template – evtl. ließe sich ein Abo-Modell integrieren (rein optional hier erwähnt, primär falls externe API-Kosten anfallen).

Diese Erweiterungsmöglichkeiten zeigen ein Bild, wie DuelPath sich von einem reinen Tool hin zu einer umfassenden Plattform für Yu-Gi-Oh!-Spieler entwickeln könnte. Wichtig ist, Erweiterungen phasenweise umzusetzen (siehe Roadmap), um das Kernprodukt nicht zu überfrachten. Jede neue Funktion sollte den Nutzerfokus beibehalten: Mehrwert beim Lernen, Planen und Spielen von Yu-Gi-Oh! schaffen.

9. Roadmap (Phasenweise Entwicklung)

Um DuelPath effizient und zielgerichtet umzusetzen, wird die Entwicklung in Phasen unterteilt. Jede Phase liefert ein lauffähiges Teilprodukt (MVPs für Teilbereiche), das iterativ erweitert wird. Diese phasenweise Planung ermöglicht Feedback von Testnutzern frühzeitig einzubeziehen und Risiken zu minimieren. Hier die geplante Roadmap:

Phase 1: Grundgerüst und Tech-Stack Einrichtung (Monat 1-2)
Ziel: Projektbasis schaffen, auf der weitere Features aufsetzen.

Next.js Boilerplate einrichten, Repository aufsetzen. Deployment auf Vercel vorbereiten.

Auth-System konfigurieren: NextAuth integrieren (Datenbankanbindung mit Prisma, erste Test-User anlegen, evtl. Magic Link Login). Sicherstellen, dass Login/Logout funktioniert und geschützte Routen vorhanden sind.

Datenbank & Prisma: Grundlegendes Prisma-Schema implementieren (User, Card, Deck, DeckCard – zumindest als Schemaentwurf). Verbindung zu einer lokalen SQLite-DB für Dev. Migrationen laufen lassen.

UI-Framework einbinden: Tailwind CSS bereits vorhanden; shadcn/ui Komponenten hinzufügen (per Installation des Libraries, z.B. Accordions, Dialog). Design-System (Farben, Theme) definieren.

Internationalisierung vorbereiten: Next.js i18n oder entsprechende Library konfigurieren. Basissprachdateien für DE/EN anlegen (für Nav-Bar, Login-Form etc.).

Testing & Linting Pipeline: ESLint und Prettier einrichten nach Team-Standard. Erste einfache Tests (z.B. Komponententest für einen Button) schreiben, CI-Pipeline auf GitHub zum Laufen bringen.
Ergebnis von Phase 1: Eine lauffähige Skeleton-App: Man kann sich registrieren/einloggen, sieht eine leere Startseite und grundlegende Navigation. Entwickler können effizient arbeiten durch eingerichtete Tools.

Phase 2: Deck-Verwaltung (Monat 3-4)
Ziel: Kernfeature Deck-Builder implementieren und Kartendaten verfügbar machen.

Kartenimport: Script oder API-Route erstellen, die von YGOPRODeck alle Karten zieht und in die DB schreibt (unter Beachtung des wöchentlichen Updates und der Local-Store-Empfehlung
ygoprodeck.com
). Einmal initial ausführen, um den Card-Pool zu füllen.

Deck-Modell & CRUD: Prisma-Models für Deck/DeckCard finalisieren. Implementierung der Serverfunktionen: Deck anlegen, löschen, umbenennen. API-Routen (REST oder Next.js actions) für diese Operationen, geschützt mit Auth.

Deck-Editor UI: Seite erstellen, wo Nutzer ein Deck bauen kann. Link in der Nav („Meine Decks“). Zunächst schlicht: Liste der eigenen Decks mit „Neues Deck“ Button. Klick auf Deck -> Editor-Seite. In Editor die zwei Spalten (Kartenliste, Deckliste) aufbauen. Kartenliste zuerst vielleicht einfach via API alle Karten laden (später optimieren), mit einfachem Suchfeld (Namensfilter). Deckliste anzeigbar, Hinzufügen/Entfernen Buttons funktionsfähig (via API-Aufrufe DeckCard zu DB hinzufügen oder entfernen).

Regelchecks & Feedback: Basis-Validierung (min. 40 Karten) implementieren: UI zeigt Warnung, API könnte beim Speichern blocken falls unter 40 (optional, vielleicht Soft-Warnung genügt).

Internationalisierung Inhalte: Decknamen lässt der User frei eintippen (keine Übersetzung nötig), aber UI-Texte in DE/EN testen („Deck erstellen“, „Karte suchen“ etc.).

Performance Feinschliff Phase 2: Index auf card.name setzen. Evtl. Server-seitige Suche implementieren (API GET /cards?name=Blue-Eyes die filtert, damit nicht 11k Karten ans Frontend gehen).

Testing: Unittests für Deck-Logik (z.B. eine Funktion, die Deckvalidität prüft) und vielleicht Cypress/Playwright Test, der Deck-Build einmal durchklickt.
Ergebnis von Phase 2: Nutzer können sich einloggen und Decks erstellen. Die komplette Kartendatenbank ist integriert, so dass man real existierende Decks bauen kann. UI ist rudimentär aber funktional – man kann Karten suchen und seinem Deck hinzufügen, die Deckliste wird gespeichert.

Phase 3: Kombo-Editor (Monat 5-6)
Ziel: Nutzer in der Lage versetzen, Kombos einzugeben und darzustellen.

Kombo-Model & CRUD: Prisma-Models für Combo und ComboStep implementieren. API-Routen für Kombos erstellen (Erstellen, Speichern, Laden, Liste der eigenen Kombos).

Kombo-Editor UI: Neue Sektion „Kombos“. Startseite zeigt Liste eigener Kombos mit „Neue Kombo“-Button. Kombo-Editor-Seite: linke Seite optional Deckwahl (Dropdown der eigenen Decks zur Zuordnung) und „Schritt hinzufügen“-Button. Umsetzung der Timeline als Column, wo Steps gerendert werden. Der Step-Editor als Modal/Dialog, in dem man Karte wählen (Autocomplete auf Karten, gefiltert nach gewähltem Deck oder alle Karten) und Aktionstyp wählen kann. Speicherung eines Steps direkt in DB oder lokal erst und bei Save in DB – hier evtl. vorerst lokal sammeln und beim Abschluss alles schicken, um viele API-Calls zu vermeiden.

Kombo Ausführen („Play Mode“): Ein „Abspielen“-Button wechselt die Ansicht in den Play-Modus. Hier kann man Step für Step durchklicken (oder Autoplay animiert). Implementation: entweder in React State die aktuelle Step-Index verfolgen und entsprechend highlighten, oder ganz neue Seite/Component, die den Ablauf illustriert. Für MVP reicht auch, die Steps nacheinander einzublenden o.ä. (Animation später).

Einfache Zustandsdarstellung: Wenn möglich, in Play Mode eine vereinfachte Feldvisualisierung: z.B. unter der Step-Liste ein Bereich „Field“ mit Text: „Monster Zone: X, Graveyard: Y“ etc. Kann auch weggelassen werden, falls es Phase 3 sprengt.

Validierung & Hinweise: Im Editor optional: Ein „Validiere Kombo“-Button, der eine Routine anstößt, die versucht, offensichtliche Widersprüche zu finden (z.B. verwendet Karte, die nicht im Deck war). Diese Routine kann trivial starten (alle verwendeten Karten sind im zugeordneten Deck vorhanden? Wenn Deck gewählt ist) und später ausgebaut werden. Hinweise als UI-Icons an Steps ausgeben.

UX-Verfeinerung: Schritte umsortieren per Drag & Drop implementieren (wenn Zeit in Phase 3, sonst Phase 4). Internationalisierung der Aktionstypen (z.B. „Normal Summon“ vs „Normalbeschwörung“ je nach Sprache).

Testen: Usability-Test mit ein paar Spielern durchführen – Feedback sammeln, ob der Editor verständlich ist. Technisch: Tests für Kombospeicherung, reihenfolgerichtige Rückgabe der Steps etc.
Ergebnis von Phase 3: Die Plattform erlaubt jetzt das Dokumentieren von Kombos. Ein Nutzer kann ein Deck erstellen (Phase 2), dann Kombos dazu eingeben und sie Schritt für Schritt visualisieren. Damit ist ein Hauptnutzen erfüllt: Deckbau und Komboplanung. Die Anwendung kann in einer Closed Beta erprobt werden.

Phase 4: Duellmodus (Monat 7-9)
Ziel: Einfache Duellsimulation (Solitärmodus) implementieren.

Duell-Engine Grundlage: Entwickeln einer internen repräsentation des Spielzustands (Klassen/Strukturen für Field, Hand, Graveyard, etc.). Implementieren der Turn-Phasen und Aktionen, zumindest soweit nötig um typische Aktionen zu erlauben. Z.B. Funktionen normalSummon(card), moveToGrave(card) etc., die den State ändern. Kein vollständiger Regelcheck, aber es soll möglich sein, Karten von Hand aufs Feld zu legen etc.

Duell UI Implementierung: Neue Seite „Duellmodus“. Erstes UI: der Nutzer wählt eines seiner Decks und klickt „Start Duel“. Das System gibt ihm 5 Handkarten (zufällig aus Deck, Deck wird gemischt). Darstellung des Feldes mit leeren Slots. Handkarten als Icons unten.

Aktionen im UI: Klick auf Handkarte -> Optionen: wenn Monster und noch normalSummon verfügbar, Option „Beschwören“, wenn Zauber, Option „Aktivieren“ etc. Diese rufen unsere Engine-Funktionen auf, die den Zustand modifizieren und dann UI re-render (z.B. Handkarte entfernen, Monsterzone Slot füllen mit Kartenname).

Phasen-Flow: Button „Nächste Phase“ implementieren, der intern Phase weiterschaltet. Am Ende der End Phase wechselt es wieder zur Draw Phase des Spielers und zieht automatisch eine Karte.

Lebenspunkte & Kampf: Implementieren eines einfachen Attacken-Mechanismus: Klick auf eigenes Monster in Battle Phase -> es markiert, dann Klick auf Gegner (Life Points oder Monster falls wir welches droppen) -> berechne Schaden (z.B. direkt 2500 abziehen vom Gegner-LP). Da Gegner nur Dummy, kann man immer direkt angreifen. LP-Anzeige updaten, Siegbedingung checken (LP <=0 -> Duell endet).

Engine Limitierung: Wir beschränken bewusst komplexe Effekte. In Phase 4 wird vmtl. kein Support für Chain-Effekte etc. sein. Aber wir legen evtl. Grundsteine: ein Stack für Ketten, wo Effekte rein könnten, aber initial ungenutzt. Wichtig ist, dass das System robust keine Abstürze verursacht, egal was der Nutzer klickt. Bei illegalen Moves (z.B. 6. Monster beschwören) entweder verhindern (grauer Button) oder handlen (ersetzen? aber besser verhindern).

Speichern/Wiederholen: In Phase 4 muss nicht zwingend ein Duell gespeichert werden, aber wir könnten einen „Replay als Kombo speichern“-Button anbieten: Das Duell-Log wird ins Combo-Format umgewandelt und in die Kombodatenbank gespeichert. So kann der Nutzer seine gespielte Sequenz gleich als Kombo übernehmen.

Testing: Viele manuelle Tests mit verschiedenen Decks (auch extremen, z.B. 60-Karten-Deck, oder Decks nur mit Zaubern etc.). Sicherstellen, dass die UI nicht einfriert und alle Aktionen wie gedacht funktionieren. Performance-Test: der State-Update pro Aktion sollte flott sein (vermutlich kein Problem).
Ergebnis von Phase 4: DuelPath hat nun einen rudimentären Solo-Duellmodus. Spieler können ihre Decks nicht nur trocken analysieren, sondern tatsächliche Duellzüge nachstellen. Das Tool ist damit ein eigenständiges Testfeld für Deckideen geworden.

Phase 5: Feinschliff und Performance, Launch-Vorbereitung (Monat 10)
Ziel: Vor dem öffentlichen Launch alle wichtigen Verbesserungen einpflegen, Bugs fixen und das System stabil skalierbar machen.

UI/UX Polish: Basierend auf Beta-Feedback UI optimieren: z.B. bessere Highlights, Hilfe-Tutorial implementieren, Ladeindikatoren wo nötig (z.B. bei API-Calls), evtl. Soundeffekte für Duellaktionen (optional, low-priority aber nice).

Internationalisierung fertigstellen: Alle noch hartcodierten Texte ins Übersetzungssystem überführen, finale Übersetzungsdurchläufe (ggf. professionelle Übersetzer für Englische Texte gegenchecken).

Sicherheit Audit: Penetrationstest light – versuch SQL-Injection (sollte nicht gehen), XSS (gesondert prüfen: Kombo-Beschreibung als Script injection?), CSRF (NextAuth schützt API, aber wir aktivieren SameSite Cookies etc.). Falls Lücken gefunden, fixen.

Performance Tuning: Setup Monitoring (z.B. Vercel Analytics, Sentry Performance) in Produktion. Konfigurieren von DB Connection Pooling (falls nötig Prisma Data Proxy einbinden). Lasttest durchführen. Karten-Suchfunktion ggf. anpassen, falls zu langsam (z.B. Implementierung ElasticSearch o.ä. vertagt bis es wirklich benötigt wird).

SEO & Marketing Ready: Falls öffentliche Inhalte existieren, sorgen wir dafür, dass z.B. geteilte Decks/Combos SEO-freundliche Seiten haben (mit Meta Tags, OpenGraph für Social Media Previews). Auch erstellen wir eine kleine Landing Page, die das Projekt erklärt (Screenshots, Features) – kann Startseite sein, wenn nicht eingeloggt.

Launch Deployment: Auf Vercel produktiv stellen mit eigener Domain (duelpath.com o.ä.). Testnutzer migrieren (falls Beta auf separater DB war, Daten übertragen oder Beta-Reset kommunizieren).

Ergebnis von Phase 5: Die Anwendung ist launchbereit – stabil, getestet, polished. Wir können offiziell live gehen und Nutzer einladen.

Phase 6+: Post-Launch Erweiterungen
Nach dem MVP-Launch stehen die in Abschnitt 8 beschriebenen Erweiterungen an. Je nach Nutzerfeedback priorisieren wir:

Wahrscheinlich als erstes Community-Funktionen (öffentliche Bibliotheken, Teilen von Inhalten), um Benutzerwachstum zu fördern.

Dann Statistik-Features für die Power-User.

KI-Funktionen implementieren wir iterativ und sorgfältig, da sie komplex und kostenintensiv sind – evtl. in Partnerschaft mit einem AI-Dienst oder als Premium-Addon.

Ebenfalls denkbar nach Launch: Zwei-Spieler-Modus online (das aber erst, wenn genug Nachfrage und Regelwerk robust).

Die Roadmap bleibt agil – wir werden Nutzer-Feedback sammeln und ggf. neue Phasen definieren. Wichtig ist, dass Phase 1–5 die Kernziele abdecken und eine solide, skalierbare Grundlage schaffen. Darauf kann DuelPath organisch wachsen zu der visionären All-in-One-Plattform für Yu-Gi-Oh!-Enthusiasten.