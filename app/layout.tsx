import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import { AvisoAcceso } from "@/components/aviso-acceso";
import { Encabezado } from "@/components/encabezado";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  // Cada página pone su título y la plantilla agrega la marca: "Mis pedidos · FrescoDirecto".
  title: {
    default: "FrescoDirecto · Pescado del día en Guaymas",
    template: "%s · FrescoDirecto",
  },
  description:
    "Los pescadores de Guaymas publican su captura del día y las marisquerías de Guaymas y San Carlos la piden y la pagan en la app.",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-MX">
      <body className={`${geistSans.className} flex min-h-svh flex-col antialiased`}>
        <Encabezado />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
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
