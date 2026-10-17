import type { Rol } from "@/lib/tipos";

const SECCIONES_PRIVADAS = ["/pedidos", "/pescador", "/admin"];

/** Página inicial de cada rol: adonde llega al entrar y adonde vuelve con ?aviso=rol. */
export function inicioDeRol(rol: Rol): "/" | "/pescador" | "/admin" {
  if (rol === "pescador") return "/pescador";
  if (rol === "admin") return "/admin";
  return "/";
}

/** Rutas que exigen sesión: /pedidos, /pescador y /admin, con todo lo que cuelga de ellas. */
export function esRutaProtegida(pathname: string): boolean {
  return SECCIONES_PRIVADAS.some(
    (seccion) => pathname === seccion || pathname.startsWith(`${seccion}/`),
  );
}

/**
 * Devuelve `valor` solo si es una ruta de este sitio; sirve para el parámetro `next`.
 * Resolverla con URL atrapa trucos como "//otro.com", "/\otro.com" o un tabulador.
 */
export function rutaInterna(valor: string | null | undefined): string | null {
  if (!valor || !valor.startsWith("/")) return null;
  const base = "http://interno.invalid";
  try {
    const url = new URL(valor, base);
    if (url.origin !== base) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}
