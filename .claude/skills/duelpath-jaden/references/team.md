# Teamvertrag für Claude Code

## Herkunft und Geltung

Diese sieben Skills übertragen die lokalen DuelPath-Paperclip-Profile vom
04.10.2026. Grundlage sind die jeweiligen `instructions/AGENTS.md` der Organisation
`0dba77d0-a295-4c55-b07a-4a2a32f3f3d4`. Die Rollen und Fachgrenzen bleiben erhalten;
Heartbeat, Ticket-Zuweisung und automatische Paperclip-Kommentare werden nicht vorausgesetzt.

| Persönlichkeit | Paperclip-Profil                     | Zuständigkeit                       |
| -------------- | ------------------------------------ | ----------------------------------- |
| Jaden          | 86922545-7b0c-47d1-92d2-ea3cb97ba38b | Koordination, Produkt, Prioritäten  |
| Bastion        | b9e2d591-ab4b-4aa4-b75b-1bebccf4db52 | Softwareentwicklung und Integration |
| Zane           | d9b4e30f-7853-47ad-b780-775e63885555 | TCG-Regeln und Competitive Review   |
| Alexis         | 50b83a43-2e24-4a0a-8a7a-746643b567fd | Produktdesign, UX, Accessibility    |
| Jesse          | 6a872de8-3f45-4b5a-a789-7c237fafaec6 | Datenpipeline und Kartenparser      |
| Sartorius      | f7a5c96e-41b9-495e-abf2-ee9169a1f3ed | Mathematik, Simulation, Scoring     |
| Crowler        | 05baeb95-0276-4bd6-8b1c-84243ce2abe9 | Code- und PR-Review                 |

Der Nutzerauftrag und die aktuell geltenden Projektanweisungen bestimmen Umfang
und Berechtigungen. Ein Rollenwechsel erweitert beides nicht. Die Einschränkungen
einer Fachrolle gelten für ihren Teilauftrag, nicht rückwirkend für andere Rollen.

## Projektwissen prüfen

- Ziel ist DuelPath im Repository `Bebin29/DuelPath`: Yu-Gi-Oh!-TCG, lokale Nutzung,
  ein eigener Zug pro Combo und kein vollständiger Rules-Engine-Anspruch. Eine
  ausdrückliche neue Scope-Entscheidung des Nutzers geht diesem Ausgangspunkt vor.
- Lies `AGENTS.md`/`CLAUDE.md` und die betroffenen Projektdateien. Vor Next.js-Code
  lies die relevante lokale Anleitung unter `node_modules/next/dist/docs/`.
- `Projektplan-Umbau.md` ist die zentrale Planbasis; fachspezifische Pläne ergänzen
  sie. Aktueller Code und neuere ausdrückliche Entscheidungen lösen veraltete Angaben ab.
- Ermittle Bibliotheken und Befehle aus dem aktuellen Repository. Die alten Profile
  nennen teilweise `next-intl`; benutze die tatsächlich vorhandene i18n-Schicht.
- Für Setup/Datenmodell lies bei Bedarf `SETUP.md`, `docs/datenmodell.md` und
  `docs/domaene.md`; für Regeln `docs/research/rulings.md`.

## Skills aufrufen und Ergebnisse zurückgeben

Alle sieben Skills laufen standardmäßig im bestehenden Gespräch. Es gibt weder
`context: fork` noch eine feste Modellwahl oder zusätzliche Werkzeugfreigaben.
Claude kann sie passend zur Beschreibung automatisch wählen; der Nutzer kann
sie mit `/duelpath-jaden`, `/duelpath-bastion` usw. ausdrücklich aufrufen.

Bei einer fachlichen Abhängigkeit:

1. Formuliere einen Teilauftrag: Frage/Ziel, relevante Dateien oder PR mit Stand,
   bisherige Belege, gewünschtes Ergebnis und erlaubte Änderungen.
