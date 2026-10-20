# Guion de pruebas manuales P01–P10

Sirve para tomar las evidencias de FrescoDirecto IA sin ayuda. Cada prueba dice con qué cuenta entrar, qué tocar, qué debe verse y cómo se llama la captura de pantalla.

**Todos los datos son ficticios y los pagos son de prueba: no se cobra dinero real.**

## Antes de empezar

1. **El admin reinicia la demo.** Entra como `fd.admin@example.com` y abre `/admin`.
   - En la sección de reinicio toca **Reiniciar demo** y luego **Sí, reiniciar**.
   - Debe aparecer "Escenario demo listo: 5 capturas en el catálogo de hoy, … pedidos pagados en la app, … calificaciones y 1 disputa abierta."
   - Toca **Salir** para cerrar la sesión.
2. **Contraseña:** todas las cuentas usan la contraseña demo (la comparte Brayan). Los correos son `fd.<cuenta>@example.com`.
3. **Pantalla:** usa un teléfono o la ventana del navegador a 375 px de ancho.
4. **Si una prueba sale distinta:** no sigas. Anota qué viste, reinicia la demo (paso 1) y repite desde la primera prueba del orden.

## Orden recomendado

**P03, P04, P01, P02, P05, P06, P06b (opcional), P07, P09, P10 y P08.**

- P03 espera la Sierra con 30 kg, así que va antes de P05, que le descuenta 10 kg.
- P07 usa el pedido que se crea en P05.
- P09 usa el pedido que cierra P07.
- P10 y P08 usan pedidos que ya trae la demo (Pargo y Cabrilla) y no dependen de las demás pruebas.

## Cuentas de la demo

| Cuenta | Quién es |
| --- | --- |
| `fd.admin` | Administración |
| `fd.restaurante1` | Martha Leyva, Marisquería El Muelle |
| `fd.pescador1` | Juan Valenzuela (★ 4.3 · 11 calificaciones) |

Los números de reputación pueden variar un poco según el día en que se cargó la demo. Los folios (`FD-…`) y los recibos (`PAG-…`) también cambian; lo que importa es el formato y los montos.

---

## P01 · Publicar una captura (F1)

- **Cuenta:** `fd.pescador1` · **Inicio:** `/pescador/publicar` (menú **Publicar**)
- **Evidencia:** `E01_F1_P01_captura-publicada.png`

Pasos:

1. En **Especie** elige **Cabrilla**.
2. En **kg** escribe `12.5`.
3. En **Precio por kg** escribe `155`.
4. Deja la **Hora de captura** como viene.
5. Toca **Tomar foto** y toma o elige una foto.
6. Toca **Publicar**.

Resultado esperado:

- Te lleva a **Mis capturas** con el aviso **"Captura publicada."**
- En **Activas** aparece la Cabrilla con 12.5 kg a $155/kg.
- En el catálogo (`/`, menú **Catálogo**) también aparece esa Cabrilla de Juan Valenzuela.

La captura debe mostrar el aviso y la Cabrilla en la lista.

## P02 · Publicar sin foto (F1, caso inválido)

- **Cuenta:** `fd.pescador1` · **Inicio:** `/pescador/publicar`
- **Evidencia:** `E02_F1_P02_sin-foto.png`

Pasos:

1. Llena **Especie**, **kg** y **Precio por kg** como en P01 (Cabrilla, `12.5`, `155`).
2. **No** toques **Tomar foto**.
3. Toca **Publicar**.

Resultado esperado:

- Debajo de **Foto** aparece **"Dato incompleto"** en rojo.
- No se guarda nada: en **Mis capturas** no hay una captura nueva.

La captura debe mostrar el mensaje junto a Foto.

## P03 · Filtros del catálogo (F2)

- **Cuenta:** visitante (sin iniciar sesión) · **Inicio:** `/`
- **Evidencia:** `E03_F2_P03_filtros.png`

Pasos:

1. Toca el filtro **Especie** y elige **Sierra**.
2. Toca el filtro **Precio** y elige **Hasta $100/kg**.
3. Toca el filtro **Horas** y elige **Menos de 12 h**.

