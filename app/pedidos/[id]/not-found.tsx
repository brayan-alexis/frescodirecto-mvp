import { BotonEnlace } from "@/components/fd/boton";
import { EstadoVacio } from "@/components/fd/estado-vacio";
import { Receipt } from "lucide-react";

export default function PedidoNoEncontrado() {
  return (
    <EstadoVacio
      icono={Receipt}
      titulo="No encontramos ese pedido"
      ayuda="Puede que el enlace esté incompleto o que el pedido no sea de tu cuenta."
      accion={
        <BotonEnlace variante="secundario" href="/">
          Ir al inicio
        </BotonEnlace>
      }
    />
  );
}
