-- =============================================================================
-- FrescoDirecto IA · MVP · Migración 1 de 3
-- Esquema, permisos (RLS) y reglas de negocio del MVP:
--   F1 publicar captura · F2 catálogo del día · F3 pedido con pago protegido
--   F4 seguimiento, recepción y liberación del pago · F5 calificación del pescador
--
-- Cómo aplicarla: Supabase → SQL Editor → pegar este archivo completo → Run.
-- Se ejecuta UNA vez en un proyecto nuevo. Probada en PostgreSQL 16 con los
-- esquemas auth y storage simulados (ver supabase/pruebas/).
--
-- Principio de diseño: las tablas son de solo lectura para la app. Toda
-- escritura de negocio pasa por funciones (RPC) que validan rol, estado,
-- inventario y dinero. Así ninguna pantalla puede saltarse una regla.
--
-- Cobro dentro de la app (retroalimentación docente, 16 de octubre de 2026):
-- el restaurante paga al pedir y FrescoDirecto retiene el dinero hasta que el
-- restaurante confirma la recepción; entonces lo libera al pescador. La
-- comisión de 5 % la paga el restaurante y solo se cobra en pedidos recibidos
-- conforme. En el MVP la pasarela es simulada (tarjetas de prueba); en la
-- Fase 2 se conecta una pasarela real en modo de prueba sin cambiar este modelo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tipos
-- -----------------------------------------------------------------------------
create type public.rol_usuario as enum ('restaurante', 'pescador', 'admin');
create type public.estado_cuenta as enum ('pendiente', 'aprobado', 'rechazado');
create type public.estado_captura as enum ('activa', 'retirada');
create type public.estado_pedido as enum (
  'solicitado', 'aceptado', 'rechazado', 'entregado',
  'recibido_conforme', 'con_incidencia', 'cancelado'
);
create type public.modalidad_entrega as enum ('entrega', 'recoleccion');
-- retenido: FrescoDirecto guarda el dinero · en_disputa: hay una incidencia sin resolver
-- liberado: se pagó al pescador · reembolsado: se devolvió todo al restaurante
create type public.estado_pago as enum ('retenido', 'en_disputa', 'liberado', 'reembolsado');

-- -----------------------------------------------------------------------------
-- 2. Tablas
-- -----------------------------------------------------------------------------
create table public.especies (
  id      integer generated always as identity primary key,
  nombre  text not null unique,
  activa  boolean not null default true
);

-- Un perfil por usuario de Supabase Auth. Lo crea el trigger de la sección 4.
create table public.perfiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  rol        public.rol_usuario not null,
  estado     public.estado_cuenta not null,
  nombre     text not null,
  negocio    text,          -- nombre de la marisquería o de la cooperativa
  telefono   text,
  email      text,
  creado_en  timestamptz not null default now()
);

-- Lo que publica un pescador: un lote de una especie con su inventario.
create table public.capturas (
  id              uuid primary key default gen_random_uuid(),
  pescador_id     uuid not null references public.perfiles (id),
  especie_id      integer not null references public.especies (id),
  kg_publicados   numeric(7,2) not null check (kg_publicados > 0 and kg_publicados <= 2000),
  kg_disponibles  numeric(7,2) not null,
  precio_kg       numeric(8,2) not null check (precio_kg > 0 and precio_kg <= 5000),
  capturada_en    timestamptz not null,               -- hora declarada por el pescador
  publicada_en    timestamptz not null default now(), -- hora del servidor
  foto_path       text not null check (length(trim(foto_path)) > 0),
  notas           text check (notas is null or length(notas) <= 280),
  estado          public.estado_captura not null default 'activa',
  constraint kg_disponibles_en_rango check (kg_disponibles >= 0 and kg_disponibles <= kg_publicados),
  -- La hora declarada nunca puede ser posterior a la publicación (5 min de tolerancia
  -- por relojes desfasados). Por eso la regla de 24 h nunca se alarga.
  constraint captura_no_futura check (capturada_en <= publicada_en + interval '5 minutes')
);
create index capturas_vigentes_idx on public.capturas (capturada_en desc) where estado = 'activa';
create index capturas_pescador_idx on public.capturas (pescador_id);

-- Un pedido corresponde a una sola captura (decisión de alcance del MVP).
create table public.pedidos (
  id              uuid primary key default gen_random_uuid(),
  numero          bigint generated always as identity unique,
  folio           text generated always as ('FD-' || lpad(numero::text, 5, '0')) stored,
  captura_id      uuid not null references public.capturas (id),
  restaurante_id  uuid not null references public.perfiles (id),
  pescador_id     uuid not null references public.perfiles (id),
  kg              numeric(7,2) not null check (kg > 0),
  precio_kg       numeric(8,2) not null check (precio_kg > 0),  -- precio congelado al pedir
  total           numeric(10,2) generated always as (round(kg * precio_kg, 2)) stored,  -- valor del pescado
  modalidad       public.modalidad_entrega not null default 'entrega',
  estado          public.estado_pedido not null default 'solicitado',
  motivo_rechazo  text,
  nota_incidencia text,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  constraint incidencia_con_nota check (
    estado <> 'con_incidencia' or length(trim(coalesce(nota_incidencia, ''))) >= 5
  )
);
create index pedidos_restaurante_idx on public.pedidos (restaurante_id, creado_en desc);
create index pedidos_pescador_idx on public.pedidos (pescador_id, creado_en desc);
create index pedidos_captura_idx on public.pedidos (captura_id);

-- Bitácora de cambios de estado: alimenta el seguimiento y las métricas.
-- actor_id vacío = lo hizo el sistema (vencimientos automáticos).
create table public.pedido_eventos (
  id         bigint generated always as identity primary key,
  pedido_id  uuid not null references public.pedidos (id) on delete cascade,
  estado     public.estado_pedido not null,
  actor_id   uuid references public.perfiles (id),
  nota       text,
  creado_en  timestamptz not null default now()
);
create index pedido_eventos_pedido_idx on public.pedido_eventos (pedido_id, creado_en);

