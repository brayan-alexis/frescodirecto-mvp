// Fuentes del sistema de diseño FrescoDirecto con next/font (se sirven desde nuestro dominio,
// sin llamadas a Google en el navegador). tailwind.config.ts las usa como font-display, font-sans y font-mono.
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next, Playfair_Display } from "next/font/google";

export const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-playfair",
  display: "swap",
});

export const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--font-atkinson",
  display: "swap",
});

export const atkinsonMono = Atkinson_Hyperlegible_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-atkinson-mono",
  display: "swap",
});
