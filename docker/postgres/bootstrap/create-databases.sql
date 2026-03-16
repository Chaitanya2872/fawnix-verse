SELECT 'CREATE DATABASE fawnix_identity'
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'fawnix_identity'
)\gexec

SELECT 'CREATE DATABASE fawnix_crm'
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'fawnix_crm'
)\gexec

SELECT 'CREATE DATABASE fawnix_inventory'
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'fawnix_inventory'
)\gexec

SELECT 'CREATE DATABASE fawnix_hrms'
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'fawnix_hrms'
)\gexec

SELECT 'CREATE DATABASE fawnix_sales'
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'fawnix_sales'
)\gexec
