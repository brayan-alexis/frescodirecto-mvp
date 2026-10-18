import { Aviso } from "@/components/fd/aviso";

/** Va junto a todo lo que muestre pagos: la pasarela es simulada. */
export function AvisoModoPrueba({ className }: { className?: string }) {
  return <Aviso tono="alerta" titulo="Modo de prueba: no se cobra dinero real" className={className} />;
}
