# Índice de requisitos — My-Deutsch

Fuente única de verdad del alcance. Cada fila enlaza a su mini-archivo. Estados: Pendiente · En progreso · Hecho · Descartado.
Fases: 2 = spike técnico · 3 = MVP · 4 = aprendizaje · 5 = pulido.

## Módulos

| Código | Módulo                 |
| ------ | ---------------------- |
| M-1    | Cuenta                 |
| M-2    | Grupos                 |
| M-3    | Biblioteca             |
| M-4    | Procesamiento (worker) |
| M-5    | Lector                 |
| M-6    | Léxico                 |
| M-7    | Vocabulario personal   |
| M-8    | Ejercicios             |
| M-T    | Transversal            |

## Requerimientos funcionales (50)

| ID    | Título                                                                                                                         | Módulo | Prioridad | Fase | Estado      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------ | ------ | --------- | ---- | ----------- |
| RF-01 | [Registrar usuario con correo y contraseña](funcionales/RF-01-registrar-usuario-con-correo-y-contrasena.md)                    | M-1    | Alta      | 3    | Hecho       |
| RF-02 | [Iniciar sesión con correo y contraseña](funcionales/RF-02-iniciar-sesion-con-correo-y-contrasena.md)                          | M-1    | Alta      | 3    | Hecho       |
| RF-03 | [Iniciar sesión con Google](funcionales/RF-03-iniciar-sesion-con-google.md)                                                    | M-1    | Alta      | 3    | Hecho       |
| RF-04 | [Cerrar sesión y recuperar contraseña](funcionales/RF-04-cerrar-sesion-y-recuperar-contrasena.md)                              | M-1    | Media     | 3    | Hecho       |
| RF-05 | [Gestionar perfil](funcionales/RF-05-gestionar-perfil.md)                                                                      | M-1    | Baja      | 4    | Hecho       |
| RF-06 | [Crear grupo](funcionales/RF-06-crear-grupo.md)                                                                                | M-2    | Alta      | 3    | Hecho       |
| RF-07 | [Unirse a un grupo](funcionales/RF-07-unirse-a-un-grupo.md)                                                                    | M-2    | Alta      | 3    | Hecho       |
| RF-08 | [Ver miembros del grupo](funcionales/RF-08-ver-miembros-del-grupo.md)                                                          | M-2    | Media     | 3    | Hecho       |
| RF-09 | [Administrar grupo](funcionales/RF-09-administrar-grupo.md)                                                                    | M-2    | Media     | 4    | Hecho       |
| RF-10 | [Salir de un grupo](funcionales/RF-10-salir-de-un-grupo.md)                                                                    | M-2    | Media     | 4    | Hecho       |
| RF-11 | [Subir PDF escaneado a un grupo](funcionales/RF-11-subir-pdf-escaneado-a-un-grupo.md)                                          | M-3    | Alta      | 3    | Hecho       |
| RF-12 | [Procesar libro en segundo plano](funcionales/RF-12-procesar-libro-en-segundo-plano.md)                                        | M-4    | Alta      | 3    | Hecho       |
| RF-13 | [Ver estado del procesamiento](funcionales/RF-13-ver-estado-del-procesamiento.md)                                              | M-3    | Media     | 3    | Hecho       |
| RF-14 | [Ver biblioteca del grupo](funcionales/RF-14-ver-biblioteca-del-grupo.md)                                                      | M-3    | Alta      | 3    | Hecho       |
| RF-15 | [Quitar libro de un grupo](funcionales/RF-15-quitar-libro-de-un-grupo.md)                                                      | M-3    | Baja      | 4    | Hecho       |
| RF-16 | [Pasar páginas](funcionales/RF-16-pasar-paginas.md)                                                                            | M-5    | Alta      | 3    | Hecho       |
| RF-17 | [Texto seleccionable alineado al original](funcionales/RF-17-texto-seleccionable-alineado-al-original.md)                      | M-5    | Alta      | 3    | Hecho       |
| RF-18 | [Modo lectura adaptado](funcionales/RF-18-modo-lectura-adaptado.md)                                                            | M-5    | Media     | 4    | Hecho       |
| RF-19 | [Zoom y ajuste de página](funcionales/RF-19-zoom-y-ajuste-de-pagina.md)                                                        | M-5    | Media     | 3    | Hecho       |
| RF-20 | [Recordar última página](funcionales/RF-20-recordar-ultima-pagina.md)                                                          | M-5    | Alta      | 3    | Hecho       |
| RF-21 | [Consultar palabra](funcionales/RF-21-consultar-palabra.md)                                                                    | M-6    | Alta      | 3    | Hecho       |
| RF-22 | [Mostrar género y color del sustantivo](funcionales/RF-22-mostrar-genero-y-color-del-sustantivo.md)                            | M-6    | Alta      | 3    | Hecho       |
| RF-23 | [Resolver formas flexionadas al lema](funcionales/RF-23-resolver-formas-flexionadas-al-lema.md)                                | M-6    | Alta      | 3    | Hecho       |
| RF-24 | [Detectar verbos separables](funcionales/RF-24-detectar-verbos-separables.md)                                                  | M-6    | Media     | 4    | Hecho       |
| RF-25 | [Palabra no encontrada](funcionales/RF-25-palabra-no-encontrada.md)                                                            | M-6    | Media     | 3    | Hecho       |
| RF-26 | [Colorear todos los sustantivos](funcionales/RF-26-colorear-todos-los-sustantivos.md)                                          | M-5    | Alta      | 3    | Hecho       |
| RF-27 | [Guardar palabras en el diccionario personal](funcionales/RF-27-guardar-palabras-en-el-diccionario-personal.md)                | M-7    | Alta      | 4    | Hecho       |
| RF-28 | [Indicar palabras ya vistas en el texto](funcionales/RF-28-indicar-palabras-ya-vistas-en-el-texto.md)                          | M-7    | Alta      | 4    | Hecho       |
| RF-29 | [Marcar palabra como conocida](funcionales/RF-29-marcar-palabra-como-conocida.md)                                              | M-7    | Media     | 4    | Hecho       |
| RF-30 | [Consultar diccionario personal](funcionales/RF-30-consultar-diccionario-personal.md)                                          | M-7    | Alta      | 4    | Hecho       |
| RF-31 | [Filtrar y ordenar el diccionario personal](funcionales/RF-31-filtrar-y-ordenar-el-diccionario-personal.md)                    | M-7    | Alta      | 4    | Hecho       |
| RF-32 | [Exportar diccionario personal](funcionales/RF-32-exportar-diccionario-personal.md)                                            | M-7    | Baja      | 5    | Hecho       |
| RF-33 | [Escribir respuestas sobre la página](funcionales/RF-33-escribir-respuestas-sobre-la-pagina.md)                                | M-8    | Media     | 3    | Hecho       |
| RF-34 | [Campos de ejercicio detectados automáticamente](funcionales/RF-34-campos-de-ejercicio-detectados-automaticamente.md)          | M-8    | Baja      | 4    | Hecho       |
| RF-35 | [Reiniciar ejercicios de una página](funcionales/RF-35-reiniciar-ejercicios-de-una-pagina.md)                                  | M-8    | Baja      | 4    | Hecho       |
| RF-36 | [Interfaz responsive en celular, tablet y computador](funcionales/RF-36-interfaz-responsive-en-celular-tablet-y-computador.md) | M-T    | Alta      | 3    | Hecho       |
| RF-37 | [Preferencias de lectura](funcionales/RF-37-preferencias-de-lectura.md)                                                        | M-T    | Baja      | 5    | Hecho       |
| RF-38 | [Enderezar y separar dobles páginas](funcionales/RF-38-enderezar-y-separar-dobles-paginas.md)                                  | M-4    | Alta      | 2    | Hecho       |
| RF-39 | [Unir palabras cortadas con guion](funcionales/RF-39-unir-palabras-cortadas-con-guion.md)                                      | M-6    | Alta      | 2    | Hecho       |
| RF-40 | [Página de inicio pública y política de privacidad](funcionales/RF-40-pagina-de-privacidad-y-de-inicio-publica.md)             | M-1    | Alta      | 3    | Hecho       |
| RF-41 | [Marcar plurales en amarillo](funcionales/RF-41-marcar-plurales-en-amarillo.md)                                                | M-5    | Media     | 3    | Hecho       |
| RF-42 | [Diseño visual y experiencia móvil](funcionales/RF-42-diseno-visual-y-experiencia-movil.md)                                    | M-1    | Alta      | 3    | Hecho       |
| RF-43 | [Calidad de las traducciones al español](funcionales/RF-43-calidad-de-las-traducciones.md)                                     | M-6    | Alta      | 3    | Hecho       |
| RF-44 | [Tema claro y oscuro con selector y barra de navegación](funcionales/RF-44-tema-claro-y-oscuro.md)                             | M-T    | Alta      | 5    | Hecho       |
| RF-45 | [Verbos separables con punto medio en el panel](funcionales/RF-45-verbo-separable-con-punto-medio.md)                          | M-5    | Media     | 3    | Hecho       |
| RF-46 | [Progreso de procesamiento fiel](funcionales/RF-46-progreso-de-procesamiento-fiel.md)                                          | M-4    | Alta      | 6    | En progreso |
| RF-47 | [Traducir frases seleccionadas](funcionales/RF-47-traducir-frases-seleccionadas.md)                                            | M-5    | Alta      | 6    | En progreso |
| RF-48 | [Repaso con tarjetas (FSRS)](funcionales/RF-48-repaso-con-tarjetas.md)                                                         | M-7    | Alta      | 6    | En progreso |
| RF-49 | [Indicador de avance de lectura](funcionales/RF-49-indicador-de-avance-de-lectura.md)                                          | M-5    | Media     | 6    | En progreso |
| RF-50 | [PWA instalable con lectura sin conexión](funcionales/RF-50-pwa-instalable-con-lectura-sin-conexion.md)                        | M-T    | Alta      | 6    | En progreso |
| RF-51 | [Reprocesar un libro con el pipeline nuevo](funcionales/RF-51-reprocesar-libro-con-pipeline-nuevo.md) | M-4    | Alta      | 6    | Propuesto   |

