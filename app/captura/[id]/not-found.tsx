import { BotonEnlace } from "@/components/fd/boton";
import { EstadoVacio } from "@/components/fd/estado-vacio";
import { Fish } from "lucide-react";

export default function CapturaNoEncontrada() {
  return (
    <EstadoVacio
      icono={Fish}
      titulo="No encontramos esa captura"
      ayuda="Puede que el enlace esté incompleto o que la captura ya no exista."
      accion={
        <BotonEnlace variante="secundario" href="/">
          Ver el catálogo de hoy
        </BotonEnlace>
      }
    />
  );
}
