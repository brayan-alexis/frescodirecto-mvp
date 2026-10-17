-- =============================================================================
-- FrescoDirecto IA · MVP · Migración 2 de 3
-- Escenario de demostración reproducible (datos ficticios) y su reinicio.
--
-- Requisito: haber creado las cuentas demo (fd.*@example.com) con
--   node --env-file=.env.local scripts/crear-usuarios-demo.mjs
-- Después, en el SQL Editor:  select public.cargar_datos_demo();
-- Reiniciar el escenario: la misma llamada, o la función reiniciar_demo()
-- desde la cuenta de administrador. Solo borra y recrea datos de cuentas
-- demo; nunca toca otras cuentas.
-- =============================================================================

-- Inserta un pedido demo con un historial de estados y un pago coherentes.
create or replace function public._demo_pedido(
  p_captura_id     uuid,
  p_restaurante_id uuid,
  p_kg             numeric,
  p_estado         public.estado_pedido,
  p_creado         timestamptz,
  p_nota           text default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_c        public.capturas;
  v_id       uuid;
  v_ruta     public.estado_pedido[];
  v_i        integer;
  v_fin      timestamptz;
  v_subtotal numeric;
  v_comision numeric;
  v_cierre   text;
begin
  select * into v_c from public.capturas where id = p_captura_id;

  v_ruta := case p_estado
    when 'solicitado'        then array['solicitado']
    when 'aceptado'          then array['solicitado', 'aceptado']
    when 'entregado'         then array['solicitado', 'aceptado', 'entregado']
    when 'recibido_conforme' then array['solicitado', 'aceptado', 'entregado', 'recibido_conforme']
    when 'con_incidencia'    then array['solicitado', 'aceptado', 'entregado', 'con_incidencia']
    when 'rechazado'         then array['solicitado', 'rechazado']
    when 'cancelado'         then array['solicitado', 'cancelado']
  end::public.estado_pedido[];
  v_fin := p_creado + (array_length(v_ruta, 1) - 1) * interval '50 minutes';

  insert into public.pedidos (
    captura_id, restaurante_id, pescador_id, kg, precio_kg, modalidad, estado,
    motivo_rechazo, nota_incidencia, creado_en, actualizado_en
  )
  values (
    v_c.id, p_restaurante_id, v_c.pescador_id, p_kg, v_c.precio_kg, 'entrega', p_estado,
    case when p_estado = 'rechazado' then coalesce(p_nota, 'No alcanza el producto para hoy') end,
    case when p_estado = 'con_incidencia' then coalesce(p_nota, 'Llegó con hielo insuficiente') end,
    p_creado, v_fin
  )
  returning id into v_id;

  for v_i in 1 .. array_length(v_ruta, 1) loop
    insert into public.pedido_eventos (pedido_id, estado, actor_id, creado_en)
    values (
      v_id, v_ruta[v_i],
      case when v_ruta[v_i] in ('solicitado', 'recibido_conforme', 'con_incidencia', 'cancelado')
           then p_restaurante_id else v_c.pescador_id end,
      p_creado + (v_i - 1) * interval '50 minutes'
    );
  end loop;

  -- Pago con tarjeta de prueba: retenido si el pedido sigue abierto, liberado si se
  -- recibió conforme y reembolsado si se rechazó, se canceló o tuvo incidencia
  -- (las incidencias del historial ya se resolvieron con reembolso total).
  v_subtotal := round(p_kg * v_c.precio_kg, 2);
  v_comision := round(v_subtotal * public.tasa_comision(), 2);
  v_cierre := case
    when p_estado = 'recibido_conforme' then 'liberado'
    when p_estado in ('rechazado', 'cancelado', 'con_incidencia') then 'reembolsado'
    else 'retenido' end;

  insert into public.pagos (
    pedido_id, restaurante_id, pescador_id, subtotal, comision, metodo, pagado_en,
    estado, liberado_en, reembolsado_en, monto_pescador, monto_reembolsado,
    comision_cobrada, nota_resolucion
  )
  values (
    v_id, p_restaurante_id, v_c.pescador_id, v_subtotal, v_comision, 'tarjeta_prueba_4242', p_creado,
    v_cierre::public.estado_pago,
    case when v_cierre = 'liberado' then v_fin end,
    case when v_cierre = 'reembolsado' then v_fin end,
    case when v_cierre = 'liberado' then v_subtotal else 0 end,
    case when v_cierre = 'reembolsado' then v_subtotal + v_comision else 0 end,
    case when v_cierre = 'liberado' then v_comision else 0 end,
    case when p_estado = 'con_incidencia' then 'Reembolso total: la incidencia se comprobó con fotos.' end
  );

  if p_estado not in ('rechazado', 'cancelado') then
    update public.capturas set kg_disponibles = kg_disponibles - p_kg where id = v_c.id;
  end if;

  return v_id;
end;
$$;

-- Inserta una captura demo y devuelve su id.
create or replace function public._demo_captura(
  p_pescador_id uuid,
  p_especie     text,
  p_kg          numeric,
  p_precio      numeric,
  p_capturada   timestamptz,
  p_notas       text default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.capturas (
    pescador_id, especie_id, kg_publicados, kg_disponibles, precio_kg,
    capturada_en, publicada_en, foto_path, notas
  )
  select p_pescador_id, e.id, p_kg, p_kg, p_precio,
         p_capturada, p_capturada + interval '30 minutes',
         'demo/' || lower(translate(p_especie, 'áéíóú', 'aeiou')) || '.jpg',
         p_notas
    from public.especies e
   where e.nombre = p_especie
  returning id into v_id;

  if v_id is null then
    raise exception 'Especie demo inexistente: %', p_especie;
  end if;
  return v_id;
end;
$$;

-- Califica un pedido demo (solo historial).
create or replace function public._demo_calificacion(
  p_pedido_id  uuid,
  p_estrellas  integer,
  p_comentario text,
  p_creado     timestamptz
)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.calificaciones (pedido_id, restaurante_id, pescador_id, estrellas, comentario, creado_en)
  select pe.id, pe.restaurante_id, pe.pescador_id, p_estrellas, p_comentario, p_creado
    from public.pedidos pe
   where pe.id = p_pedido_id;
$$;

create or replace function public.cargar_datos_demo()
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_admin uuid; v_p1 uuid; v_p2 uuid; v_p3 uuid; v_p4 uuid;
  v_r1 uuid; v_r2 uuid; v_r3 uuid;
  v_demo uuid[];
  v_pescadores uuid[];
  v_restaurantes uuid[];
  v_rotacion text[] := array['Sierra', 'Huachinango', 'Cabrilla', 'Pargo', 'Corvina', 'Lenguado'];
  v_precios jsonb := '{"Sierra": 95, "Huachinango": 180, "Cabrilla": 160,
                       "Pargo": 150, "Corvina": 85, "Lenguado": 140}';
  v_buenos text[] := array['Llegó fresco y a tiempo', 'Buen peso, sin faltantes',
                           'Muy buena calidad, repetiré', 'Bien enhielado',
                           'Puntual y amable'];
  v_malos text[] := array['Llegó tarde', 'Faltó hielo en la hielera',
                          'El peso no coincidió', 'Calidad irregular'];
  v_hoy date := (now() at time zone 'America/Hermosillo')::date;
  v_fecha date;
  v_finde boolean;
  v_dia integer; v_f integer; v_r integer; v_idx integer;
  v_especie text;
  v_kg_ped numeric; v_disp numeric; v_azar double precision;
  v_capturas_dia uuid[];
  v_estado public.estado_pedido;
  v_pid uuid;
  v_hora timestamptz;
  v_estrellas integer;
  v_c_sierra uuid; v_c_cabrilla uuid; v_c_pargo uuid; v_c_disputa uuid;
  v_vigentes integer; v_pedidos integer; v_calif integer; v_disputas integer;
begin
  select id into v_admin from public.perfiles where email = 'fd.admin@example.com';
  select id into v_p1 from public.perfiles where email = 'fd.pescador1@example.com';
  select id into v_p2 from public.perfiles where email = 'fd.pescador2@example.com';
  select id into v_p3 from public.perfiles where email = 'fd.pescador3@example.com';
  select id into v_p4 from public.perfiles where email = 'fd.pescador4@example.com';
  select id into v_r1 from public.perfiles where email = 'fd.restaurante1@example.com';
  select id into v_r2 from public.perfiles where email = 'fd.restaurante2@example.com';
  select id into v_r3 from public.perfiles where email = 'fd.restaurante3@example.com';

  if v_admin is null or v_p1 is null or v_p2 is null or v_p3 is null or v_p4 is null
     or v_r1 is null or v_r2 is null or v_r3 is null then
    raise exception 'Faltan cuentas demo. Ejecuta primero scripts/crear-usuarios-demo.mjs'
      using detail = 'SIN_CUENTAS_DEMO';
  end if;

  v_demo := array[v_admin, v_p1, v_p2, v_p3, v_p4, v_r1, v_r2, v_r3];
  v_pescadores := array[v_p1, v_p2, v_p3];
  v_restaurantes := array[v_r1, v_r2, v_r3];

  -- Roles y estados de las cuentas demo
  update public.perfiles set rol = 'admin', estado = 'aprobado' where id = v_admin;
  update public.perfiles set rol = 'pescador', estado = 'aprobado' where id = any (v_pescadores);
  update public.perfiles set rol = 'pescador', estado = 'pendiente' where id = v_p4;
  update public.perfiles set rol = 'restaurante', estado = 'aprobado' where id = any (v_restaurantes);

  -- Limpieza: solo datos ligados a cuentas demo. Al borrar los pedidos se borran
  -- en cascada sus eventos, pagos y calificaciones.
  delete from public.pedidos
   where restaurante_id = any (v_demo) or pescador_id = any (v_demo)
      or captura_id in (select id from public.capturas where pescador_id = any (v_demo));
  delete from public.capturas where pescador_id = any (v_demo);

  -- Historial de 28 días: alimenta precio de referencia, demanda, reputación y
  -- métricas. setseed hace que el escenario sea idéntico en cada recarga del día.
  perform setseed(0.42);
  for v_dia in 1 .. 28 loop
    v_fecha := v_hoy - v_dia;
    v_finde := extract(isodow from v_fecha) in (5, 6, 7);
    v_capturas_dia := array[]::uuid[];

    for v_f in 1 .. 3 loop
      v_especie := v_rotacion[1 + ((v_dia + v_f) % 6)];
      v_capturas_dia := v_capturas_dia || public._demo_captura(
        v_pescadores[v_f], v_especie,
        (15 + floor(random() * 26))::numeric,
        round(((v_precios ->> v_especie)::numeric * (0.9 + random() * 0.2)::numeric), 0),
        (v_fecha + time '06:00') at time zone 'America/Hermosillo'
      );
    end loop;

    for v_r in 1 .. 3 loop
      if random() < (case when v_finde then 0.85 else 0.5 end) then
        v_idx := 1 + floor(random() * 3)::integer;
        select kg_disponibles into v_disp from public.capturas where id = v_capturas_dia[v_idx];
        v_kg_ped := least((3 + floor(random() * 8))::numeric, v_disp);
        if v_kg_ped >= 3 then
          v_azar := random();
          v_estado := case
            when v_azar < 0.07 then 'con_incidencia'::public.estado_pedido
            when v_azar < 0.13 then 'rechazado'::public.estado_pedido
            else 'recibido_conforme'::public.estado_pedido
          end;
          v_hora := ((v_fecha + time '07:00') at time zone 'America/Hermosillo')
                    + floor(random() * 120) * interval '1 minute';
          v_pid := public._demo_pedido(v_capturas_dia[v_idx], v_restaurantes[v_r], v_kg_ped, v_estado, v_hora);

          -- Satisfacción: 7 de cada 10 pedidos recibidos se califican.
          if v_estado in ('recibido_conforme', 'con_incidencia') and random() < 0.7 then
            v_azar := random();
            v_estrellas := case
              when v_estado = 'con_incidencia' then 1 + floor(v_azar * 3)::integer   -- 1 a 3
              when v_azar < 0.55 then 5
              when v_azar < 0.88 then 4
              when v_azar < 0.97 then 3
              else 2 end;
            perform public._demo_calificacion(
              v_pid, v_estrellas,
              case when random() < 0.6 then
                case when v_estrellas >= 4
                     then v_buenos[1 + floor(random() * array_length(v_buenos, 1))::integer]
                     else v_malos[1 + floor(random() * array_length(v_malos, 1))::integer] end
              end,
              v_hora + interval '4 hours');
          end if;
        end if;
      end if;
    end loop;
  end loop;

  -- Una disputa abierta de ayer, para la pantalla del administrador:
  -- Ana Islas reportó una incidencia y el pago sigue retenido.
  v_c_disputa := public._demo_captura(v_p2, 'Corvina', 20, 85,
    ((v_hoy - 1) + time '05:30') at time zone 'America/Hermosillo', null);
  v_pid := public._demo_pedido(v_c_disputa, v_r3, 6, 'con_incidencia',
    ((v_hoy - 1) + time '07:10') at time zone 'America/Hermosillo',
    'Dos piezas llegaron sin hielo y con olor fuerte');
  update public.pagos
     set estado = 'en_disputa', reembolsado_en = null, monto_reembolsado = 0, nota_resolucion = null
   where pedido_id = v_pid;

  -- El historial queda cerrado: así el catálogo de hoy es igual a cualquier hora.
  update public.capturas set estado = 'retirada'
   where pescador_id = any (v_pescadores) and estado = 'activa';

  -- Catálogo de hoy (horas relativas a este momento)
  v_c_sierra := public._demo_captura(v_p1, 'Sierra', 40, 95, now() - interval '2 hours',
    'Enhielada en hielera; entrego en Guaymas centro');
  perform public._demo_captura(v_p2, 'Huachinango', 5, 180, now() - interval '3 hours',
    'Solo 5 kg; piezas de 1 a 1.5 kg');
  v_c_cabrilla := public._demo_captura(v_p3, 'Cabrilla', 18, 160, now() - interval '5 hours', null);
  v_c_pargo := public._demo_captura(v_p1, 'Pargo', 12, 150, now() - interval '9 hours', null);
  perform public._demo_captura(v_p2, 'Corvina', 25, 85, now() - interval '20 hours',
    'Precio especial por volumen');
  -- Más de 24 h: NO debe aparecer en el catálogo (prueba P04)
  perform public._demo_captura(v_p3, 'Lenguado', 8, 140, now() - interval '30 hours', null);

  -- Pedidos de hoy en distintos estados, todos con pago retenido
  perform public._demo_pedido(v_c_pargo, v_r1, 4, 'solicitado', now() - interval '40 minutes');
  perform public._demo_pedido(v_c_sierra, v_r2, 10, 'aceptado', now() - interval '80 minutes');
  perform public._demo_pedido(v_c_cabrilla, v_r1, 3, 'entregado', now() - interval '150 minutes');

  select count(*) into v_vigentes from public.catalogo_del_dia();
  select count(*) into v_pedidos from public.pedidos where restaurante_id = any (v_restaurantes);
  select count(*) into v_calif from public.calificaciones where restaurante_id = any (v_restaurantes);
  select count(*) into v_disputas from public.pagos
   where estado = 'en_disputa' and restaurante_id = any (v_restaurantes);

  return format('Escenario demo listo: %s capturas en el catálogo de hoy, %s pedidos pagados en la app, %s calificaciones y %s disputa abierta.',
                v_vigentes, v_pedidos, v_calif, v_disputas);
end;
$$;

-- Reinicio desde la app (solo administradores)
create or replace function public.reiniciar_demo()
returns text
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Acceso denegado: solo administradores.' using detail = 'ROL_NO_PERMITIDO';
  end if;
  return public.cargar_datos_demo();
end;
$$;

revoke execute on function
  public._demo_pedido(uuid, uuid, numeric, public.estado_pedido, timestamptz, text),
  public._demo_captura(uuid, text, numeric, numeric, timestamptz, text),
  public._demo_calificacion(uuid, integer, text, timestamptz),
  public.cargar_datos_demo(),
  public.reiniciar_demo()
from public, anon, authenticated;

grant execute on function public.reiniciar_demo() to authenticated;