## Requerimientos no funcionales (19)

| ID     | Título                                                                                                                    | Módulo | Prioridad | Fase | Estado      |
| ------ | ------------------------------------------------------------------------------------------------------------------------- | ------ | --------- | ---- | ----------- |
| RNF-01 | [Tiempo de respuesta al consultar una palabra](no-funcionales/RNF-01-tiempo-de-respuesta-al-consultar-una-palabra.md)     | M-6    | Alta      | 3    | Hecho       |
| RNF-02 | [Tiempo de cambio de página](no-funcionales/RNF-02-tiempo-de-cambio-de-pagina.md)                                         | M-5    | Alta      | 3    | Hecho       |
| RNF-03 | [Precisión del OCR](no-funcionales/RNF-03-precision-del-ocr.md)                                                           | M-4    | Alta      | 2    | Hecho       |
| RNF-04 | [Tiempo de procesamiento de un libro](no-funcionales/RNF-04-tiempo-de-procesamiento-de-un-libro.md)                       | M-4    | Media     | 2    | Hecho       |
| RNF-05 | [Autenticación segura](no-funcionales/RNF-05-autenticacion-segura.md)                                                     | M-1    | Alta      | 3    | Hecho       |
| RNF-06 | [Aislamiento de datos personales (RLS)](no-funcionales/RNF-06-aislamiento-de-datos-personales-rls.md)                     | M-T    | Alta      | 3    | Hecho       |
| RNF-07 | [Usabilidad en móvil](no-funcionales/RNF-07-usabilidad-en-movil.md)                                                       | M-T    | Alta      | 3    | Hecho       |
| RNF-08 | [Rendimiento web](no-funcionales/RNF-08-rendimiento-web.md)                                                               | M-T    | Media     | 5    | En progreso |
| RNF-09 | [Accesibilidad y contraste de colores de género](no-funcionales/RNF-09-accesibilidad-y-contraste-de-colores-de-genero.md) | M-T    | Alta      | 3    | Hecho       |
| RNF-10 | [Concurrencia en el plan gratuito](no-funcionales/RNF-10-concurrencia-en-el-plan-gratuito.md)                             | M-T    | Media     | 5    | En progreso |
| RNF-11 | [Límites de archivo](no-funcionales/RNF-11-limites-de-archivo.md)                                                         | M-3    | Media     | 3    | Hecho       |
| RNF-12 | [Calidad y pruebas](no-funcionales/RNF-12-calidad-y-pruebas.md)                                                           | M-T    | Media     | 3    | Hecho       |
| RNF-13 | [Portabilidad de datos y respaldo](no-funcionales/RNF-13-portabilidad-de-datos-y-respaldo.md)                             | M-T    | Baja      | 5    | Hecho       |
| RNF-14 | [Guardado fiable de anotaciones](no-funcionales/RNF-14-guardado-fiable-de-anotaciones.md)                                 | M-8    | Media     | 3    | Hecho       |
| RNF-15 | [Compatibilidad con iPhone y PWA](no-funcionales/RNF-15-compatibilidad-con-iphone-y-pwa.md)                               | M-T    | Alta      | 3    | Hecho       |
| RNF-16 | [Despliegue de la app en Vercel](no-funcionales/RNF-16-despliegue-de-la-app-en-vercel.md)                                 | M-T    | Alta      | 3    | Hecho       |
| RNF-17 | [Límite de intentos de código de invitación](no-funcionales/RNF-17-limite-de-intentos-de-codigo-de-invitacion.md)         | M-2    | Alta      | 3    | Hecho       |
| RNF-18 | [Velocidad de procesamiento](no-funcionales/RNF-18-velocidad-de-procesamiento.md)                                         | M-4    | Alta      | 6    | En progreso |
| RNF-19 | [Rendimiento de lectura](no-funcionales/RNF-19-rendimiento-de-lectura.md)                                                 | M-5    | Media     | 6    | En progreso |

## Alcance del MVP (cierre 2026-10-19)

El MVP incluye todo lo marcado **Hecho**. Siguen **En progreso**, a la espera de acciones de la usuaria (cuenta de prueba, primera ejecución en Actions): RNF-08 (rendimiento web) y RNF-10 (concurrencia).

Mejoras del 2026-10-20 (Fase 6 del plan): RF-46 a RF-50, RNF-18 y RNF-19 están implementados y probados en CI, pero siguen **En progreso** porque cada uno tiene al menos un criterio que solo la usuaria puede verificar (libro real de 167 páginas cronometrado, iPhone físico, libros subidos de nuevo para `sents`, sesión real de repaso). El detalle por criterio está en cada archivo. Detalle y limitaciones conocidas: [`docs/CIERRE-MVP.md`](../CIERRE-MVP.md) y [`docs/ESTADO.md`](../ESTADO.md).

## Plantilla para un requisito nuevo

Copia cualquier archivo existente, usa el siguiente ID libre, añade la fila a este índice y enlaza las reglas de negocio afectadas. Ningún código se implementa sin requisito (ver CLAUDE.md).
