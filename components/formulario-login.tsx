"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inicioDeRol, rutaInterna } from "@/lib/rutas";
import { createClient } from "@/lib/supabase/client";
import type { FilaPerfil } from "@/lib/tipos";
import Link from "next/link";
import { useState } from "react";

export function FormularioLogin({ siguiente }: { siguiente: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const entrar = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    setEnviando(true);
    setError(null);

    const supabase = createClient();
    const { data, error: errorAuth } = await supabase.auth.signInWithPassword({
      email: String(datos.get("correo") ?? "").trim(),
      password: String(datos.get("contrasena") ?? ""),
    });
    if (errorAuth) {
      setError(
        errorAuth.code === "invalid_credentials"
          ? "Correo o contraseña incorrectos."
          : "No se pudo iniciar sesión. Intenta de nuevo.",
      );
      setEnviando(false);
      return;
    }

    const { data: perfil } = await supabase
      .from("perfiles")
      .select("rol")
      .eq("id", data.user.id)
      .maybeSingle<Pick<FilaPerfil, "rol">>();
    // Navegación completa para que el encabezado del layout raíz se pinte con la sesión.
    window.location.assign(
      rutaInterna(siguiente) ?? (perfil ? inicioDeRol(perfil.rol) : "/"),
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          <h1>Entrar</h1>
        </CardTitle>
        <CardDescription>Usa el correo y la contraseña de tu cuenta.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={entrar} className="flex flex-col gap-6">
          <div className="grid gap-2">
            <Label htmlFor="correo">Correo</Label>
            <Input
              id="correo"
              name="correo"
              type="email"
              autoComplete="email"
              required
              className="h-11"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contrasena">Contraseña</Label>
            <Input
              id="contrasena"
              name="contrasena"
              type="password"
              autoComplete="current-password"
              required
              className="h-11"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="h-11 w-full" disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </Button>
          <p className="text-center text-sm">
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="underline underline-offset-4">
              Crear cuenta
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
