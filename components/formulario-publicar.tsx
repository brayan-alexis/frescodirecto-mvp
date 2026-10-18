"use client";

import { Aviso } from "@/components/fd/aviso";
import { BarraAccion } from "@/components/fd/barra-accion";
import { Boton } from "@/components/fd/boton";
import { Campo, atributosControl, claseControl } from "@/components/fd/campo";
import { CampoFoto } from "@/components/fd/campo-foto";
import { comprimirFoto } from "@/lib/comprimir-foto";
import { formatoDinero, formatoKg } from "@/lib/formato";
import {
  CAMPOS_PUBLICAR,
  camposVacios,
  ERROR_FOTO,
  ERROR_SUBIDA,
  horaSonoraAIso,
  leerDecimal,
  MENSAJES_INCOMPLETO,
  ubicarError,
  type CampoPublicar,
} from "@/lib/publicar";
import { createClient } from "@/lib/supabase/client";
import { leerErrorRpc, type FilaEspecie } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  especies: Pick<FilaEspecie, "id" | "nombre">[];
  usuarioId: string;
  horaInicial: string; // "AAAA-MM-DDTHH:mm" en hora de Sonora, calculada en el servidor
};

type Errores = Partial<Record<CampoPublicar | "general", string>>;
type Foto = { blob: Blob; url: string };

const MAX_NOTAS = 280;
const AYUDA_NOTAS = "Sin teléfonos ni correos: el contacto se comparte al aceptar un pedido pagado.";

/**
 * Publicar captura. Devuelve el formulario con su barra de acción fija adentro:
 * la barra queda abajo mientras se llenan los campos.
 */
