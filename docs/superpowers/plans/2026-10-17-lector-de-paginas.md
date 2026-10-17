# Lector de páginas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Formato del JSON de página con ejemplo de prueba y un lector que muestra la página original con capa de texto tocable, panel de palabra con color de género y resaltado de sustantivos (RF-16, RF-17, RF-21, RF-22, RF-26).

**Architecture:** Lógica pura y probada en `lib/domain/` (validación del JSON, consultas por token, paginación); componentes React finos en `components/reader/`; ruta provisional `/lector/demo` que lee un ejemplo estático de `public/demo/`. La consulta de una palabra no hace peticiones de red: todo viene en el JSON de la página (RNF-01).

**Tech Stack:** Next.js 16 (App Router), TypeScript estricto, Tailwind 4, Vitest + Testing Library, Playwright; Pillow vía `uv` para generar la imagen del ejemplo.

**Spec:** diseño aprobado en la conversación del 2026-10-17; requisitos `docs/requisitos/funcionales/RF-16`, `RF-17`, `RF-21`, `RF-22`, `RF-26`, `RNF-01`, `RNF-09`; reglas RN-01, RN-05, RN-06, RN-12, RN-14; formato base en `docs/04-modelo-de-datos.md`.

## Global Constraints

- UI y documentación en español; identificadores y código en inglés. Commits `RF-xx: ...` en ramas `feat/RF-xx-...`; **sin** `Co-Authored-By` ni "Generated with" (CLAUDE.md regla 6).
- Mobile-first a 360 px; objetivos táctiles ≥ 44 px; sin dependencia de hover; `env(safe-area-inset-*)`.
- Consultar una palabra: sin peticiones de red, panel < 300 ms (RNF-01).
- Colores solo con tokens `--gender-m/n/f` (contraste ≥ 4.5:1); el género nunca solo con color: artículo escrito + borde inferior sólido (der) / punteado (das) / doble (die) (RNF-09).
- Resaltado de sustantivos con opacidad ≤ 35 %; activar en < 100 ms (RF-26).
- Máximo 5 acepciones por palabra (RN-12). Coordenadas relativas 0–1.
- Zona reservada de 24 px desde el borde para el gesto "atrás" de iOS (RF-16 c1).
- Sin librerías de gestos: eventos de puntero nativos. El ejemplo no usa páginas de libros con derechos de autor.
- La preferencia de colorear va en `localStorage`, siempre dentro de `try/catch`.

## Review Focus

- Página con `tokens: []` (imagen sin texto): el lector la muestra sin errores ni capa vacía tocable.
- Token cuyo `l` no está en `lex` (palabra sin entrada): el panel muestra la forma tal cual y un enlace de búsqueda externa (RN-12), no falla.
- Sustantivo con varios géneros y solo plural: color y etiquetas según RN-01 (cubierto por `genderInfo`; se prueba en el panel).
- Palabra cortada con guion (`b2`): ambas cajas son tocables y abren la misma entrada.
- Página 1 y última: "anterior"/"siguiente" no salen del rango; el selector rechaza valores fuera de 1..N.
- `localStorage` bloqueado (modo privado): el interruptor funciona en la sesión sin lanzar excepción.

---

### Task 1: Formato del JSON de página y validador

**Files:**

- Create: `lib/domain/page.ts`, `lib/domain/page.test.ts`
- Modify: `docs/04-modelo-de-datos.md` (sección "Archivo de tokens por página": añadir `f`, `v: 1` fijo, nota de validación), `docs/requisitos/INDEX.md` no cambia aún.

**Interfaces:**

- Produces:

  ```ts
  export type Box = readonly [x: number, y: number, w: number, h: number];
  export type Sense = { es: string; m: boolean };
  export type LexEntry = {
    lemma: string;
    pos: string;
    g?: Gender[];
    pl?: string;
    senses: Sense[];
  };
  export type Token = {
    t: string;
    b: Box;
    b2?: Box;
    l?: number;
    c?: number;
    sep?: number;
    f?: string;
  };
  export type PageData = {
    v: 1;
    size: readonly [number, number];
    lines: (readonly [number, number])[];
    paragraphs: (readonly [number, number])[];
    images: Box[];
    fields: Box[];
    tokens: Token[];
    lex: Record<string, LexEntry>;
  };
  export function parsePage(raw: unknown): PageData; // lanza Error con mensaje en español
  ```

  (`Gender` viene de `lib/domain/gender.ts`.) `f` es la etiqueta de forma: `"pret" | "part" | "pres" | "pl" | "comp" | "sup"`.

