"use client";

import { useAvisoAccion } from "@/components/aviso-accion";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { leerErrorRpc } from "@/lib/tipos";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const ERROR_CONEXION = "No se pudo reiniciar la demo. Revisa tu conexión e intenta de nuevo.";

/**
 * Reinicio del escenario demo con confirmación en dos pasos (sin window.confirm).
 * El resultado reemplaza el aviso de la página: uno anterior ("Disputa resuelta") ya no aplica.
 */
export function ReiniciarDemo() {
  const router = useRouter();
  const avisar = useAvisoAccion();
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // `disabled` llega hasta que React repinta; el ref frena un segundo clic inmediato.
  const enviandoRef = useRef(false);

  const reiniciar = async () => {
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(true);
    setError(null);

    const { data, error } = await createClient().rpc("reiniciar_demo");

    enviandoRef.current = false;
    setEnviando(false);
    setConfirmando(false);
    if (error) {
      const e = leerErrorRpc(error);
      setError(e.codigo == null ? ERROR_CONEXION : e.mensaje);
      return;
    }
    avisar(data as string);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
          {error}
        </p>
      )}
      {confirmando ? (
        <div className="flex flex-col gap-3 rounded-md border p-3">
          <p className="text-sm font-medium">¿Seguro? Se borran los pedidos de prueba y se recarga el escenario.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="destructive" className="h-11" disabled={enviando} onClick={reiniciar}>
              {enviando ? "Reiniciando…" : "Sí, reiniciar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={enviando}
              onClick={() => setConfirmando(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-11 self-start"
          onClick={() => {
            setError(null);
            setConfirmando(true);
          }}
        >
          Reiniciar demo
        </Button>
      )}
    </div>
  );
}
