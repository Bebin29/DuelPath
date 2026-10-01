import { NextResponse } from 'next/server';
import { OPENAPI } from '@/server/api/openapi';

/** GET /api/v1/openapi.json: öffentlich, damit Agenten die API ohne Token entdecken */
export const GET = () => NextResponse.json(OPENAPI);