- [ ] **Step 1: Write the failing tests** en `page.test.ts`: acepta un JSON mínimo válido; rechaza `v: 2` ("versión no soportada"); rechaza una caja con valor `1.2` o negativo; rechaza un token con `l: 9` ausente de `lex`; rechaza una entrada con 6 acepciones; rechaza `lines` con índices fuera de `tokens`; rechaza `sep` fuera de rango; acepta `tokens: []`.
- [ ] **Step 2: Run** `pnpm test lib/domain/page.test.ts` → FAIL (`parsePage` no existe).
- [ ] **Step 3: Implement** `parsePage` a mano (sin librería nueva): valida estructura y rangos, devuelve el objeto tipado.
- [ ] **Step 4: Run** `pnpm test lib/domain/page.test.ts && pnpm typecheck` → PASS.
- [ ] **Step 5: Actualizar `docs/04-modelo-de-datos.md`** con el campo `f` y la lista de valores.
- [ ] **Step 6: Commit** `RF-17: formato del JSON de página y validador parsePage`.

### Task 2: Consultas por token (palabra, oración, forma)

**Files:**

- Create: `lib/domain/page-lookup.ts`, `lib/domain/page-lookup.test.ts`

**Interfaces:**

- Consumes: `PageData`, `Token`, `LexEntry` (Task 1); `genderInfo` (existente).
- Produces:

  ```ts
  export function entryFor(page: PageData, tokenIndex: number): LexEntry | null; // null si no hay l o no está en lex
  export function sentenceOf(page: PageData, tokenIndex: number): string; // oración que contiene el token, tokens unidos con espacio
  export function pairOf(page: PageData, tokenIndex: number): number | null; // token pareja de verbo separable (RN-07), simétrica
  export function formLabel(f: string | undefined): string | null; // "pret" → "pretérito", etc.
  export function posLabel(pos: string): string; // "noun" → "sustantivo"; desconocido → "palabra"
  export function plainText(page: PageData): string; // texto en orden de lectura, saltos de línea por `lines`
  ```

- [ ] **Step 1: Failing tests**: `entryFor` devuelve la entrada de `l:431` y `null` si `l` falta; `sentenceOf` corta en `.`, `!`, `?` dentro del párrafo; `pairOf(ruft)` → índice de `an` y viceversa; `formLabel("pret")` → `"pretérito"`; `posLabel("verb")` → `"verbo"`; `plainText` conserva un `\n` entre líneas y espacios entre palabras (RF-17 c2).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** en `page-lookup.ts`; la oración se delimita por tokens que terminan en `.`/`!`/`?` dentro de `paragraphs`.
- [ ] **Step 4: Run** `pnpm test lib/domain && pnpm typecheck` → PASS.
- [ ] **Step 5: Commit** `RF-21: consultas por token (entrada, oración, forma, texto plano)`.

### Task 3: Ejemplo de prueba (3 páginas sintéticas)

**Files:**

- Create: `worker/tools/make_demo_pages.py` (genera imágenes y JSON), `public/demo/page-1.webp`, `page-2.webp`, `page-3.webp`, `public/demo/page-1.json`, `page-2.json`, `page-3.json`, `lib/domain/demo-pages.test.ts`

**Interfaces:**

- Produces: archivos servidos en `/demo/page-{n}.webp|json`, n = 1..3. Imagen 1600×2263, ≤ 250 KB. Contenido original propio (frases inventadas):
  - página 1: sustantivos de cada género (`der Tisch`, `das Haus`/`die Häuser`, `die Lampe`), un nombre propio (`Berlin`, `pos: "propn"`);
  - página 2: verbo separable (`ruft … an`, forma `pret` en `ging → gehen`), sustantivo de dos géneros (`der/das Teil`), solo plural (`die Leute`), palabra con guion final de línea (`b2`);
  - página 3: sin tokens (solo una ilustración) para el caso `tokens: []`.

