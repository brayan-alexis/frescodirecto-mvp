import { Aviso } from "@/components/fd/aviso";
import { obtenerPerfil } from "@/lib/sesion";
import { Suspense } from "react";

export default function LayoutPescador({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Suspense fallback={null}>
        <AvisoCuentaPendiente />
      </Suspense>
      {children}
    </>
  );
}

// Solo informa; la guarda de rol está en cada página.
async function AvisoCuentaPendiente() {
  const perfil = await obtenerPerfil();
  if (perfil?.rol !== "pescador" || perfil.estado !== "pendiente") return null;

  return (
    <Aviso tono="alerta" titulo="Tu cuenta está en revisión" className="mb-5">
      <p>Podrás publicar cuando el administrador te apruebe.</p>
    </Aviso>
  );
}
