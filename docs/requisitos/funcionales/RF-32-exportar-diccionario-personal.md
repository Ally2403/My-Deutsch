# RF-32 — Exportar diccionario personal

| Campo | Valor |
|---|---|
| **ID** | RF-32 |
| **Título** | Exportar diccionario personal |
| **Módulo** | M-7 Vocabulario personal |
| **Prioridad** | Baja |
| **Fase** | 5 |
| **Estado** | Pendiente |
| **Dependencias** | [RF-30](RF-30-consultar-diccionario-personal.md) |
| **Reglas de negocio** | — |

## Descripción
El usuario puede descargar su diccionario (con los filtros actuales) en CSV compatible con Excel y con la importación de Anki.

## Justificación
Los datos son del usuario; además permite estudiar con otras herramientas.

## Criterios de aceptación
1. El CSV en UTF-8 con BOM abre correctamente con tildes y umlauts en Excel, con las columnas artículo, lema, tipo, significados, estado, consultas y libro.
