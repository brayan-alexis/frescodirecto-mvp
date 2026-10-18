"use client";

import { Aviso } from "@/components/fd/aviso";
import { Boton } from "@/components/fd/boton";
import { Campo } from "@/components/fd/campo";
import { inicioDeRol } from "@/lib/rutas";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Check, Fish, Store, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

type RolRegistro = "restaurante" | "pescador";
type CampoRegistro = "correo" | "contrasena" | "repetir";
type ErrorFormulario = { campo?: CampoRegistro; mensaje: string; tono?: "error" | "exito" };

const TIPOS: { valor: RolRegistro; titulo: string; icono: LucideIcon }[] = [
  { valor: "restaurante", titulo: "Tengo una marisquería", icono: Store },
  { valor: "pescador", titulo: "Soy pescador", icono: Fish },
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
  // `disabled` llega hasta que React repinta; el ref frena un segundo clic inmediato.
  const enviandoRef = useRef(false);

  const registrar = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (enviandoRef.current) return;
    const datos = new FormData(e.currentTarget);
    const texto = (campo: string) => String(datos.get(campo) ?? "").trim();
    const contrasena = String(datos.get("contrasena") ?? "");
    setError(null);

    if (contrasena !== String(datos.get("repetir") ?? "")) {
      setError({ campo: "repetir", mensaje: "Las contraseñas no coinciden." });
      return;
    }

    const rolElegido: RolRegistro = datos.get("rol") === "pescador" ? "pescador" : "restaurante";
    enviandoRef.current = true;
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
      enviandoRef.current = false;
      setEnviando(false);
      return;
    }
    if (!data.session) {
      // Solo pasaría con "Confirm email" activado en Supabase.
      setError({ mensaje: "Tu cuenta se creó. Entra con tu correo y contraseña.", tono: "exito" });
      enviandoRef.current = false;
      setEnviando(false);
      return;
    }
    // Navegación completa para que el encabezado del layout raíz se pinte con la sesión.
    window.location.assign(inicioDeRol(rolElegido));
  };

  const errorDe = (campo: CampoRegistro) => (error?.campo === campo ? error.mensaje : null);

  const etiquetaNegocio =
    rol === "restaurante"
      ? "Nombre de la marisquería"
      : rol === "pescador"
        ? "Cooperativa (opcional)"
        : "Marisquería o cooperativa";

  return (
    <form onSubmit={registrar} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-bold text-ink">Tipo de cuenta</legend>
        <div className="grid grid-cols-2 gap-2">
          {TIPOS.map(({ valor, titulo, icono: Icono }) => {
            const elegido = rol === valor;
            return (
              <label
                key={valor}
                className={cn(
                  "flex min-h-[72px] cursor-pointer flex-col items-start justify-center gap-1 rounded-lg px-3 py-3 text-sm font-bold leading-tight text-ink",
                  "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus",
                  elegido ? "border-2 border-ink bg-marea-soft" : "border border-line-strong bg-surface",
                )}
              >
                <input
                  type="radio"
                  name="rol"
                  value={valor}
                  required
                  checked={elegido}
                  onChange={() => setRol(valor)}
                  className="sr-only"
                />
                <span className="flex w-full items-center justify-between gap-2">
                  <Icono aria-hidden className="size-5 shrink-0" />
                  {elegido && <Check aria-hidden className="size-4 shrink-0" strokeWidth={3} />}
                </span>
                <span>{titulo}</span>
              </label>
            );
          })}
        </div>
        {rol === "pescador" && (
          <p role="status" className="text-sm text-ink-muted">
            Tu cuenta queda en revisión hasta que el administrador la apruebe.
          </p>
        )}
      </fieldset>

      <Campo id="nombre" etiqueta="Tu nombre" name="nombre" autoComplete="name" required />
      <Campo
        id="negocio"
        etiqueta={etiquetaNegocio}
        name="negocio"
        autoComplete="organization"
        required={rol === "restaurante"}
      />
      <Campo id="telefono" etiqueta="Teléfono" name="telefono" type="tel" inputMode="tel" autoComplete="tel" required />
      <Campo
        id="correo"
        etiqueta="Correo"
        error={errorDe("correo")}
        name="correo"
        type="email"
        autoComplete="email"
        required
      />
      <Campo
        id="contrasena"
        etiqueta="Contraseña"
        ayuda="Al menos 6 caracteres."
        error={errorDe("contrasena")}
        name="contrasena"
        type="password"
        autoComplete="new-password"
        minLength={6}
        required
      />
      <Campo
        id="repetir"
        etiqueta="Repetir contraseña"
        error={errorDe("repetir")}
        name="repetir"
        type="password"
        autoComplete="new-password"
        minLength={6}
        required
      />

      {error && !error.campo && (
        <Aviso tono={error.tono ?? "error"} titulo={error.mensaje}>
          {error.tono === "exito" && (
            <Link href="/login" className="mt-1 inline-flex min-h-11 items-center font-bold underline underline-offset-4">
              Ir a Entrar
            </Link>
          )}
        </Aviso>
      )}
      <Boton type="submit" bloque ocupado={enviando} textoOcupado="Creando cuenta…">
        Crear cuenta
      </Boton>
      <p className="text-center text-sm text-ink">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </form>
  );
}
