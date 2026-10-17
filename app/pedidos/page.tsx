import { BotonActualizar } from "@/components/boton-actualizar";
import { Cargando } from "@/components/cargando";
import { ListaPedidos } from "@/components/lista-pedidos";
import { Button } from "@/components/ui/button";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import type { MiPedido } from "@/lib/tipos";
import Link from "next/link";
import { Suspense } from "react";

export default function PaginaPedidos() {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido />
    </Suspense>
  );
}

// mis_pedidos ya viene del más reciente al más antiguo, con pago y teléfono (solo si está activo).
async function Contenido() {
  await exigirRol(["restaurante"]);

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("mis_pedidos")
    .eq("mi_papel", "restaurante");
  const pedidos: MiPedido[] = data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Mis pedidos</h1>
        <BotonActualizar />
      </div>

      {error ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
        >
          <p>No pudimos cargar tus pedidos. Revisa tu conexión e inténtalo de nuevo.</p>
          <Button asChild variant="outline" className="h-11">
            <Link href="/pedidos">Reintentar</Link>
          </Button>
        </div>
      ) : (
        <ListaPedidos
          pedidos={pedidos}
          vacio={
            <>
              <p className="font-medium">No tienes pedidos activos.</p>
              <Button asChild className="h-11">
                <Link href="/">Ver la captura del día</Link>
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}
