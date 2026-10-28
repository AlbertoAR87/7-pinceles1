# Panel de administración de 7 Pinceles

El cambio de seguridad fue autorizado expresamente por el propietario y aplicado en Supabase. Solo existe un administrador fundador: la cuenta verificada de Alberto. El menú Administradores y el historial quedan reservados al fundador; no hay altas automáticas de administradores. La publicación y verificación web se documentan al final de este archivo.

## Primera versión

- El botón Administración aparece dentro de Mi cuenta únicamente tras confirmar el rol y los permisos contra la base de datos.
- Permisos delegables separados: asociados/solicitudes, talleres y recursos.
- El administrador fundador puede dar y retirar permisos a otras cuentas con correo confirmado. Su propio acceso no se puede retirar desde el panel.
- Asociados: consultar solicitudes y actualizar estado; estado de perfil y solicitud se guardan en una sola operación.
- Talleres: crear, editar, publicar u ocultar; fechas de Europe/Madrid, aforo confirmado opcional. No abre inscripciones.
- Recursos: crear, editar, publicar u ocultar enlaces HTTPS. El recurso enlazado debe proteger sus propios archivos confidenciales.
- Historial de escrituras: actor, acción, referencia, fecha y cambios de estado/permisos; sin copiar motivos, correos o contraseñas al historial.
- Páginas de 50 registros, búsqueda por nombre/título, confirmación antes de guardar y detección de cambios concurrentes.
- Sin borrado permanente, pagos, donaciones, adjudicación de ayudas, lectura de contraseñas ni exportación masiva.

## Seguridad

`database/admin-panel.sql` crea el esquema privado seven_admin, sus tablas con RLS y sin permisos directos para anon/authenticated. El único punto de entrada público es una función SECURITY INVOKER, disponible solo para authenticated. Llama a una función privada SECURITY DEFINER que comprueba auth.uid() y los permisos actuales en cada operación. No utiliza user_metadata, no modifica las políticas existentes y no otorga escritura directa sobre las tablas del proyecto.

Las revocaciones se comprueban contra la base de datos en cada petición, sin esperar a que expire el JWT. El cliente limpia datos al cerrar sesión y descarta respuestas tardías. La revocación no puede borrar datos ya vistos o copiados por una persona previamente autorizada.

El permiso de asociado es independiente del administrativo. La cuenta del fundador no se convertirá automáticamente en asociado activo.

## Validación realizada

- 32 pruebas locales pasan: 24 existentes y 8 del panel (incluyen falta de rol, metadatos falsos, permisos por área, errores, revocación, logout, respuestas tardías, texto no ejecutable, confirmación y fechas/cambio de hora).
- Compilación de producción correcta.
- Revisión visual local de solicitudes, áreas y edición de permisos con datos ficticios; captura guardada en el proyecto.
- Las pruebas de interfaz utilizan respuestas simuladas.
- Las dos verificaciones SQL se ejecutaron correctamente en Supabase con ROLLBACK: límites de privilegios, metadatos falsos, usuario normal, permisos parciales, protección del fundador, concesión y retirada de permisos, rechazo de escritura directa, creación y edición de borradores, actualización de estado y auditoría. No quedaron cuentas adicionales con rol administrativo ni contenido de prueba.
- La auditoría de seguridad posterior informa de RLS sin políticas en las dos tablas privadas: es deliberado, pues no tienen permisos directos para usuarios y solo se operan mediante la función autorizada. Permanece el aviso previo sobre contraseñas filtradas.
- Asesor de seguridad previo: un aviso existente sobre protección contra contraseñas filtradas desactivada. No se ha modificado Auth.

## Activación y comprobaciones

La migración aplicada es private_admin_panel_permissions. El alta inicial del fundador se realizó mediante una consulta privada por correo confirmado, fuera del repositorio público. No contiene claves nuevas ni depende de metadatos editables.

Los nuevos administradores deben crearse como cuentas normales, confirmar su correo y recibir del fundador los permisos concretos desde Administración → Administradores → Dar acceso. Dejar todos los permisos sin marcar al editar retira su acceso administrativo. Esa función no existe para administradores delegados. No puede retirarse el acceso del fundador desde la web.

Las inscripciones, pagos y ayudas siguen fuera del panel. Los recursos enlazados mantienen su propia protección. El rol administrativo no cambia la condición de asociado.

## Desarrollo y mantenimiento

`npm ci`, `npm test`, `npm run build`. Para una revisión con datos ficticios: `node scripts/preview-admin.mjs`, solo en localhost:4175. No publicar esa vista ni usar sus datos como evidencia de producción.

Para retirar temporalmente el panel, revertir la publicación del frontend y revocar EXECUTE de public.admin_panel a authenticated desde una sesión autorizada. Antes de cambios posteriores, conservar una copia privada de roles y auditoría. No eliminar el historial ni las tablas para revertir la interfaz. Cualquier recuperación de datos necesita una copia y una prueba independiente; no se ha probado restauración.
