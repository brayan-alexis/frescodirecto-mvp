import { Cargando } from "@/components/cargando";
import { exigirRol } from "@/lib/sesion";
import { Suspense } from "react";

export default function PaginaPedidos() {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await exigirRol(["restaurante"]);

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold">Mis pedidos</h1>
      <p className="text-muted-foreground">Se construye en la tarea 05</p>
    </div>
  );
}
