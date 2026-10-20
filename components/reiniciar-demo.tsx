"use client";

import { useAvisoAccion } from "@/components/aviso-accion";
import { Aviso } from "@/components/fd/aviso";
import { Boton } from "@/components/fd/boton";
import { createClient } from "@/lib/supabase/client";
import { leerErrorRpc } from "@/lib/tipos";
import { RotateCcw } from "lucide-react";
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
      {error && <Aviso tono="error" titulo={error} />}
      {confirmando ? (
        <div className="flex flex-col gap-3 rounded-md bg-surface-sunken p-3">
          <p className="text-sm font-bold text-ink">
            ¿Seguro? Se borran los pedidos de prueba y se recarga el escenario.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Boton variante="secundario" disabled={enviando} onClick={() => setConfirmando(false)}>
              Cancelar
            </Boton>
            <Boton variante="peligro" ocupado={enviando} textoOcupado="Reiniciando…" onClick={reiniciar}>
              Sí, reiniciar
            </Boton>
          </div>
        </div>
      ) : (
        <Boton
          variante="secundario"
          icono={RotateCcw}
          className="self-start"
          onClick={() => {
            setError(null);
            setConfirmando(true);
          }}
        >
          Reiniciar demo
        </Boton>
      )}
    </div>
  );
}