- [ ] **Step 1: Failing test** `demo-pages.test.ts`: lee los 3 JSON de `public/demo/`, los pasa por `parsePage`, comprueba que la página 3 tiene 0 tokens, que la 2 tiene un token con `b2` y un par `sep`, y que el `.webp` de cada página pesa ≤ 250 KB.
- [ ] **Step 2: Run** → FAIL (faltan archivos).
- [ ] **Step 3: Implement** `make_demo_pages.py` con Pillow (`uv run --with pillow python worker/tools/make_demo_pages.py`): dibuja el texto sobre fondo claro, calcula las cajas relativas desde la medida real del texto y escribe imagen + JSON. Ejecutarlo y versionar los archivos generados.
- [ ] **Step 4: Run** `pnpm test lib/domain/demo-pages.test.ts` → PASS.
- [ ] **Step 5: Commit** `RF-17: ejemplo de prueba de 3 páginas sintéticas`.

### Task 4: Paginación pura

**Files:**

- Create: `lib/domain/paging.ts`, `lib/domain/paging.test.ts`

**Interfaces:**

- Produces:

  ```ts
  export function clampPage(n: number, total: number): number; // entero en 1..total
  export function parsePageInput(text: string, total: number): number | null; // null si no es entero válido en 1..total
  export function swipeDirection(a: {
    startX: number;
    dx: number;
    dy: number;
    width: number;
  }): "next" | "prev" | null;
  export function keyDirection(key: string): "next" | "prev" | null; // ArrowRight/PageDown → next; ArrowLeft/PageUp → prev
  export function prefetchTargets(page: number, total: number): number[]; // vecinas existentes
  export const EDGE_GUARD_PX = 24;
  ```

  `swipeDirection` devuelve `null` si `startX < 24` o `startX > width − 24` (gesto del sistema), si |dx| < 50 o si |dy| > |dx|; `dx < 0` → `"next"`.

- [ ] **Step 1: Failing tests** con los valores anteriores (borde 23 px → `null`, 24 px y dx −80 → `"next"`, `parsePageInput("0", 3)` → `null`, `prefetchTargets(1, 3)` → `[2]`, `prefetchTargets(3, 3)` → `[2]`).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** funciones puras.
- [ ] **Step 4: Run** `pnpm test lib/domain/paging.test.ts` → PASS.
- [ ] **Step 5: Commit** `RF-16: lógica de paginación (swipe con borde reservado, teclas, precarga)`.

### Task 5: Capa de texto alineada (RF-17)

**Files:**

- Create: `components/reader/text-layer.tsx`, `components/reader/text-layer.test.tsx`

**Interfaces:**

- Consumes: `PageData`, `Token`.
- Produces: `<TextLayer page={PageData} onWordClick={(tokenIndex: number, rect: DOMRect) => void} highlight={boolean} />`. Posiciona cada palabra con `left/top/width/height` en `%` desde `b` (y `b2` como segundo `<span>` con el mismo `data-token`); texto transparente, `user-select: text`; un salto de línea y un espacio de texto entre spans para que la copia respete el orden de lectura. Cada span es `role="button"` con `tabIndex=0` y se activa con Enter/Espacio; el área táctil mínima es 44 px de alto con `::before` expandido sin mover el texto.

- [ ] **Step 1: Failing tests**: renderiza los tokens de la página 1; el `style.left` del primer span es `11.2%`; un token con `b2` produce dos spans con el mismo `data-token`; click y Enter llaman a `onWordClick` con el índice; `tokens: []` no renderiza ningún botón.
- [ ] **Step 2: Run** `pnpm test components/reader/text-layer.test.tsx` → FAIL.
- [ ] **Step 3: Implement** el componente (Tailwind, sin estilos en línea salvo las cajas).
- [ ] **Step 4: Run** → PASS; `pnpm typecheck && pnpm lint`.
- [ ] **Step 5: Commit** `RF-17: capa de texto transparente alineada con la página`.

### Task 6: Lector con paso de páginas (RF-16) y ruta `/lector/demo`

**Files:**

- Create: `components/reader/page-reader.tsx`, `components/reader/page-reader.test.tsx`, `app/lector/demo/page.tsx`
- Modify: `app/globals.css` (altura `100dvh`, `touch-action: pan-y` en el visor)

**Interfaces:**

