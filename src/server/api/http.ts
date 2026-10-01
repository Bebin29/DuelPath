import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { auth } from '@/lib/auth/auth';
import { userForToken } from './tokens';

/**
 * Gemeinsame Hülle der REST-API (/api/v1): Anmeldung per Bearer-Token oder Browser-Session,
 * Rate-Limit, einheitliche Antworten `{ data }` und Fehler `{ error: { code, message, details } }`.
 */
export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'INVALID'
  | 'CONFLICT'
  | 'NOT_POSSIBLE'
  | 'RATE_LIMITED'
  | 'INTERNAL';

const STATUS: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INVALID: 400,
  CONFLICT: 409,
  NOT_POSSIBLE: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export const ok = (data: unknown, status = 200) => NextResponse.json({ data }, { status });

const fail = (code: ApiErrorCode, message: string, details?: unknown) =>
  NextResponse.json(
    { error: { code, message, ...(details !== undefined && { details }) } },
    { status: STATUS[code] }
  );

// Einfaches Rate-Limit pro Nutzer im Speicher: genug für lokale Agenten, kein Ersatz für ein Gateway
const WINDOW_MS = 60_000;
const LIMIT = 300;
const hits = new Map<string, { start: number; count: number }>();
function rateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = hits.get(userId);
  if (!entry || now - entry.start > WINDOW_MS) {
    hits.set(userId, { start: now, count: 1 });
    return false;
  }
  entry.count++;
  return entry.count > LIMIT;
}

async function authenticate(request: NextRequest): Promise<string | null> {
  const header = request.headers.get('authorization');
  if (header?.startsWith('Bearer ')) return userForToken(header.slice(7).trim());
  const session = await auth();
  return session?.user?.id ?? null;
}

type Params = Record<string, string>;
type Handler<P extends Params> = (args: {
  request: NextRequest;
  userId: string;
  params: P;
}) => Promise<Response>;

/** Route Handler mit Anmeldung, Rate-Limit und Fehlerbehandlung */
export function route<P extends Params = Params>(handler: Handler<P>) {
  return async (request: NextRequest, context: { params: Promise<P> }) => {
    try {
      const userId = await authenticate(request);
      if (!userId)
        return fail(
          'UNAUTHORIZED',
          'Bearer-Token fehlt oder ist ungültig (Einstellungen › API-Tokens)'
        );
      if (rateLimited(userId)) return fail('RATE_LIMITED', 'Zu viele Anfragen, kurz warten');
      return await handler({ request, userId, params: await context.params });
    } catch (error) {
      if (error instanceof ApiError) return fail(error.code, error.message, error.details);
      if (error instanceof ZodError)
        return fail('INVALID', error.issues[0]?.message ?? 'Ungültige Daten', error.issues);
      console.error('API-Fehler', error);
      return fail('INTERNAL', 'Interner Fehler');
    }
  };
}

/** JSON-Body lesen; ein leerer Body ist ein leeres Objekt */
export async function body(request: NextRequest): Promise<unknown> {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError('INVALID', 'Body ist kein gültiges JSON');
  }
}
