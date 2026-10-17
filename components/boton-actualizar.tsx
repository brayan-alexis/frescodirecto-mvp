"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** Sin tiempo real: vuelve a pedir los datos al servidor. */
export function BotonActualizar() {
  const router = useRouter();
  const [actualizando, iniciar] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      className="h-11"
      disabled={actualizando}
      onClick={() => iniciar(() => router.refresh())}
    >
      {actualizando ? "Actualizando…" : "Actualizar"}
    </Button>
  );
}