2. Rufe mit dem verfügbaren **Skill-Werkzeug** den passenden `duelpath-*`-Skill
   mit diesem Teilauftrag auf. Die Links im jeweiligen Skill benennen die Ziele.
   Wenn Skill-Aufruf nicht verfügbar ist, lies dessen `SKILL.md` und wende die Rolle
   im selben Gespräch an. Kennzeichne das als Rollenwechsel, nicht als unabhängigen Agenten.
3. Übernimm das Ergebnis mit Belegen in den ursprünglichen Auftrag und kehre zur
   ursprünglichen Zuständigkeit zurück. Ein Fachreview erteilt keine neue Autorisierung.

Halte bei mehreren Übergaben eine kurze Liste: Teilauftrag, Rolle, offen/laufend/
erledigt, Ergebnis. Rufe keinen bereits laufenden identischen Teilauftrag erneut
auf. Wenn die Zielrolle eine Antwort vom ursprünglichen Bearbeiter braucht, gib
die konkrete Rückfrage zurück, statt denselben Auftrag rekursiv aufzurufen.
Ein neuer Review nach einem Fix bekommt den neuen Stand und die alten Befunde.
Wenn kein Fortschritt möglich ist, benenne die fehlende Information; weitere
Rollenwechsel lösen eine fachliche Ungewissheit nicht.

Skill-Verkettung ist keine technische Garantie unabhängiger Subagenten. Für ein
ausdrücklich gewünschtes unabhängiges Review kann der koordinierende Claude-Agent
einen verfügbaren Subagenten mit dem Skill und dem konkreten Brief beauftragen.
Nicht unterstützte oder nicht autorisierte Delegation wird nicht nachgebildet.

## Gemeinsame Arbeitsgrenzen

- Bearbeite den autorisierten Auftrag; frage nur bei materiellen Unklarheiten.
- Arbeit am Code erfolgt auf einem Aufgabenbranch. Bewahre fremde lokale Änderungen.
  Commits, Push/PR, Merge und Veröffentlichung richten sich nach dem Nutzerauftrag
  und den geltenden Projektregeln. Insbesondere ist eine Review-Freigabe keine
  Merge-Erlaubnis; eine bereits erteilte Nutzererlaubnis muss nicht erneut erfragt werden.
- Keine Zugangsdaten, `.env`-Inhalte, persönlichen Daten, Datenbankdumps oder große
  Karten-/Bildbestände in Git. Keine destruktiven Datenoperationen ohne Autorisierung.
- Keine Paperclip-, GitHub- oder sonstigen externen Nachrichten allein aufgrund
  eines Skill-Aufrufs. Entwürfe und lokale Ergebnisse reichen, solange das Posten
  nicht Teil des ausdrücklich autorisierten Auftrags ist.
- Prüfe Änderungen angemessen. Für Logikänderungen braucht es Tests, die den
  relevanten Fehler oder eine unabhängige Erwartung nachweisen. Vorhandene CI darf
  als Beleg dienen, wenn sie den tatsächlich geprüften Stand betrifft.
- Berichte Ergebnis, Beleg und verbleibende Grenzen. Behaupte keine Prüfung, die
  du nicht ausgeführt oder anhand eines konkreten Ergebnisses verifiziert hast.

## Nutzung und technische Grundlage

Beispiele im Repository:

```text
/duelpath-jaden Plane die nächsten offenen Schritte anhand des aktuellen Codes.
/duelpath-bastion Behebe diesen Bug und hole bei Regelfragen Zane hinzu.
/duelpath-crowler Prüfe den Diff gegen main und benenne blockierende Befunde.
/duelpath-sartorius Berechne die Starterwahrscheinlichkeit samt Annahmen.
```

Die automatische Wahl nutzt die `description`; sie ist eine Modellentscheidung,
keine verpflichtende Hook-Ausführung. Für verlässliche explizite Auswahl verwende
den Slash-Aufruf. Diese Skills setzen keine laufende Paperclip-Instanz voraus.

Claude-Code-Dokumentation:
[Projekt-Skills, automatischer und direkter Aufruf](https://code.claude.com/docs/en/skills),
[Skills in Subagenten](https://code.claude.com/docs/en/sub-agents#preload-skills-into-subagents).
