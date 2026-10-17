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
    <p
      role="status"
      className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
    >
      Tu cuenta está pendiente de aprobación. Podrás publicar cuando el equipo la apruebe.
    </p>
  );
}
