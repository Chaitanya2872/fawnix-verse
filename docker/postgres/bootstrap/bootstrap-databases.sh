#!/bin/sh
set -eu

echo "Waiting for PostgreSQL at ${PGHOST}:${PGPORT}..."
until pg_isready -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${PGDATABASE}" >/dev/null 2>&1; do
  sleep 2
done

echo "PostgreSQL is ready. Ensuring service databases exist..."

for db_name in ${SERVICE_DATABASES}; do
  case "${db_name}" in
    *[!a-z0-9_]*|'')
      echo "Invalid database name: ${db_name}" >&2
      exit 1
      ;;
  esac

  if psql -v ON_ERROR_STOP=1 -tAc "SELECT 1 FROM pg_database WHERE datname = '${db_name}'" | grep -q 1; then
    echo "Database '${db_name}' already exists"
  else
    echo "Creating database '${db_name}'"
    psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${db_name}\""
  fi
done

echo "Database bootstrap complete."