-- Pago protegido: uno por pedido. El restaurante paga al pedir; FrescoDirecto
-- retiene el dinero y al cerrar el pedido lo reparte entre pescador, restaurante
-- (reembolso) y comisión. Nunca se guardan datos de tarjetas.
create table public.pagos (
  id                   uuid primary key default gen_random_uuid(),
  numero               bigint generated always as identity unique,
  recibo               text generated always as ('PAG-' || lpad(numero::text, 5, '0')) stored,
  pedido_id            uuid not null unique references public.pedidos (id) on delete cascade,
  restaurante_id       uuid not null references public.perfiles (id),
  pescador_id          uuid not null references public.perfiles (id),
  subtotal             numeric(10,2) not null check (subtotal > 0),   -- valor del pescado: lo recibe el pescador
  comision             numeric(10,2) not null check (comision >= 0),  -- 5 % que paga el restaurante
  total                numeric(10,2) generated always as (subtotal + comision) stored,  -- lo que se cobró
  estado               public.estado_pago not null default 'retenido',
  proveedor            text not null default 'simulado'
                       check (proveedor in ('simulado', 'stripe', 'mercadopago')),
  metodo               text not null,                -- p. ej. tarjeta_prueba_4242
  referencia_proveedor text,                         -- id del cargo en la pasarela real (Fase 2)
  pagado_en            timestamptz not null default now(),
  liberado_en          timestamptz,
  reembolsado_en       timestamptz,
  monto_pescador       numeric(10,2) not null default 0 check (monto_pescador >= 0),     -- liberado al pescador
  monto_reembolsado    numeric(10,2) not null default 0 check (monto_reembolsado >= 0),  -- devuelto al restaurante
  comision_cobrada     numeric(10,2) not null default 0 check (comision_cobrada >= 0),   -- ingreso de FrescoDirecto
  nota_resolucion      text,
  resuelto_por         uuid references public.perfiles (id),
  -- Mientras está abierto, el dinero no se ha movido.
  constraint pago_abierto_sin_movimientos check (
    estado not in ('retenido', 'en_disputa')
    or (monto_pescador = 0 and monto_reembolsado = 0 and comision_cobrada = 0
        and liberado_en is null and reembolsado_en is null)
  ),
  -- Al cerrarse, lo cobrado se reparte completo: ni un peso se pierde ni se duplica.
  constraint pago_cuadra check (
    estado in ('retenido', 'en_disputa')
    or monto_pescador + monto_reembolsado + comision_cobrada = subtotal + comision
  )
);
create index pagos_restaurante_idx on public.pagos (restaurante_id, pagado_en desc);
create index pagos_pescador_idx on public.pagos (pescador_id, pagado_en desc);
create index pagos_abiertos_idx on public.pagos (estado) where estado in ('retenido', 'en_disputa');

-- Calificación de satisfacción: el restaurante califica al pescador después de
-- recibir un pedido pagado en la app. Es opcional y hay una por pedido.
create table public.calificaciones (
  id              uuid primary key default gen_random_uuid(),
  pedido_id       uuid not null unique references public.pedidos (id) on delete cascade,
  restaurante_id  uuid not null references public.perfiles (id),
  pescador_id     uuid not null references public.perfiles (id),
  estrellas       smallint not null check (estrellas between 1 and 5),
  comentario      text check (comentario is null or length(comentario) <= 280),
  creado_en       timestamptz not null default now()
);
create index calificaciones_pescador_idx on public.calificaciones (pescador_id, creado_en desc);

-- -----------------------------------------------------------------------------
-- 3. Funciones auxiliares (SECURITY DEFINER evita recursión en RLS)
-- -----------------------------------------------------------------------------
create or replace function public.mi_rol()
returns public.rol_usuario
language sql stable security definer set search_path = ''
as $$
  select rol from public.perfiles where id = auth.uid();
$$;

create or replace function public.es_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol = 'admin' and estado = 'aprobado'
  );
$$;

create or replace function public.es_pescador_aprobado()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol = 'pescador' and estado = 'aprobado'
  );
$$;

-- Comisión de FrescoDirecto: un solo lugar para cambiarla.
create or replace function public.tasa_comision()
returns numeric
language sql immutable set search_path = ''
as $$
  select 0.05::numeric;
$$;

-- Reputación pública del pescador: el promedio solo se muestra con 3 o más
-- calificaciones; antes, la app muestra "Nuevo". Sin comentarios ni nombres.
create or replace function public.reputacion_pescador(p_pescador_id uuid)
returns table (calificacion numeric, num_calificaciones integer)
language sql stable security definer set search_path = ''
as $$
  select case when count(*) >= 3 then round(avg(ca.estrellas)::numeric, 1) end,
         count(*)::integer
  from public.calificaciones ca
  where ca.pescador_id = p_pescador_id;
$$;

-- -----------------------------------------------------------------------------
-- 4. Alta de perfiles: al registrarse, el rol viene de los metadatos.
--    Nadie puede darse rol de admin; el pescador nace pendiente de aprobación.
-- -----------------------------------------------------------------------------
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_rol  public.rol_usuario := case
           when v_meta ->> 'rol' = 'pescador' then 'pescador'::public.rol_usuario
           else 'restaurante'::public.rol_usuario
         end;
begin
  insert into public.perfiles (id, rol, estado, nombre, negocio, telefono, email)
  values (
    new.id,
    v_rol,
    case when v_rol = 'pescador' then 'pendiente'::public.estado_cuenta
         else 'aprobado'::public.estado_cuenta end,
    coalesce(nullif(trim(v_meta ->> 'nombre'), ''), split_part(new.email, '@', 1)),
    nullif(trim(v_meta ->> 'negocio'), ''),
    nullif(trim(v_meta ->> 'telefono'), ''),
    new.email
  );
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo_usuario();

