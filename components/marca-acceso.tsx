/**
 * Marca de /login y /registro: bloque marea de orilla a orilla debajo de la barra superior
 * y, encima de su borde inferior, la tarjeta del formulario.
 * El -mx-4 -mt-6 compensa el px-4 py-6 de <main> en app/layout.tsx.
 */
export function MarcaAcceso({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className="-mx-4 -mt-6 flex flex-col gap-2 bg-marea px-4 pb-14 pt-6 text-on-marea">
        <p className="font-display text-[28px] font-extrabold uppercase leading-9 tracking-[0.06em]">
          FrescoDirecto
        </p>
        <p className="text-base">Pescado del día de Guaymas y San Carlos, del muelle a la marisquería.</p>
      </div>
      <div className="-mt-8 flex flex-col gap-5 rounded-lg bg-surface p-4 shadow-card">{children}</div>
    </div>
  );
}
