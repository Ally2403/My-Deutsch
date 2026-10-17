#!/usr/bin/env bash
# Corre un comando dentro de la imagen del worker (Tesseract deu + uv), con el repo montado.
# Reutiliza la imagen del spike: mismo Ubuntu que el runner de GitHub Actions.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && (pwd -W 2>/dev/null || pwd))"
MSYS_NO_PATHCONV=1 docker run --rm \
  -v "$ROOT:/repo" -w /repo/worker \
  -v mydeutsch-uv-cache:/root/.cache/uv \
  -e UV_PROJECT_ENVIRONMENT=/opt/venv-worker -e UV_LINK_MODE=copy \
  mydeutsch-spike "$@"
