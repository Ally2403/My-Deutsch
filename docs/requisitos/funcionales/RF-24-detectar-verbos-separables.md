# RF-24 — Detectar verbos separables

| Campo | Valor |
|---|---|
| **ID** | RF-24 |
| **Título** | Detectar verbos separables |
| **Módulo** | M-6 Léxico |
| **Prioridad** | Media |
| **Fase** | 4 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-23](RF-23-resolver-formas-flexionadas-al-lema.md) |
| **Reglas de negocio** | RN-07 |

## Descripción
Cuando el verbo y su partícula están separados en la oración, ambos se asocian al verbo compuesto, y al tocar uno se resalta el otro.

## Justificación
Los verbos separables son muy frecuentes en B1 y su significado cambia por completo ("hören" vs. "aufhören").

## Criterios de aceptación
1. En "Er ruft sie morgen an", tocar "ruft" o "an" muestra "anrufen" y resalta ambas palabras.
2. En el conjunto de prueba, ≥ 80 % de los verbos separables con partícula separada se detectan correctamente.
