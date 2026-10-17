"use client";

import { cn } from "@/lib/utils";
import { Fish } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type Props = {
  src: string | null;
  alt: string;
  variante: "miniatura" | "grande";
};

/**
 * Foto de una captura. Si no hay foto o no carga, muestra un recuadro neutro
 * del mismo tamaño en lugar del ícono roto (next/image repite onError tras hidratar).
 */
export function FotoCaptura({ src, alt, variante }: Props) {
  const [fallo, setFallo] = useState(false);
  const miniatura = variante === "miniatura";

  if (!src || fallo) {
    return (
      <div
        role="img"
        aria-label="Sin foto"
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          miniatura ? "size-20 shrink-0 rounded-md" : "aspect-[4/3] w-full rounded-xl",
        )}
      >
        <Fish aria-hidden className={miniatura ? "size-8" : "size-16"} />
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
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, 576px"
        loading="eager"
        onError={() => setFallo(true)}
        className="object-cover"
      />
    </div>
  );
}
