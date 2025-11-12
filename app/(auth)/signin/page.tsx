"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n/hooks";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/components/ui/button";
import { Input } from "@/components/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/components/ui/card";
import Link from "next/link";

/**
 * Login-Formular mit E-Mail/Passwort
 */
export default function SignInPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      setError("E-Mail und Passwort sind erforderlich");
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t("auth.errors.invalidCredentials"));
        setIsLoading(false);
      } else {
        router.push("/decks");
        router.refresh();
      }
    } catch (error) {
      console.error("Sign in error:", error);
      setError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("auth.signIn")}</CardTitle>
        <CardDescription>
          Melde dich an, um auf deine Decks und Kombos zuzugreifen
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm border border-destructive/20">
              {error}
            </div>
          )}

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
              placeholder="••••••••"
              aria-invalid={error ? "true" : "false"}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t("common.loading") : t("auth.signIn")}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          {t("auth.noAccount")}{" "}
          <Link href="/auth/signup" className="text-primary hover:underline">
            {t("auth.signUp")}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

