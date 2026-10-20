"use client";

import { useAvisoAccion } from "@/components/aviso-accion";
import { Aviso } from "@/components/fd/aviso";
import { Boton } from "@/components/fd/boton";
import { createClient } from "@/lib/supabase/client";
import { leerErrorRpc } from "@/lib/tipos";
import { Check, ChevronLeft, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const ERROR_CONEXION = "No se pudo completar la acción. Revisa tu conexión e intenta de nuevo.";

/** Aprobar o rechazar a un pescador pendiente. La base valida que quien llama sea admin. */
export function AccionesPendiente({ perfilId, nombre }: { perfilId: string; nombre: string }) {
  const router = useRouter();
  const avisar = useAvisoAccion();
  const [confirmarRechazo, setConfirmarRechazo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Qué respuesta está en curso: solo ese botón muestra el spinner.
  const [enviando, setEnviando] = useState<"aprobar" | "rechazar" | null>(null);
  // `disabled` llega hasta que React repinta; el ref frena un segundo clic inmediato.
  const enviandoRef = useRef(false);

  const responder = async (aprobar: boolean) => {
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(aprobar ? "aprobar" : "rechazar");
    setError(null);

    const { error } = await createClient().rpc("aprobar_pescador", {
      p_perfil_id: perfilId,
      p_aprobar: aprobar,
    });

    enviandoRef.current = false;
    setEnviando(null);
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
      {error && <Aviso tono="error" titulo={error} />}
      {confirmarRechazo ? (
        <>
          <p className="text-sm text-ink">¿Rechazar a {nombre}? No podrá publicar capturas.</p>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
            <Boton
              variante="secundario"
              icono={ChevronLeft}
              disabled={enviando != null}
              onClick={() => setConfirmarRechazo(false)}
            >
              Volver
            </Boton>
            <Boton
              variante="peligro"
              bloque
              ocupado={enviando === "rechazar"}
              textoOcupado="Rechazando…"
              onClick={() => responder(false)}
            >
              Sí, rechazar
            </Boton>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Boton
            variante="secundario"
            icono={X}
            disabled={enviando != null}
            onClick={() => {
              setError(null);
              setConfirmarRechazo(true);
            }}
          >
            Rechazar
          </Boton>
          <Boton
            icono={Check}
            ocupado={enviando === "aprobar"}
            textoOcupado="Aprobando…"
            onClick={() => responder(true)}
          >
            Aprobar
          </Boton>
        </div>
      )}
    </div>
  );
}
