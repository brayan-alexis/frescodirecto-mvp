import { cn } from "@/lib/utils";

/** Va junto a todo lo que muestre pagos: la pasarela es simulada. */
export function AvisoModoPrueba({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-center text-sm font-medium text-amber-900",
        className,
      )}
    >
      Modo de prueba: no se cobra dinero real
    </p>
  );
}
