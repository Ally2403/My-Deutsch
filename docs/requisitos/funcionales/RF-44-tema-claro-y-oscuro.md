# RF-44 — Tema claro y oscuro con selector y barra de navegación

| Campo | Valor |
|---|---|
| **ID** | RF-44 |
| **Título** | Tema claro y oscuro con selector y barra de navegación |
| **Módulo** | M-T Transversal |
| **Prioridad** | Alta |
| **Fase** | 5 |
| **Estado** | Hecho |
| **Dependencias** | [RF-42](RF-42-diseno-visual-y-experiencia-movil.md), [RF-37](RF-37-preferencias-de-lectura.md) |
| **Reglas de negocio** | — |

## Descripción
La app es clara por defecto, con un diseño limpio y minimalista. Quien lo prefiera puede elegir el modo oscuro desde un botón de sol/luna visible en todas las pantallas (alterna claro ↔ oscuro; sin elección guardada parte del tema del sistema). Una barra superior común da acceso a Grupos, Diccionario y Perfil. Cubre la parte de tema de RF-37 (guardada en el dispositivo; no en el perfil).

## Justificación
RF-42 dejó el modo oscuro «para después»; la usuaria pidió colores claros y modo oscuro opcional.

## Criterios de aceptación
1. Un botón de sol/luna (muestra el tema al que cambiará) está en la barra superior de todas las pantallas con barra y en el lector; la elección se recuerda en el dispositivo.
2. El tema se aplica antes del primer pintado (sin destello de tema equivocado) y «Sistema» sigue `prefers-color-scheme`.
3. Colores de género, plural y texto cumplen ≥ 4,5:1 sobre el fondo en ambos temas (RNF-09); el género no depende solo del color.
4. En modo oscuro la imagen de la página del libro conserva su aspecto original (no se invierte).
5. La barra superior (marca, Grupos, Diccionario, Perfil) usa objetivos ≥ 44 px, no desborda a 360 px y solo muestra los enlaces con sesión.
6. Todas las pantallas se ven correctas en ambos temas a 360, 768 y 1280 px.

## Verificación (2026-10-19)
- Criterios 1, 2 ✅ `e2e/tema.spec.ts`: el selector recorre Sistema → Claro → Oscuro y persiste al recargar; «Sistema» sigue `prefers-color-scheme`; el script inline aplica el tema antes de hidratar (con el JS de React bloqueado).
- Criterio 3 ✅ `lib/domain/contrast.test.ts`: texto, muted, danger, accent y género ≥ 4,5:1 en claro y oscuro (y el bloque «Sistema» repite el oscuro); axe `color-contrast` sin violaciones serias en 6 rutas × 2 temas × 4 proyectos.
- Criterio 4 ✅ e2e: la superficie de la página sigue blanca y sin `filter` en oscuro.
- Criterio 5 ✅ e2e: barra de ≥ 44 px que cabe a 360 px (en móvil solo el logo; el nombre aparece desde 480 px).
- Criterio 6 ◐ rutas públicas y lector demo verificados (sin desbordamiento) en ambos temas a 360/768/1280 y WebKit iPhone; pantallas con sesión revisadas a mano en Chromium (grupos claro/oscuro), sin datos reales de grupo/biblioteca.

- Actualización (2026-10-19): el selector de tres estados se cambió por sol/luna a pedido de la usuaria; cubierto por `e2e/tema.spec.ts` y `lib/domain/theme.test.ts`.
