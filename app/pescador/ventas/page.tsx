import { AvisoModoPrueba } from "@/components/aviso-modo-prueba";
import { BotonActualizar } from "@/components/boton-actualizar";
import { EsqueletoLista } from "@/components/esqueleto-lista";
import { ListaPedidos } from "@/components/lista-pedidos";
import { Button } from "@/components/ui/button";
import { formatoDinero } from "@/lib/formato";
import { resumenVentas } from "@/lib/seguimiento";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import type { MiPedido } from "@/lib/tipos";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Mis ventas" };

export default function PaginaVentas() {
  return (
    <Suspense fallback={<EsqueletoLista texto="Cargando tus ventas…" />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  const perfil = await exigirRol(["pescador"]);

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("mis_pedidos")
    .eq("mi_papel", "pescador");

  const pedidos: MiPedido[] = data ?? [];
  // Solo sumas para mostrar: cada monto viene de mis_pedidos.
  const { porCobrar, cobrado } = resumenVentas(pedidos);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Mis ventas</h1>
        <BotonActualizar />
      </div>
      <AvisoModoPrueba />

      {error ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
        >
          <p>No pudimos cargar tus ventas. Revisa tu conexión e inténtalo de nuevo.</p>
          <Button asChild variant="outline" className="h-11">
            <a href="/pescador/ventas">Reintentar</a>
          </Button>
        </div>
      ) : (
        <>
          <dl aria-label="Resumen de pagos" className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 rounded-xl border p-3">
              <dt className="text-sm text-muted-foreground">Por cobrar (retenido)</dt>
              <dd className="text-xl font-bold">{formatoDinero(porCobrar)}</dd>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border p-3">
              <dt className="text-sm text-muted-foreground">Cobrado</dt>
              <dd className="text-xl font-bold">{formatoDinero(cobrado)}</dd>
            </div>
          </dl>

          <ListaPedidos
            pedidos={pedidos}
            vacio={
              <>
                <p className="font-medium">
                  {pedidos.length > 0 ? "No tienes pedidos por atender." : "Aún no tienes pedidos."}
                </p>
                {perfil.estado === "aprobado" && (
                  <Button asChild className="h-11">
                    <Link href="/pescador/publicar">Publicar captura</Link>
                  </Button>
                )}
              </>
            }
          />
        </>
      )}
    </div>
  );
}
