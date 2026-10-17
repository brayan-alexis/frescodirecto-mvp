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
import { inicioDeRol } from "@/lib/rutas";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";

type RolRegistro = "restaurante" | "pescador";
type Campo = "correo" | "contrasena" | "repetir";
type ErrorFormulario = { campo?: Campo; mensaje: string };

const TIPOS: { valor: RolRegistro; titulo: string; detalle: string }[] = [
  { valor: "restaurante", titulo: "Restaurante", detalle: "Compro pescado para mi marisquería" },
  { valor: "pescador", titulo: "Pescador", detalle: "Vendo mi captura del día" },
];

// Errores de Supabase Auth por código, en español y junto al campo que toca.
const ERRORES: Record<string, ErrorFormulario> = {
  user_already_exists: { campo: "correo", mensaje: "Ya existe una cuenta con ese correo." },
  email_exists: { campo: "correo", mensaje: "Ya existe una cuenta con ese correo." },
  email_address_invalid: { campo: "correo", mensaje: "Revisa el correo: no parece válido." },
  weak_password: { campo: "contrasena", mensaje: "La contraseña es muy débil: usa una más larga." },
  over_request_rate_limit: { mensaje: "Demasiados intentos. Espera un momento e intenta de nuevo." },
};

export function FormularioRegistro() {
  const [rol, setRol] = useState<RolRegistro | null>(null);
  const [error, setError] = useState<ErrorFormulario | null>(null);
  const [enviando, setEnviando] = useState(false);

  const registrar = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    const texto = (campo: string) => String(datos.get(campo) ?? "").trim();
    const contrasena = String(datos.get("contrasena") ?? "");
    setError(null);

    if (contrasena !== String(datos.get("repetir") ?? "")) {
      setError({ campo: "repetir", mensaje: "Las contraseñas no coinciden." });
      return;
    }

    const rolElegido: RolRegistro = datos.get("rol") === "pescador" ? "pescador" : "restaurante";
    setEnviando(true);
    // El trigger al_crear_usuario crea el perfil: restaurante aprobado, pescador pendiente.
    const { data, error: errorAuth } = await createClient().auth.signUp({
      email: texto("correo"),
      password: contrasena,
      options: {
        data: {
          rol: rolElegido,
          nombre: texto("nombre"),
          negocio: texto("negocio"),
          telefono: texto("telefono"),
        },
      },
    });

    if (errorAuth) {
      setError(
        ERRORES[errorAuth.code ?? ""] ?? { mensaje: "No se pudo crear la cuenta. Intenta de nuevo." },
      );
      setEnviando(false);
      return;
    }
    if (!data.session) {
      // Solo pasaría con "Confirm email" activado en Supabase.
      setError({ mensaje: "Tu cuenta se creó. Entra con tu correo y contraseña." });
      setEnviando(false);
      return;
    }
    // Navegación completa para que el encabezado del layout raíz se pinte con la sesión.
    window.location.assign(inicioDeRol(rolElegido));
  };

  const errorDe = (campo: Campo) =>
    error?.campo === campo && (
      <p role="alert" className="text-sm font-medium text-destructive">
        {error.mensaje}
      </p>
    );

  const etiquetaNegocio =
    rol === "restaurante"
      ? "Nombre de la marisquería"
      : rol === "pescador"
        ? "Cooperativa (opcional)"
        : "Marisquería o cooperativa";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          <h1>Crear cuenta</h1>
        </CardTitle>
        <CardDescription>Elige si compras o vendes pescado.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={registrar} className="flex flex-col gap-6">
          <fieldset className="grid gap-3">
            <legend className="mb-3 text-sm font-medium">Tipo de cuenta</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {TIPOS.map((tipo) => (
                <label
                  key={tipo.valor}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-4",
                    rol === tipo.valor && "border-primary bg-accent",
                  )}
                >
                  <input
                    type="radio"
                    name="rol"
                    value={tipo.valor}
                    required
                    checked={rol === tipo.valor}
                    onChange={() => setRol(tipo.valor)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
                  />
                  <span className="grid gap-1">
                    <span className="font-semibold">{tipo.titulo}</span>
                    <span className="text-sm text-muted-foreground">{tipo.detalle}</span>
                  </span>
                </label>
              ))}
            </div>
            {rol === "pescador" && (
              <p
                role="status"
                className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
              >
                Tu cuenta de pescador debe aprobarse antes de publicar.
              </p>
            )}
          </fieldset>

          <div className="grid gap-2">
            <Label htmlFor="nombre">Tu nombre</Label>
            <Input id="nombre" name="nombre" autoComplete="name" required className="h-11" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="negocio">{etiquetaNegocio}</Label>
            <Input
              id="negocio"
              name="negocio"
              autoComplete="organization"
              required={rol === "restaurante"}
              className="h-11"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              name="telefono"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              className="h-11"
            />
          </div>
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
            {errorDe("correo")}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contrasena">Contraseña</Label>
            <Input
              id="contrasena"
              name="contrasena"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              className="h-11"
            />
            {errorDe("contrasena")}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="repetir">Repetir contraseña</Label>
            <Input
              id="repetir"
              name="repetir"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              className="h-11"
            />
            {errorDe("repetir")}
          </div>

          {error && !error.campo && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error.mensaje}
            </p>
          )}
          <Button type="submit" className="h-11 w-full" disabled={enviando}>
            {enviando ? "Creando cuenta…" : "Crear cuenta"}
          </Button>
          <p className="text-center text-sm">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Entrar
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
