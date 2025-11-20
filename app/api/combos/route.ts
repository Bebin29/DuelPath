import { NextRequest, NextResponse } from 'next/server';
import { getCombosByUser } from '@/server/actions/combo.actions';
import { createCombo } from '@/server/actions/combo.actions';
import { createComboSchema, type CreateComboInput } from '@/lib/validations/combo.schema';
import { deduplicateRequest, createRequestKey } from '@/lib/utils/request-dedup';

/**
 * GET /api/combos
 *
 * Lädt alle Kombos des aktuellen Users
 *
 * Query-Parameter:
 * - deckId: Optional - Filter nach Deck-ID
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const deckId = searchParams.get('deckId') || undefined;
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!, 10) : undefined;
    if (skip !== undefined && isNaN(skip)) {
      return NextResponse.json({ error: 'Invalid skip parameter' }, { status: 400 });
    }
    const take = searchParams.get('take') ? parseInt(searchParams.get('take')!, 10) : undefined;
    if (take !== undefined && isNaN(take)) {
      return NextResponse.json({ error: 'Invalid take parameter' }, { status: 400 });
    }

    // Request-Deduplizierung
    const requestKey = createRequestKey('GET', request.url);
      const result = await deduplicateRequest(requestKey, () =>
      getCombosByUser(deckId, { skip, take })
    );

    if ('error' in result) {
      if (result.error === 'Unauthorized') {
        return NextResponse.json({ error: result.error }, { status: 401 });
      }
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const response = NextResponse.json(result);

    // Cache-Headers für GET-Requests
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');

    return response;
  } catch (error) {
    console.error('Get combos error:', error);

    return NextResponse.json(
      {
        error: 'Failed to get combos',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/combos
 *
 * Erstellt eine neue Kombo
 */
export async function POST(request: NextRequest) {
  try {
    let body: CreateComboInput;
    try {
      const rawBody = await request.json();
      body = createComboSchema.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const result = await createCombo(body);

    if ('error' in result) {
      if (result.error === 'Unauthorized') {
        return NextResponse.json({ error: result.error }, { status: 401 });
      }
      if (result.error === 'Forbidden') {
        return NextResponse.json({ error: result.error }, { status: 403 });
      }
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Create combo error:', error);

    return NextResponse.json(
      {
        error: 'Failed to create combo',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
