#!/bin/bash
# Option B — standard redeploy with the retry+fallback ask.py, run from the box itself:
# put the updated module into the deploy source at /opt/optionlab and run the box's own
# redeploy.sh (same script every normal deploy uses). Takes 3-5 min to rebuild.
#   curl -sL raw.githubusercontent.com/trailingtrades/circles-algo-lab/main/f3.sh | bash
set -e
curl -fsSL -o /root/ask_new.py raw.githubusercontent.com/trailingtrades/circles-algo-lab/main/vpsfix/ask.py
grep -q 'ASK_MODEL_FALLBACK' /root/ask_new.py || { echo "download broken"; exit 1; }
cp /opt/optionlab/backend/app/analytics/ask.py /root/ask_old_backup.py
cp /root/ask_new.py /opt/optionlab/backend/app/analytics/ask.py
echo "source updated — running the standard redeploy (3-5 min, lots of output is normal)..."
/opt/optionlab/redeploy.sh
echo "redeploy done, waiting 12s..."
sleep 12
for i in 1 2 3; do
  curl -s -X POST http://127.0.0.1:8000/api/live/ask -H 'Content-Type: application/json' -d '{"question":"What are the three markets?","context":"","lang":"en","prog":"smart"}' | head -c 200
  echo; echo "--- test $i"
done
echo "DEPLOY-DONE (retry + ASK_MODEL_FALLBACK active; rollback file: /root/ask_old_backup.py)"