- Consumes: `TextLayer`, funciones de `paging.ts`, `parsePage`.
- Produces: `<PageReader total={number} loadPage={(n: number) => Promise<PageData>} imageUrl={(n: number) => string} />`. Estado: página actual, `PageData` actual. Pasa de página por: puntero (`swipeDirection`), toque en el 20 % lateral, teclas (`keyDirection` en `window`), selector numérico con etiqueta "página X de Y" (`parsePageInput`). Precarga con `prefetchTargets` (`new Image()` + `loadPage`, resultados en un `Map`). `app/lector/demo/page.tsx` pasa `total=3`, `loadPage` que hace `fetch('/demo/page-n.json')` + `parsePage`, `imageUrl` → `/demo/page-n.webp`.

- [ ] **Step 1: Failing tests** (Testing Library, `loadPage` simulado): muestra "página 1 de 3"; `ArrowRight` pasa a la 2 y muestra "página 2 de 3"; `ArrowLeft` en la 1 se queda en la 1; escribir "9" en el selector no cambia de página y marca error; al montar pide precarga de la 2; tras pasar a la 2, de la 1 y la 3.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `PageReader` y la ruta. La imagen usa `next/image` solo si no complica el WebP estático; si no, `<img>` con `width/height` de `size`.
- [ ] **Step 4: Run** `pnpm test components/reader && pnpm typecheck && pnpm lint` → PASS.
- [ ] **Step 5: Commit** `RF-16: lector con paso de páginas, selector y precarga`.

### Task 7: Panel de palabra con género (RF-21, RF-22)

**Files:**

- Create: `components/reader/word-panel.tsx`, `components/reader/word-panel.test.tsx`, `lib/domain/lookup-log.ts`, `lib/domain/lookup-log.test.ts`
- Modify: `components/reader/page-reader.tsx` (abre el panel al tocar una palabra), `app/globals.css` (clases `.gender-m/n/f`)

**Interfaces:**

- Consumes: `entryFor`, `sentenceOf`, `formLabel`, `posLabel`, `pairOf`, `genderInfo`.
- Produces:

  ```ts
  // lookup-log.ts (RN-05; la conexión a user_words va con el diccionario personal)
  export type Lookup = { lexiconId: number; lemma: string; pos: string; page: number; sentence: string };
  export function recordLookup(l: Lookup): void; // por ahora llama a un manejador inyectable `setLookupHandler(fn)`; sin manejador no hace nada
  export function setLookupHandler(fn: ((l: Lookup) => void) | null): void;
  // word-panel.tsx
  <WordPanel page={PageData} tokenIndex={number} pageNumber={number} onClose={() => void} anchor={DOMRect | null} />
  ```

  El panel es `role="dialog"`: hoja inferior bajo 768 px, tarjeta junto a la palabra desde 768 px. Se cierra con toque fuera, `Escape` y arrastre hacia abajo ≥ 60 px; al cerrar no cambia de página. Contenido: forma tocada; lema; tipo en español; hasta 5 acepciones con "traducción automática" cuando `m`; si hay `f`, "ging → gehen, pretérito"; para sustantivos, artículo + lema coloreados y plural ("das Haus, die Häuser"); varios géneros muestran todos los artículos y la etiqueta "varios géneros"; solo plural en gris con "solo plural"; sin entrada: forma tal cual + enlace `https://de.wiktionary.org/wiki/<forma>` con `target="_blank" rel="noopener"`. Al abrirse llama `recordLookup` con la oración (`sentenceOf`) y el id de léxico.

- [ ] **Step 1: Failing tests** `word-panel.test.tsx`: `Häuser` muestra "das Haus, die Häuser" con clase `gender-n`; `ging` muestra "ging → gehen, pretérito"; `der/das Teil` muestra ambos artículos y "varios géneros"; `Leute` muestra "solo plural" sin clase de color; `Berlin` (`propn`) no usa clase de género; sin `lex` muestra el enlace de búsqueda; `Escape` llama a `onClose`; una entrada con acepción `m: true` muestra "traducción automática"; el artículo escrito aparece siempre (RF-22 c3); **no se llama a `fetch`** (espía en `globalThis.fetch`, RNF-01 c2); `recordLookup` recibe la oración y el id. `lookup-log.test.ts`: sin manejador no lanza; con manejador lo llama una vez.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** panel y `lookup-log.ts`; integrar en `PageReader` (el toque en la capa de texto guarda `tokenIndex` y `anchor`; tocar la pareja resalta ambas, RN-07).
- [ ] **Step 4: Run** `pnpm test && pnpm typecheck && pnpm lint` → PASS.
- [ ] **Step 5: Commit** `RF-21, RF-22: panel de palabra con lema, acepciones, forma y color de género`.