Resultado esperado:

- Queda una sola tarjeta: la **Sierra de Juan Valenzuela**, con **30 kg** disponibles, **$95/kg** y su reputación **★ 4.3 (11)**.
- La dirección de la página lleva los filtros (`?especie=…&precio=100&horas=12`).

## P04 · Catálogo sin resultados (F2, caso inválido)

- **Cuenta:** visitante · **Inicio:** `/`
- **Evidencia:** `E04_F2_P04_sin-resultados.png`

Pasos:

1. Toca el filtro **Especie** y elige **Lenguado**.

Resultado esperado:

- Aparece **"No hay capturas con esos filtros."** y el botón **Quitar filtros**.
- El Lenguado se capturó hace 30 h, así que ya no está en el catálogo del día.
- Al tocar **Quitar filtros** vuelve la lista completa.

## P05 · Pedir y pagar (F3)

- **Cuenta:** `fd.restaurante1` · **Inicio:** `/` → tarjeta de la **Sierra**
- **Evidencia:** `E05_F3_P05_pedido-pagado.png`

Pasos:

1. Entra a la Sierra de Juan Valenzuela (30 kg disponibles, $95/kg).
2. En **Pedir esta captura**, en **kg a pedir** escribe `10`.
3. En **Modalidad** elige **Entrega en mi negocio**.
4. Toca **Continuar al pago**.
5. Revisa el resumen estimado: Pescado $950, Comisión de servicio 5 % $47.50 y **Total a pagar $997.50**.
6. En **Tarjeta de prueba** deja **Visa de prueba terminación 4242 (se aprueba)**. Debe verse el aviso **"Modo de prueba: no se cobra dinero real"**.
7. Toca **Pagar $997.50**.

Resultado esperado:

- Te lleva al detalle del pedido: folio **FD-…**, estado **Solicitado** ("Esperando al pescador").
- **Recibo de pago** con número **PAG-…**:
  - Valor del pescado **$950**
  - Comisión de servicio 5 % **$47.50**
  - Total pagado **$997.50**
  - Estado: **Pago retenido por FrescoDirecto**
- Al volver a la Sierra en el catálogo quedan **20 kg** disponibles.

Anota el folio: lo usas en P07 y P09.

## P06 · Pedir más de lo que hay (F3, caso inválido)

- **Cuenta:** `fd.restaurante1` · **Inicio:** `/` → tarjeta del **Huachinango**
- **Evidencia:** `E06_F3_P06_sin-inventario.png`

Pasos:

1. Entra al Huachinango de Rosa Martínez (5 kg disponibles, $180/kg).
2. En **kg a pedir** escribe `20`.
3. Toca **Continuar al pago** y luego **Pagar …** con la tarjeta 4242.

Resultado esperado:

- Debajo de **kg a pedir** aparece: **"Operación inválida: inventario insuficiente. Solo quedan 5 kg disponibles."**
- No se crea ningún pedido y no se cobra nada.
- El Huachinango sigue con 5 kg.

## P06b · Pago rechazado (F3, prueba extra opcional)

- **Cuenta:** `fd.restaurante1` · **Inicio:** `/` → tarjeta de la **Corvina**
- **Evidencia:** `E06b_F3_pago-rechazado.png`

Pasos:

1. Entra a la Corvina de Rosa Martínez (25 kg, $85/kg).
2. En **kg a pedir** escribe `2` y toca **Continuar al pago**.
3. En **Tarjeta de prueba** elige **Visa de prueba terminación 0002 (se rechaza)**.
4. Toca **Pagar …**.

Resultado esperado:

- Junto a la tarjeta aparece **"Pago rechazado por la pasarela de prueba (tarjeta terminación 0002). No se hizo ningún cargo ni se apartó producto."**
- No hay pedido nuevo y la Corvina sigue con **25 kg**.

## P07 · Aceptar, entregar y liberar el pago (F4)

