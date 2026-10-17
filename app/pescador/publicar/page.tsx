import { Cargando } from "@/components/cargando";
import { exigirRol } from "@/lib/sesion";
import { Suspense } from "react";

export default function PaginaPublicar() {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await exigirRol(["pescador"]);

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold">Publicar captura</h1>
      <p className="text-muted-foreground">Se construye en la tarea 03</p>
    </div>
  );
}
