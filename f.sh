#!/bin/bash
# One-shot fixer for the Ask 5 Circles assistant on the VPS: tries every generate-capable
# Gemini model on the configured key, sets the first one that answers as ASK_MODEL,
# restarts the optionlab container and runs a live test. Run as root on the box:
#   curl -sL raw.githubusercontent.com/trailingtrades/circles-algo-lab/main/f.sh | bash
KEY=$(grep ^GEMINI_API_KEY /opt/optionlab/backend.env | cut -d= -f2)
[ -n "$KEY" ] || { echo "GEMINI_API_KEY missing in /opt/optionlab/backend.env"; exit 1; }
for M in $(curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$KEY" | grep -o '"models/[^"]*"' | tr -d '"' | sed 's|models/||' | sort -u); do
  echo "trying $M ..."
  R=$(curl -s -X POST "https://generativelanguage.googleapis.com/v1beta/models/$M:generateContent?key=$KEY" -H 'Content-Type: application/json' -d '{"contents":[{"role":"user","parts":[{"text":"hi"}]}]}')
  if echo "$R" | grep -q '"text"'; then
    echo "WORKS: $M"
    sed -i "s|^ASK_MODEL=.*|ASK_MODEL=$M|" /opt/optionlab/backend.env
    cd /opt/optionlab && docker compose -f compose.prod.yml up -d --force-recreate optionlab
    sleep 10
    curl -s -X POST http://127.0.0.1:8000/api/live/ask -H 'Content-Type: application/json' -d '{"question":"What is an option?","context":"","lang":"en","prog":"smart"}' | head -c 300
    echo; echo "ALL-DONE ($M set as ASK_MODEL)"; exit 0
  fi
done
echo "NO-MODEL-WORKED — is key par abhi koi generate model nahi chal raha"
