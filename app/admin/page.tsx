import { Cargando } from "@/components/cargando";
import { exigirRol } from "@/lib/sesion";
import { Suspense } from "react";

export default function PaginaAdmin() {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await exigirRol(["admin"]);

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold">Administración</h1>
      <p className="text-muted-foreground">Se construye en la tarea 06</p>
    </div>
  );
}
