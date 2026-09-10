#!/bin/bash
# Runall CaféPro — toutes les suites tests/t*.js · REND LA MAIN EN ÉCHEC au moindre test rouge.
# Le harness régénère seul /tmp/qr.js et /tmp/app.js depuis index.html s'ils manquent.
cd "$(dirname "$0")/.."
pass=0; fail=0; failed=""
for f in tests/t*.js; do
  n=$(basename "$f" .js)
  if node tests/harness.js /tmp/app.js "$f" >"/tmp/out_$n.txt" 2>&1; then pass=$((pass+1)); else fail=$((fail+1)); failed="$failed $n"; fi
done
echo "== $pass OK / $fail ÉCHEC :$failed =="
[ "$fail" -eq 0 ]
