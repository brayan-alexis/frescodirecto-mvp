// Crea las 8 cuentas demo de FrescoDirecto y sube las fotos de ejemplo.
//
// Uso (una vez, desde la raíz del proyecto):
//   node --env-file=.env.local scripts/crear-usuarios-demo.mjs
//
// Necesita en .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY y DEMO_PASSWORD.
// La secret key solo vive en .env.local: nunca en Vercel, en el navegador ni en el repo.
// Es seguro volver a correrlo: las cuentas que ya existen se dejan igual.
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const password = process.env.DEMO_PASSWORD;

if (!url || !secretKey || !password) {
  console.error('Faltan variables en .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY y DEMO_PASSWORD.');
  process.exit(1);
}
if (password.length < 10) {
  console.error('DEMO_PASSWORD debe tener al menos 10 caracteres.');
  process.exit(1);
}

const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Datos ficticios. El rol de admin lo asigna cargar_datos_demo(): nadie lo obtiene al registrarse.
const cuentas = [
  { email: 'fd.admin@example.com', meta: { rol: 'restaurante', nombre: 'Coordinación FrescoDirecto' } },
  { email: 'fd.pescador1@example.com', meta: { rol: 'pescador', nombre: 'Juan Valenzuela', negocio: 'Coop. Bahía de Guaymas', telefono: '622-000-0101' } },
  { email: 'fd.pescador2@example.com', meta: { rol: 'pescador', nombre: 'Rosa Martínez', negocio: 'Pescadores de La Cantera', telefono: '622-000-0102' } },
  { email: 'fd.pescador3@example.com', meta: { rol: 'pescador', nombre: 'Ernesto Ruiz', negocio: 'Independiente', telefono: '622-000-0103' } },
  { email: 'fd.pescador4@example.com', meta: { rol: 'pescador', nombre: 'Luis Gámez', negocio: 'Independiente', telefono: '622-000-0104' } },
  { email: 'fd.restaurante1@example.com', meta: { rol: 'restaurante', nombre: 'Martha Leyva', negocio: 'Marisquería El Muelle', telefono: '622-000-0201' } },
  { email: 'fd.restaurante2@example.com', meta: { rol: 'restaurante', nombre: 'Carlos Ochoa', negocio: 'Mariscos La Manga', telefono: '622-000-0202' } },
  { email: 'fd.restaurante3@example.com', meta: { rol: 'restaurante', nombre: 'Ana Islas', negocio: 'Mariscos Bahía San Carlos', telefono: '622-000-0203' } },
];

console.log('Cuentas demo');
for (const cuenta of cuentas) {
  const { error } = await supabase.auth.admin.createUser({
    email: cuenta.email,
    password,
    email_confirm: true,
    user_metadata: cuenta.meta,
  });
  if (!error) {
    console.log(`  ✓ ${cuenta.email}`);
  } else if (error.code === 'email_exists' || /already/i.test(error.message)) {
    console.log(`  • ${cuenta.email} (ya existía)`);
  } else {
    console.error(`  ✗ ${cuenta.email}: ${error.message}`);
    process.exitCode = 1;
  }
}

// Las capturas demo apuntan a demo/<especie>.jpg en el bucket "capturas".
const especies = ['sierra', 'huachinango', 'cabrilla', 'pargo', 'corvina', 'lenguado'];
const carpeta = path.join(process.cwd(), 'supabase', 'seed-fotos');

console.log('\nFotos demo');
for (const especie of especies) {
  let datos;
  try {
    datos = await readFile(path.join(carpeta, `${especie}.jpg`));
  } catch {
    console.warn(`  ⚠ Falta supabase/seed-fotos/${especie}.jpg (la captura se verá sin foto)`);
    continue;
  }
  const { error } = await supabase.storage
    .from('capturas')
    .upload(`demo/${especie}.jpg`, datos, { contentType: 'image/jpeg', upsert: true });
  console.log(error ? `  ✗ ${especie}: ${error.message}` : `  ✓ demo/${especie}.jpg`);
  if (error) process.exitCode = 1;
}

console.log('\nSiguiente paso, en el SQL Editor de Supabase:\n  select public.cargar_datos_demo();');
