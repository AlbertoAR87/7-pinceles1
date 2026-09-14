# Publicación y mantenimiento

## Proyecto existente

- GitHub: AlbertoAR87/7-pinceles1.
- Supabase: gboifuaaswbqumxxijed (eu-west-3).
- El frontend usa la clave publishable. No usar service_role ni sb_secret en archivos públicos.
- Los perfiles se crean mediante el trigger existente al registrar una cuenta.
- Solo se permite modificar nombre, teléfono y localidad. La solicitud omite status porque el servidor asigna pending.
- La aprobación de asociados se gestiona actualmente desde Supabase por una persona autorizada. No hay panel administrativo web.
- Las URL de recursos son enlaces externos HTTPS; si el contenido es confidencial, debe tener su propia autorización. Ocultar el enlace no protege un archivo público.

## GitHub Pages y dominio

1. Settings → Pages → Source: GitHub Actions.
2. Ejecutar el workflow Deploy to GitHub Pages. Solo sube dist/, sin pruebas, SQL ni documentación interna.
3. Configurar el dominio personalizado sietepinceles.es en Settings → Pages.
4. Revisar los registros actuales antes de cambiarlos; conservar registros de correo y verificación.
5. Para DNS directo: A del dominio raíz a 185.199.108.153, 185.199.109.153, 185.199.110.153 y 185.199.111.153. CNAME de www a albertoar87.github.io (sin ruta).
6. Esperar a que GitHub valide DNS y emita el certificado; activar Enforce HTTPS cuando esté disponible.
7. Verificar raíz y www por HTTPS, la redirección canónica y la carga de CSS/JS/logo.

Los registros observados el 14-09-2026 para el dominio raíz eran 172.66.3.26 y 162.159.143.30: no son las direcciones directas de GitHub Pages. Los servidores DNS autoritativos son dns111.ovh.net y ns111.ovh.net. La zona no está en la cuenta Cloudflare conectada. Preparar el cambio desde OVH conservando una copia de los registros anteriores y sin modificar MX/TXT de correo.

GitHub Pages está activado con GitHub Actions y HTTPS en https://albertoar87.github.io/7-pinceles1/. El dominio personalizado aún no se ha asignado en Pages para evitar redirigir esta dirección operativa hacia un dominio que sigue apuntando a otro alojamiento.

Fuente: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site

## Supabase Auth y correo

Configurar Site URL a la URL que finalmente esté publicada. Cuando el dominio funcione, usar https://sietepinceles.es/.
Añadir como redirect URLs exactas las direcciones realmente usadas:

- https://sietepinceles.es/
- https://www.sietepinceles.es/
- https://albertoar87.github.io/7-pinceles1/ (si se usa para pruebas antes del dominio).

Configurar SMTP de producción, remitente y verificación DNS con el proveedor de correo. Nunca guardar sus credenciales en el repositorio.
El SMTP predeterminado de Supabase está limitado a direcciones del equipo y no sirve para abrir registros al público.
No desactivar la confirmación de email para sortear este bloqueo.

Fuente: https://supabase.com/docs/guides/auth/auth-smtp

Prueba real pendiente hasta contar con el buzón de prueba y la configuración: registrar cuenta → recibir correo → confirmar → login → guardar perfil → enviar solicitud → consultar pendiente → aprobar por administración → ver recursos → logout → recuperar contraseña → usar enlace → cambiar contraseña → login nuevo.
Probar enlace caducado, credenciales erróneas, doble envío, sesión vencida y conexión interrumpida. No confundir pruebas simuladas con entrega real de correos.

## Recuperación y operación

- Código: conservar el ZIP original y el repositorio. Para revertir una versión, revertir el commit y dejar que Pages vuelva a publicar.
- Datos: comprobar el plan y las copias disponibles en Supabase antes de depender de ellas. No se ha probado una restauración.
- Antes de cambios de esquema, exportar una copia con las herramientas oficiales y almacenarla de forma privada, cifrada y fuera de este repositorio.
- Probar restauraciones en un entorno separado, sin sustituir el proyecto existente ni exponer datos reales.
- Revisar solicitudes desde Supabase y mantener una persona responsable de contestar el correo.
- No abrir talleres, pagos o donaciones hasta completar sus requisitos y pruebas. No se incluyen pagos ni tienda en esta versión.
