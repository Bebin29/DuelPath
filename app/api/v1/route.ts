import { NextResponse } from 'next/server';

/** GET /api/v1: Einstieg mit Verweis auf die Beschreibung */
export const GET = () =>
  NextResponse.json({
    data: {
      name: 'DuelPath API',
      version: 1,
      openapi: '/api/v1/openapi.json',
      auth: 'Authorization: Bearer dp_... (Settings > API tokens)',
      start: ['GET /api/v1/decks', 'POST /api/v1/combos', 'POST /api/v1/combos/{id}/steps'],
    },
  });
