# Verificación de la web — 14 de septiembre de 2026

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

## Pendiente: no certificado de extremo a extremo

- Recepción y clic en el correo de confirmación de la cuenta de prueba.
- Login correcto de esa cuenta desde la web publicada, persistencia de perfil y solicitud desde el navegador y validación tras aprobación administrativa.
- Entrega de recuperación, enlace válido, cambio real de contraseña y login con la nueva contraseña.
- Revisión de Site URL, redirect URLs y SMTP en el panel de Supabase; el navegador requiere iniciar sesión. Resend conectado no tiene dominios ni correos enviados.
- Dominio propio y www, DNS de OVH, certificado y redirección canónica.
- Restauración de una copia de seguridad.

La prueba de alta ha dejado una cuenta técnica pendiente de confirmar. No representa una persona asociada ni impacto social. Los usuarios de las pruebas SQL no se conservan.

## Cambios en Supabase

Se conserva gboifuaaswbqumxxijed. Se han retirado permisos TRUNCATE/REFERENCES/TRIGGER del cliente,
los permisos de escritura de inscripciones de talleres y la lectura de notas administrativas.
No se han recreado tablas ni modificado registros de usuarios reales.