-- -----------------------------------------------------------------------------
-- 5. Lecturas públicas: catálogo del día y detalle (sin teléfonos ni correos)
--    Incluyen la reputación del pescador (F5).
-- -----------------------------------------------------------------------------
create or replace function public.catalogo_del_dia(
  p_especie_id integer default null,
  p_precio_max numeric default null,
  p_horas_max  numeric default null
)
returns table (
  id uuid, especie_id integer, especie text, pescador text, cooperativa text,
  kg_disponibles numeric, kg_publicados numeric, precio_kg numeric,
  capturada_en timestamptz, publicada_en timestamptz, horas_desde_captura numeric,
  foto_path text, notas text, calificacion numeric, num_calificaciones integer
)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.especie_id, e.nombre, p.nombre, p.negocio,
         c.kg_disponibles, c.kg_publicados, c.precio_kg,
         c.capturada_en, c.publicada_en,
         round((extract(epoch from (now() - c.capturada_en)) / 3600.0)::numeric, 1),
         c.foto_path, c.notas, r.calificacion, r.num_calificaciones
  from public.capturas c
  join public.especies e on e.id = c.especie_id
  join public.perfiles p on p.id = c.pescador_id
  cross join lateral public.reputacion_pescador(c.pescador_id) r
  where c.estado = 'activa'
    and c.kg_disponibles > 0
    and c.capturada_en > now() - interval '24 hours'   -- regla de 24 h
    and p.estado = 'aprobado'
    and (p_especie_id is null or c.especie_id = p_especie_id)
    and (p_precio_max is null or c.precio_kg <= p_precio_max)
    and (p_horas_max  is null or c.capturada_en > now() - make_interval(secs => p_horas_max * 3600))
  order by c.capturada_en desc;
$$;

create or replace function public.detalle_captura(p_id uuid)
returns table (
  id uuid, especie_id integer, especie text, pescador text, cooperativa text,
  kg_disponibles numeric, kg_publicados numeric, precio_kg numeric,
  capturada_en timestamptz, publicada_en timestamptz, horas_desde_captura numeric,
  foto_path text, notas text, disponible boolean,
  calificacion numeric, num_calificaciones integer
)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.especie_id, e.nombre, p.nombre, p.negocio,
         c.kg_disponibles, c.kg_publicados, c.precio_kg,
         c.capturada_en, c.publicada_en,
         round((extract(epoch from (now() - c.capturada_en)) / 3600.0)::numeric, 1),
         c.foto_path, c.notas,
         (c.estado = 'activa' and c.kg_disponibles > 0
           and c.capturada_en > now() - interval '24 hours' and p.estado = 'aprobado'),
         r.calificacion, r.num_calificaciones
  from public.capturas c
  join public.especies e on e.id = c.especie_id
  join public.perfiles p on p.id = c.pescador_id
  cross join lateral public.reputacion_pescador(c.pescador_id) r
  where c.id = p_id;
$$;

-- -----------------------------------------------------------------------------
-- 6. F1 · Publicar captura (pescador aprobado)
--    Los errores llevan detail = código y hint = campo, para marcarlo en pantalla.
-- -----------------------------------------------------------------------------
create or replace function public.publicar_captura(
  p_especie_id   integer,
  p_kg           numeric,
  p_precio_kg    numeric,
  p_foto_path    text,
  p_capturada_en timestamptz default null,
  p_notas        text default null
)
returns public.capturas
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_capturada timestamptz := coalesce(p_capturada_en, now());
  v_kg        numeric := round(p_kg, 2);
  v_precio    numeric := round(p_precio_kg, 2);
  v_notas     text := nullif(trim(p_notas), '');
  v_fila      public.capturas;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para publicar.' using detail = 'SIN_SESION';
  end if;
  if not public.es_pescador_aprobado() then
    raise exception 'Solo los pescadores con cuenta aprobada pueden publicar.'
      using detail = 'ROL_NO_PERMITIDO';
  end if;
  if p_especie_id is null
     or not exists (select 1 from public.especies where id = p_especie_id and activa) then
    raise exception 'Dato incompleto: selecciona la especie.'
      using detail = 'DATO_INCOMPLETO', hint = 'especie';
  end if;
  if v_kg is null or v_kg <= 0 then
    raise exception 'Dato incompleto: los kilogramos deben ser mayores a 0.'
      using detail = 'DATO_INCOMPLETO', hint = 'kg';
  end if;
  if v_kg > 2000 then
    raise exception 'Revisa la cantidad: máximo 2,000 kg por publicación.'
      using detail = 'DATO_INVALIDO', hint = 'kg';
  end if;
  if v_precio is null or v_precio <= 0 or v_precio > 5000 then
    raise exception 'Dato incompleto: el precio por kg debe ser mayor a 0 (máximo $5,000).'
      using detail = 'DATO_INCOMPLETO', hint = 'precio';
  end if;
  if p_foto_path is null or length(trim(p_foto_path)) = 0 then
    raise exception 'Dato incompleto: agrega la foto de la captura.'
      using detail = 'DATO_INCOMPLETO', hint = 'foto';
  end if;
  if split_part(trim(p_foto_path), '/', 1) <> v_uid::text then
    raise exception 'La foto no pertenece a tu cuenta.'
      using detail = 'DATO_INVALIDO', hint = 'foto';
  end if;
  if v_capturada > now() + interval '5 minutes' then
    raise exception 'La hora de captura no puede estar en el futuro.'
      using detail = 'DATO_INVALIDO', hint = 'capturada_en';
  end if;
  if v_capturada < now() - interval '24 hours' then
    raise exception 'La captura tiene más de 24 horas; ya no puede publicarse.'
      using detail = 'DATO_INVALIDO', hint = 'capturada_en';
  end if;
  if length(coalesce(v_notas, '')) > 280 then
    raise exception 'Las notas admiten 280 caracteres como máximo.'
      using detail = 'DATO_INVALIDO', hint = 'notas';
  end if;
  -- Contra la fuga: el contacto se comparte solo dentro de un pedido pagado.
  if v_notas ~ '(\d[\s().-]*){10,}'
     or v_notas ~* '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}' then
    raise exception 'Las notas no pueden incluir teléfonos ni correos: el contacto se comparte al aceptar un pedido pagado.'
      using detail = 'DATO_INVALIDO', hint = 'notas';
  end if;

  insert into public.capturas (
    pescador_id, especie_id, kg_publicados, kg_disponibles, precio_kg,
    capturada_en, foto_path, notas
  )
  values (
    v_uid, p_especie_id, v_kg, v_kg, v_precio,
    least(v_capturada, now()), trim(p_foto_path), v_notas
  )
  returning * into v_fila;

  return v_fila;
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. Pago protegido: movimientos internos del dinero retenido
--    'liberar'    → el pescador recibe el subtotal y FrescoDirecto la comisión
--    'reembolsar' → el restaurante recibe todo lo que pagó
--    'disputa'    → el dinero queda retenido hasta que el administrador resuelva
--    Uso interno: la llaman las funciones de pedido; la app no la ve.
-- -----------------------------------------------------------------------------
create or replace function public._mover_pago(
  p_pedido_id uuid,
  p_accion    text,
  p_nota      text default null
)
returns public.pagos
language plpgsql security definer set search_path = ''
as $$
declare
  v_pago public.pagos;
