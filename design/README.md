# Design

`DuelPath.pen` ist das Design-Dokument für pen.dev (Komponenten, Screens, Tokens nach `UI-Plan.md`). Öffnen mit der pen.dev-App.

Die Kartenbilder unter `assets/` sind urheberrechtlich geschützt und werden nicht versioniert (`.gitignore`). So werden sie lokal geholt:

```bash
cd design && mkdir -p assets && cd assets
for id in 62962630 44362883 87746184 68468459 14558127 10045474 27204311 97268402 94145021 73642296 24508238 24224830 44146295 70534340 36637374 36577931 82738008 42141493; do
  curl -s -o "${id}_small.jpg" "https://images.ygoprodeck.com/images/cards_small/$id.jpg"
done
curl -s -o 62962630.jpg https://images.ygoprodeck.com/images/cards/62962630.jpg
curl -s -o back.jpg https://images.ygoprodeck.com/images/cards/back_high.jpg
```
