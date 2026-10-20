import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

// Los colores son variables CSS de app/globals.css. color-mix deja funcionar los
// modificadores de opacidad de Tailwind 3 (bg-primary/90, border-white/40) sobre ellas.
const token = (variable: string) =>
  `color-mix(in srgb, var(${variable}) calc(<alpha-value> * 100%), transparent)`;

// Tokens del sistema de diseño (docs/ui/sistema-diseno.md): cada nombre genera
// bg-<nombre>, text-<nombre>, border-<nombre>…
const TOKENS = [
  "bg",
  "surface",
  "surface-sunken",
  "line",
  "line-strong",
  "ink",
  "ink-muted",
  "marea",
  "on-marea",
  "marea-soft",
  "boya",
  "boya-hover",
  "on-boya",
  "fresco",
  "fresco-soft",
  "alerta",
  "alerta-soft",
  "error",
  "error-soft",
  "focus",
  "solicitado",
  "solicitado-soft",
  "aceptado",
  "aceptado-soft",
  "entregado",
  "entregado-soft",
  "recibido",
  "recibido-soft",
  "incidencia",
  "incidencia-soft",
  "rechazado",
  "rechazado-soft",
  "cancelado",
  "cancelado-soft",
];

export default {
  darkMode: ["variant", '&:where([data-theme="dark"], [data-theme="dark"] *, .dark, .dark *)'],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ...Object.fromEntries(TOKENS.map((nombre) => [nombre, token(`--color-${nombre}`)])),
        background: token("--background"),
        foreground: token("--foreground"),
        card: {
          DEFAULT: token("--card"),
          foreground: token("--card-foreground"),
        },
        popover: {
          DEFAULT: token("--popover"),
          foreground: token("--popover-foreground"),
        },
        primary: {
          DEFAULT: token("--primary"),
          foreground: token("--primary-foreground"),
        },
        secondary: {
          DEFAULT: token("--secondary"),
          foreground: token("--secondary-foreground"),
        },
        muted: {
          DEFAULT: token("--muted"),
          foreground: token("--muted-foreground"),
        },
        accent: {
          DEFAULT: token("--accent"),
          foreground: token("--accent-foreground"),
        },
        destructive: {
          DEFAULT: token("--destructive"),
          foreground: token("--destructive-foreground"),
        },
        border: token("--border"),
        input: token("--input"),
        ring: token("--ring"),
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        bar: "var(--shadow-bar)",
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", '"Times New Roman"', "serif"],
        sans: ["var(--font-atkinson)", '"Segoe UI"', "system-ui", "sans-serif"],
        mono: ["var(--font-atkinson-mono)", "ui-monospace", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
