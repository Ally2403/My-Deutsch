---
name: nuevo-requisito
description: Usar cuando un cambio no está cubierto por ningún RF/RNF y hay que proponer un requisito nuevo (siguiente ID libre) antes de escribir código.
---

# Nuevo requisito

1. Siguiente ID libre: listar `docs/requisitos/funcionales/` y `no-funcionales/` y tomar el mayor + 1.
2. Copiar un requisito existente (p. ej. `RF-45-...md`) con la tabla de campos: ID, Título, Módulo, Prioridad, Fase, Estado (`Pendiente`), Dependencias, Reglas de negocio (RN-xx de `docs/02-reglas-de-negocio.md`).
3. Secciones: Descripción, Justificación, Criterios de aceptación medibles, Aprobación, Verificación.
4. Añadir la fila en `docs/requisitos/INDEX.md`; no reformatear con Prettier archivos existentes.
5. En modo autónomo: si la usuaria no lo ha aprobado, escribir «propuesto por Claude, sin aprobar» en Aprobación y **no implementarlo**.
6. Añadir una línea en `docs/ESTADO.md` («Retomar aquí»).
