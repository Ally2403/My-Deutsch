#!/usr/bin/env bash
# Corre un comando dentro de la imagen del spike (Tesseract deu + uv), con el repo montado.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && (pwd -W 2>/dev/null || pwd))"
MSYS_NO_PATHCONV=1 docker run --rm \
  -v "$ROOT:/repo" -w /repo/worker/spike \
  -v mydeutsch-uv-cache:/root/.cache/uv \
  -e UV_PROJECT_ENVIRONMENT=/opt/venv -e UV_LINK_MODE=copy \
  mydeutsch-spike "$@"
