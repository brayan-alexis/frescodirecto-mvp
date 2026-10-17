import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PedidoNoEncontrado() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-3">
      <h1 className="text-2xl font-bold">No encontramos ese pedido</h1>
      <p className="text-muted-foreground">
        Puede que el enlace esté incompleto o que el pedido no sea de tu cuenta.
      </p>
      <Button asChild className="h-11">
        <Link href="/">Ir al inicio</Link>
      </Button>
    </div>
  );
}
