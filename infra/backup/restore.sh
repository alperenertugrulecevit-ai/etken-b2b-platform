#!/usr/bin/env bash

set -Eeuo pipefail

: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL is required}"

BACKUP_IMAGE="${BACKUP_IMAGE:-europe-west1-docker.pkg.dev/etken-b2b-production/cloud-run-source-deploy/etken-b2b-backup:latest}"
BACKUP_OBJECT="${1:-}"
CONFIRMATION="${2:-}"

if [ -z "${BACKUP_OBJECT}" ]; then
  echo "Usage: ./restore.sh gs://bucket/daily/backup.dump RESTORE"
  exit 1
fi

if [ "${CONFIRMATION}" != "RESTORE" ]; then
  echo "ERROR: Second argument must be RESTORE."
  exit 1
fi

if [[ "${TARGET_DATABASE_URL}" == *"mgepgvqgjkfigfapglme"* ]] && [ "${ALLOW_PRODUCTION_RESTORE:-false}" != "true" ]; then
  echo "ERROR: Production restore is blocked."
  echo "Set ALLOW_PRODUCTION_RESTORE=true only during an approved recovery."
  exit 1
fi

LOCAL_FILE="/tmp/$(basename "${BACKUP_OBJECT}")"

cleanup() {
  rm -f "${LOCAL_FILE}"
}

trap cleanup EXIT

echo "Downloading backup: ${BACKUP_OBJECT}"
gcloud storage cp "${BACKUP_OBJECT}" "${LOCAL_FILE}"

docker run --rm \
  --entrypoint pg_restore \
  -v /tmp:/backup:ro \
  "${BACKUP_IMAGE}" \
  --dbname="${TARGET_DATABASE_URL}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  "/backup/$(basename "${LOCAL_FILE}")"

echo "Restore completed successfully."
