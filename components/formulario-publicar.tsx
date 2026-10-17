"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { comprimirFoto } from "@/lib/comprimir-foto";
import {
  camposVacios,
  DATO_INCOMPLETO,
  ERROR_FOTO,
  ERROR_SUBIDA,
  horaSonoraAIso,
  leerDecimal,
  ubicarError,
  type CampoPublicar,
} from "@/lib/publicar";
import { createClient } from "@/lib/supabase/client";
import { leerErrorRpc, type FilaEspecie } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { Camera } from "lucide-react";
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

export function FormularioPublicar({ especies, usuarioId, horaInicial }: Props) {
  const router = useRouter();
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const [preparandoFoto, setPreparandoFoto] = useState(false);
  const [foto, setFoto] = useState<Foto | null>(null);
  // Ruta ya subida de esta foto: si la base rechaza un dato, el reintento no la sube otra vez.
  const [rutaSubida, setRutaSubida] = useState<string | null>(null);
  const [largoNotas, setLargoNotas] = useState(0);

  useEffect(() => () => {
    if (foto) URL.revokeObjectURL(foto.url);
  }, [foto]);

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
    const datos = new FormData(e.currentTarget);
    const texto = (campo: string) => String(datos.get(campo) ?? "");
    const valores = {
      especie: texto("especie"),
      kg: texto("kg"),
      precio: texto("precio"),
      capturada_en: texto("capturada_en"),
    };

    const vacios = camposVacios({ ...valores, foto: foto != null });
    if (vacios.length > 0 || !foto) {
      setErrores(Object.fromEntries(vacios.map((campo) => [campo, DATO_INCOMPLETO])));
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
        setErrores({ foto: ERROR_SUBIDA });
        setEnviando(false);
        return;
      }
      ruta = nueva;
      setRutaSubida(nueva);
    }

    const notas = texto("notas").trim();
    const { error } = await supabase.rpc("publicar_captura", {
      p_especie_id: Number(valores.especie),
      p_kg: leerDecimal(valores.kg),
      p_precio_kg: leerDecimal(valores.precio),
      p_foto_path: ruta,
      p_capturada_en: horaSonoraAIso(valores.capturada_en),
      p_notas: notas || null,
    });

    if (error) {
      const { destino, mensaje } = ubicarError(leerErrorRpc(error));
      setErrores({ [destino]: mensaje });
      setEnviando(false);
      return;
    }
    // Sin reactivar el botón: evita una segunda publicación mientras navega.
    router.push("/pescador?publicada=1");
  };

  const errorDe = (campo: CampoPublicar) =>
    errores[campo] && (
      <p id={`error-${campo}`} role="alert" className="text-sm font-medium text-destructive">
        {errores[campo]}
      </p>
    );
  const invalido = (campo: CampoPublicar) =>
    errores[campo] ? { "aria-invalid": true, "aria-describedby": `error-${campo}` } : {};

  return (
    <form onSubmit={publicar} noValidate className="flex flex-col gap-5">
      {errores.general && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
        >
          {errores.general}
        </p>
      )}

      <div className="grid gap-2">
        <Label htmlFor="especie">Especie</Label>
        <select
          id="especie"
          name="especie"
          required
          defaultValue=""
          {...invalido("especie")}
          className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
        {errorDe("especie")}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid content-start gap-2">
          <Label htmlFor="kg">kg</Label>
          <Input
            id="kg"
            name="kg"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="12.5"
            required
            {...invalido("kg")}
            className="h-11"
          />
          {errorDe("kg")}
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="precio">Precio por kg</Label>
          <Input
            id="precio"
            name="precio"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="$155"
            required
            {...invalido("precio")}
            className="h-11"
          />
          {errorDe("precio")}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="capturada_en">Hora de captura (hora de Sonora)</Label>
        <Input
          id="capturada_en"
          name="capturada_en"
          type="datetime-local"
          defaultValue={horaInicial}
          required
          {...invalido("capturada_en")}
          className="h-11 min-w-0"
        />
        {errorDe("capturada_en")}
      </div>

      <div className="grid gap-2">
        <span className="text-sm font-medium leading-none">Foto</span>
        {foto && (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:)
          <img
            src={foto.url}
            alt="Vista previa de la foto"
            className="aspect-[4/3] w-full rounded-xl bg-muted object-cover"
          />
        )}
        <label
          className={cn(
            "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-3 text-base font-medium focus-within:ring-2 focus-within:ring-ring hover:bg-accent",
            errores.foto ? "border-destructive" : "border-input",
            preparandoFoto && "cursor-wait opacity-60",
          )}
        >
          <Camera aria-hidden className="size-5" />
          {preparandoFoto ? "Preparando foto…" : foto ? "Cambiar foto" : "Tomar foto"}
          <input
            type="file"
            name="foto"
            accept="image/*"
            capture="environment"
            disabled={preparandoFoto || enviando}
            onChange={elegirFoto}
            {...invalido("foto")}
            className="sr-only"
          />
        </label>
        {errorDe("foto")}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notas">Notas (opcional)</Label>
        <textarea
          id="notas"
          name="notas"
          rows={3}
          maxLength={MAX_NOTAS}
          onChange={(e) => setLargoNotas(e.target.value.length)}
          aria-invalid={errores.notas ? true : undefined}
          aria-describedby={errores.notas ? "error-notas ayuda-notas" : "ayuda-notas"}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div className="flex justify-between gap-3 text-sm text-muted-foreground">
          <p id="ayuda-notas">
            Sin teléfonos ni correos: el contacto se comparte al aceptar un pedido pagado
          </p>
          <span aria-hidden className="shrink-0">
            {largoNotas}/{MAX_NOTAS}
          </span>
        </div>
        {errorDe("notas")}
      </div>

      <Button type="submit" className="h-11 w-full text-base" disabled={enviando || preparandoFoto}>
        {enviando ? "Publicando…" : "Publicar"}
      </Button>
    </form>
  );
}
