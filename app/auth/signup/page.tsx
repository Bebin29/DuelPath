"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n/hooks";
import { signUpAction } from "@/server/actions/auth";
import { Button } from "@/components/components/ui/button";
import { Input } from "@/components/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Registrierungsformular
 */
export default function SignUpPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);

    const result = await signUpAction(formData);

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    } else if (result?.success) {
      // Weiterleitung zur Anmeldeseite nach erfolgreicher Registrierung
      router.push("/auth/signin?registered=true");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("auth.signUp")}</CardTitle>
        <CardDescription>
          Erstelle ein Konto, um deine Decks und Kombos zu verwalten
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm border border-destructive/20">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              {t("auth.name")}
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Dein Name"
              aria-invalid={error ? "true" : "false"}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              {t("auth.email")}
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="deine@email.de"
              aria-invalid={error ? "true" : "false"}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              {t("auth.password")}
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Mindestens 8 Zeichen"
              minLength={8}
              aria-invalid={error ? "true" : "false"}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Passwort bestätigen
            </label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              placeholder="Passwort wiederholen"
              aria-invalid={error ? "true" : "false"}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t("common.loading") : t("auth.signUp")}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          {t("auth.hasAccount")}{" "}
          <Link href="/auth/signin" className="text-primary hover:underline">
            {t("auth.signIn")}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

