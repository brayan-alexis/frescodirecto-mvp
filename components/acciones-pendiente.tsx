"use client";

import { useAvisoAccion } from "@/components/aviso-accion";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { leerErrorRpc } from "@/lib/tipos";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const ERROR_CONEXION = "No se pudo completar la acción. Revisa tu conexión e intenta de nuevo.";

/** Aprobar o rechazar a un pescador pendiente. La base valida que quien llama sea admin. */
export function AccionesPendiente({ perfilId, nombre }: { perfilId: string; nombre: string }) {
  const router = useRouter();
  const avisar = useAvisoAccion();
  const [confirmarRechazo, setConfirmarRechazo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // `disabled` llega hasta que React repinta; el ref frena un segundo clic inmediato.
  const enviandoRef = useRef(false);

  const responder = async (aprobar: boolean) => {
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(true);
    setError(null);

    const { error } = await createClient().rpc("aprobar_pescador", {
      p_perfil_id: perfilId,
      p_aprobar: aprobar,
    });

    enviandoRef.current = false;
    setEnviando(false);
    if (error) {
      const e = leerErrorRpc(error);
      setError(e.codigo == null ? ERROR_CONEXION : e.mensaje);
      return;
    }
    avisar(aprobar ? `${nombre} aprobado: ya puede publicar.` : `${nombre} rechazado: no podrá publicar.`);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
          {error}
        </p>
      )}
      {confirmarRechazo ? (
        <>
          <p className="text-sm">¿Rechazar a {nombre}? No podrá publicar capturas.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              className="h-11"
              disabled={enviando}
              onClick={() => responder(false)}
            >
              {enviando ? "Rechazando…" : "Sí, rechazar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={enviando}
              onClick={() => setConfirmarRechazo(false)}
            >
              Volver
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="h-11" disabled={enviando} onClick={() => responder(true)}>
            {enviando ? "Aprobando…" : "Aprobar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={enviando}
            onClick={() => {
              setError(null);
              setConfirmarRechazo(true);
            }}
          >
            Rechazar
          </Button>
        </div>
      )}
    </div>
  );
}
