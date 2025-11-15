import { NextRequest, NextResponse } from "next/server";
import { getCombo, updateCombo, deleteCombo } from "@/server/actions/combo.actions";
import type { UpdateComboInput } from "@/lib/validations/combo.schema";
import { deduplicateRequest, createRequestKey } from "@/lib/utils/request-dedup";

/**
 * GET /api/combos/[id]
 * 
 * Lädt eine einzelne Kombo mit allen Steps
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Request-Deduplizierung
    const requestKey = createRequestKey("GET", request.url);
    const result = await deduplicateRequest(requestKey, () => getCombo(id));

    if ("error" in result) {
      if (result.error === "Unauthorized") {
        return NextResponse.json(
          { error: result.error },
          { status: 401 }
        );
      }
      if (result.error === "Forbidden") {
        return NextResponse.json(
          { error: result.error },
          { status: 403 }
        );
      }
      if (result.error === "Combo not found") {
        return NextResponse.json(
          { error: result.error },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    const response = NextResponse.json(result);
    
    // Cache-Headers für GET-Requests
    response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
    
    return response;
  } catch (error) {
    console.error("Get combo error:", error);
    
    return NextResponse.json(
      {
        error: "Failed to get combo",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/combos/[id]
 * 
 * Aktualisiert eine Kombo
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as UpdateComboInput;

    const result = await updateCombo(id, body);

    if ("error" in result) {
      if (result.error === "Unauthorized") {
        return NextResponse.json(
          { error: result.error },
          { status: 401 }
        );
      }
      if (result.error === "Forbidden") {
        return NextResponse.json(
          { error: result.error },
          { status: 403 }
        );
      }
      if (result.error === "Combo not found") {
        return NextResponse.json(
          { error: result.error },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Update combo error:", error);
    
    return NextResponse.json(
      {
        error: "Failed to update combo",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/combos/[id]
 * 
 * Löscht eine Kombo
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await deleteCombo(id);

    if ("error" in result) {
      if (result.error === "Unauthorized") {
        return NextResponse.json(
          { error: result.error },
          { status: 401 }
        );
      }
      if (result.error === "Forbidden") {
        return NextResponse.json(
          { error: result.error },
          { status: 403 }
        );
      }
      if (result.error === "Combo not found") {
        return NextResponse.json(
          { error: result.error },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Delete combo error:", error);
    
    return NextResponse.json(
      {
        error: "Failed to delete combo",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