export function FormularioPublicar({ especies, usuarioId, horaInicial }: Props) {
  const router = useRouter();
  const [especie, setEspecie] = useState("");
  const [kg, setKg] = useState("");
  const [precio, setPrecio] = useState("");
  const [capturadaEn, setCapturadaEn] = useState(horaInicial);
  const [notas, setNotas] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  // Sube con cada envío fallido: el efecto lleva el foco al primer campo con error.
  const [intento, setIntento] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [preparandoFoto, setPreparandoFoto] = useState(false);
  const [foto, setFoto] = useState<Foto | null>(null);
  // Ruta ya subida de esta foto: si la base rechaza un dato, el reintento no la sube otra vez.
  const [rutaSubida, setRutaSubida] = useState<string | null>(null);

  useEffect(() => () => {
    if (foto) URL.revokeObjectURL(foto.url);
  }, [foto]);

  // Al fallar, el foco va al primer campo con error, en el orden del formulario.
  useEffect(() => {
    if (intento === 0) return;
    const primero = CAMPOS_PUBLICAR.find((campo) => errores[campo]);
    if (primero) document.getElementById(primero)?.focus();
    // Solo tras un envío: los errores ya están puestos cuando sube `intento`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intento]);

  const fallar = (nuevos: Errores) => {
    setErrores(nuevos);
    setIntento((n) => n + 1);
  };

  const elegirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setPreparandoFoto(true);
    setErrores((previos) => ({ ...previos, foto: undefined }));
    try {
      const blob = await comprimirFoto(archivo);
      setFoto({ blob, url: URL.createObjectURL(blob) });
      setRutaSubida(null);
    } catch {
      setErrores((previos) => ({ ...previos, foto: ERROR_FOTO }));
    } finally {
      setPreparandoFoto(false);
    }
  };

  const publicar = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (enviando) return;

    const vacios = camposVacios({ especie, kg, precio, capturada_en: capturadaEn, foto: foto != null });
    if (vacios.length > 0 || !foto) {
      fallar(
        Object.fromEntries(
          vacios.map((campo) => [campo, MENSAJES_INCOMPLETO[campo as keyof typeof MENSAJES_INCOMPLETO]]),
        ),
      );
      return;
    }

    setErrores({});
    setEnviando(true);
    const supabase = createClient();

    let ruta = rutaSubida;
    if (!ruta) {
      const nueva = `${usuarioId}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from("capturas")
        .upload(nueva, foto.blob, { contentType: "image/jpeg" });
      if (error) {
        fallar({ foto: ERROR_SUBIDA });
        setEnviando(false);
        return;
      }
      ruta = nueva;
      setRutaSubida(nueva);
    }

    const precioKg = leerDecimal(precio);
    const notasLimpias = notas.trim();
    const { error } = await supabase.rpc("publicar_captura", {
      p_especie_id: Number(especie),
      p_kg: leerDecimal(kg),
      p_precio_kg: precioKg,
      p_foto_path: ruta,
      p_capturada_en: horaSonoraAIso(capturadaEn),
      p_notas: notasLimpias || null,
    });

    if (error) {
      const { destino, mensaje } = ubicarError(leerErrorRpc(error), precioKg);
      fallar({ [destino]: mensaje });
      setEnviando(false);
      return;
    }
    // Sin reactivar el botón: evita una segunda publicación mientras navega.
    router.push("/pescador?publicada=1");
  };

  // Resumen de la barra con lo escrito; solo para mostrar.
  const nombreEspecie = especies.find((e) => String(e.id) === especie)?.nombre;
  const kgEscritos = leerDecimal(kg);
  const precioEscrito = leerDecimal(precio);
  const hayResumen = nombreEspecie != null || kgEscritos != null || precioEscrito != null;

  return (
    <form onSubmit={publicar} noValidate className="flex flex-col gap-5">
      {errores.general && (
        <Aviso tono="error" titulo="No se publicó la captura">
          <p>{errores.general}</p>
        </Aviso>
      )}

      <Campo id="especie" etiqueta="Especie" error={errores.especie}>
        <select
          {...atributosControl("especie", errores.especie)}
          name="especie"
          required
          value={especie}
          onChange={(e) => setEspecie(e.target.value)}
          className={cn(claseControl, "w-full cursor-pointer")}
        >
          <option value="" disabled>
            Elige la especie
          </option>
          {especies.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      </Campo>

      <div className="grid grid-cols-2 items-start gap-3">
        <Campo
          id="kg"
          etiqueta="Kilos"
          sufijo="kg"
          error={errores.kg}
          name="kg"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="12.5"
          required
          value={kg}
          onChange={(e) => setKg(e.target.value)}
        />
        <Campo
          id="precio"
          etiqueta="Precio por kilo"
          prefijo="$"
          error={errores.precio}
          name="precio"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="155"
          required
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
        />
      </div>

      {/* El control de siempre (fecha y hora): la base acepta capturas de las últimas 24 h. */}
      <Campo
        id="capturada_en"
        etiqueta="Hora de captura"
        ayuda="En hora de Sonora. No puede ser después de ahora."
        error={errores.capturada_en}
        name="capturada_en"
        type="datetime-local"
        required
        value={capturadaEn}
        onChange={(e) => setCapturadaEn(e.target.value)}
      />

      <CampoFoto
        id="foto"
        name="foto"
        etiqueta="Foto de la captura"
        vistaPrevia={foto?.url ?? null}
        error={errores.foto}
        preparando={preparandoFoto}
        disabled={enviando}
        onChange={elegirFoto}
      />

      <div className="flex flex-col gap-1">
        <Campo
          id="notas"
          etiqueta="Notas (opcional)"
          ayuda={AYUDA_NOTAS}
          error={errores.notas}
        >
          <textarea
            {...atributosControl("notas", errores.notas, AYUDA_NOTAS)}
            name="notas"
            rows={3}
            maxLength={MAX_NOTAS}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className={cn(claseControl, "self-stretch py-2")}
          />
        </Campo>
        <p aria-hidden className="text-right text-[13px] text-ink-muted tabular-nums">
          {notas.length}/{MAX_NOTAS}
        </p>
      </div>

      <BarraAccion
        resumen={
          hayResumen
            ? {
                izquierda: `${nombreEspecie ?? "Sin especie"} · ${kgEscritos != null ? formatoKg(kgEscritos) : "— kg"}`,
                derecha: `${precioEscrito != null ? formatoDinero(precioEscrito) : "—"} /kg`,
              }
            : undefined
        }
      >
        <Boton
          type="submit"
          bloque
          icono={Plus}
          ocupado={enviando}
          textoOcupado="Publicando…"
          disabled={preparandoFoto}
        >
          Publicar captura
        </Boton>
      </BarraAccion>
    </form>
  );
}
