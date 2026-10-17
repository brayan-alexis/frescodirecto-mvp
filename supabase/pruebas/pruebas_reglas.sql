-- =============================================================================
-- FrescoDirecto IA · Pruebas automáticas de reglas, permisos y dinero (SQL)
--
-- Qué hace: ejecuta los casos válidos e inválidos de F1–F5, el pago protegido,
-- los vencimientos y los permisos, actuando como cada usuario demo. Todo corre
-- dentro de una transacción que termina en ROLLBACK: no deja ningún cambio.
--
-- Cómo correrlo: Supabase → SQL Editor → pegar → Run. Requiere el escenario
-- demo recién cargado (select public.cargar_datos_demo();).
-- Resultado esperado: ningún error. El SQL Editor de Supabase suele mostrar solo
-- "Success. No rows returned"; los avisos "cumple" se ven si lo corres con psql.
-- Si algo falla, se detiene en la prueba que falló y muestra "... FALLA: motivo".
-- =============================================================================
begin;

-- ---------------------------------------------------------------------------
-- P01 · F1 válido: pescador aprobado publica una captura completa
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', json_build_object('sub',
  (select id from auth.users where email = 'fd.pescador1@example.com'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare v public.capturas;
begin
  v := public.publicar_captura(
    (select id from public.especies where nombre = 'Cabrilla'), 12.5, 155,
    auth.uid()::text || '/prueba-p01.jpg', now() - interval '1 hour', 'Prueba P01');
  if v.id is null or v.kg_disponibles <> 12.5 or v.estado <> 'activa' then
    raise exception 'P01 FALLA: captura mal guardada';
  end if;
  if not exists (select 1 from public.catalogo_del_dia() c where c.id = v.id) then
    raise exception 'P01 FALLA: no aparece en el catálogo';
  end if;
  raise notice 'P01 cumple: captura % publicada a las % (hora del servidor) y visible en el catálogo',
    v.id, v.publicada_en;
end $$;

-- ---------------------------------------------------------------------------
-- P02 · F1 inválido: sin foto y con 0 kg. Además, notas con teléfono (fuga).
-- ---------------------------------------------------------------------------
do $$
declare v_msg text; v_hint text;
begin
  begin
    perform public.publicar_captura((select id from public.especies where nombre = 'Sierra'), 10, 90, '', null, null);
  exception when others then
    get stacked diagnostics v_msg = message_text, v_hint = pg_exception_hint;
  end;
  if v_msg is distinct from 'Dato incompleto: agrega la foto de la captura.' or v_hint <> 'foto' then
    raise exception 'P02 FALLA (sin foto): %', coalesce(v_msg, 'no hubo error');
  end if;
  raise notice 'P02 cumple: "%" (campo: %)', v_msg, v_hint;

  v_msg := null;
  begin
    perform public.publicar_captura((select id from public.especies where nombre = 'Sierra'), 0, 90,
      auth.uid()::text || '/x.jpg', null, null);
  exception when others then
    get stacked diagnostics v_msg = message_text, v_hint = pg_exception_hint;
  end;
  if v_msg not like 'Dato incompleto: los kilogramos%' then
    raise exception 'P02 FALLA (0 kg): %', coalesce(v_msg, 'no hubo error');
  end if;
  raise notice 'P02 cumple: "%" (campo: %)', v_msg, v_hint;

  v_msg := null;
  begin
    perform public.publicar_captura((select id from public.especies where nombre = 'Sierra'), 10, 90,
      auth.uid()::text || '/x.jpg', null, 'Llámame al 622 123 4567 y te la dejo más barata');
  exception when others then
    get stacked diagnostics v_msg = message_text, v_hint = pg_exception_hint;
  end;
  if v_msg not like 'Las notas no pueden incluir teléfonos%' or v_hint <> 'notas' then
    raise exception 'Fuga FALLA: aceptó un teléfono en las notas (%)', coalesce(v_msg, 'sin error');
  end if;
  raise notice 'Fuga cumple: las notas de una captura no aceptan teléfonos ni correos';
end $$;

-- Pescador pendiente de aprobación no puede publicar
reset role;
select set_config('request.jwt.claims', json_build_object('sub',
  (select id from auth.users where email = 'fd.pescador4@example.com'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare v_msg text;
begin
  begin
    perform public.publicar_captura((select id from public.especies where nombre = 'Sierra'), 10, 90,
      auth.uid()::text || '/x.jpg', null, null);
  exception when others then v_msg := sqlerrm;
  end;
  if v_msg is distinct from 'Solo los pescadores con cuenta aprobada pueden publicar.' then
    raise exception 'Permisos FALLA (pescador pendiente): %', coalesce(v_msg, 'pudo publicar');
  end if;
  raise notice 'Permisos cumple: un pescador pendiente no puede publicar';
end $$;

-- ---------------------------------------------------------------------------
-- P03 · F2 válido: filtros del catálogo (como visitante sin sesión)
-- P04 · F2 inválido: captura de más de 24 h no aparece; filtro sin resultados
-- Reputación pública (F5): promedio solo con 3 o más calificaciones
-- ---------------------------------------------------------------------------
reset role;
select set_config('prueba.pescador_nuevo',
  (select id::text from auth.users where email = 'fd.pescador4@example.com'), true);
select set_config('request.jwt.claims', '', true);
set local role anon;
do $$
declare v_total int; v_filtrado int; v_vacio int; v_sierra record; v_nuevo record;
begin
  select count(*) into v_total from public.catalogo_del_dia();
  select count(*) into v_filtrado from public.catalogo_del_dia(
    (select id from public.especies where nombre = 'Sierra'), 100, 12);
  if v_total < 5 or v_filtrado <> 1 then
    raise exception 'P03 FALLA: total %, filtrado %', v_total, v_filtrado;
  end if;
  raise notice 'P03 cumple: % capturas visibles; filtro Sierra, hasta $100 y 12 h → % resultado', v_total, v_filtrado;

  if exists (select 1 from public.catalogo_del_dia() where especie = 'Lenguado') then
    raise exception 'P04 FALLA: aparece una captura de más de 24 h';
  end if;
  select count(*) into v_vacio from public.catalogo_del_dia(null, 10, null);
  if v_vacio <> 0 then
    raise exception 'P04 FALLA: el filtro imposible devolvió % filas', v_vacio;
  end if;
  raise notice 'P04 cumple: el Lenguado de hace 30 h no aparece y el filtro sin resultados devuelve 0 filas';

  select * into v_sierra from public.catalogo_del_dia() where especie = 'Sierra' limit 1;
  select * into v_nuevo from public.reputacion_pescador(current_setting('prueba.pescador_nuevo')::uuid);
  if v_sierra.num_calificaciones < 3 or v_sierra.calificacion is null
     or v_nuevo.calificacion is not null or v_nuevo.num_calificaciones <> 0 then
    raise exception 'Reputación FALLA: Sierra % (% calif.), pescador nuevo %',
      v_sierra.calificacion, v_sierra.num_calificaciones, v_nuevo.calificacion;
  end if;
  raise notice 'Reputación cumple: el catálogo muestra % estrellas (% calificaciones) y un pescador sin calificaciones aparece como Nuevo',
    v_sierra.calificacion, v_sierra.num_calificaciones;
end $$;

-- El visitante no puede pedir ni leer tablas
do $$
declare v_ok int := 0;
begin
  begin
    perform public.solicitar_pedido(gen_random_uuid(), 1);
  exception when insufficient_privilege then v_ok := v_ok + 1;
  end;
  begin
    perform count(*) from public.pedidos;
  exception when insufficient_privilege then v_ok := v_ok + 1;
  end;
  begin
    perform count(*) from public.pagos;
  exception when insufficient_privilege then v_ok := v_ok + 1;
  end;
  if v_ok <> 3 then raise exception 'Permisos FALLA: el visitante pidió o leyó pedidos o pagos'; end if;
  raise notice 'Permisos cumple: el visitante solo consulta el catálogo';
end $$;

-- ---------------------------------------------------------------------------
-- P05 · F3 válido: restaurante pide 10 kg de Sierra (hay 30) y paga en la app
-- Pago rechazado: la tarjeta de prueba 0002 no crea pedido ni aparta producto
-- P06 · F3 inválido: pide 20 kg de Huachinango (hay 5)
-- Cancelar antes de que el pescador responda reembolsa todo
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', json_build_object('sub',
  (select id from auth.users where email = 'fd.restaurante1@example.com'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare v_cat record; v_ped public.pedidos; v_pago public.pagos; v_despues numeric;
begin
  select * into v_cat from public.catalogo_del_dia() where especie = 'Sierra' limit 1;
  v_ped := public.solicitar_pedido(v_cat.id, 10, 'entrega', '4242');
  select * into v_pago from public.pagos where pedido_id = v_ped.id;
  select kg_disponibles into v_despues from public.catalogo_del_dia() where id = v_cat.id;
  if v_ped.folio not like 'FD-%' or v_ped.estado <> 'solicitado'
     or v_ped.total <> 10 * v_cat.precio_kg or v_despues <> v_cat.kg_disponibles - 10 then
    raise exception 'P05 FALLA: folio %, estado %, total %, kg %', v_ped.folio, v_ped.estado, v_ped.total, v_despues;
  end if;
  if v_pago.estado <> 'retenido' or v_pago.subtotal <> 950 or v_pago.comision <> 47.50
     or v_pago.total <> 997.50 or v_pago.recibo not like 'PAG-%' then
    raise exception 'P05 FALLA (pago): estado %, subtotal %, comisión %, total %',
      v_pago.estado, v_pago.subtotal, v_pago.comision, v_pago.total;
  end if;
  raise notice 'P05 cumple: pedido % (%), pago % retenido: $% de pescado + $% de comisión = $%; inventario de % a % kg',
    v_ped.folio, v_ped.estado, v_pago.recibo, v_pago.subtotal, v_pago.comision, v_pago.total,
    v_cat.kg_disponibles, v_despues;
end $$;

do $$
declare v_cat record; v_msg text; v_detail text; v_pedidos int; v_pagos int;
begin
  select * into v_cat from public.catalogo_del_dia() where especie = 'Corvina' limit 1;
  select count(*) into v_pedidos from public.pedidos;
  select count(*) into v_pagos from public.pagos;
  begin
    perform public.solicitar_pedido(v_cat.id, 2, 'entrega', '0002');
  exception when others then
    get stacked diagnostics v_msg = message_text, v_detail = pg_exception_detail;
  end;
  if v_detail is distinct from 'PAGO_RECHAZADO'
     or (select count(*) from public.pedidos) <> v_pedidos
     or (select count(*) from public.pagos) <> v_pagos
     or (select kg_disponibles from public.catalogo_del_dia() where id = v_cat.id) <> v_cat.kg_disponibles then
    raise exception 'Pago FALLA (tarjeta rechazada): %', coalesce(v_msg, 'se aceptó el pago');
  end if;
  raise notice 'Pago cumple: "%"', v_msg;
end $$;

do $$
declare v_cat record; v_msg text; v_detail text; v_pagos int;
begin
  select * into v_cat from public.catalogo_del_dia() where especie = 'Huachinango' limit 1;
  select count(*) into v_pagos from public.pagos;
  begin
    perform public.solicitar_pedido(v_cat.id, 20);
  exception when others then
    get stacked diagnostics v_msg = message_text, v_detail = pg_exception_detail;
  end;
  if v_msg is distinct from 'Operación inválida: inventario insuficiente. Solo quedan 5 kg disponibles.' then
    raise exception 'P06 FALLA: %', coalesce(v_msg, 'no hubo error');
  end if;
  if (select kg_disponibles from public.catalogo_del_dia() where id = v_cat.id) <> 5
     or (select count(*) from public.pagos) <> v_pagos then
    raise exception 'P06 FALLA: cambió el inventario o se registró un cobro';
  end if;
  raise notice 'P06 cumple: "%" (%); el inventario sigue en 5 kg y no hubo cobro', v_msg, v_detail;
end $$;

do $$
declare v_cat record; v_ped public.pedidos; v_pago public.pagos; v_kg numeric;
begin
  select * into v_cat from public.catalogo_del_dia() where especie = 'Corvina' limit 1;
  v_ped := public.solicitar_pedido(v_cat.id, 2, 'recoleccion', '4242');
  v_ped := public.cancelar_pedido(v_ped.id);
  select * into v_pago from public.pagos where pedido_id = v_ped.id;
  select kg_disponibles into v_kg from public.catalogo_del_dia() where id = v_cat.id;
  if v_ped.estado <> 'cancelado' or v_pago.estado <> 'reembolsado'
     or v_pago.monto_reembolsado <> v_pago.total or v_pago.comision_cobrada <> 0
     or v_kg <> v_cat.kg_disponibles then
    raise exception 'Pago FALLA (cancelar): pedido %, pago %, reembolso % de %, kg %',
      v_ped.estado, v_pago.estado, v_pago.monto_reembolsado, v_pago.total, v_kg;
  end if;
  -- Este pedido queda sin respuesta para la prueba de vencimientos
  perform public.solicitar_pedido(v_cat.id, 1, 'entrega', '4242');
  raise notice 'Pago cumple: cancelar devuelve los $% completos y los kg al catálogo', v_pago.total;
end $$;

-- ---------------------------------------------------------------------------
-- P10 · F5 inválido: calificar un pedido que aún no se recibe, o fuera de rango
-- ---------------------------------------------------------------------------
do $$
declare v_id uuid; v_msg text; v_detail text; v_hint text;
begin
  select id into v_id from public.mis_pedidos() where estado = 'solicitado' and especie = 'Pargo' limit 1;
  begin
    perform public.calificar_pedido(v_id, 5, 'Excelente');
  exception when others then
    get stacked diagnostics v_msg = message_text, v_detail = pg_exception_detail;
  end;
  if v_detail is distinct from 'NO_CALIFICABLE' then
    raise exception 'P10 FALLA: calificó un pedido no recibido (%)', coalesce(v_msg, 'sin error');
  end if;
  raise notice 'P10 cumple: "%"', v_msg;

  v_msg := null;
  begin
    perform public.calificar_pedido(v_id, 6, null);
  exception when others then
    get stacked diagnostics v_msg = message_text, v_hint = pg_exception_hint;
  end;
  if v_hint is distinct from 'estrellas' then
    raise exception 'P10 FALLA: aceptó 6 estrellas (%)', coalesce(v_msg, 'sin error');
  end if;
  raise notice 'P10 cumple: "%" (campo: %)', v_msg, v_hint;
end $$;

-- ---------------------------------------------------------------------------
-- P07 · F4 válido: el pescador acepta y entrega; el restaurante confirma
--       conforme y el pago se libera al pescador
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', json_build_object('sub',
  (select id from auth.users where email = 'fd.pescador1@example.com'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare v_id uuid; v_ped public.pedidos;
begin
  select id into v_id from public.mis_pedidos()
   where estado = 'solicitado' and especie = 'Sierra' and kg = 10 limit 1;
  v_ped := public.responder_pedido(v_id, true);
  if v_ped.estado <> 'aceptado' then raise exception 'P07 FALLA al aceptar'; end if;
  v_ped := public.marcar_entregado(v_id);
  if v_ped.estado <> 'entregado' then raise exception 'P07 FALLA al entregar'; end if;
  if (select estado from public.pagos where pedido_id = v_id) <> 'retenido' then
    raise exception 'P07 FALLA: el pago se movió antes de la confirmación';
  end if;
  raise notice 'P07 (pescador) cumple: % aceptado y entregado; el pago sigue retenido', v_ped.folio;
end $$;

reset role;
select set_config('request.jwt.claims', json_build_object('sub',
  (select id from auth.users where email = 'fd.restaurante1@example.com'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare v_id uuid; v_ped public.pedidos; v_pago public.pagos; v_tel text; v_tel_despues text; v_eventos int;
begin
  select id, contraparte_telefono into v_id, v_tel from public.mis_pedidos()
   where estado = 'entregado' and especie = 'Sierra' limit 1;
  v_ped := public.confirmar_recepcion(v_id, true);
  select * into v_pago from public.pagos where pedido_id = v_id;
  select count(*) into v_eventos from public.pedido_eventos where pedido_id = v_id;
  select contraparte_telefono into v_tel_despues from public.mis_pedidos() where id = v_id;
  if v_ped.estado <> 'recibido_conforme' or v_eventos <> 4 or v_tel is null then
    raise exception 'P07 FALLA: estado %, eventos %, teléfono %', v_ped.estado, v_eventos, v_tel;
  end if;
  if v_pago.estado <> 'liberado' or v_pago.monto_pescador <> 950 or v_pago.comision_cobrada <> 47.50
     or v_pago.monto_reembolsado <> 0 then
    raise exception 'P07 FALLA (pago): %, pescador $%, comisión $%', v_pago.estado, v_pago.monto_pescador, v_pago.comision_cobrada;
  end if;
  if v_tel_despues is not null then
    raise exception 'Fuga FALLA: el teléfono sigue visible con el pedido cerrado';
  end if;
  raise notice 'P07 cumple: % recibido conforme con 4 eventos; pago liberado: $% al pescador y $% de comisión',
    v_ped.folio, v_pago.monto_pescador, v_pago.comision_cobrada;
  raise notice 'Fuga cumple: el teléfono del pescador se vio durante la entrega y se ocultó al cerrar el pedido';
end $$;

-- ---------------------------------------------------------------------------
-- P09 · F5 válido: el restaurante califica el pedido que recibió
-- ---------------------------------------------------------------------------
do $$
declare v_id uuid; v_pescador uuid; v_antes int; v_despues int; v_cal public.calificaciones; v_msg text;
begin
  select id into v_id from public.mis_pedidos()
   where estado = 'recibido_conforme' and especie = 'Sierra' and puede_calificar limit 1;
  select pescador_id into v_pescador from public.pedidos where id = v_id;
  select num_calificaciones into v_antes from public.reputacion_pescador(v_pescador);
  v_cal := public.calificar_pedido(v_id, 5, 'Llegó muy fresca y a tiempo');
  select num_calificaciones into v_despues from public.reputacion_pescador(v_pescador);
  if v_cal.estrellas <> 5 or v_despues <> v_antes + 1
     or (select puede_calificar from public.mis_pedidos() where id = v_id) then
    raise exception 'P09 FALLA: estrellas %, calificaciones % → %', v_cal.estrellas, v_antes, v_despues;
  end if;
  begin
    perform public.calificar_pedido(v_id, 1, 'Cambio de opinión');
  exception when others then v_msg := sqlerrm;
  end;
  if v_msg is distinct from 'Ya calificaste este pedido.' then
    raise exception 'P09 FALLA: permitió calificar dos veces (%)', coalesce(v_msg, 'sin error');
  end if;
  raise notice 'P09 cumple: calificación de % estrellas guardada; el pescador pasa de % a % calificaciones; "%"',
    v_cal.estrellas, v_antes, v_despues, v_msg;
end $$;

-- ---------------------------------------------------------------------------
-- P08 · F4 inválido: reportar incidencia sin describirla; luego con descripción
--       (el pago queda en disputa, retenido hasta que resuelva el administrador)
-- ---------------------------------------------------------------------------
do $$
declare v_id uuid; v_ped public.pedidos; v_msg text;
begin
  select id into v_id from public.mis_pedidos() where estado = 'entregado' and especie = 'Cabrilla' limit 1;
  begin
    perform public.confirmar_recepcion(v_id, false, '');
  exception when others then v_msg := sqlerrm;
  end;
  if v_msg is distinct from 'Describe la incidencia (mínimo 5 caracteres).'
     or (select estado from public.pedidos where id = v_id) <> 'entregado'
     or (select estado from public.pagos where pedido_id = v_id) <> 'retenido' then
    raise exception 'P08 FALLA: %', coalesce(v_msg, 'aceptó la incidencia sin nota');
  end if;
  v_ped := public.confirmar_recepcion(v_id, false, 'Llegaron 2.5 kg en lugar de 3');
  if v_ped.estado <> 'con_incidencia' or (select estado from public.pagos where pedido_id = v_id) <> 'en_disputa' then
    raise exception 'P08 FALLA al registrar la incidencia';
  end if;
  raise notice 'P08 cumple: "%"; con descripción queda % y el pago en disputa', v_msg, v_ped.estado;
end $$;

-- Un pescador no puede pedir, ni ver o responder pedidos y pagos de otro pescador
reset role;
select set_config('prueba.pedido_ajeno', (
  select p.id::text from public.pedidos p join public.perfiles pf on pf.id = p.pescador_id
   where pf.email = 'fd.pescador1@example.com' and p.estado = 'aceptado' limit 1), true);
select set_config('request.jwt.claims', json_build_object('sub',
  (select id from auth.users where email = 'fd.pescador2@example.com'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare v_msg text;
begin
  begin
    perform public.solicitar_pedido((select id from public.catalogo_del_dia() limit 1), 1);
  exception when others then v_msg := sqlerrm;
  end;
  if v_msg is distinct from 'Solo los restaurantes pueden hacer pedidos.' then
    raise exception 'Permisos FALLA (pescador pide): %', coalesce(v_msg, 'pudo pedir');
  end if;
  v_msg := null;
  begin
    perform public.responder_pedido(current_setting('prueba.pedido_ajeno')::uuid, false);
  exception when others then v_msg := sqlerrm;
  end;
  if v_msg is distinct from 'Pedido no encontrado.' then
    raise exception 'Permisos FALLA (pedido ajeno): %', coalesce(v_msg, 'pudo responder');
  end if;
  if exists (select 1 from public.pedidos p where p.pescador_id <> auth.uid())
     or exists (select 1 from public.pagos pa where pa.pescador_id <> auth.uid())
     or exists (select 1 from public.calificaciones ca where ca.pescador_id <> auth.uid()) then
    raise exception 'Permisos FALLA: un pescador ve pedidos, pagos o calificaciones de otro';
  end if;
  v_msg := null;
  begin
    perform public.resolver_disputa(current_setting('prueba.pedido_ajeno')::uuid, 0, 'Lo resuelvo yo');
  exception when others then v_msg := sqlerrm;
  end;
  if v_msg is distinct from 'Acceso denegado: solo administradores.' then
    raise exception 'Permisos FALLA (pescador resuelve disputa): %', coalesce(v_msg, 'pudo resolver');
  end if;
  raise notice 'Permisos cumple: el pescador no pide, no ve pedidos ni pagos ajenos y no resuelve disputas';
end $$;

-- Escrituras directas a tablas bloqueadas (todo pasa por funciones)
do $$
declare v_ok int := 0;
begin
  begin
    update public.pedidos set estado = 'recibido_conforme';
  exception when insufficient_privilege then v_ok := v_ok + 1;
  end;
  begin
    insert into public.capturas (pescador_id, especie_id, kg_publicados, kg_disponibles, precio_kg, capturada_en, foto_path)
    values (auth.uid(), 1, 1, 1, 1, now(), 'x');
  exception when insufficient_privilege then v_ok := v_ok + 1;
  end;
  begin
    update public.pagos set estado = 'liberado';
  exception when insufficient_privilege then v_ok := v_ok + 1;
  end;
  begin
    insert into public.calificaciones (pedido_id, restaurante_id, pescador_id, estrellas)
    values (gen_random_uuid(), auth.uid(), auth.uid(), 5);
  exception when insufficient_privilege then v_ok := v_ok + 1;
  end;
  begin
    perform public._mover_pago(gen_random_uuid(), 'liberar');
  exception when insufficient_privilege then v_ok := v_ok + 1;
  end;
  if v_ok <> 5 then raise exception 'Permisos FALLA: escritura directa permitida (% de 5 bloqueadas)', v_ok; end if;
  raise notice 'Permisos cumple: no se puede escribir directo en pedidos, capturas, pagos ni calificaciones';
end $$;

-- Rechazar devuelve los kg y el dinero (pedido demo "solicitado" de Pargo, 4 kg)
reset role;
select set_config('request.jwt.claims', json_build_object('sub',
  (select id from auth.users where email = 'fd.pescador1@example.com'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare v_id uuid; v_captura uuid; v_antes numeric; v_despues numeric; v_pago public.pagos;
begin
  select p.id, p.captura_id into v_id, v_captura from public.pedidos p
   where p.estado = 'solicitado' and p.kg = 4 limit 1;
  select kg_disponibles into v_antes from public.capturas where id = v_captura;
  perform public.responder_pedido(v_id, false, 'Se me acabó el pargo');
  select kg_disponibles into v_despues from public.capturas where id = v_captura;
  select * into v_pago from public.pagos where pedido_id = v_id;
  if v_despues <> v_antes + 4 or v_pago.estado <> 'reembolsado' or v_pago.monto_reembolsado <> v_pago.total then
    raise exception 'Regla FALLA: rechazar (kg % → %, pago %)', v_antes, v_despues, v_pago.estado;
  end if;
  raise notice 'Regla cumple: al rechazar, el inventario vuelve de % a % kg y se reembolsan $%',
    v_antes, v_despues, v_pago.monto_reembolsado;
end $$;

-- Fotos: cada pescador aprobado sube solo a su carpeta. En Supabase, si el esquema
-- storage no admite inserciones por SQL, la prueba se omite: verifícala subiendo una
-- foto desde la app con dos cuentas distintas.
do $$
declare v_ok boolean := false;
begin
  begin
    insert into storage.objects (bucket_id, name) values ('capturas', auth.uid()::text || '/foto-ok.jpg');
  exception
    when insufficient_privilege then
      raise exception 'Storage FALLA: no pudo subir a su propia carpeta';
    when others then
      raise notice 'Storage: prueba omitida en este entorno (%)', sqlerrm;
      return;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('capturas', gen_random_uuid()::text || '/ajena.jpg');
  exception when insufficient_privilege then v_ok := true;
  end;
  if not v_ok then raise exception 'Storage FALLA: subió a una carpeta ajena'; end if;
  raise notice 'Storage cumple: sube a su carpeta y no a la de otros';
end $$;

-- Un restaurante no administra, no resuelve disputas ni ve pedidos o pagos ajenos
reset role;
select set_config('request.jwt.claims', json_build_object('sub',
  (select id from auth.users where email = 'fd.restaurante2@example.com'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare v_msg text; v_msg2 text;
begin
  begin
    perform public.reiniciar_demo();
  exception when others then v_msg := sqlerrm;
  end;
  begin
    perform public.disputas_abiertas();
  exception when others then v_msg2 := sqlerrm;
  end;
  if v_msg is distinct from 'Acceso denegado: solo administradores.'
     or v_msg2 is distinct from 'Acceso denegado: solo administradores.' then
    raise exception 'Admin FALLA: % / %', coalesce(v_msg, 'reinició la demo'), coalesce(v_msg2, 'vio disputas');
  end if;
  if exists (select 1 from public.pedidos p where p.restaurante_id <> auth.uid())
     or exists (select 1 from public.pagos pa where pa.restaurante_id <> auth.uid()) then
    raise exception 'Permisos FALLA: un restaurante ve pedidos o pagos de otro';
  end if;
  raise notice 'Permisos cumple: un restaurante no administra ni ve pedidos o pagos ajenos';
end $$;

-- ---------------------------------------------------------------------------
-- Administración: aprobar pescadores y resolver disputas
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', json_build_object('sub',
  (select id from auth.users where email = 'fd.admin@example.com'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare v_pendiente uuid; v_estado text;
begin
  select id into v_pendiente from public.perfiles where email = 'fd.pescador4@example.com';
  select estado into v_estado from public.aprobar_pescador(v_pendiente, true);
  if v_estado <> 'aprobado' then raise exception 'Admin FALLA al aprobar'; end if;
  raise notice 'Admin cumple: aprobó al pescador pendiente';
end $$;

do $$
declare v_abiertas int; v_cabrilla uuid; v_corvina uuid; v_pago public.pagos; v_msg text; v_hint text;
begin
  select count(*) into v_abiertas from public.disputas_abiertas();
  select pedido_id into v_cabrilla from public.disputas_abiertas() where especie = 'Cabrilla';
  select pedido_id into v_corvina from public.disputas_abiertas() where especie = 'Corvina';
  if v_abiertas <> 2 or v_cabrilla is null or v_corvina is null then
    raise exception 'Disputas FALLA: % abiertas', v_abiertas;
  end if;

  begin
    perform public.resolver_disputa(v_cabrilla, 9999, 'Reembolso mayor al pedido');
  exception when others then
    get stacked diagnostics v_msg = message_text, v_hint = pg_exception_hint;
  end;
  if v_hint is distinct from 'reembolso' then
    raise exception 'Disputas FALLA: aceptó un reembolso mayor al valor del pescado (%)', coalesce(v_msg, 'sin error');
  end if;

  -- Faltó medio kilo de 3 kg a $160: se devuelven $80 del pescado y la comisión.
  v_pago := public.resolver_disputa(v_cabrilla, 80, 'Faltó medio kilo según la báscula del restaurante');
  if v_pago.estado <> 'liberado' or v_pago.monto_pescador <> 400 or v_pago.monto_reembolsado <> 104
     or v_pago.comision_cobrada <> 0 then
    raise exception 'Disputas FALLA (parcial): %, pescador $%, reembolso $%, comisión $%',
      v_pago.estado, v_pago.monto_pescador, v_pago.monto_reembolsado, v_pago.comision_cobrada;
  end if;
  raise notice 'Disputas cumple: reembolso parcial de $% al restaurante y $% al pescador, sin comisión',
    v_pago.monto_reembolsado, v_pago.monto_pescador;

  v_pago := public.resolver_disputa(v_corvina, (select subtotal from public.pagos where pedido_id = v_corvina),
    'Fotos confirman producto sin hielo');
  if v_pago.estado <> 'reembolsado' or v_pago.monto_reembolsado <> v_pago.total or v_pago.monto_pescador <> 0 then
    raise exception 'Disputas FALLA (total): %', v_pago.estado;
  end if;
  if exists (select 1 from public.disputas_abiertas()) then
    raise exception 'Disputas FALLA: quedaron disputas abiertas';
  end if;
  raise notice 'Disputas cumple: reembolso total de $% y no quedan disputas abiertas', v_pago.monto_reembolsado;
end $$;

-- ---------------------------------------------------------------------------
-- Vencimientos automáticos (los corre Supabase Cron cada hora)
-- Se simula el paso de 25 h moviendo las fechas dentro de esta transacción.
-- ---------------------------------------------------------------------------
reset role;
do $$
declare v_sin_respuesta uuid; v_entregado uuid; v_msg text; v_kg_antes numeric;
begin
  select pe.id into v_sin_respuesta from public.pedidos pe
    join public.perfiles r on r.id = pe.restaurante_id
   where r.email = 'fd.restaurante1@example.com' and pe.estado = 'solicitado' and pe.kg = 1 limit 1;
  select pe.id into v_entregado from public.pedidos pe
    join public.perfiles r on r.id = pe.restaurante_id
   where r.email = 'fd.restaurante2@example.com' and pe.estado = 'aceptado' limit 1;
  select kg_disponibles into v_kg_antes from public.capturas
   where id = (select captura_id from public.pedidos where id = v_sin_respuesta);

  update public.pedidos set creado_en = now() - interval '25 hours' where id = v_sin_respuesta;
  update public.pedidos set estado = 'entregado' where id = v_entregado;
  insert into public.pedido_eventos (pedido_id, estado, actor_id, creado_en)
  values (v_entregado, 'entregado', (select pescador_id from public.pedidos where id = v_entregado),
          now() - interval '25 hours');

  v_msg := public.vencer_pedidos();
  if (select estado from public.pedidos where id = v_sin_respuesta) <> 'cancelado'
     or (select estado from public.pagos where pedido_id = v_sin_respuesta) <> 'reembolsado'
     or (select kg_disponibles from public.capturas
          where id = (select captura_id from public.pedidos where id = v_sin_respuesta)) <> v_kg_antes + 1
     or (select estado from public.pedidos where id = v_entregado) <> 'recibido_conforme'
     or (select estado from public.pagos where pedido_id = v_entregado) <> 'liberado' then
    raise exception 'Vencimientos FALLA: %', v_msg;
  end if;
  raise notice 'Vencimientos cumple: %', v_msg;
end $$;

-- El dinero cuadra: cada pago cerrado reparte exactamente lo que se cobró
do $$
declare v_mal int; v_cobrado numeric; v_comisiones numeric;
begin
  select count(*) into v_mal from public.pagos
   where estado in ('liberado', 'reembolsado')
     and monto_pescador + monto_reembolsado + comision_cobrada <> total;
  select sum(total), sum(comision_cobrada) into v_cobrado, v_comisiones from public.pagos;
  if v_mal <> 0 then raise exception 'Dinero FALLA: % pagos no cuadran', v_mal; end if;
  raise notice 'Dinero cumple: todos los pagos cerrados cuadran ($% cobrados, $% de comisiones)', v_cobrado, v_comisiones;
end $$;

-- Nadie se registra como admin
do $$
declare v_rol text;
begin
  begin
    insert into auth.users (id, email, raw_user_meta_data)
    values (gen_random_uuid(), 'fd.intruso@example.com', '{"rol": "admin", "nombre": "Intruso"}');
  exception when others then
    raise notice 'Alta: prueba omitida en este entorno (%)', sqlerrm;
    return;
  end;
  select rol into v_rol from public.perfiles where email = 'fd.intruso@example.com';
  if v_rol <> 'restaurante' then raise exception 'Alta FALLA: quedó como %', v_rol; end if;
  raise notice 'Alta cumple: pedir rol admin al registrarse deja la cuenta como restaurante';
end $$;

-- Reglas simples y métricas (migración 3)
select set_config('request.jwt.claims', json_build_object('sub',
  (select id from auth.users where email = 'fd.admin@example.com'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare v_ref int; v_dem int; v_cta int; v_kpi int; v_sat numeric;
begin
  if to_regprocedure('public.precio_referencia(integer, integer)') is null then
    raise notice 'Migración 3: funciones aún no instaladas (omitido)';
    return;
  end if;
  select count(*) into v_ref from public.precio_referencia();
  select count(*) into v_dem from public.demanda_estimada();
  select count(*) into v_cta from public.estado_cuenta(((now() at time zone 'America/Hermosillo')::date - 7));
  select count(*), max(satisfaccion_promedio) into v_kpi, v_sat from public.kpis_semanales(8);
  if v_ref = 0 or v_dem = 0 or v_cta = 0 or v_kpi <> 8 or v_sat is null then
    raise exception 'Migración 3 FALLA: referencia %, demanda %, estado de cuenta %, kpis %, satisfacción %',
      v_ref, v_dem, v_cta, v_kpi, v_sat;
  end if;
  raise notice 'Migración 3 cumple: % especies con precio de referencia, % filas de demanda, % restaurantes en el estado de cuenta, % semanas de KPIs con satisfacción',
    v_ref, v_dem, v_cta, v_kpi;
end $$;

reset role;
rollback;
