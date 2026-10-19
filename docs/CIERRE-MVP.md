# Cierre del MVP — My-Deutsch (2026-10-19)

Producción: https://my-deutsch.vercel.app · Repositorio: `Ally2403/My-Deutsch` · Base: Supabase `rgzguilhkilaizamvyuq`.

## Qué incluye el MVP
- **Cuenta:** registro, ingreso con correo y con Google (publicado), recuperar contraseña, perfil y eliminar cuenta, página de inicio y privacidad (RF-01–05, RF-40).
- **Grupos:** crear, unirse por código o enlace (con límite de intentos), miembros, administrar, salir (RF-06–10, RNF-17).
- **Biblioteca:** subir un PDF escaneado (reanudable, ≤ 50 MB y ≤ 400 páginas), procesamiento en GitHub Actions (OCR → texto + imágenes WebP), estado en vivo, reintento, quitar libro (RF-11–15, RNF-04, RNF-11).
- **Lector:** pasar páginas, texto tocable alineado al original, zoom, recordar la última página y % leído, panel de palabra con significado en español, género y plural, verbos separables, palabras cortadas con guion, colorear sustantivos (der azul · das verde · die rojo), marcar plurales en amarillo (RF-16–17, RF-19–26, RF-38–39, RF-41, RNF-01–03).
- **Diccionario personal:** guardado automático al consultar, palabras vistas/conocidas en el texto, pantalla con búsqueda, filtros y orden (RF-27–31).
- **Transversal:** diseño minimalista claro con **modo oscuro** (sol/luna), responsive 360/768/1280 px, iPhone (web) (RF-36, RF-42, RF-44, RNF-07, RNF-09, RNF-15); seguridad y privacidad por RLS (RNF-05, RNF-06); CI con pruebas (RNF-12); despliegue en Vercel (RNF-16).

## Verificación
526 pruebas unitarias · 145 e2e (Chromium 360/768/1280 y WebKit iPhone) · 277 pytest del worker · cobertura de `lib/domain` 97,5 % · suite RLS de 22 pruebas contra la base real · CI en cada PR · prueba manual de la usuaria en producción (correo, Google, sesión, libro real, iPhone).

## Añadido después del cierre (2026-10-19, todo en `main`)
RF-33/RNF-14/RF-35 (escribir respuestas sobre la página, guardado fiable offline, reiniciar página) · RF-34 (campos de ejercicio detectados) · RF-32 (exportar diccionario a CSV) · RF-37 (preferencias de lectura en el perfil) · RF-18 (modo lectura, con ilustraciones detectadas por el worker) · RF-45 (verbos separables con punto medio en el panel).

## En progreso (necesitan una acción de la usuaria)
| ID | Tema | Falta |
|---|---|---|
| RNF-08 | Lighthouse móvil en cada despliegue de producción | Ver la primera ejecución del workflow `lighthouse` en Actions (medido a mano: rendimiento 89–98, accesibilidad y buenas prácticas 100) |
| RNF-10 | Concurrencia: 25 usuarios, p95 < 500 ms | Correr `loadtest/lector.k6.js` 10 min con una cuenta de prueba y un libro real |

## Limitaciones conocidas
- **RNF-02 criterio 2 (cambio aprobado 2026-10-19):** las páginas son privadas, así que se sirven desde la app con caché privada de 7 días, no desde un CDN con caché inmutable de 1 año.
- Para que los libros ya subidos muestren campos de ejercicio e ilustraciones hay que reprocesarlos.
- Un reintento de procesamiento repite el libro desde la primera hoja.
- Las traducciones son automáticas (Opus-MT) y pueden fallar en frases idiomáticas; el panel lo indica.
- Alrededor del 1 % de las palabras queda ligeramente desalineado frente a la tinta (≤ 4,7 % del ancho).
- Sin prueba con lector de pantalla real; sin PWA instalable (descartada).
- Pendientes de seguridad diferidos (RF-43): fijar el SHA-256 de los modelos ya convertidos, revisar enlaces simbólicos en la carpeta de preparación y exigir un indicador de desarrollo para `MYDEUTSCH_MODELS_DIR`. Riesgo bajo hoy.
- Cierres de sesión: se redujo la causa probable (renovación doble); si reaparece, revisar los logs de Auth (`refresh_token_not_found`) y subir el «JWT expiry» en Supabase.

## Siguiente paso sugerido (post-MVP)
1. Recoger comentarios del curso (~25 estudiantes) durante dos semanas.
2. Priorizar: ejercicios escritos (RF-33/34/35) o exportar diccionario (RF-32), según lo que pidan.
3. Reprocesar libros cuando mejoren traducciones o reglas del worker.
