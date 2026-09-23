# 7 Pinceles

Web oficial del proyecto **7 Pinceles — El arte del desorden**.

## Arquitectura

- Frontend estático HTML/CSS/JS.
- Autenticación y datos: Supabase.
- Despliegue previsto: GitHub Pages.
- Dominio previsto: `sietepinceles.es`.

## Seguridad

El frontend usa exclusivamente la clave pública/publishable de Supabase. Nunca debe incluirse una `service_role` o una clave secreta en este repositorio. Las tablas expuestas deben mantener RLS activo.

## Estado

La base de datos de Supabase ya contiene perfiles, solicitudes de asociación, talleres, inscripciones y recursos. El frontend implementa registro, acceso, recuperación de contraseña, edición de perfil, solicitud de asociación y lectura de recursos según el estado del perfil.

La inscripción a talleres permanece cerrada hasta validar de extremo a extremo la gestión de aforo y concurrencia.

## Desarrollo y publicación

Requiere Node.js 22. Ejecutar `npm ci`, `npm test`, `npm run build` y `npm start`.
La vista local está en `http://127.0.0.1:4173`. Publicar únicamente `dist/`.
Las dependencias se compilan en un archivo local, con versiones fijadas en package-lock.json.
No hace falta configurar ninguna clave secreta en GitHub.

En Settings → Pages elegir GitHub Actions. El workflow ejecuta las pruebas antes de publicar.
El fichero CNAME prepara `sietepinceles.es`; el dominio también debe configurarse en Settings → Pages y en el proveedor DNS.
Consultar `DEPLOYMENT.md` para completar dominio, correos y verificaciones externas.

## Pruebas

`npm test` comprueba regresiones con respuestas simuladas: acceso a Mi cuenta, cierre de sesión y limpieza de datos,
campos permitidos en la solicitud, recuperación, enlace caducado, desconexión, doble envío,
respuestas tardías tras logout, enlaces de recursos inseguros, fallo de perfil y acceso de no asociados.
Estas pruebas no certifican la entrega de correos ni el recorrido real de confirmación de cuenta.

## Calendario privado

El perfil incluye un calendario para todas las cuentas registradas, sin exigir ser asociado activo.
Lee únicamente actividades publicadas de `public.workshops`, después de iniciar sesión.
La política existente permite SELECT a `authenticated` con `is_published = true`; `anon` no tiene SELECT.
No se han ampliado permisos ni añadido claves. Se limpia la agenda al salir y se descartan respuestas de sesiones anteriores.
Los horarios se presentan en `Europe/Madrid` (incluidos los cambios de horario).
Sin `starts_at`, la actividad aparece en «Próximamente», fuera de la cuadrícula.
Las inscripciones siguen cerradas.

Para gestionar eventos, usar el editor de tablas del proyecto Supabase existente → `workshops`:
editar `title`, `description`, `location` y `starts_at` solo cuando estén confirmados;
guardar fechas con zona horaria explícita. `is_published = false` mantiene un borrador oculto.
No colocar datos personales de asistentes en los textos. «Actualizar» vuelve a consultar la agenda.
El taller previsto para octubre de 2026 se ha añadido sin fecha ni aforo inventados.

Pruebas: `npm test` incluye sesión, cierre, respuestas tardías, fechas de Madrid, navegación, texto seguro y reintento.
Para revisión visual local con datos ficticios: después de compilar, ejecutar `node scripts/preview-calendar.mjs`.
Los archivos `dist/__calendar*` son solo para la revisión local y nunca deben publicarse.

## Analítica opcional

`analytics.js` conecta GA4 `G-EP929LYQG4` solo en `sietepinceles.es` y tras aceptar la analítica.
No carga Google en las vistas locales, antes del consentimiento, ni en URLs con parámetros o fragmentos de autenticación.
Solo se envían vistas con dirección limpia; no se envían perfiles, formularios ni identificadores de cuenta.
El pie permite revisar la decisión. Rechazar borra las cookies GA, desactiva la etiqueta y recarga si estaba cargada.
La retirada se comunica también a las otras pestañas mediante el evento de almacenamiento.
Consentimiento y cookies: 180 días; sin renovación automática de cookies.

En Google Analytics se ha desactivado Medición mejorada y se mantiene Google Signals desactivado.
La conservación de usuarios y eventos se ha configurado en 2 meses, sin reinicio por actividad; los informes agregados tienen reglas distintas.
No activar medición de formularios, User-ID, datos proporcionados por usuarios ni publicidad sin revisar finalidad y consentimiento.
Las pruebas de analítica comprueban el bloqueo previo, aceptación, rechazo, retirada, cookies, persistencia, caducidad y URLs sensibles.
La recepción real se comprueba en Analytics → Informes → Tiempo real después de aceptar en la web pública.
El comprobador automático de etiquetas puede no detectar esta instalación porque no acepta el aviso.

Referencias: [modo de consentimiento de Google](https://developers.google.com/tag-platform/security/concepts/consent-mode)
y [criterio de la AEPD sobre aceptar y rechazar cookies](https://www.aepd.es/preguntas-frecuentes/17-internet-y-redes-sociales/FAQ-1707-importancia-de-las-cookies-en-la-proteccion-de-datos).
