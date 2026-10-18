"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

/** Acción de la barra superior (sobre color marea). */
export function BotonSalir() {
  const [saliendo, setSaliendo] = useState(false);

  const salir = async () => {
    setSaliendo(true);
    // Solo esta sesión: las cuentas demo se usan en varios dispositivos a la vez.
    await createClient().auth.signOut({ scope: "local" });
    // Navegación completa para que el encabezado se vuelva a pintar sin sesión.
    window.location.assign("/");
  };

  return (
    <button
      type="button"
      onClick={salir}
      disabled={saliendo}
      aria-busy={saliendo || undefined}
      className="inline-flex min-h-11 items-center rounded-md px-3 font-bold disabled:opacity-60"
    >
      {saliendo ? "Saliendo…" : "Salir"}
    </button>
  );
}
