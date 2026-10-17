import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Rutas de la plantilla que ahora viven en /login y /registro (la query se conserva).
  async redirects() {
    return [
      { source: "/auth/login", destination: "/login", permanent: false },
      { source: "/auth/sign-up", destination: "/registro", permanent: false },
    ];
  },
};

export default nextConfig;