- **Cuentas:** primero `fd.pescador1`, luego `fd.restaurante1` · **Inicio:** `/pescador/ventas`
- **Evidencia:** `E07_F4_P07_pago-liberado.png`

Pasos con Juan (`fd.pescador1`):

1. Abre **Mis ventas** y entra al pedido de P05 (el folio que anotaste).
2. Toca **Aceptar**. El estado pasa a **Aceptado** y aparece el teléfono de Martha.
3. Toca **Marcar entregado**. El estado pasa a **Entregado**. Toca **Salir**.

Pasos con Martha (`fd.restaurante1`):

4. Abre **Mis pedidos** y entra al mismo pedido.
5. Toca **Confirmar recepción** y luego **Recibido conforme**.
6. Toca **Sí, liberar pago**.

Resultado esperado:

- Estado **Recibido conforme** y pago **"Pagado al pescador"**.
- En el recibo: Valor del pescado $950, Total pagado $997.50 y **Recibe el pescador $950**.
- La **Línea de tiempo** tiene **4 pasos**: Solicitado, Aceptado, Entregado y Recibido conforme.
- El teléfono de la contraparte **ya no se ve**.
- Con Juan, en **Mis ventas**, el resumen **Cobrado** incluye los $950.

La captura debe mostrar el estado, el recibo y la línea de tiempo.

## P09 · Calificar al pescador (F5)

- **Cuenta:** `fd.restaurante1` · **Inicio:** el pedido de P07, justo después de liberar el pago
- **Evidencia:** `E09_F5_P09_calificacion.png`

Pasos:

1. En el pedido recibido aparece la tarjeta de calificación. En **Satisfacción** toca la quinta estrella (**5 de 5 estrellas**).
2. En **Comentario (opcional)** escribe `Llegó muy fresca y a tiempo`.
3. Toca **Enviar calificación**.

Resultado esperado:

- Aparece el aviso "Gracias. Calificaste a Juan Valenzuela con 5 de 5 estrellas." y en el pedido **"Calificaste con ★★★★★"**, sin opción de cambiarla.
- En el catálogo, la Sierra de Juan pasa de 11 a **12 calificaciones**.
- Con `fd.pescador1`, en **Mis capturas**, la sección de reputación muestra la calificación y su comentario "Llegó muy fresca y a tiempo". Los comentarios solo los ve el pescador.

## P10 · Calificar un pedido no recibido (F5, caso inválido)

- **Cuenta:** `fd.restaurante1` · **Inicio:** `/pedidos`
- **Evidencia:** `E10_F5_P10_no-calificable.png`

Pasos:

1. Abre **Mis pedidos** y entra al pedido de **Pargo** (4 kg, estado **Solicitado**).

Resultado esperado:

- **No aparece** la tarjeta de calificación.
- La captura debe mostrar el pedido en Solicitado sin esa tarjeta.

Opcional, para quien tenga acceso a Supabase (Brayan): si se fuerza la calificación desde el SQL Editor, la base responde **"Solo puedes calificar un pedido que ya recibiste."** Esa comprobación está en el bloque P10 de `supabase/pruebas/pruebas_reglas.sql`.

## P08 · Incidencia sin descripción (F4, caso inválido)

- **Cuenta:** `fd.restaurante1` · **Inicio:** `/pedidos` → pedido de **3 kg de Cabrilla** (estado **Entregado**)
- **Evidencia:** `E08_F4_P08_incidencia-sin-nota.png`

Pasos:

1. Entra al pedido de 3 kg de Cabrilla.
2. Toca **Confirmar recepción** y luego **Con incidencia**.
3. Deja vacío el campo **Describe la incidencia**.
4. Toca **Enviar incidencia**.

Resultado esperado:

- Debajo del campo aparece **"Describe la incidencia (mínimo 5 caracteres)."**
- El pedido **sigue Entregado** y el pago sigue **retenido** ("Pago retenido por FrescoDirecto").

---

## Al terminar

- Reúne las capturas con los nombres indicados: diez pruebas, más la P06b si la hiciste.
- Para dejar la demo limpia, vuelve a **Reiniciar demo** como `fd.admin`.
