#!/usr/bin/env bash

set -Eeuo pipefail

: "${BACKUP_BUCKET:?BACKUP_BUCKET is required}"

BACKUP_IMAGE="${BACKUP_IMAGE:-europe-west1-docker.pkg.dev/etken-b2b-production/cloud-run-source-deploy/etken-b2b-backup:latest}"
BACKUP_OBJECT="${1:-}"

if [ -z "${BACKUP_OBJECT}" ]; then
  BACKUP_OBJECT="$(gcloud storage ls "gs://${BACKUP_BUCKET}/daily/*.dump" | sort | tail -n 1)"
fi

if [ -z "${BACKUP_OBJECT}" ]; then
  echo "ERROR: No backup object found."
  exit 1
fi

LOCAL_FILE="/tmp/$(basename "${BACKUP_OBJECT}")"
LIST_FILE="/tmp/$(basename "${BACKUP_OBJECT}").list"

cleanup() {
  rm -f "${LOCAL_FILE}" "${LIST_FILE}"
}

trap cleanup EXIT

echo "Downloading backup: ${BACKUP_OBJECT}"
gcloud storage cp "${BACKUP_OBJECT}" "${LOCAL_FILE}"

if [ ! -s "${LOCAL_FILE}" ]; then
  echo "ERROR: Downloaded backup is empty."
  exit 1
fi

docker run --rm \
  --entrypoint pg_restore \
  -v /tmp:/backup:ro \
  "${BACKUP_IMAGE}" \
  --list "/backup/$(basename "${LOCAL_FILE}")" \
  >"${LIST_FILE}"

ENTRY_COUNT="$(grep -Ev "^(;|$)" "${LIST_FILE}" | wc -l | tr -d " ")"

if [ "${ENTRY_COUNT}" -lt 1 ]; then
  echo "ERROR: Backup contains no restorable objects."
  exit 1
fi

echo "Backup is structurally valid."
echo "Restorable object count: ${ENTRY_COUNT}"
echo "Backup file: ${BACKUP_OBJECT}"
