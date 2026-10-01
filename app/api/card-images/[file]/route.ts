import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

/**
 * GET /api/card-images/<passcode>.jpg bzw. <passcode>_small.jpg
 *
 * YGOPRODeck erlaubt kein Hotlinking. Bilder werden beim ersten Abruf heruntergeladen und lokal
 * zwischengespeichert, standardmäßig außerhalb des Repos (der Ordner liegt sonst in OneDrive).
 */
const CACHE_DIR = process.env.CARD_IMAGE_DIR || path.join(homedir(), '.duelpath', 'card-images');

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  // Nur Passcodes zulassen: verhindert Path Traversal im Cache-Ordner
  const match = /^(\d{1,10})(_small)?\.jpg$/.exec(file);
  if (!match) return new Response(null, { status: 404 });

  const cachePath = path.join(CACHE_DIR, file);
  let image = await readFile(cachePath).catch(() => null);

  if (!image) {
    const folder = match[2] ? 'cards_small' : 'cards';
    const res = await fetch(`https://images.ygoprodeck.com/images/${folder}/${match[1]}.jpg`);
    if (!res.ok) return new Response(null, { status: 404 });
    image = Buffer.from(await res.arrayBuffer());
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(cachePath, image);
  }

  return new Response(new Uint8Array(image), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
