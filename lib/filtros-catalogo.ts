// Filtros del catálogo guardados en la URL (?especie=1&precio=100&horas=12).
// Un valor inválido se ignora: así nunca llega a la RPC algo que Postgres rechace.

export const PRECIOS_MAX = [100, 150, 200] as const;
export const HORAS_MAX = [6, 12, 24] as const;

export type Filtros = {
  especie: number | null;
  precio: (typeof PRECIOS_MAX)[number] | null;
  horas: (typeof HORAS_MAX)[number] | null;
};

type Parametros = Record<string, string | string[] | undefined>;

function primero(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

function deLista<T extends number>(lista: readonly T[], valor: string | undefined): T | null {
  return lista.find((opcion) => String(opcion) === valor) ?? null;
}

/** Lee los filtros de searchParams; lo que no sea válido queda en null. */
export function leerFiltros(sp: Parametros): Filtros {
  const especie = primero(sp.especie);
  return {
    // Hasta 9 dígitos: cabe en el integer de Postgres.
    especie: especie && /^[1-9]\d{0,8}$/.test(especie) ? Number(especie) : null,
    precio: deLista(PRECIOS_MAX, primero(sp.precio)),
    horas: deLista(HORAS_MAX, primero(sp.horas)),
  };
}

/** URL del catálogo con los filtros activos, en orden fijo; "/" si no hay ninguno. */
export function urlCatalogo(filtros: Filtros): string {
  const parametros = new URLSearchParams();
  if (filtros.especie != null) parametros.set("especie", String(filtros.especie));
  if (filtros.precio != null) parametros.set("precio", String(filtros.precio));
  if (filtros.horas != null) parametros.set("horas", String(filtros.horas));
  const texto = parametros.toString();
  return texto ? `/?${texto}` : "/";
}

export function hayFiltros(filtros: Filtros): boolean {
  return filtros.especie != null || filtros.precio != null || filtros.horas != null;
}
