# Verificación de la web — actualizada el 15 de septiembre de 2026

## Publicación

Repositorio público: https://github.com/AlbertoAR87/7-pinceles1

GitHub Pages activado por API con build_type=workflow y HTTPS. Primer despliegue correcto:
https://github.com/AlbertoAR87/7-pinceles1/actions/runs/34870359021

La web se ha abierto correctamente en https://albertoar87.github.io/7-pinceles1/.
El CNAME contiene sietepinceles.es, pero el dominio no se ha asignado en Pages ni se ha cambiado DNS de OVH.

## Pruebas que han pasado

- Compilación local del frontend y dependencias fijadas. Solo se publica dist/.
- 14 pruebas automáticas de regresión con servicios simulados (`npm test`): perfil, acceso, logout, solicitud, doble envío, recuperación, errores, respuestas tardías, recursos y refresco de sesión.
- SQL contra la base real, con usuarios y recurso temporales dentro de una transacción revertida: lectura y actualización solo del perfil propio, bloqueo de autoaprobación, solicitud con estado pending, rechazo de duplicados y solicitudes ajenas, notas administrativas privadas, recursos solo para asociado activo e inscripciones de taller cerradas. Script: database/verify-rls.sql.
- Asesor de seguridad Supabase después de restringir permisos: cero avisos. Esto no sustituye una auditoría integral.
- Clave del código cotejada con las claves públicas del proyecto: publishable activa. No se usa service_role ni una clave secreta en el frontend.
- Vista de escritorio 1440×1000 y móviles 390×844 y 320×740; menú móvil, diálogo de acceso, recuperación y ausencia de desbordamiento horizontal comprobados. Logo cargado.
- Login real con credenciales inexistentes: mensaje de error en español, formulario reutilizable, sin error de JavaScript registrado.
- Alta real mediante API con alias del correo del responsable: HTTP 200, usuario creado, confirmation_sent_at informado y email_confirmed_at todavía vacío. No se recibió una sesión sin confirmar el correo.

## Pruebas reales adicionales del 15 de septiembre

- La cuenta técnica figura con correo confirmado en Supabase. No se ha observado directamente el clic de confirmación.
- Login correcto desde la web publicada y sesión conservada al recargar.
- Edición de nombre, mensaje de guardado y persistencia tras recarga; comprobado también en la base de datos.
- Solicitud de asociado enviada desde el navegador, marcada expresamente como prueba que no debe tramitarse. Confirmación visual y estado pending comprobado en la base de datos.
- Cierre de sesión: se oculta el perfil y se limpia la interfaz privada.
- Solicitud real de recuperación desde el navegador: mensaje de confirmación y recovery_sent_at informado. Esto no certifica recepción ni cambio de contraseña.
- Site URL corregida de localhost a https://albertoar87.github.io/7-pinceles1/ y esa misma dirección añadida a Redirect URLs. Persistencia verificada tras recargar el panel.
- Inspección del panel de correo: SMTP personalizado desactivado. Sigue pendiente un proveedor para el registro público.

## Pendiente: no certificado de extremo a extremo

- Observación de recepción y clic en un correo de confirmación con la configuración corregida.
- Vista de asociado activo en el navegador. La revisión automática rechazó elevar temporalmente los permisos de la cuenta técnica sin autorización explícita; no se aplicó el cambio.
- Entrega de recuperación, enlace válido, cambio real de contraseña y login con la nueva contraseña.
- Configuración de SMTP de producción. Resend conectado no tenía dominios ni correos enviados en la revisión del 14 de septiembre.
- Dominio propio y www, DNS de OVH, certificado y redirección canónica.
- Restauración de una copia de seguridad.

La prueba conserva una cuenta técnica confirmada con estado registered y una solicitud pending marcada como prueba. No representa una persona asociada ni impacto social. Los usuarios de las pruebas SQL no se conservan.

## Cambios en Supabase

Se conserva gboifuaaswbqumxxijed. Se han retirado permisos TRUNCATE/REFERENCES/TRIGGER del cliente,
los permisos de escritura de inscripciones de talleres y la lectura de notas administrativas.
No se han recreado tablas ni modificado registros de usuarios reales.
# Calendario privado — 22 de septiembre de 2026

- 24 pruebas automáticas aprobadas: las nuevas cubren acceso de cuentas registradas, cierre, respuestas tardías, reintento, cambio de mes, zona Europe/Madrid y texto sin ejecución HTML.
- Vista local con datos ficticios revisada en escritorio y móvil (390 px); selección de día y mes vacío verificadas; sin errores de consola.
- Base real: RLS de workshops activo; SELECT como anon denegado; authenticated ve la actividad publicada y no ve un borrador temporal (transacción revertida).
- Taller previsto para octubre incorporado con starts_at, ends_at y capacity nulos. Inscripciones no habilitadas.
- La revisión visual utilizó una sesión simulada local, no credenciales de una persona. Las pruebas de permisos se ejecutaron en la base real.
- El asesor de seguridad no señaló fallos RLS. Mantiene el aviso de protección contra contraseñas filtradas desactivada, ajeno al calendario: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
