import { Aviso } from "@/components/fd/aviso";
import { claseBoton } from "@/components/fd/boton";
import { RotateCw } from "lucide-react";

type Props = {
  /** "No pudimos cargar las capturas". */
  titulo: string;
  /** La misma página: el <a> recarga completo para volver a pedir los datos. */
  href: string;
};

/** Error al leer los datos de una pantalla, con la acción de reintentar. */
export function ErrorCarga({ titulo, href }: Props) {
  return (
    <Aviso tono="error" titulo={titulo}>
      <p>Revisa tu conexión e inténtalo de nuevo.</p>
      <a href={href} className={claseBoton("secundario", false, "mt-3")}>
        <RotateCw aria-hidden className="size-5 shrink-0" />
        Reintentar
      </a>
    </Aviso>
  );
}
