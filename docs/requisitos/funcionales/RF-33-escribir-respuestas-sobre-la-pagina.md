# RF-33 — Escribir respuestas sobre la página

| Campo | Valor |
|---|---|
| **ID** | RF-33 |
| **Título** | Escribir respuestas sobre la página |
| **Módulo** | M-8 Ejercicios |
| **Prioridad** | Media |
| **Fase** | 3 |
| **Estado** | Hecho |
| **Dependencias** | [RF-17](RF-17-texto-seleccionable-alineado-al-original.md) |
| **Reglas de negocio** | RN-13 |

## Descripción
En modo "Escribir", el usuario toca un punto de la página y aparece un cuadro de texto donde escribe su respuesta. Puede mover, editar y borrar los cuadros. Se guardan por usuario y por página.

## Justificación
Los libros traen ejercicios de completar y escribir; resolverlos en la misma página evita usar papel aparte.

## Criterios de aceptación
1. El cuadro aparece donde se tocó y se guarda en coordenadas relativas, por lo que se ve en el mismo lugar en celular y en computador.
2. Los cambios se guardan automáticamente en < 1 s (RNF-14), sin botón de guardar.
3. Fuera del modo "Escribir", tocar la página consulta palabras como siempre.
4. Un interruptor permite ocultar o mostrar mis respuestas.
