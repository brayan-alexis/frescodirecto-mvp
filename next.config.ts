import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Solo las fotos públicas del bucket `capturas` de nuestro proyecto de Supabase.
  images: {
    remotePatterns: supabaseUrl
      ? [new URL("/storage/v1/object/public/capturas/**", supabaseUrl)]
      : [],
  },
  // Rutas de la plantilla que ahora viven en /login y /registro (la query se conserva).
  async redirects() {
    return [
      { source: "/auth/login", destination: "/login", permanent: false },
      { source: "/auth/sign-up", destination: "/registro", permanent: false },
    ];
  },
};

export default nextConfig;
