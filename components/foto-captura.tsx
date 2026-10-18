"use client";

import { cn } from "@/lib/utils";
import { Fish } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type Props = {
  src: string | null;
  alt: string;
  /** portada: a ancho completo arriba del detalle de captura. */
  variante: "miniatura" | "grande" | "portada";
};

/**
 * Foto de una captura. Si no hay foto o no carga, muestra un recuadro neutro
 * del mismo tamaño en lugar del ícono roto (next/image repite onError tras hidratar).
 */
export function FotoCaptura({ src, alt, variante }: Props) {
  const [fallo, setFallo] = useState(false);
  const miniatura = variante === "miniatura";
  const portada = variante === "portada";

  if (!src || fallo) {
    return (
      <div
        role="img"
        aria-label="Sin foto"
        className={cn(
          "flex items-center justify-center",
          portada ? "h-[200px] w-full flex-col gap-2 bg-marea-soft text-ink" : "bg-muted text-muted-foreground",
          miniatura && "size-20 shrink-0 rounded-md",
          variante === "grande" && "aspect-[4/3] w-full rounded-xl",
        )}
      >
        <Fish aria-hidden className={miniatura ? "size-8" : portada ? "size-12" : "size-16"} />
        {portada && <span aria-hidden className="text-sm font-bold">Foto de la captura</span>}
      </div>
    );
  }

  if (miniatura) {
    return (
      <Image
        src={src}
        alt={alt}
        width={80}
        height={80}
        onError={() => setFallo(true)}
        className="size-20 shrink-0 rounded-md bg-muted object-cover"
      />
    );
  }

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        portada ? "h-[200px] bg-surface-sunken" : "aspect-[4/3] rounded-xl bg-muted",
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={portada ? "(max-width: 480px) 100vw, 480px" : "(max-width: 640px) 100vw, 576px"}
        loading="eager"
        onError={() => setFallo(true)}
        className="object-cover"
      />
    </div>
  );
}
