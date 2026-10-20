# FrescoDirecto IA · MVP

Marketplace B2B de pescado del día para marisquerías de Guaymas y San Carlos, Sonora. El pescador publica su captura desde el teléfono. El restaurante pide los kg exactos y paga en la app. FrescoDirecto retiene el pago hasta que el restaurante confirma la recepción, y después el restaurante califica al pescador.

Proyecto de Global Project · Maestría en Inteligencia Artificial Centrada en la Sociedad (ITSON), 2026.
Equipo: Marco Antonio Blasco Esquer, Brayan Alexis Fajardo Ortiz e Itzel Yacquelin Beltrán Reyes.

- **App en línea:** https://frescodirecto-mvp.vercel.app
- **Versión entregada:** `v1.0.0` (20 de octubre de 2026)
- **Todos los datos son ficticios. Los pagos usan una pasarela de prueba: no se cobra dinero real.**

## Funciones del MVP

| Función | Quién | Qué hace |
| --- | --- | --- |
| F1. Publicar captura | Pescador aprobado | Especie, kg, precio, hora y foto. La hora de publicación la pone el servidor |
| F2. Catálogo del día | Cualquiera | Capturas de menos de 24 h con kg disponibles, con filtros por especie, precio y horas, y la reputación del pescador |
| F3. Pedido con pago protegido | Restaurante | Descuenta los kg sin sobreventa, cobra en la app (valor del pescado más 5 % de comisión) y retiene el pago |
| F4. Seguimiento y recepción | Pescador y restaurante | El pescador acepta o rechaza y marca entregado. El restaurante confirma conforme, lo que libera el pago, o reporta una incidencia, que deja el pago en disputa |
| F5. Calificación del pescador | Restaurante | De 1 a 5 estrellas después de recibir; promedio público con 3 o más calificaciones |

Soporte: registro con rol, aprobación de pescadores, resolución de disputas y reinicio de la demo desde `/admin`.

## Rutas

| Ruta | Para quién | Qué contiene |
| --- | --- | --- |
| `/` | Todos | Catálogo del día |
| `/captura/[id]` | Todos | Detalle, pedido y pago |
| `/login`, `/registro` | Visitante | Inicio de sesión y registro con rol |
| `/pedidos`, `/pedidos/[id]` | Restaurante (el detalle también lo ve el pescador del pedido) | Pedidos, recepción y calificación |
| `/pescador` | Pescador | Sus capturas y su reputación |
| `/pescador/publicar` | Pescador | Formulario de publicación |
| `/pescador/ventas` | Pescador | Pedidos recibidos y pagos |
| `/admin` | Admin | Pescadores pendientes, disputas y reinicio de la demo |

## Stack

Next.js 16 (App Router, TypeScript, Tailwind) en Vercel · Supabase (Postgres con RLS, Auth, Storage, Cron) · GitHub Actions.

## Configuración desde cero

1. **Requisitos:** cuentas gratuitas de GitHub, Vercel y Supabase; Node.js 20.9 o superior; Git.
2. **Esquema:** en Supabase → New project → SQL Editor, ejecutar en orden los tres archivos de `supabase/migrations/`.
3. **Correo:** Authentication → Sign In / Providers → Email → desactivar **Confirm email**.
4. **Variables:** copiar `.env.example` como `.env.local` y llenarlas. Las llaves están en el botón Connect y en Project Settings → API Keys.
5. **Cuentas demo:** `npm install` y luego `node --env-file=.env.local scripts/crear-usuarios-demo.mjs`. Crea 8 cuentas y sube las fotos de `supabase/seed-fotos/`.
6. **Escenario demo:** en el SQL Editor, `select public.cargar_datos_demo();`. Debe responder "Escenario demo listo: 5 capturas en el catálogo de hoy, … pedidos pagados en la app, … calificaciones y 1 disputa abierta."
7. **Tareas programadas:** Integrations → Cron → habilitar pg_cron y ejecutar `supabase/cron_reinicio_demo.sql`. Programa el reinicio diario de la demo a las 05:00 y los vencimientos de pagos cada hora.
8. **Ejecutar:** en local, `npm run dev` y abrir http://localhost:3000. En línea, importar el repo en Vercel con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Probar

- **Pago de prueba:**
  - la tarjeta terminación **4242** se aprueba;
  - la **0002** se rechaza, y en ese caso no se crea pedido ni se aparta producto.

  La app nunca pide números de tarjeta.
- **Automática (reglas, permisos y dinero):** pegar `supabase/pruebas/pruebas_reglas.sql` en el SQL Editor. Con `psql` se ven 32 avisos "cumple"; el SQL Editor suele mostrar solo "Success. No rows returned". En ambos casos, éxito = ningún error. No deja cambios.
- **Manual (P01–P10):** seguir `docs/pruebas-manuales.md`, con cuentas demo y el nombre de cada evidencia.
- **Reiniciar el escenario:** `select public.cargar_datos_demo();` o el botón Reiniciar demo del administrador.

## Cuentas demo

| Cuenta | Rol |
| --- | --- |
| `fd.restaurante1@example.com` | Restaurante (Martha Leyva, Marisquería El Muelle) |
| `fd.restaurante2@example.com`, `fd.restaurante3@example.com` | Restaurantes |
| `fd.pescador1@example.com` a `fd.pescador3@example.com` | Pescadores aprobados |
| `fd.pescador4@example.com` | Pescador pendiente de aprobación |
| `fd.admin@example.com` | Administrador |

La contraseña común se comparte solo por el medio acordado con la docente.
