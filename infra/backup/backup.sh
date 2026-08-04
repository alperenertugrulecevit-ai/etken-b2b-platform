#!/usr/bin/env bash

set -Eeuo pipefail

: "${DATABASE_URL:?DATABASE_URL tanımlı değil}"
: "${BACKUP_BUCKET:?BACKUP_BUCKET tanımlı değil}"

TIMESTAMP="$(date -u +"%Y-%m-%dT%H-%M-%SZ")"
BACKUP_NAME="etken-b2b-${TIMESTAMP}.dump"
LOCAL_FILE="/tmp/${BACKUP_NAME}"
RESTORE_LIST_FILE="/tmp/${BACKUP_NAME}.list"
REMOTE_FILE="gs://${BACKUP_BUCKET}/daily/${BACKUP_NAME}"

cleanup() {
  rm -f "${LOCAL_FILE}" "${RESTORE_LIST_FILE}"
}

trap cleanup EXIT

echo "Etken B2B veritabanı yedeği başlatıldı: ${TIMESTAMP}"

pg_dump \
  --dbname="${DATABASE_URL}" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="${LOCAL_FILE}"

if [ ! -s "${LOCAL_FILE}" ]; then
  echo "HATA: Yedek dosyası oluşturulamadı veya dosya boş."
  exit 1
fi

BACKUP_SIZE="$(du -h "${LOCAL_FILE}" | cut -f1)"
echo "Yedek dosyası oluşturuldu. Boyut: ${BACKUP_SIZE}"

pg_restore \
  --list "${LOCAL_FILE}" \
  >"${RESTORE_LIST_FILE}"

if [ ! -s "${RESTORE_LIST_FILE}" ]; then
  echo "HATA: Yedek dosyasının pg_restore doğrulaması başarısız."
  exit 1
fi

echo "Yedek dosyası yapısal olarak doğrulandı."

gcloud storage cp \
  "${LOCAL_FILE}" \
  "${REMOTE_FILE}"

REMOTE_SIZE="$(
  gcloud storage objects describe "${REMOTE_FILE}" \
    --format="value(size)"
)"

if [ -z "${REMOTE_SIZE}" ] || [ "${REMOTE_SIZE}" = "0" ]; then
  echo "HATA: Cloud Storage üzerindeki yedek doğrulanamadı."
  exit 1
fi

echo "Cloud Storage dosyası doğrulandı. Boyut: ${REMOTE_SIZE} byte"
echo "Yedek başarıyla tamamlandı: ${REMOTE_FILE}"