begin
  select * into v_pago from public.pagos where pedido_id = p_pedido_id for update;
  if not found then
    raise exception 'El pedido no tiene pago registrado.' using detail = 'PAGO_NO_ENCONTRADO';
  end if;
  if v_pago.estado not in ('retenido', 'en_disputa')
     or (p_accion = 'disputa' and v_pago.estado <> 'retenido') then
    raise exception 'El pago ya no se puede mover (estado: %).', v_pago.estado
      using detail = 'TRANSICION_INVALIDA';
  end if;

  if p_accion = 'liberar' then
    update public.pagos
       set estado = 'liberado', liberado_en = now(),
           monto_pescador = subtotal, comision_cobrada = comision
     where id = v_pago.id
    returning * into v_pago;
  elsif p_accion = 'reembolsar' then
    update public.pagos
       set estado = 'reembolsado', reembolsado_en = now(),
           monto_reembolsado = subtotal + comision,
           nota_resolucion = coalesce(p_nota, nota_resolucion)
     where id = v_pago.id
    returning * into v_pago;
  elsif p_accion = 'disputa' then
    update public.pagos set estado = 'en_disputa' where id = v_pago.id
    returning * into v_pago;
  else
    raise exception 'Movimiento de pago desconocido: %', p_accion;
  end if;
  return v_pago;
end;
$$;

-- -----------------------------------------------------------------------------
-- 8. F3 · Solicitar pedido y pagarlo en la app (restaurante)
--    1) Descuenta los kg en UNA sentencia UPDATE con la condición de inventario
--       en el WHERE: si dos restaurantes piden a la vez, Postgres bloquea la fila,
--       reevalúa la condición y el segundo recibe "inventario insuficiente".
--    2) Cobra con la pasarela de prueba. Si la tarjeta se rechaza, la excepción
--       deshace todo: no hay pedido, ni cargo, ni producto apartado.
--    3) Crea el pedido y su pago retenido.
--    Tarjetas de prueba: '4242' se aprueba, '0002' se rechaza. La app solo envía
--    la terminación elegida; nunca se capturan números de tarjeta.
-- -----------------------------------------------------------------------------
create or replace function public.solicitar_pedido(
  p_captura_id     uuid,
  p_kg             numeric,
  p_modalidad      public.modalidad_entrega default 'entrega',
  p_tarjeta_prueba text default '4242'
)
returns public.pedidos
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_kg        numeric := round(p_kg, 2);
  v_captura   public.capturas;
  v_pedido    public.pedidos;
  v_pago      public.pagos;
  v_restantes numeric;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para pedir.' using detail = 'SIN_SESION';
  end if;
  if public.mi_rol() is distinct from 'restaurante'::public.rol_usuario then
    raise exception 'Solo los restaurantes pueden hacer pedidos.'
      using detail = 'ROL_NO_PERMITIDO';
  end if;
  if v_kg is null or v_kg <= 0 then
    raise exception 'La cantidad debe ser mayor a 0 kg.'
      using detail = 'DATO_INVALIDO', hint = 'kg';
  end if;
  if p_tarjeta_prueba is null or p_tarjeta_prueba not in ('4242', '0002') then
    raise exception 'Elige una tarjeta de prueba.'
      using detail = 'DATO_INCOMPLETO', hint = 'pago';
  end if;

  update public.capturas c
     set kg_disponibles = c.kg_disponibles - v_kg
   where c.id = p_captura_id
     and c.estado = 'activa'
     and c.capturada_en > now() - interval '24 hours'
     and c.kg_disponibles >= v_kg
     and exists (select 1 from public.perfiles pf
                 where pf.id = c.pescador_id and pf.estado = 'aprobado')
  returning c.* into v_captura;

  if not found then
    select c.kg_disponibles into v_restantes
      from public.capturas c
     where c.id = p_captura_id
       and c.estado = 'activa'
       and c.capturada_en > now() - interval '24 hours';
    if v_restantes is null or v_restantes = 0 then
      raise exception 'Esta captura ya no está disponible.'
        using detail = 'CAPTURA_NO_DISPONIBLE';
    end if;
    raise exception 'Operación inválida: inventario insuficiente. %',
      case when v_restantes = 1 then 'Solo queda 1 kg disponible.'
           else format('Solo quedan %s kg disponibles.', rtrim(rtrim(v_restantes::text, '0'), '.')) end
      using detail = 'INVENTARIO_INSUFICIENTE', hint = 'kg';
  end if;

  -- Pasarela de prueba (simulada). En la Fase 2 aquí se valida el cargo real.
  if p_tarjeta_prueba = '0002' then
    raise exception 'Pago rechazado por la pasarela de prueba (tarjeta terminación 0002). No se hizo ningún cargo ni se apartó producto.'
      using detail = 'PAGO_RECHAZADO', hint = 'pago';
  end if;

  insert into public.pedidos (captura_id, restaurante_id, pescador_id, kg, precio_kg, modalidad)
  values (v_captura.id, v_uid, v_captura.pescador_id, v_kg, v_captura.precio_kg,
          coalesce(p_modalidad, 'entrega'::public.modalidad_entrega))
  returning * into v_pedido;

  insert into public.pagos (pedido_id, restaurante_id, pescador_id, subtotal, comision, metodo)
  values (v_pedido.id, v_uid, v_pedido.pescador_id, v_pedido.total,
          round(v_pedido.total * public.tasa_comision(), 2),
          'tarjeta_prueba_' || p_tarjeta_prueba)
  returning * into v_pago;

  insert into public.pedido_eventos (pedido_id, estado, actor_id, nota)
  values (v_pedido.id, v_pedido.estado, v_uid,
          format('Pago %s retenido por FrescoDirecto: $%s', v_pago.recibo, v_pago.total));

  return v_pedido;
