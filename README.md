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
