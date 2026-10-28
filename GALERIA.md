# Galería de vídeos

Implementación preparada el 28/10/2026.

- Portada: tres vídeos en index.html.
- Galería: seis vídeos en galeria.html.
- Estilos e interacción: gallery.css y gallery.js.
- Portadas alojadas en gallery-<id>.jpg. No se contacta con YouTube hasta pulsar Cargar vídeo.
- Cerrar vídeo elimina el reproductor; los enlaces externos funcionan sin JavaScript.
- Se excluyó El Mural del Caos por aparecer una menor sin autorización específica para esta web.

Para añadir un vídeo: copiar una tarjeta de galeria.html, cambiar data-video por su identificador de YouTube, data-title, título y enlace; añadir su portada en gallery-<id>.jpg. Revisar permisos y contenido antes de publicar. No cargar fotografías de menores sin autorización concreta. Actualizar la fecha de selección. Las listas son manuales, no se sincronizan automáticamente.

Publicación: subir estos archivos al repositorio AlbertoAR87/7-pinceles1, rama main. El workflow existente construye dist y publica GitHub Pages. No subir node_modules ni credenciales. Verificar el workflow y después https://sietepinceles.es/galeria.html.

Validación: construcción completada; 24 pruebas existentes pasan; comprobación de seis tarjetas, ausencia inicial de iframes, carga bajo petición y cierre del reproductor correcta. Previsualización en navegador bloqueada por acceso a localhost; reproducción real, apariencia móvil y publicación aún pendientes.

Reversión: revertir el commit de la galería y dejar que el workflow publique de nuevo.