end;
$$;

-- -----------------------------------------------------------------------------
-- 9. F4 · Seguimiento, recepción y liberación del pago
-- -----------------------------------------------------------------------------
create or replace function public.responder_pedido(
  p_pedido_id uuid,
  p_aceptar   boolean,
  p_motivo    text default null
)
returns public.pedidos
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_pedido public.pedidos;
begin
  if v_uid is null then
    raise exception 'Inicia sesión.' using detail = 'SIN_SESION';
  end if;
  if p_aceptar is null then
    raise exception 'Indica si aceptas o rechazas el pedido.' using detail = 'DATO_INCOMPLETO';
  end if;

  select * into v_pedido from public.pedidos
   where id = p_pedido_id and pescador_id = v_uid
   for update;
  if not found then
    raise exception 'Pedido no encontrado.' using detail = 'PEDIDO_NO_ENCONTRADO';
  end if;
  if v_pedido.estado <> 'solicitado' then
    raise exception 'Este pedido ya fue respondido (estado: %).', v_pedido.estado
      using detail = 'TRANSICION_INVALIDA';
  end if;

  if p_aceptar then
    update public.pedidos
       set estado = 'aceptado', actualizado_en = now()
     where id = v_pedido.id
    returning * into v_pedido;
  else
    -- Rechazar devuelve los kg al inventario y el dinero al restaurante.
    update public.capturas
       set kg_disponibles = kg_disponibles + v_pedido.kg
     where id = v_pedido.captura_id;
    update public.pedidos
       set estado = 'rechazado', motivo_rechazo = nullif(trim(p_motivo), ''),
           actualizado_en = now()
     where id = v_pedido.id
    returning * into v_pedido;
    perform public._mover_pago(v_pedido.id, 'reembolsar', 'Rechazado por el pescador');
  end if;

  insert into public.pedido_eventos (pedido_id, estado, actor_id, nota)
  values (v_pedido.id, v_pedido.estado, v_uid,
          case when p_aceptar then nullif(trim(p_motivo), '')
               else concat_ws('. ', nullif(trim(p_motivo), ''), 'Pago reembolsado al restaurante') end);

  return v_pedido;
end;
$$;

create or replace function public.marcar_entregado(p_pedido_id uuid)
returns public.pedidos
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_pedido public.pedidos;
begin
  if v_uid is null then
    raise exception 'Inicia sesión.' using detail = 'SIN_SESION';
  end if;
  select * into v_pedido from public.pedidos
   where id = p_pedido_id and pescador_id = v_uid
   for update;
  if not found then
    raise exception 'Pedido no encontrado.' using detail = 'PEDIDO_NO_ENCONTRADO';
  end if;
  if v_pedido.estado <> 'aceptado' then
    raise exception 'Solo un pedido aceptado puede marcarse como entregado (estado: %).', v_pedido.estado
      using detail = 'TRANSICION_INVALIDA';
  end if;

  update public.pedidos
     set estado = 'entregado', actualizado_en = now()
   where id = v_pedido.id
  returning * into v_pedido;

  insert into public.pedido_eventos (pedido_id, estado, actor_id)
  values (v_pedido.id, v_pedido.estado, v_uid);

  return v_pedido;
end;
$$;

-- El restaurante confirma desde "entregado" o directamente desde "aceptado"
-- (caso de recolección en el muelle, donde nadie marca la entrega).
-- Conforme → se libera el pago al pescador. Con incidencia → el pago queda en
-- disputa hasta que el administrador la resuelva.
create or replace function public.confirmar_recepcion(
  p_pedido_id uuid,
  p_conforme  boolean,
  p_nota      text default null
)
returns public.pedidos
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_pedido public.pedidos;
  v_nota   text := nullif(trim(p_nota), '');
begin
  if v_uid is null then
    raise exception 'Inicia sesión.' using detail = 'SIN_SESION';
  end if;
  if p_conforme is null then
    raise exception 'Indica si recibiste conforme o con incidencia.' using detail = 'DATO_INCOMPLETO';
  end if;
  if not p_conforme and length(coalesce(v_nota, '')) < 5 then
    raise exception 'Describe la incidencia (mínimo 5 caracteres).'
      using detail = 'DATO_INCOMPLETO', hint = 'nota';
  end if;

  select * into v_pedido from public.pedidos
   where id = p_pedido_id and restaurante_id = v_uid
   for update;
  if not found then
    raise exception 'Pedido no encontrado.' using detail = 'PEDIDO_NO_ENCONTRADO';
  end if;
  if v_pedido.estado not in ('aceptado', 'entregado') then
    raise exception 'Este pedido no está listo para confirmarse (estado: %).', v_pedido.estado
      using detail = 'TRANSICION_INVALIDA';
  end if;

  update public.pedidos
     set estado = case when p_conforme then 'recibido_conforme'::public.estado_pedido
                       else 'con_incidencia'::public.estado_pedido end,
         nota_incidencia = case when p_conforme then null else v_nota end,
         actualizado_en = now()
   where id = v_pedido.id
  returning * into v_pedido;

  perform public._mover_pago(v_pedido.id, case when p_conforme then 'liberar' else 'disputa' end);

  insert into public.pedido_eventos (pedido_id, estado, actor_id, nota)
  values (v_pedido.id, v_pedido.estado, v_uid,
          case when p_conforme then 'Pago liberado al pescador'
               else v_nota || '. Pago retenido en revisión' end);

  return v_pedido;
