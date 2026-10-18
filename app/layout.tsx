import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { AvisoAcceso } from "@/components/aviso-acceso";
import { Encabezado } from "@/components/encabezado";
import { atkinson, atkinsonMono, playfair } from "./fuentes";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  // Cada página pone su título y la plantilla agrega la marca: "Mis pedidos · FrescoDirecto".
  title: {
    default: "FrescoDirecto · Pescado del día",
    template: "%s · FrescoDirecto",
  },
  description: "Pescado del día de Guaymas y San Carlos, del muelle a la marisquería.",
};

// En Next 16 el color de la barra del navegador va en viewport, no en metadata.
export const viewport: Viewport = {
  themeColor: "#16233F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-MX"
      className={`${playfair.variable} ${atkinson.variable} ${atkinsonMono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-svh flex-col">
        <Encabezado />
        <main className="mx-auto w-full max-w-[480px] flex-1 px-4 py-6">
          <Suspense fallback={null}>
            <AvisoAcceso />
          </Suspense>
          {children}
        </main>
        <footer className="border-t px-4 py-6 text-center text-xs text-muted-foreground">
          MVP académico · Todos los datos son ficticios
        </footer>
      </body>
    </html>
  );
}
