// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { NextRequest } from 'next/server';

const auth = vi.hoisted(() => vi.fn());
const userForToken = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/auth', () => ({ auth }));
vi.mock('@/server/api/tokens', () => ({ userForToken }));

import { ApiError, body, ok, route } from '@/server/api/http';

const call = (handler: Parameters<typeof route>[0], headers: Record<string, string> = {}) =>
  route(handler)(new NextRequest('http://localhost/api/v1/x', { headers }), {
    params: Promise.resolve({}),
  });

describe('REST-API: Hülle', () => {
  beforeEach(() => {
    auth.mockResolvedValue(null);
    userForToken.mockResolvedValue(null);
  });

  it('lehnt Anfragen ohne gültiges Token ab', async () => {
    const res = await call(async () => ok(1), { authorization: 'Bearer dp_falsch' });
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe('UNAUTHORIZED');
  });

  it('gibt den Nutzer des Tokens an den Handler', async () => {
    userForToken.mockResolvedValue('user-7');
    const res = await call(async ({ userId }) => ok({ userId }), {
      authorization: 'Bearer dp_gut',
    });
    expect(await res.json()).toEqual({ data: { userId: 'user-7' } });
  });

  it('nimmt ohne Token die Browser-Session', async () => {
    auth.mockResolvedValue({ user: { id: 'user-8' } });
    const res = await call(async ({ userId }) => ok({ userId }));
    expect(await res.json()).toEqual({ data: { userId: 'user-8' } });
  });

  it('übersetzt Fehler in Status und einheitliche Form', async () => {
    auth.mockResolvedValue({ user: { id: 'user-9' } });
    const conflict = await call(async () => {
      throw new ApiError('CONFLICT', 'geändert', { revision: 4 });
    });
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toEqual({
      error: { code: 'CONFLICT', message: 'geändert', details: { revision: 4 } },
    });
    const invalid = await call(async () => ok(z.object({ a: z.string() }).parse({})));
    expect(invalid.status).toBe(400);
    const crash = await call(async () => {
      throw new Error('kaputt');
    });
    expect(crash.status).toBe(500);
  });
});

describe('bounded JSON bodies', () => {
  it('accepts small JSON and rejects oversized streamed bodies without content-length', async () => {
    const small = new NextRequest('http://localhost/import', { method: 'POST', body: '{"a":1}' });
    expect(await body(small, 20)).toEqual({ a: 1 });
    const large = new NextRequest('http://localhost/import', {
      method: 'POST',
      body: JSON.stringify({ data: 'x'.repeat(50) }),
    });
    await expect(body(large, 20)).rejects.toMatchObject({ code: 'INVALID' });
  });
});
