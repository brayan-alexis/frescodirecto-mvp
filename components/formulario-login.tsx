"use client";

import { Aviso } from "@/components/fd/aviso";
import { Boton } from "@/components/fd/boton";
import { Campo } from "@/components/fd/campo";
import { inicioDeRol, rutaInterna } from "@/lib/rutas";
import { createClient } from "@/lib/supabase/client";
import type { FilaPerfil } from "@/lib/tipos";
import Link from "next/link";
import { useRef, useState } from "react";

export function FormularioLogin({ siguiente }: { siguiente: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // `disabled` llega hasta que React repinta; el ref frena un segundo clic inmediato.
  const enviandoRef = useRef(false);

  const entrar = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (enviandoRef.current) return;
    const datos = new FormData(e.currentTarget);
    enviandoRef.current = true;
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
      enviandoRef.current = false;
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
    <form onSubmit={entrar} className="flex flex-col gap-5">
      {error && (
        <Aviso tono="error" titulo="No pudiste entrar">
          <p>{error}</p>
        </Aviso>
      )}
      <Campo id="correo" etiqueta="Correo" name="correo" type="email" autoComplete="email" required />
      <Campo
        id="contrasena"
        etiqueta="Contraseña"
        name="contrasena"
        type="password"
        autoComplete="current-password"
        required
      />
      <Boton type="submit" bloque ocupado={enviando} textoOcupado="Entrando…">
        Entrar
      </Boton>
      <p className="text-center text-sm text-ink">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">
          Crear cuenta
        </Link>
      </p>
    </form>
  );
}
