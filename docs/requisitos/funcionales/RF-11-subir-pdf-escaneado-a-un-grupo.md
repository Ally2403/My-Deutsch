# RF-11 — Subir PDF escaneado a un grupo

| Campo | Valor |
|---|---|
| **ID** | RF-11 |
| **Título** | Subir PDF escaneado a un grupo |
| **Módulo** | M-3 Biblioteca |
| **Prioridad** | Alta |
| **Fase** | 3 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-07](RF-07-unirse-a-un-grupo.md) |
| **Reglas de negocio** | RN-02, RN-10 |

## Descripción
Un miembro sube un PDF a un grupo indicando el título del libro. El sistema calcula su huella, valida los límites y lo encola para procesamiento, o lo vincula directamente si ya existía.

## Justificación
Es la entrada de contenido de toda la aplicación.

## Criterios de aceptación
1. Un PDF válido (≤ 50 MB, ≤ 400 páginas) queda en estado "En cola" y aparece en la biblioteca del grupo.
2. Un archivo que no es PDF, o que supera los límites, se rechaza antes de subirlo completo, con un mensaje que indica el límite.
3. Si la huella ya existe (RN-02), el libro queda disponible al instante, sin reprocesarse.
4. Si el usuario ya tiene un libro en procesamiento, se muestra "Espera a que termine tu libro actual".
5. La subida muestra una barra de progreso y se puede reanudar si se corta la conexión en móvil.