end;
$$;

-- Cancelar mientras el pescador no responde (devuelve los kg y el dinero).
create or replace function public.cancelar_pedido(p_pedido_id uuid)
returns public.pedidos
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_pedido public.pedidos;
begin
  if v_uid is null then
    raise exception 'Inicia sesión.' using detail = 'SIN_SESION';
  end if;
  select * into v_pedido from public.pedidos
   where id = p_pedido_id and restaurante_id = v_uid
   for update;
  if not found then
    raise exception 'Pedido no encontrado.' using detail = 'PEDIDO_NO_ENCONTRADO';
  end if;
  if v_pedido.estado <> 'solicitado' then
    raise exception 'Solo se puede cancelar un pedido que el pescador no ha respondido.'
      using detail = 'TRANSICION_INVALIDA';
  end if;

  update public.capturas
     set kg_disponibles = kg_disponibles + v_pedido.kg
   where id = v_pedido.captura_id;
  update public.pedidos
     set estado = 'cancelado', actualizado_en = now()
   where id = v_pedido.id
  returning * into v_pedido;
  perform public._mover_pago(v_pedido.id, 'reembolsar', 'Cancelado por el restaurante');

  insert into public.pedido_eventos (pedido_id, estado, actor_id, nota)
  values (v_pedido.id, v_pedido.estado, v_uid, 'Pago reembolsado al restaurante');

  return v_pedido;
end;
$$;

-- Lista de pedidos del usuario (como restaurante o como pescador), con su pago y
-- su calificación. Contra la fuga y por privacidad, el teléfono de la contraparte
-- solo aparece mientras el pedido está activo (aceptado o entregado).
create or replace function public.mis_pedidos()
returns table (
  id uuid, folio text, mi_papel text, estado public.estado_pedido,
  especie text, foto_path text, kg numeric, precio_kg numeric, total numeric,
  modalidad public.modalidad_entrega, contraparte text, contraparte_negocio text,
  contraparte_telefono text, motivo_rechazo text, nota_incidencia text,
  creado_en timestamptz, actualizado_en timestamptz,
  pago_estado public.estado_pago, recibo text, comision numeric, total_pagado numeric,
  monto_pescador numeric, monto_reembolsado numeric,
  calificacion smallint, puede_calificar boolean
)
language sql stable security definer set search_path = ''
as $$
  select pe.id, pe.folio,
         case when pe.restaurante_id = auth.uid() then 'restaurante' else 'pescador' end,
         pe.estado, e.nombre, c.foto_path, pe.kg, pe.precio_kg, pe.total, pe.modalidad,
         o.nombre, o.negocio,
         case when pe.estado in ('aceptado', 'entregado') then o.telefono end,
         pe.motivo_rechazo, pe.nota_incidencia, pe.creado_en, pe.actualizado_en,
         pa.estado, pa.recibo, pa.comision, pa.total, pa.monto_pescador, pa.monto_reembolsado,
         ca.estrellas,
         (pe.restaurante_id = auth.uid()
          and pe.estado in ('recibido_conforme', 'con_incidencia')
          and ca.id is null)
  from public.pedidos pe
  join public.capturas c on c.id = pe.captura_id
  join public.especies e on e.id = c.especie_id
  join public.perfiles o on o.id = case when pe.restaurante_id = auth.uid()
                                        then pe.pescador_id else pe.restaurante_id end
  left join public.pagos pa on pa.pedido_id = pe.id
  left join public.calificaciones ca on ca.pedido_id = pe.id
  where pe.restaurante_id = auth.uid() or pe.pescador_id = auth.uid()
  order by pe.creado_en desc;
$$;

-- -----------------------------------------------------------------------------
-- 10. F5 · Calificación de satisfacción (restaurante → pescador)
--     Solo compras verificadas: pedido pagado en la app y ya recibido.
-- -----------------------------------------------------------------------------
create or replace function public.calificar_pedido(
  p_pedido_id  uuid,
  p_estrellas  integer,
  p_comentario text default null
)
returns public.calificaciones
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid        uuid := auth.uid();
  v_pedido     public.pedidos;
  v_comentario text := nullif(trim(p_comentario), '');
  v_fila       public.calificaciones;
begin
  if v_uid is null then
    raise exception 'Inicia sesión.' using detail = 'SIN_SESION';
  end if;
  if p_estrellas is null or p_estrellas not between 1 and 5 then
    raise exception 'Elige de 1 a 5 estrellas.' using detail = 'DATO_INVALIDO', hint = 'estrellas';
  end if;
  if length(coalesce(v_comentario, '')) > 280 then
    raise exception 'El comentario admite 280 caracteres como máximo.'
      using detail = 'DATO_INVALIDO', hint = 'comentario';
  end if;

  select * into v_pedido from public.pedidos
   where id = p_pedido_id and restaurante_id = v_uid;
  if not found then
    raise exception 'Pedido no encontrado.' using detail = 'PEDIDO_NO_ENCONTRADO';
  end if;
  if v_pedido.estado not in ('recibido_conforme', 'con_incidencia') then
    raise exception 'Solo puedes calificar un pedido que ya recibiste.' using detail = 'NO_CALIFICABLE';
  end if;

  begin
    insert into public.calificaciones (pedido_id, restaurante_id, pescador_id, estrellas, comentario)
    values (v_pedido.id, v_uid, v_pedido.pescador_id, p_estrellas, v_comentario)
    returning * into v_fila;
  exception when unique_violation then
    raise exception 'Ya calificaste este pedido.' using detail = 'YA_CALIFICADO';
  end;

  return v_fila;
end;
$$;

