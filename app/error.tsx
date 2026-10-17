"use client"; // Los límites de error deben ser Client Components.

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect } from "react";

// En Next 16 la prop para volver a intentar se llama `retry` (antes `reset`).
export default function PaginaError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex max-w-xl flex-col items-start gap-3">
      <h1 className="text-2xl font-bold">Algo salió mal</h1>
      <p className="text-muted-foreground">
        No pudimos mostrar esta página. Revisa tu conexión e inténtalo de nuevo.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="h-11" onClick={() => retry()}>
          Intentar de nuevo
        </Button>
        <Button asChild variant="outline" className="h-11">
          <Link href="/">Ver el catálogo de hoy</Link>
        </Button>
      </div>
    </div>
  );
}
