#!/bin/sh
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)" || exit 1
exec python3 -m http.server "${PORT:-4173}" --bind 0.0.0.0 --directory dist