-- Calificaciones que recibió el pescador que consulta (con comentario y negocio).
-- Los comentarios no son públicos: solo los ven el pescador y el administrador.
create or replace function public.mis_calificaciones()
returns table (folio text, especie text, estrellas smallint, comentario text,
               restaurante text, creado_en timestamptz)
language sql stable security definer set search_path = ''
as $$
  select pe.folio, e.nombre, ca.estrellas, ca.comentario,
         coalesce(r.negocio, r.nombre), ca.creado_en
  from public.calificaciones ca
  join public.pedidos pe on pe.id = ca.pedido_id
  join public.capturas c on c.id = pe.captura_id
  join public.especies e on e.id = c.especie_id
  join public.perfiles r on r.id = ca.restaurante_id
  where ca.pescador_id = auth.uid()
  order by ca.creado_en desc;
$$;

-- -----------------------------------------------------------------------------
-- 11. Administración
-- -----------------------------------------------------------------------------
create or replace function public.aprobar_pescador(p_perfil_id uuid, p_aprobar boolean default true)
returns public.perfiles
language plpgsql security definer set search_path = ''
as $$
declare
  v_perfil public.perfiles;
begin
  if not public.es_admin() then
    raise exception 'Acceso denegado: solo administradores.' using detail = 'ROL_NO_PERMITIDO';
  end if;
  update public.perfiles
     set estado = case when p_aprobar then 'aprobado'::public.estado_cuenta
                       else 'rechazado'::public.estado_cuenta end
   where id = p_perfil_id and rol = 'pescador'
  returning * into v_perfil;
  if not found then
    raise exception 'Pescador no encontrado.' using detail = 'PERFIL_NO_ENCONTRADO';
  end if;
  return v_perfil;
end;
$$;

