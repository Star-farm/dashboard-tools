#!/usr/bin/env bash
# Run once on the VPS, from the project root (same level as docker-compose.yml),
# BEFORE the first "docker compose up --build".
#
# NOTE: Simulation_Data.csv is baked directly into the Docker image at build
# time (via Dockerfile's "COPY . ."), so there is no host-side ./data volume
# to prepare anymore. Make sure ./data/Simulation_Data.csv exists in this
# project directory locally BEFORE you run "docker compose build" - that's
# what gets copied into the image.
set -euo pipefail

APP_UID=8888   # must match "useradd -u 8888 appuser" in the Dockerfile

if [ ! -f ./data/Simulation_Data.csv ]; then
  echo "⚠️  ./data/Simulation_Data.csv not found in the build context."
  echo "    Add it here BEFORE running 'docker compose build', or the CSV"
  echo "    will not be included in the image and the app will boot with"
  echo "    no data loaded."
fi

echo "==> Creating ./model_cache (if missing)"
mkdir -p ./model_cache

echo "==> Setting ownership to match appuser (uid $APP_UID) inside the container"
echo "    (bind mounts don't inherit the Dockerfile's chown - it has to be set from the host)"
sudo chown -R "$APP_UID":"$APP_UID" ./model_cache

if [ ! -f .env ]; then
  echo "==> .env not found - copying from _env.example_VPS"
  cp _env.example_VPS .env
  echo "    ⚠️  Remember to open .env and set a real API_KEYS value (not the placeholder),"
  echo "       and double-check ENFORCE_HTTPS and ALLOWED_ORIGINS for your actual setup."
else
  echo "==> .env already exists, skipping copy"
fi

echo "==> Done. You can now run: docker compose up -d --build"