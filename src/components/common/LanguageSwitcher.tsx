"use client";

import { useLanguage } from "@/lib/i18n/hooks";
import { Button } from "@/components/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Sprachumschalter DE/EN
 * 
 * Persistente Locale über localStorage
 */
export function LanguageSwitcher() {
  const { currentLanguage, changeLanguage } = useLanguage();

  return (
    <div className="flex gap-2">
      <Button
        variant={currentLanguage === "de" ? "default" : "outline"}
        size="sm"
        onClick={() => changeLanguage("de")}
        aria-label="Deutsch"
        className={cn(
          currentLanguage === "de" && "bg-accent text-accent-foreground"
        )}
      >
        DE
      </Button>
      <Button
        variant={currentLanguage === "en" ? "default" : "outline"}
        size="sm"
        onClick={() => changeLanguage("en")}
        aria-label="English"
        className={cn(
          currentLanguage === "en" && "bg-accent text-accent-foreground"
        )}
      >
        EN
      </Button>
    </div>
  );
}




