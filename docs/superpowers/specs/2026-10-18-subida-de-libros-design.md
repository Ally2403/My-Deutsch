# Entrega 2 — Subida y procesamiento de libros (diseño)

Requisitos: RF-11, RF-12 (cierre), RF-13, RF-14, RNF-11, RNF-17 (nuevo). Reglas: RN-02, RN-03, RN-10, RN-11.

## Intención

Que un miembro suba un PDF escaneado, el worker lo procese en GitHub Actions y todo el grupo lo lea en `/libros/[id]`, sin romper RN-02 (libro único por contenido) ni los límites del plan gratuito.

## Objetivos

- Subida reanudable con progreso (móvil, iPhone incluido).
- Un libro ya existente se vincula en segundos, sin reprocesar.
- Estado visible («En cola», «Procesando X/Y», «Listo», «Error» con «Reintentar»).
- Biblioteca del grupo con portada, páginas y progreso personal.

## No objetivos

- Quitar libros (RF-15), diccionario personal (RF-27), progreso real de lectura (RF-20; la biblioteca muestra 0 % hasta entonces).
- Cola con prioridades: basta FIFO y un libro por usuario (RN-10).

## Anti-objetivos (fracaso aunque «funcione»)

- Que alguien vincule a su grupo un libro cuyo archivo no tiene (RN-02).
- Secretos en el cliente o en el repositorio (la service role key solo en secretos de Actions y variables de servidor de Vercel).
- Superar el plan gratuito (1 GB de Storage, 2 000 min de Actions).

## Decisiones (aprobadas por la usuaria, 2026-10-18)

1. **Disparo por token de GitHub** (`repository_dispatch` con `book_id`); no se revisa una cola periódica. Token fino con permiso Actions (escritura), ya guardado en Vercel como `GITHUB_DISPATCH_TOKEN`.
2. **`submit_book` ya no confía en la huella del cliente.** Solo registra una _solicitud pendiente_ (grupo, título, ruta del archivo subido). No crea libros ni vincula grupos.
3. **La huella la calcula el servidor**: una ruta de API en Vercel (con service role key) lee el PDF de Storage, calcula el SHA-256 y llama a una función SQL solo para service role que:
   - si el libro existe (`queued`/`processing`/`ready`): lo vincula al grupo y borra el archivo subido;
   - si no: crea el libro y el `job` (aplica RN-10) y la ruta dispara el workflow.
4. **El worker recalcula la huella** y aborta si no coincide; también rechaza PDF de más de 400 páginas con mensaje claro (el conteo de páginas no se hace en el navegador; **decisión del asistente**).
5. **El worker publica** imágenes WebP y JSON en el bucket `pages` bajo `<book_id>/`, crea las filas de `pages` y `jobs`, actualiza `pages_done` por página (reanudable) y mapea los ids de léxico locales a `lexicon.id` de Postgres (inserta solo el léxico usado, ADR-003).
6. **RNF-17**: tabla de intentos fallidos de `join_group` con RLS; 10 fallos/hora bloquean al usuario.
7. Navegador: valida tipo (cabecera `%PDF`) y tamaño (≤ 50 MB) antes de subir; subida reanudable (TUS de Supabase); progreso en pantalla.

## Orden de entrega (ramas pequeñas, cada una con TDD)

- **2a** Migración: solicitudes pendientes, funciones, intentos de `join_group`; pruebas pgTAP.
- **2b** Worker: publicación en Supabase y `process-book.yml`.
- **2c** Ruta de API: verifica huella y dispara el workflow.
- **2d** Pantallas: subida, estado, biblioteca, `/libros/[id]`.

## A cargo de la usuaria

Guardar en Vercel `SUPABASE_SERVICE_ROLE_KEY` (variable de servidor) y en GitHub Actions `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (secretos). Claude nunca lee ni escribe esos valores; mantiene `.env.example`.

## Sin verificar de antemano

RNF-04 (tiempo en Actions), reanudación de subida en un iPhone real, que 400 páginas quepan en el tiempo máximo de un job.

## Deja libre al constructor

Nombres de tablas y funciones, formato exacto de los mensajes de error, diseño visual de la biblioteca (mobile-first, 44 px táctiles).
