#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

for tool in initdb pg_ctl psql createdb; do
  command -v "$tool" >/dev/null || { echo "PostgreSQL tools are required. Install PostgreSQL and add its bin directory to PATH."; exit 1; }
done

mkdir -p .local/socket
chmod 700 .local .local/socket
cluster="$PWD/.local/postgres"
if [[ ! -f "$cluster/PG_VERSION" ]]; then
  initdb -D "$cluster" -U contriq_owner --auth-local=trust --auth-host=trust --encoding=UTF8 --locale=C >/dev/null
fi
if ! pg_ctl -D "$cluster" status >/dev/null 2>&1; then
  pg_ctl -D "$cluster" -l "$PWD/.local/postgres.log" -o "-p 55438 -h 127.0.0.1 -k '$PWD/.local/socket'" start >/dev/null
fi

export PGHOST=127.0.0.1 PGPORT=55438 PGUSER=contriq_owner
if [[ "$(psql -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname='contriq'")" != "1" ]]; then
  createdb contriq
fi
if [[ "$(psql -d postgres -Atc "SELECT 1 FROM pg_roles WHERE rolname='contriq_reader'")" != "1" ]]; then
  psql -d postgres -c 'CREATE ROLE contriq_reader LOGIN' >/dev/null
fi
if [[ ! -f .env.local ]]; then
  umask 077
  cp .env.example .env.local
fi
npm run db:migrate
npm run db:seed
npm run db:score
psql -d contriq -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
GRANT CONNECT ON DATABASE contriq TO contriq_reader;
GRANT USAGE ON SCHEMA public TO contriq_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO contriq_reader;
ALTER DEFAULT PRIVILEGES FOR ROLE contriq_owner IN SCHEMA public GRANT SELECT ON TABLES TO contriq_reader;
SQL
echo 'Contriq database is ready. Start the application with npm run dev.'