### Task 8: Colorear todos los sustantivos (RF-26) y contraste (RNF-09)

**Files:**

- Create: `lib/domain/contrast.ts`, `lib/domain/contrast.test.ts`, `lib/domain/noun-highlight.ts`, `lib/domain/noun-highlight.test.ts`, `components/reader/use-highlight-pref.ts`
- Modify: `components/reader/page-reader.tsx` (interruptor "Colorear sustantivos", `aria-pressed`), `components/reader/text-layer.tsx` (clase por género cuando `highlight`), `app/globals.css` (fondos con opacidad ≤ 0.35 y borde inferior: `solid` der, `dotted` das, `double` die)

**Interfaces:**

- Produces:

  ```ts
  export function contrastRatio(fg: string, bg: string): number; // hex "#rrggbb", WCAG 2.x
  export function highlightFor(page: PageData): Map<number, Gender>; // tokenIndex → género, solo sustantivos con género conocido (excluye propn y solo plural)
  export function useHighlightPref(): [boolean, (v: boolean) => void]; // localStorage clave "my-deutsch:highlight"; try/catch
  ```

- [ ] **Step 1: Failing tests**: `contrastRatio` de `#171717` sobre `#ffffff` ≥ 15; los tokens `--gender-m/n/f` leídos de `globals.css` dan ≥ 4.5 sobre `#ffffff` (tema claro) y sobre `#0a0a0a` (tema oscuro) — el test parsea el CSS; `highlightFor(página 1)` incluye `Tisch`(m), `Haus`(n), `Lampe`(f) y excluye `Berlin`; con `localStorage` que lanza, `useHighlightPref` no rompe (test con Testing Library `renderHook`); la opacidad definida para el resaltado en el CSS es ≤ 0.35.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** y cablear el interruptor; el cambio es un cambio de clase en la capa (sin recalcular la página) para cumplir < 100 ms.
- [ ] **Step 4: Run** `pnpm test && pnpm typecheck && pnpm lint` → PASS.
- [ ] **Step 5: Commit** `RF-26, RNF-09: resaltado de sustantivos con patrón por género y verificación de contraste`.

### Task 9: Verificación en navegador y cierre

**Files:**

- Create: `e2e/lector.spec.ts`
- Modify: `docs/requisitos/funcionales/RF-16, 17, 21, 22, 26*.md` (estado), `docs/requisitos/INDEX.md`, `docs/ESTADO.md`

- [ ] **Step 1: Escribir e2e** de Playwright en `/lector/demo`: (a) 360 px: tocar `Häuser` abre el panel y `page.on("request")` no registra peticiones nuevas entre el toque y el panel; (b) flechas cambian de página; (c) interruptor de sustantivos añade clases y `localStorage` persiste tras recargar; (d) copiar el texto de la página 1 (`selection.toString()`) conserva saltos de línea; (e) el desfase entre la caja de la selección y la de la imagen es ≤ 2 % del ancho; (f) lo mismo a 768 y 1280 px y en WebKit iPhone.
- [ ] **Step 2: Run** `pnpm e2e` y revisar capturas a 360/768/1280; corregir lo que falle.
- [ ] **Step 3: Medir** la apertura del panel en 100 toques (perfil móvil de gama media, 4G rápido); registrar el p95 en `ESTADO.md`; axe-core sin violaciones serias si se puede instalar sin añadir peso al paquete de la app (solo devDependency), si no, reportarlo como no verificado.
- [ ] **Step 4: Verificar cada criterio** de RF-16/17/21/22/26 y marcar estados: los verificados pasan a "Hecho"; RF-21 c5 (RN-05) queda "Parcial" (solo `recordLookup`, sin `user_words`); lo no verificado (swipe real en iPhone, gesto "atrás") se reporta.
- [ ] **Step 5: Run** `pnpm typecheck && pnpm lint && pnpm test` → todo en verde (skill `verification-before-completion`).
- [ ] **Step 6: Commit** `RF-16, RF-17, RF-21, RF-22, RF-26: verificación en navegador y estado`.
