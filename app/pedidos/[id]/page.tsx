import { Cargando } from "@/components/cargando";
import { exigirRol } from "@/lib/sesion";
import { Suspense } from "react";

export default function PaginaPedido() {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido />
    </Suspense>
  );
}

// La base de datos ya filtra que el usuario participe en el pedido.
async function Contenido() {
  await exigirRol(["restaurante", "pescador"]);

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold">Detalle del pedido</h1>
      <p className="text-muted-foreground">Se construye en la tarea 04</p>
    </div>
  );
}
