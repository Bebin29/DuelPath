Farbspezifikation DuelPath
Einleitung

Das Farbschema des Projekts DuelPath setzt auf einen natürlichen, harmonischen Look: Ein tiefes Dunkelgrün als Primärfarbe wird durch warme Beige- und Brauntöne ergänzt, was insgesamt eine ruhige, erdige Ästhetik erzeugt
stylique.de
piktochart.com
. Diese Palette orientiert sich an Naturfarben, um eine ausgewogene und anspruchsvolle Wirkung zu erzielen
piktochart.com
. Das dunkle Grün vermittelt Stabilität und Ruhe
piktochart.com
, während die helleren neutralen Töne die Tiefe des Grüns unterstreichen und ein freundliches, zurückhaltendes Ambiente schaffen
stylique.de
. Dadurch entsteht ein konsistentes Design, das sowohl für Branding-Elemente als auch für die Benutzeroberfläche stimmig eingesetzt werden kann.

Abbildung: Visualisierung der DuelPath-Farbpalette. Die dunkle Primärfarbe (#194038) erscheint links, gefolgt von der gold-beigen Sekundärfarbe (#D9B473) und dem dunklen Braunton (#734F43) als zusätzlichem Akzent. Rechts daneben stehen der helle Beigeton (#EDD8A2) für Hintergründe sowie der neutrale Grauton (#8F9189). Diese Anordnung verdeutlicht das Zusammenspiel der Farben und ihre hierarchische Gewichtung im Design.

Farbpalette

Die folgende Tabelle listet die definierten Farben von DuelPath mit ihrer Rolle, dem Hex-Code und einem kurzen Verwendungszweck auf:

Farbrolle Hexcode Beschreibung / Verwendung
Primärfarbe (Primary) #194038 Sehr dunkles Grün (ein dunkles Zyan
colorhexa.com
). Dient als Hauptfarbe für Branding und primäre UI-Elemente. Vermittelt einen stabilen, natürlichen Eindruck
piktochart.com
. Eignet sich für wichtige Aktionen (z. B. Haupt-Buttons); helle Schrift oder Icons (weiß) darauf gewährleisten hervorragenden Kontrast und Lesbarkeit
daily.dev
.
Sekundärfarbe (Secondary) #D9B473 Warmer Beige-/Goldton. Zweite Markenfarbe zur Unterstützung der Primärfarbe. Wird für Hervorhebungen, Icons oder sekundäre Elemente verwendet, um Akzente zu setzen. Kann z. B. für Hover-Effekte oder sekundäre Buttons genutzt werden – dunkle Schrift (Schwarz) ist auf diesem hellen Ton sehr gut lesbar (hoher Kontrast).
Akzentfarbe (Accent) #734F43 Dunkles Braun. Zusätzliche Akzentfarbe für besondere Highlights oder alternative Hintergründe. Kann sparsam für Überschriften, Hervorhebungen oder abgesetzte Sektionen eingesetzt werden, um dem Design mehr Tiefe zu geben. Weiße Schrift hat auf diesem dunklen Braun einen hohen Kontrast (ca. 7:1 oder besser, erfüllt somit WCAG-AAA für normalen Text).
Hintergrund (Background) #EDD8A2 Helles Beige. Eignet sich als Hintergrundfarbe für Flächen, Seitenbereiche oder Cards. Wirkt freundlich und zurückhaltend, lässt das Dunkelgrün hervorstechen. Schwarze Schrift hat auf diesem hellen Beige einen ausgezeichneten Kontrast (≈15:1, AAA-konform)
colorcombos.com
, wohingegen weiße Schrift darauf nicht zu empfehlen ist (Kontrast zu niedrig
colorcombos.com
).
Neutral (Neutral Gray) #8F9189 Neutrales Grau mit leicht grünlichem Unterton. Wird für sekundäre UI-Elemente und dezente Details genutzt – etwa für Ränder, Divider, Platzhaltertext oder Hintergrund von deaktivierten Elementen. Als Hintergrundfarbe sollte es bevorzugt mit dunkler Schrift kombiniert werden, da weiße Schrift auf mittlerem Grau nur in großer Schriftgröße ausreichend kontrastiert
chromium.googlesource.com
. Dieses Grau bietet einen unaufdringlichen Gegenpol zu den Buntfarben und unterstützt ein ausgewogenes Gesamtbild.
Hinweise zur Zugänglichkeit und Nutzung

Barrierefreiheit: Bei der Verwendung der Farben ist auf ausreichenden Kontrast zu achten. Insbesondere sollte dunkle Schrift auf hellen Hintergründen und helle Schrift auf dunklen Hintergründen eingesetzt werden
daily.dev
. Alle wichtigen Textelemente sollten die WCAG-Richtwerte (mind. 4.5:1 Kontrast für Fließtext) erfüllen, damit die Inhalte für alle Nutzer gut lesbar sind. Durch die gewählte Palette (dunkles Grün vs. helle Beige-Töne) werden bereits natürliche Kontrastpaare gebildet, dennoch empfiehlt sich ein Test mit Kontrast-Checker-Tools für konkrete Kombinationen.

Tailwind CSS: Um diese Farben im Projekt konsistent zu nutzen, können sie in der Tailwind-Konfiguration hinterlegt werden. In der tailwind.config.js lassen sich unter theme.extend.colors eigene Farbnamen definieren (z. B. "primary": "#194038", "secondary": "#D9B473", etc.), damit sie direkt per Utility-Klassen referenziert werden können
stackoverflow.com
. Beispielsweise könnte man dann Klassen wie bg-primary, text-primary oder bg-background verwenden, anstatt hex-Werte manuell einzutragen. (Alternativ sind natürlich auch direkte Hex-Angaben möglich, z. B. bg-[#194038], jedoch erleichtert die Verwendung benannter Farben die Wartung und Konsistenz im Design.)
