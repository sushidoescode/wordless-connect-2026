#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
test -d Cache/TypeScript/lib/LensifyTS/Declarations || {
  echo "Lens Studio generated declarations are missing; open and compile WordlessRelay first." >&2
  exit 1
}
./node_modules/.bin/tsc -p tools/typecheck/tsconfig.preflight.json
