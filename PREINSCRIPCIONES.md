# Preinscripciones a talleres

La cuenta web no implica ser socio. Solo las cuentas con correo confirmado pueden enviar la solicitud. La persona adulta responsable indica el total de participantes que pintarán y cuántos son menores. No se piden nombres, edades exactas ni datos médicos de menores. Una cuenta gestiona una solicitud por taller; para ampliarla, cancela y vuelve a enviar el total, perdiendo cualquier confirmación anterior.

La preinscripción es una petición pendiente y no reserva aforo. Se aceptan solicitudes de interés por encima del aforo; solo las confirmadas consumen plazas. La solicitud completa se confirma o queda en espera; no hay confirmaciones parciales de grupos.

Mi cuenta → Mis preinscripciones permite consultar, actualizar el estado y cancelar. Las respuestas tras cerrar sesión se descartan. El registro y la recuperación mantienen la confirmación por correo existente. No se envían correos automáticos de recepción ni de cambios: la confirmación de recepción y el estado se muestran en la cuenta. El administrador puede contactar manualmente por correo; estos envíos requieren su decisión.

Mi cuenta → Administración → Preinscripciones permite consultar nombre y correo de la persona responsable, número de participantes, menores y estado. Solo quienes tienen permiso Talleres pueden gestionarlas. Las modificaciones incluyen un control para impedir sobrescribir datos recién cambiados en otra pestaña y quedan en el historial. En Talleres se abre o cierra la preinscripción de cada ficha. La disponibilidad pública se consulta al servidor; cerrar conserva las solicitudes.

Para confirmar plazas, configura primero una fecha y un aforo. El servidor bloquea el taller durante cada asignación, cuenta las personas de las solicitudes confirmadas y las inscripciones anteriores y rechaza superar el aforo. También impide bajar el aforo por debajo de las plazas confirmadas. Pendientes y lista de espera no reservan plaza. El taller del cartel tiene 30 plazas; fecha y hora siguen pendientes.

La imagen original se incluye sin editar. El QR del cartel lleva a WhatsApp; apuntarse requiere el formulario de la web. Comparte https://sietepinceles.es/#evento.

## Operación y recuperación

No hay costes de nuevos servicios ni nuevas dependencias. Se usan el alojamiento y Supabase existentes; siguen aplicándose sus límites.

Los datos están en el esquema privado seven_pre, con RLS y sin acceso directo a tablas desde el navegador. Las funciones públicas son envoltorios sin privilegios; la lógica privada comprueba identidad, propiedad y permisos actuales. La disponibilidad anónima solo expone identificador, apertura y fecha de talleres publicados. Las migraciones están registradas en Supabase; los SQL de implementación y verificación se conservan en la carpeta local superior, fuera del repositorio público.

Al cerrar una actividad, revisa las solicitudes y elimina los datos que ya no sean necesarios. No hay una tarea automática de borrado. Atiende solicitudes de supresión por el correo de privacidad. El historial conserva referencias y cambios de estado, sin textos de solicitudes ni datos de menores.

Antes de futuras migraciones con datos reales, exporta workshops y seven_pre.requests/events por una vía administrativa privada y guarda la copia con acceso restringido. No la subas al repositorio. Verifica restauraciones en un entorno separado. En esta entrega no se ha hecho una restauración de copias. Para retirar temporalmente la función, cierra la preinscripción desde Talleres; para revertir la interfaz, republica el commit anterior conservando las solicitudes en la base de datos.

## Validación y límites

Pruebas de interfaz automatizadas con datos simulados y comprobación SQL en una transacción revertida: cuenta no asociada, duplicados, lectura privada, rechazo administrativo, cantidades inválidas, fecha requerida, aforo, cancelación, actualización obsoleta y cierre. La transacción elimina todos sus datos de prueba al revertirse. El bloqueo por taller está implementado; no se ha realizado una carrera de dos confirmaciones simultáneas por HTTP.

La revisión automática rechazó crear cuentas y un taller persistentes de prueba en la base activa por riesgo de residuos. No se crearon. Queda pendiente un recorrido completo de envío autenticado desde el navegador con una cuenta autorizada, así como repetir la entrega de correo de alta. La vista pública y el acceso obligatorio se revisan en navegador, incluyendo vista móvil. No equivale a una prueba en todos los dispositivos físicos.

El asesor de seguridad mantiene el aviso previo de protección de contraseñas filtradas desactivada: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection. Las tablas privadas sin políticas de acceso directo se mantienen deliberadamente cerradas.
