"use client";

import { useEffect, createContext, useContext, type ReactNode } from "react";
import { useOffline } from "@/lib/hooks/use-offline";
import { registerServiceWorker } from "@/lib/utils/service-worker";
import { Badge } from "@/components/components/ui/badge";
import { Button } from "@/components/components/ui/button";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useTranslation } from "@/lib/i18n/hooks";

interface OfflineContextValue {
  isOnline: boolean;
  isOffline: boolean;
  syncPending: boolean;
  syncQueueLength: number;
  syncNow: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

/**
 * Hook um Offline-Kontext zu verwenden
 */
export function useOfflineContext(): OfflineContextValue {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOfflineContext must be used within OfflineProvider");
  }
  return context;
}

interface OfflineProviderProps {
  children: ReactNode;
}

/**
 * Provider für Offline-Funktionalität
 * 
 * Registriert Service Worker und stellt Offline-Status bereit
 */
export function OfflineProvider({ children }: OfflineProviderProps) {
  const { t } = useTranslation();
  const { isOnline, isOffline, syncPending, syncQueueLength, syncNow } = useOffline();

  useEffect(() => {
    // Registriere Service Worker beim Mount
    registerServiceWorker().catch((error) => {
      console.error("Failed to register service worker:", error);
    });
  }, []);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isOffline,
        syncPending,
        syncQueueLength,
        syncNow,
      }}
    >
      {children}
      {/* Offline-Indikator */}
      {isOffline && (
        <div className="fixed bottom-4 right-4 z-50">
          <Badge variant="destructive" className="flex items-center gap-2 px-3 py-2">
            <WifiOff className="h-4 w-4" />
            <span>{t("offline.status")}</span>
          </Badge>
        </div>
      )}
      {/* Sync-Pending-Indikator */}
      {isOnline && syncQueueLength > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <Badge variant="secondary" className="flex items-center gap-2 px-3 py-2">
            <Wifi className="h-4 w-4" />
            <span>
              {syncPending
                ? t("offline.syncing")
                : t("offline.pending", { count: syncQueueLength })}
            </span>
            {!syncPending && (
              <Button
                size="sm"
                variant="ghost"
                onClick={syncNow}
                className="h-6 px-2 ml-2"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </Badge>
        </div>
      )}
    </OfflineContext.Provider>
  );
}

