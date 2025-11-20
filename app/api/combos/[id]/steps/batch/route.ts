import { NextRequest, NextResponse } from 'next/server';
import { batchComboStepOperations } from '@/server/actions/combo.actions';
import { batchComboStepOperationsSchema } from '@/lib/validations/combo.schema';

/**
 * POST /api/combos/[id]/steps/batch
 *
 * Führt Batch-Operationen auf Combo-Steps aus
 *
 * Body:
 * {
 *   operations: [
 *     { type: "delete", stepId: "..." },
 *     { type: "update", stepId: "...", data: {...} }
 *   ]
 * }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: comboId } = await params;
    const body = await request.json();

    // Validiere Input
    const validatedData = batchComboStepOperationsSchema.parse(body);

    const result = await batchComboStepOperations(comboId, validatedData);

    if ('error' in result) {
      if (result.error === 'Unauthorized') {
        return NextResponse.json({ error: result.error }, { status: 401 });
      }
      if (result.error === 'Forbidden') {
        return NextResponse.json({ error: result.error }, { status: 403 });
      }
      if (result.error === 'Combo not found') {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Batch combo step operations error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to execute batch operations',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
