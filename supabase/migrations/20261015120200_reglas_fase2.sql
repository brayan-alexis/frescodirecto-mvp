-- =============================================================================
-- FrescoDirecto IA · Migración 3 de 3 · Reglas simples y métricas
-- Se puede aplicar desde ya; las pantallas que las usan llegan en la Fase 2.
-- Reglas simples sobre datos propios, como pidió la docente:
--   · precio de referencia: mediana por especie, pedidos recibidos, últimos 14 días
--   · demanda estimada: promedio de kg por especie y día de la semana, últimas 4 semanas
--   · estado de cuenta semanal: lo pagado en la app, la comisión cobrada y los reembolsos
--   · métricas semanales para el plan financiero (KPIs del Lean Canvas), con
--     ventas liberadas, comisiones y satisfacción
-- Estas reglas son la línea base que una IA futura tendría que superar.
-- =============================================================================

create or replace function public._inicio_semana(p_fecha date)
returns date
language sql immutable set search_path = ''
as $$
  select p_fecha - (extract(isodow from p_fecha)::integer - 1);
$$;

create or replace function public.precio_referencia(
  p_dias   integer default 14,
  p_minimo integer default 3
)
returns table (especie_id integer, especie text, mediana_precio_kg numeric, pedidos bigint)
language sql stable security definer set search_path = ''
as $$
  select e.id, e.nombre,
         round(percentile_cont(0.5) within group (order by pe.precio_kg)::numeric, 2),
         count(*)
  from public.pedidos pe
  join public.capturas c on c.id = pe.captura_id
  join public.especies e on e.id = c.especie_id
  where pe.estado = 'recibido_conforme'
    and pe.creado_en >= now() - make_interval(days => p_dias)
  group by e.id, e.nombre
  having count(*) >= p_minimo
  order by e.nombre;
$$;

-- Ventana de 28 días que termina ayer: contiene exactamente 4 de cada día de la semana.
create or replace function public.demanda_estimada(p_especie_id integer default null)
returns table (especie_id integer, especie text, dia_semana integer, dia text, kg_promedio numeric)
language sql stable security definer set search_path = ''
as $$
  with ventana as (
    select (now() at time zone 'America/Hermosillo')::date - 28 as desde,
           (now() at time zone 'America/Hermosillo')::date - 1  as hasta
  ),
  diario as (
    select c.especie_id,
           (pe.creado_en at time zone 'America/Hermosillo')::date as fecha,
           sum(pe.kg) as kg
    from public.pedidos pe
    join public.capturas c on c.id = pe.captura_id
    cross join ventana v
    where pe.estado not in ('rechazado', 'cancelado')
      and (pe.creado_en at time zone 'America/Hermosillo')::date between v.desde and v.hasta
    group by 1, 2
  )
  select e.id, e.nombre, d.num, d.nombre_dia, round(coalesce(sum(di.kg), 0) / 4.0, 1)
  from public.especies e
  cross join (values (1, 'lunes'), (2, 'martes'), (3, 'miércoles'), (4, 'jueves'),
                     (5, 'viernes'), (6, 'sábado'), (7, 'domingo')) as d(num, nombre_dia)
  left join diario di
         on di.especie_id = e.id and extract(isodow from di.fecha)::integer = d.num
  where e.activa and (p_especie_id is null or e.id = p_especie_id)
  group by e.id, e.nombre, d.num, d.nombre_dia
  order by e.nombre, d.num;
$$;

-- Estado de cuenta semanal (lunes a domingo, hora de Sonora) de los pagos hechos
-- en la app. El restaurante ve el suyo; el administrador ve todos.
create or replace function public.estado_cuenta(p_fecha date default null)
returns table (semana_inicio date, restaurante_id uuid, restaurante text,
               pedidos bigint, total_pagado numeric, comision_cobrada numeric,
               reembolsado numeric, retenido numeric)
