"use client";

import { Boton } from "@/components/fd/boton";
import { createClient } from "@/lib/supabase/client";
import { useRef, useState } from "react";

/** Acción de la barra superior (sobre color marea). */
export function BotonSalir() {
  const [saliendo, setSaliendo] = useState(false);
  // `disabled` llega hasta que React repinta; el ref frena un segundo clic inmediato.
  const saliendoRef = useRef(false);

  const salir = async () => {
    if (saliendoRef.current) return;
    saliendoRef.current = true;
    setSaliendo(true);
    // Solo esta sesión: las cuentas demo se usan en varios dispositivos a la vez.
    await createClient().auth.signOut({ scope: "local" });
    // Navegación completa para que el encabezado se vuelva a pintar sin sesión.
    window.location.assign("/");
  };

  return (
    <Boton variante="fantasma" ocupado={saliendo} textoOcupado="Saliendo…" onClick={salir}>
      Salir
    </Boton>
  );
}
