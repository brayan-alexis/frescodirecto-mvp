"use client";

import { BarraAccion } from "@/components/fd/barra-accion";
import { Boton, BotonEnlace } from "@/components/fd/boton";
import { Campo, atributosControl, claseControl } from "@/components/fd/campo";
import { CampoFoto } from "@/components/fd/campo-foto";
import { Filtros } from "@/components/fd/filtros";
import { NavInferior } from "@/components/fd/nav-inferior";
import type { Filtros as ValoresFiltros } from "@/lib/filtros-catalogo";
import type { Rol } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { Check, List, Plus, Truck, X } from "lucide-react";
import { useEffect, useState } from "react";

const ESPECIES = [
  { id: 1, nombre: "Sierra" },
  { id: 2, nombre: "Cabrilla" },
  { id: 3, nombre: "Huachinango" },
  { id: 4, nombre: "Camarón" },
  { id: 5, nombre: "Pulpo" },
  { id: 6, nombre: "Lenguado" },
];

/** Las piezas con estado: botones ocupados, campos, foto, filtros y navegación. */
export function DemoInteractiva() {
  const [ocupado, setOcupado] = useState(false);
  const [kg, setKg] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<ValoresFiltros>({ especie: null, precio: null, horas: null });

  useEffect(
    () => () => {
      if (foto) URL.revokeObjectURL(foto);
    },
    [foto],
  );

  const simular = () => {
    setOcupado(true);
    setTimeout(() => setOcupado(false), 2000);
  };

  return (
    <>
      <Seccion titulo="Boton">
        <div className="flex flex-col gap-3">
          <Boton bloque icono={Plus} ocupado={ocupado} textoOcupado="Publicando…" onClick={simular}>
            Publicar captura
          </Boton>
          <div className="grid grid-cols-2 gap-3">
            <Boton variante="secundario" icono={X} bloque>
              Rechazar
            </Boton>
            <Boton variante="primario" icono={Check} bloque disabled>
              Aceptar
            </Boton>
          </div>
          <Boton variante="peligro" bloque>
            Reportar incidencia
          </Boton>
          <div className="flex flex-wrap gap-2">
            <Boton variante="fantasma">Salir</Boton>
            <BotonEnlace href="/" variante="secundario" icono={List}>
              Ver catálogo
            </BotonEnlace>
          </div>
        </div>
      </Seccion>

      <Seccion titulo="Campo">
        <div className="flex flex-col gap-5 rounded-lg bg-surface p-4">
          <div className="grid grid-cols-2 gap-3">
            <Campo
              id="demo-kg"
              etiqueta="Kilos"
              sufijo="kg"
              inputMode="decimal"
              value={kg}
              onChange={(e) => setKg(e.target.value)}
              ayuda="Hasta 30 kg."
            />
            <Campo id="demo-precio" etiqueta="Precio por kilo" prefijo="$" sufijo="/kg" inputMode="decimal" />
          </div>
          <Campo
            id="demo-error"
            etiqueta="Kilos a pedir"
            sufijo="kg"
            inputMode="decimal"
            defaultValue="40"
            error="Pide 5 kg o menos."
          />
          <Campo id="demo-especie" etiqueta="Especie" error="Dato incompleto. Elige una especie.">
            <select
              {...atributosControl("demo-especie", "Dato incompleto. Elige una especie.")}
              defaultValue=""
              className={cn(claseControl, "w-full")}
            >
              <option value="">Elige una especie</option>
              {ESPECIES.map((e) => (
                <option key={e.id}>{e.nombre}</option>
              ))}
            </select>
          </Campo>
        </div>
      </Seccion>

      <Seccion titulo="CampoFoto">
        <div className="flex flex-col gap-5 rounded-lg bg-surface p-4">
          <CampoFoto
            id="demo-foto"
            etiqueta="Foto de la captura"
            vistaPrevia={foto}
            onChange={(e) => {
              const archivo = e.target.files?.[0];
              if (archivo) setFoto(URL.createObjectURL(archivo));
            }}
          />
          <CampoFoto
            id="demo-foto-error"
            etiqueta="Foto con error"
            vistaPrevia={null}
            error="Dato incompleto. Agrega una foto de la captura."
            onChange={() => {}}
          />
        </div>
      </Seccion>

      <Seccion titulo="Filtros">
        <div className="-mx-4">
          <Filtros especies={ESPECIES} filtros={filtros} alCambiar={(c) => setFiltros((f) => ({ ...f, ...c }))} />
        </div>
        <p className="break-all font-mono text-sm text-ink-muted">{JSON.stringify(filtros)}</p>
      </Seccion>

      <Seccion titulo="NavInferior">
        <div className="-mx-4 flex flex-col gap-2">
          {(["restaurante", "pescador", "admin"] as Rol[]).map((rol) => (
            <div key={rol}>
              <NavInferior rol={rol} />
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion titulo="BarraAccion">
        <BarraAccion resumen={{ izquierda: "10 kg × $95.00", derecha: "Total $950.00" }}>
          <Boton bloque icono={Truck} ocupado={ocupado} textoOcupado="Enviando pedido…" onClick={simular}>
            Pedir 10 kg · $950.00
          </Boton>
        </BarraAccion>
      </Seccion>
    </>
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
