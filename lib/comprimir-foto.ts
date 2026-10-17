// Compresión de la foto en el navegador, sin dependencias: lado mayor de 1280 px
// y JPEG de calidad cercana a 0.8, con objetivo menor a 400 KB.

export const LADO_MAX = 1280;
export const PESO_MAX = 400 * 1024;
const CALIDADES = [0.8, 0.7, 0.6, 0.5];

/** Medidas de destino: escala para que el lado mayor no pase de `ladoMax`; nunca agranda. */
export function medidasFoto(
  ancho: number,
  alto: number,
  ladoMax = LADO_MAX,
): { ancho: number; alto: number } {
  const escala = Math.min(1, ladoMax / Math.max(ancho, alto));
  return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala) };
}

/**
 * Devuelve la foto como JPEG comprimido. Solo funciona en el navegador.
 * Decodifica con <img>, que respeta la orientación EXIF en los navegadores actuales.
 * Lanza un error si el navegador no puede leer la imagen (p. ej. HEIC en escritorio).
 */
export async function comprimirFoto(archivo: Blob): Promise<Blob> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();

    const { ancho, alto } = medidasFoto(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Sin canvas 2D");
    ctx.fillStyle = "#fff"; // las PNG transparentes no quedan negras en JPEG
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(img, 0, 0, ancho, alto);

    let blob: Blob | null = null;
    for (const calidad of CALIDADES) {
      blob = await new Promise<Blob | null>((listo) => canvas.toBlob(listo, "image/jpeg", calidad));
      if (!blob) throw new Error("No se pudo generar el JPEG");
      if (blob.size <= PESO_MAX) break;
    }
    return blob!;
  } finally {
    URL.revokeObjectURL(url);
  }
}
