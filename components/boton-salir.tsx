"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

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
    <Button
      variant="ghost"
      className="h-11 px-2"
      onClick={salir}
      disabled={saliendo}
    >
      Salir
    </Button>
  );
}
