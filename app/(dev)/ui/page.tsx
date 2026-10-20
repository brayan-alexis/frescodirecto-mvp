import { Aviso } from "@/components/fd/aviso";
import { BarraApp } from "@/components/fd/barra-app";
import { EstadoPedido, ESTADOS } from "@/components/fd/estado-pedido";
import { EstadoVacio } from "@/components/fd/estado-vacio";
import { HoraCaptura } from "@/components/fd/hora-captura";
import { LineaTiempo, type EventoLinea } from "@/components/fd/linea-tiempo";
import { TarjetaCaptura } from "@/components/fd/tarjeta-captura";
import { BotonEnlace } from "@/components/fd/boton";
import type { CapturaCatalogo, EstadoPedido as Estado } from "@/lib/tipos";
import { Fish, Receipt } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { DemoInteractiva } from "./demo-interactiva";

// Muestra de components/fd/ con datos ficticios, solo en desarrollo: en producción es 404.
export const metadata: Metadata = { title: "Componentes", robots: { index: false } };

export default function PaginaComponentes() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense fallback={null}>
      <Muestra />
    </Suspense>
  );
}

const HORA = 60 * 60 * 1000;

async function Muestra() {
  await connection(); // la hora de las muestras es la de cada petición
  const ahora = new Date();
  const hace = (horas: number) => new Date(ahora.getTime() - horas * HORA).toISOString();

  const capturas: CapturaCatalogo[] = [
    {
      id: "00000000-0000-4000-8000-000000000001",
      especie_id: 1,
      especie: "Sierra",
      pescador: "Juan Valenzuela",
      cooperativa: "Coop. Bahía de Guaymas",
      kg_disponibles: 30,
      kg_publicados: 40,
      precio_kg: 95,
      capturada_en: hace(3),
      publicada_en: hace(2.5),
      horas_desde_captura: 3,
      foto_path: "",
      notas: null,
      calificacion: 4.3,
      num_calificaciones: 11,
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      especie_id: 2,
      especie: "Cabrilla sardinera de nombre largo",
      pescador: "María Félix Moreno de la Garza",
      cooperativa: null,
      kg_disponibles: 12.5,
      kg_publicados: 12.5,
      precio_kg: 1250.5,
      capturada_en: hace(19.5),
      publicada_en: hace(19),
      horas_desde_captura: 19.5,
      foto_path: "",
      notas: null,
      calificacion: null,
      num_calificaciones: 1,
    },
  ];

  const evento = (estado: Estado, horas: number, quien: string | null, nota: string | null = null): EventoLinea => ({
    estado,
    creado_en: hace(horas),
    quien,
    actor_id: quien ? "x" : null,
    nota,
  });

  return (
    <div className="flex flex-col gap-8 pb-10">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-[26px] font-bold leading-8">Componentes</h1>
        <p className="text-sm text-ink-muted">Datos ficticios. Esta página no existe en producción.</p>
      </header>

      <Seccion titulo="BarraApp">
        <div className="-mx-4 flex flex-col gap-2">
          <BarraApp />
          <BarraApp rol="restaurante" />
          <BarraApp rol="pescador" volver={{ href: "/pescador", texto: "Mis capturas" }} />
        </div>
      </Seccion>

      <Seccion titulo="EstadoPedido">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ESTADOS) as Estado[]).map((e) => (
            <EstadoPedido key={e} estado={e} />
          ))}
        </div>
      </Seccion>

      <Seccion titulo="HoraCaptura">
        <div className="flex flex-col gap-4 rounded-lg bg-surface p-4">
          <HoraCaptura capturadaEn={hace(0.67)} ahora={ahora} conNota />
          <HoraCaptura capturadaEn={hace(3)} ahora={ahora} />
          <HoraCaptura capturadaEn={hace(20)} ahora={ahora} />
          <HoraCaptura capturadaEn={hace(20)} ahora={ahora} compacta />
        </div>
      </Seccion>

      <Seccion titulo="TarjetaCaptura">
        <div className="flex flex-col gap-3">
          {capturas.map((c) => (
            <TarjetaCaptura key={c.id} captura={c} foto={null} ahora={ahora} href={null} />
          ))}
          <TarjetaCaptura captura={capturas[0]} foto={null} ahora={ahora} conPublicados href={null} />
        </div>
      </Seccion>

      <Seccion titulo="LineaTiempo">
        <div className="flex flex-col gap-4">
          <Tarjeta titulo="Aceptado, vista del restaurante">
            <LineaTiempo
              estado="aceptado"
              papel="restaurante"
              modalidad="entrega"
              eventos={[
                evento("solicitado", 2, "La Palapa", "Pago retenido: $997.50."),
                evento("aceptado", 1.5, "Juan Valenzuela"),
              ]}
            />
          </Tarjeta>
          <Tarjeta titulo="Entregado, vista del restaurante">
            <LineaTiempo
              estado="entregado"
              papel="restaurante"
              eventos={[
                evento("solicitado", 3, "La Palapa"),
                evento("aceptado", 2.5, "Juan Valenzuela"),
                evento("entregado", 0.5, "Juan Valenzuela"),
              ]}
            />
          </Tarjeta>
          <Tarjeta titulo="Con incidencia y resolución">
            <LineaTiempo
              estado="con_incidencia"
              papel="pescador"
              eventos={[
                evento("solicitado", 6, "La Palapa"),
                evento("aceptado", 5, "Juan Valenzuela"),
                evento("entregado", 4, "Juan Valenzuela"),
                evento("con_incidencia", 3, "La Palapa", "Llegaron 8 kg en lugar de 10 kg."),
                evento("con_incidencia", 1, "Admin", "Resolución: reembolso parcial de $190.00."),
              ]}
            />
          </Tarjeta>
          <Tarjeta titulo="Cancelado por vencimiento">
            <LineaTiempo
              estado="cancelado"
              papel="restaurante"
              eventos={[
                evento("solicitado", 26, "La Palapa"),
                evento("cancelado", 2, null, "Sin respuesta en 24 h: se reembolsó el pago."),
              ]}
            />
          </Tarjeta>
          <Tarjeta titulo="Sin bitácora (solicitado)">
            <LineaTiempo estado="solicitado" papel="pescador" eventos={[]} />
          </Tarjeta>
        </div>
      </Seccion>

      <Seccion titulo="Aviso">
        <div className="flex flex-col gap-3">
          <Aviso tono="exito" titulo="Captura publicada">
            Ya aparece en el catálogo de hoy.
          </Aviso>
          <Aviso tono="error" titulo="Inventario insuficiente">
            Solo quedan 5 kg disponibles.
          </Aviso>
          <Aviso tono="alerta" titulo="Modo de prueba: no se cobra dinero real">
            FrescoDirecto retiene el pago hasta que confirmes la recepción.
          </Aviso>
        </div>
      </Seccion>

      <Seccion titulo="EstadoVacio">
        <div className="flex flex-col gap-3">
          <div className="rounded-lg bg-surface">
            <EstadoVacio
              icono={Fish}
              titulo="Aún no hay capturas publicadas hoy"
              ayuda="Los pescadores publican desde temprano. Vuelve más tarde."
            />
          </div>
          <div className="rounded-lg bg-surface">
            <EstadoVacio
              icono={Receipt}
              titulo="Todavía no has hecho pedidos"
              accion={
                <BotonEnlace href="/" variante="secundario">
                  Ver catálogo
                </BotonEnlace>
              }
            />
          </div>
        </div>
      </Seccion>

      <DemoInteractiva />
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">{titulo}</h2>
      {children}
    </section>
  );
}

function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-card">
      <h3 className="font-bold">{titulo}</h3>
      {children}
    </div>
  );
}