-- Disputas abiertas: pedidos con incidencia cuyo pago sigue retenido.
create or replace function public.disputas_abiertas()
returns table (pedido_id uuid, folio text, recibo text, especie text, kg numeric,
               subtotal numeric, comision numeric, restaurante text, pescador text,
               nota_incidencia text, reportado_en timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.es_admin() then
    raise exception 'Acceso denegado: solo administradores.' using detail = 'ROL_NO_PERMITIDO';
  end if;
  return query
  select pe.id, pe.folio, pa.recibo, e.nombre, pe.kg, pa.subtotal, pa.comision,
         coalesce(r.negocio, r.nombre), p.nombre, pe.nota_incidencia, pe.actualizado_en
  from public.pagos pa
  join public.pedidos pe on pe.id = pa.pedido_id
  join public.capturas c on c.id = pe.captura_id
  join public.especies e on e.id = c.especie_id
  join public.perfiles r on r.id = pe.restaurante_id
  join public.perfiles p on p.id = pe.pescador_id
  where pa.estado = 'en_disputa'
  order by pe.actualizado_en;
end;
$$;

-- Resolver una disputa: el administrador decide cuánto del valor del pescado se
-- devuelve al restaurante (0 = todo al pescador; el subtotal = reembolso total).
-- Los pedidos con incidencia no generan comisión: siempre se devuelve.
create or replace function public.resolver_disputa(
  p_pedido_id uuid,
  p_reembolso numeric,
  p_nota      text
)
returns public.pagos
language plpgsql security definer set search_path = ''
as $$
declare
  v_pago      public.pagos;
  v_reembolso numeric := round(p_reembolso, 2);
  v_nota      text := nullif(trim(p_nota), '');
begin
  if not public.es_admin() then
    raise exception 'Acceso denegado: solo administradores.' using detail = 'ROL_NO_PERMITIDO';
  end if;
  if length(coalesce(v_nota, '')) < 5 then
    raise exception 'Explica la resolución (mínimo 5 caracteres).'
      using detail = 'DATO_INCOMPLETO', hint = 'nota';
  end if;
  select * into v_pago from public.pagos where pedido_id = p_pedido_id for update;
  if not found or v_pago.estado <> 'en_disputa' then
    raise exception 'Este pedido no tiene una disputa abierta.' using detail = 'TRANSICION_INVALIDA';
  end if;
  if v_reembolso is null or v_reembolso < 0 or v_reembolso > v_pago.subtotal then
    raise exception 'El reembolso debe estar entre $0 y $% (el valor del pescado).', v_pago.subtotal
      using detail = 'DATO_INVALIDO', hint = 'reembolso';
  end if;

  update public.pagos
     set estado = case when v_reembolso = subtotal then 'reembolsado'::public.estado_pago
                       else 'liberado'::public.estado_pago end,
         monto_pescador = subtotal - v_reembolso,
         monto_reembolsado = v_reembolso + comision,
         comision_cobrada = 0,
         liberado_en = case when v_reembolso < subtotal then now() end,
         reembolsado_en = now(),
         nota_resolucion = v_nota,
         resuelto_por = auth.uid()
   where id = v_pago.id
  returning * into v_pago;

  insert into public.pedido_eventos (pedido_id, estado, actor_id, nota)
  values (p_pedido_id, 'con_incidencia', auth.uid(),
          format('Resolución: $%s devueltos al restaurante y $%s pagados al pescador. %s',
                 v_pago.monto_reembolsado, v_pago.monto_pescador, v_nota));

  return v_pago;
end;
$$;

create or replace function public.retirar_captura(p_captura_id uuid)
returns public.capturas
language plpgsql security definer set search_path = ''
as $$
declare
  v_fila public.capturas;
begin
  update public.capturas
     set estado = 'retirada'
   where id = p_captura_id and pescador_id = auth.uid() and estado = 'activa'
  returning * into v_fila;
  if not found then
    raise exception 'Captura no encontrada o ya retirada.' using detail = 'CAPTURA_NO_DISPONIBLE';
  end if;
  return v_fila;
end;
$$;

-- Vencimientos automáticos (Supabase Cron, cada hora; ver supabase/cron_reinicio_demo.sql):
--   · solicitado sin respuesta del pescador por 24 h → cancelado y reembolsado
--   · entregado sin respuesta del restaurante por 24 h → recibido conforme y pago liberado
-- No se expone a la app.
create or replace function public.vencer_pedidos()
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_ped         public.pedidos;
  v_cancelados  integer := 0;
  v_confirmados integer := 0;
begin
  for v_ped in
    select * from public.pedidos
     where estado = 'solicitado' and creado_en < now() - interval '24 hours'
     for update skip locked
  loop
    update public.capturas set kg_disponibles = kg_disponibles + v_ped.kg where id = v_ped.captura_id;
    update public.pedidos set estado = 'cancelado', actualizado_en = now() where id = v_ped.id;
    perform public._mover_pago(v_ped.id, 'reembolsar', 'Vencido: el pescador no respondió en 24 h');
    insert into public.pedido_eventos (pedido_id, estado, actor_id, nota)
    values (v_ped.id, 'cancelado', null,
            'Cancelado automáticamente: el pescador no respondió en 24 h. Pago reembolsado');
    v_cancelados := v_cancelados + 1;
  end loop;

  for v_ped in
    select pe.* from public.pedidos pe
     where pe.estado = 'entregado'
       and (select max(ev.creado_en) from public.pedido_eventos ev
             where ev.pedido_id = pe.id and ev.estado = 'entregado') < now() - interval '24 hours'
     for update of pe skip locked
  loop
    update public.pedidos set estado = 'recibido_conforme', actualizado_en = now() where id = v_ped.id;
    perform public._mover_pago(v_ped.id, 'liberar');
    insert into public.pedido_eventos (pedido_id, estado, actor_id, nota)
    values (v_ped.id, 'recibido_conforme', null,
            'Confirmado automáticamente: pasaron 24 h desde la entrega sin reporte. Pago liberado al pescador');
    v_confirmados := v_confirmados + 1;
  end loop;

  return format('Cancelados por falta de respuesta: %s. Confirmados automáticamente: %s.',
                v_cancelados, v_confirmados);
end;
$$;

-- -----------------------------------------------------------------------------
-- 12. Seguridad por fila (RLS): solo lecturas; las escrituras van por funciones
-- -----------------------------------------------------------------------------
alter table public.especies       enable row level security;
alter table public.perfiles       enable row level security;
alter table public.capturas       enable row level security;
alter table public.pedidos        enable row level security;
alter table public.pedido_eventos enable row level security;
alter table public.pagos          enable row level security;
alter table public.calificaciones enable row level security;

create policy "Especies visibles para todos"
  on public.especies for select to anon, authenticated
  using (true);

create policy "Perfil propio o admin"
  on public.perfiles for select to authenticated
  using (id = (select auth.uid()) or (select public.es_admin()));

create policy "Capturas propias o admin"
  on public.capturas for select to authenticated
  using (pescador_id = (select auth.uid()) or (select public.es_admin()));

create policy "Pedidos donde participo o admin"
  on public.pedidos for select to authenticated
  using (restaurante_id = (select auth.uid())
         or pescador_id = (select auth.uid())
         or (select public.es_admin()));

create policy "Eventos de mis pedidos o admin"
  on public.pedido_eventos for select to authenticated
  using (
    exists (select 1 from public.pedidos p
            where p.id = pedido_id
              and (p.restaurante_id = (select auth.uid()) or p.pescador_id = (select auth.uid())))
    or (select public.es_admin())
  );

create policy "Pagos donde participo o admin"
  on public.pagos for select to authenticated
  using (restaurante_id = (select auth.uid())
         or pescador_id = (select auth.uid())
         or (select public.es_admin()));

create policy "Calificaciones donde participo o admin"
  on public.calificaciones for select to authenticated
  using (restaurante_id = (select auth.uid())
         or pescador_id = (select auth.uid())
         or (select public.es_admin()));

-- -----------------------------------------------------------------------------
-- 13. Privilegios: la API solo lee tablas (con RLS) y ejecuta funciones permitidas
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
grant select on public.especies to anon, authenticated;
grant select on public.perfiles, public.capturas, public.pedidos, public.pedido_eventos,
                public.pagos, public.calificaciones to authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.catalogo_del_dia(integer, numeric, numeric) to anon, authenticated;
grant execute on function public.detalle_captura(uuid) to anon, authenticated;
grant execute on function public.reputacion_pescador(uuid) to anon, authenticated;
grant execute on function
  public.mi_rol(),
  public.es_admin(),
  public.es_pescador_aprobado(),
  public.publicar_captura(integer, numeric, numeric, text, timestamptz, text),
  public.solicitar_pedido(uuid, numeric, public.modalidad_entrega, text),
  public.responder_pedido(uuid, boolean, text),
  public.marcar_entregado(uuid),
  public.confirmar_recepcion(uuid, boolean, text),
  public.cancelar_pedido(uuid),
  public.mis_pedidos(),
  public.calificar_pedido(uuid, integer, text),
  public.mis_calificaciones(),
  public.aprobar_pescador(uuid, boolean),
  public.disputas_abiertas(),
  public.resolver_disputa(uuid, numeric, text),
  public.retirar_captura(uuid)
to authenticated;
-- Sin permisos para la app: _mover_pago(), tasa_comision() y vencer_pedidos().

-- -----------------------------------------------------------------------------
-- 14. Fotos: bucket público de lectura; cada pescador aprobado sube a su carpeta
--     (ruta "<id del usuario>/<archivo>.jpg"). Máximo 5 MB, solo imágenes.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('capturas', 'capturas', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Pescadores aprobados suben fotos a su carpeta"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'capturas'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and (select public.es_pescador_aprobado())
  );

-- -----------------------------------------------------------------------------
-- 15. Catálogo de especies (ajustable)
-- -----------------------------------------------------------------------------
insert into public.especies (nombre) values
  ('Sierra'), ('Huachinango'), ('Cabrilla'), ('Pargo'),
  ('Corvina'), ('Lenguado'), ('Mojarra'), ('Jurel')
on conflict (nombre) do nothing;
