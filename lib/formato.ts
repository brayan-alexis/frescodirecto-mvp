// Formatos de pantalla compartidos: dinero y kg en es-MX, horas en hora de Sonora.
// La base guarda UTC; aquí solo se presenta. Llama estas funciones en el servidor.

const ZONA = "America/Hermosillo";

const dineroEntero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const dineroCentavos = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const numeroKg = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });
const numeroCalificacion = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const hora = new Intl.DateTimeFormat("es-MX", { timeZone: ZONA, hour: "numeric", minute: "2-digit" });
const fechaCorta = new Intl.DateTimeFormat("es-MX", { timeZone: ZONA, day: "numeric", month: "short" });
// en-CA da AAAA-MM-DD: sirve para comparar días de calendario en Sonora.
const claveDia = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA });

/** "$95" o "$1,250.50": sin decimales si el monto es entero. */
export function formatoDinero(monto: number): string {
  return (Number.isInteger(monto) ? dineroEntero : dineroCentavos).format(monto);
}

/** "12.5 kg", con hasta 2 decimales. */
export function formatoKg(kg: number): string {
  return `${numeroKg.format(kg)} kg`;
}

/** "hace 45 min" con menos de 1 h; desde 1 h, horas completas: "hace 3 h". */
export function haceCuanto(horas: number): string {
  const minutos = Math.max(1, Math.round(horas * 60));
  return minutos < 60 ? `hace ${minutos} min` : `hace ${Math.floor(minutos / 60)} h`;
}

/** "hoy 5:40 a.m.", "ayer 10:20 p.m." o "14 oct 6:00 a.m.", en hora de Sonora. */
export function horaSonora(fechaIso: string, ahora: Date = new Date()): string {
  const fecha = new Date(fechaIso);
  const dia = claveDia.format(fecha);
  // Sonora no cambia de horario, así que restar 24 h siempre cae en el día anterior.
  const prefijo =
    dia === claveDia.format(ahora)
      ? "hoy"
      : dia === claveDia.format(new Date(ahora.getTime() - 24 * 60 * 60 * 1000))
        ? "ayer"
        : fechaCorta.format(fecha);
  return `${prefijo} ${hora.format(fecha)}`;
}

/** "★★★★☆": las estrellas de una calificación de 1 a 5. Acompáñalo de un texto accesible. */
export function formatoEstrellas(estrellas: number): string {
  const llenas = Math.min(5, Math.max(0, Math.round(estrellas)));
  return "★".repeat(llenas) + "☆".repeat(5 - llenas);
}

/** "★ 4.3 (11)" en tarjetas, "★ 4.3 · 11 calificaciones" en detalle, o "Nuevo" sin promedio público. */
export function formatoReputacion(
  calificacion: number | null,
  numCalificaciones: number,
  variante: "corta" | "larga",
): string {
  if (calificacion == null) return "Nuevo";
  const promedio = numeroCalificacion.format(calificacion);
  return variante === "corta"
    ? `★ ${promedio} (${numCalificaciones})`
    : `★ ${promedio} · ${numCalificaciones} calificaciones`;
}
