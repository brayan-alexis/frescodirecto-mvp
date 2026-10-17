-- Tareas programadas de Supabase Cron (pg_cron). Las horas de cron.schedule son UTC.
--
-- Requisito: Supabase → Integrations → Cron → habilitar la extensión pg_cron
-- (otra ruta: Database → Extensions → pg_cron). Después, pegar esto en el
-- SQL Editor y ejecutarlo una vez.

-- 1. Reinicio diario del escenario demo a las 05:00, hora de Sonora (12:00 UTC).
--    Mantiene el catálogo con capturas de menos de 24 h para cualquier revisión.
select cron.schedule(
  'reinicio-demo-diario',
  '0 12 * * *',
  'select public.cargar_datos_demo()'
);

-- 2. Vencimientos del pago protegido, cada hora al minuto 7:
--    · pedido sin respuesta del pescador por 24 h → se cancela y se reembolsa
--    · pedido entregado sin respuesta del restaurante por 24 h → se confirma y
--      se libera el pago al pescador
select cron.schedule(
  'vencer-pedidos',
  '7 * * * *',
  'select public.vencer_pedidos()'
);

-- Ver ejecuciones:  select * from cron.job_run_details order by start_time desc limit 5;
-- Quitar una tarea: select cron.unschedule('vencer-pedidos');
