#!/bin/sh
set -eu

MINIO_ALIAS="${MINIO_ALIAS:-local}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://minio:9000}"
MINIO_ROOT_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-minioadmin}"
MINIO_BUCKETS="${MINIO_BUCKETS:-fawnix-objects}"

echo "Waiting for MinIO at ${MINIO_ENDPOINT}..."
until mc alias set "${MINIO_ALIAS}" "${MINIO_ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" >/dev/null 2>&1; do
  sleep 2
done

for bucket in ${MINIO_BUCKETS}; do
  echo "Ensuring bucket exists: ${bucket}"
  mc mb --ignore-existing "${MINIO_ALIAS}/${bucket}" >/dev/null
done

echo "MinIO buckets are ready."
