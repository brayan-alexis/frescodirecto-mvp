import { AvisoAccionProvider } from "@/components/aviso-accion";
import { FilaPedido } from "@/components/fila-pedido";
import { MAX_HISTORIAL, separarPedidos } from "@/lib/seguimiento";
import type { MiPedido } from "@/lib/tipos";

type Props = {
  pedidos: MiPedido[];
  /** Lo que se muestra cuando no hay activos: un texto y una acción clara. */
  vacio: React.ReactNode;
};

/** Activos arriba (piden acción) e Historial plegado con los 20 cerrados más recientes. */
export function ListaPedidos({ pedidos, vacio }: Props) {
  const { activos, historial } = separarPedidos(pedidos);

  const lista = (filas: MiPedido[], etiqueta: string) => (
    <ul aria-label={etiqueta} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {filas.map((pedido) => (
        <li key={pedido.id}>
          <FilaPedido pedido={pedido} />
        </li>
      ))}
    </ul>
  );

  return (
    <AvisoAccionProvider>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Activos ({activos.length})</h2>
        {activos.length > 0 ? (
          lista(activos, "Pedidos activos")
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed px-4 py-6">
            {vacio}
          </div>
        )}
      </section>

      {historial.length > 0 && (
        <details className="rounded-xl border">
          <summary className="flex min-h-11 cursor-pointer items-center px-4 font-semibold">
            Historial ({historial.length === MAX_HISTORIAL ? `últimos ${MAX_HISTORIAL}` : historial.length})
          </summary>
          <div className="px-3 pb-3">{lista(historial, "Historial de pedidos")}</div>
        </details>
      )}
    </AvisoAccionProvider>
  );
}
