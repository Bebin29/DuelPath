import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { CardImportService } from "@/server/services/card-import.service";

/**
 * POST /api/cards/import
 * 
 * Importiert alle Karten von der YGOPRODeck API
 * 
 * Erfordert Authentifizierung (Admin-Berechtigung könnte später hinzugefügt werden)
 */
export async function POST(request: NextRequest) {
  try {
    // Prüfe Authentifizierung
    const session = await auth();
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Starte Import
    const importService = new CardImportService();
    
    // Für API-Route verwenden wir Batch-Import, um Timeouts zu vermeiden
    const stats = await importService.importCardsInBatches(100);

    return NextResponse.json({
      success: true,
      stats,
      message: `Import abgeschlossen: ${stats.created} erstellt, ${stats.updated} aktualisiert, ${stats.errors} Fehler`,
    });
  } catch (error) {
    console.error("Card import error:", error);
    
    return NextResponse.json(
      {
        error: "Import failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

