import { Button } from "@/components/ui/button";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Página no encontrada" };

export default function PaginaNoEncontrada() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-3">
      <h1 className="text-2xl font-bold">No encontramos esta página</h1>
      <p className="text-muted-foreground">
        Puede que el enlace esté incompleto o que la página ya no exista.
      </p>
      <Button asChild className="h-11">
        <Link href="/">Ver el catálogo de hoy</Link>
      </Button>
    </div>
  );
}
