CREATE TABLE IF NOT EXISTS service_metadata (
  service_name VARCHAR(100) PRIMARY KEY,
  bootstrapped_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO service_metadata (service_name, bootstrapped_at)
VALUES ('sales-service', CURRENT_TIMESTAMP)
ON CONFLICT (service_name)
DO UPDATE SET bootstrapped_at = EXCLUDED.bootstrapped_at;