language sql stable security definer set search_path = ''
as $$
  with lim as (
    select public._inicio_semana(coalesce(p_fecha, (now() at time zone 'America/Hermosillo')::date)) as ini
  )
  select lim.ini, r.id, coalesce(r.negocio, r.nombre),
         count(*),
         sum(pa.total),
         sum(pa.comision_cobrada),
         sum(pa.monto_reembolsado),
         coalesce(sum(pa.total) filter (where pa.estado in ('retenido', 'en_disputa')), 0)
  from public.pagos pa
  join public.perfiles r on r.id = pa.restaurante_id
  cross join lim
  where (pa.pagado_en at time zone 'America/Hermosillo')::date >= lim.ini
    and (pa.pagado_en at time zone 'America/Hermosillo')::date <  lim.ini + 7
    and (public.es_admin() or pa.restaurante_id = auth.uid())
  group by lim.ini, r.id, r.negocio, r.nombre
  order by 3;
$$;

-- KPIs semanales (solo administrador): base para el plan financiero.
-- Ventas = valor del pescado liberado a pescadores; comisiones = ingreso de FrescoDirecto.
create or replace function public.kpis_semanales(p_semanas integer default 8)
returns table (semana_inicio date, pedidos_recibidos bigint, kg_recibidos numeric,
               ventas_liberadas numeric, comisiones numeric, reembolsos numeric,
               pct_incidencias numeric, pct_mismo_dia numeric,
               pct_captura_vendida numeric, restaurantes_activos bigint,
               satisfaccion_promedio numeric, pct_calificados numeric)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Acceso denegado: solo administradores.' using detail = 'ROL_NO_PERMITIDO';
  end if;

  return query
  with semanas as (
    select public._inicio_semana((now() at time zone 'America/Hermosillo')::date) - 7 * g as ini
    from generate_series(0, p_semanas - 1) as g
  ),
  ped as (
    select pe.estado, pe.kg, pe.restaurante_id,
           public._inicio_semana((pe.creado_en at time zone 'America/Hermosillo')::date) as sem,
           (c.capturada_en at time zone 'America/Hermosillo')::date as dia_captura,
           (pe.actualizado_en at time zone 'America/Hermosillo')::date as dia_cierre,
           pa.monto_pescador, pa.comision_cobrada, pa.monto_reembolsado,
           ca.estrellas
    from public.pedidos pe
    join public.capturas c on c.id = pe.captura_id
    left join public.pagos pa on pa.pedido_id = pe.id
    left join public.calificaciones ca on ca.pedido_id = pe.id
  ),
  cap as (
    select public._inicio_semana((capturada_en at time zone 'America/Hermosillo')::date) as sem,
           sum(kg_publicados) as kg_pub,
           sum(kg_publicados - kg_disponibles) as kg_vend
    from public.capturas
    group by 1
  )
  select s.ini,
         count(p.estado) filter (where p.estado = 'recibido_conforme'),
         coalesce(sum(p.kg) filter (where p.estado = 'recibido_conforme'), 0),
         coalesce(sum(p.monto_pescador), 0),
         coalesce(sum(p.comision_cobrada), 0),
         coalesce(sum(p.monto_reembolsado), 0),
         round(100.0 * count(p.estado) filter (where p.estado = 'con_incidencia')
               / nullif(count(p.estado) filter (where p.estado in ('recibido_conforme', 'con_incidencia')), 0), 1),
         round(100.0 * count(p.estado) filter (where p.estado = 'recibido_conforme' and p.dia_cierre = p.dia_captura)
               / nullif(count(p.estado) filter (where p.estado = 'recibido_conforme'), 0), 1),
         round(100.0 * max(cap.kg_vend) / nullif(max(cap.kg_pub), 0), 1),
         count(distinct p.restaurante_id) filter (where p.estado = 'recibido_conforme'),
         round(avg(p.estrellas)::numeric, 2),
         round(100.0 * count(p.estrellas)
               / nullif(count(p.estado) filter (where p.estado in ('recibido_conforme', 'con_incidencia')), 0), 1)
  from semanas s
  left join ped p on p.sem = s.ini
  left join cap on cap.sem = s.ini
  group by s.ini
  order by s.ini;
end;
$$;

revoke execute on function
  public._inicio_semana(date),
  public.precio_referencia(integer, integer),
  public.demanda_estimada(integer),
  public.estado_cuenta(date),
  public.kpis_semanales(integer)
from public, anon, authenticated;

grant execute on function public.precio_referencia(integer, integer) to anon, authenticated;
grant execute on function
  public.demanda_estimada(integer),
  public.estado_cuenta(date),
  public.kpis_semanales(integer)
to authenticated;
