import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma/client';

/**
 * Vorgemerktes Löschen beim Schließen des Tabs (navigator.sendBeacon). Die Seite hält das Löschen
 * einige Sekunden für „Rückgängig“ zurück; ohne diesen Weg bliebe die Combo sonst erhalten.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { kind?: string; id?: string } | null;
  if (!body?.id || typeof body.id !== 'string') return NextResponse.json({}, { status: 400 });
  if (body.kind === 'combo') {
    await prisma.combo.deleteMany({ where: { id: body.id, userId } });
  } else if (body.kind === 'deck') {
    await prisma.deck.deleteMany({ where: { id: body.id, userId } });
  } else {
    return NextResponse.json({}, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
