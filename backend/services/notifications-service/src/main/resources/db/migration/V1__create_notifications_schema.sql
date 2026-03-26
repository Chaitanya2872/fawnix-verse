CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  tenant_id VARCHAR(255),
  module VARCHAR(255) NOT NULL,
  event_type VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  body_text TEXT,
  body_html TEXT,
  template_key VARCHAR(255),
  template_variables TEXT,
  deeplink_url TEXT,
  priority VARCHAR(50) NOT NULL,
  locale VARCHAR(50),
  idempotency_key VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX ux_notifications_tenant_idempotency
  ON notifications (tenant_id, idempotency_key);

CREATE TABLE notification_recipients (
  id UUID PRIMARY KEY,
  notification_id UUID NOT NULL,
  user_id UUID,
  email VARCHAR(255),
  channels VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ix_notification_recipients_user
  ON notification_recipients (user_id);

CREATE INDEX ix_notification_recipients_notification
  ON notification_recipients (notification_id);

CREATE TABLE notification_attempts (
  id UUID PRIMARY KEY,
  recipient_id UUID NOT NULL,
  channel VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  error TEXT,
  retry_count INTEGER,
  next_retry_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ix_notification_attempts_recipient
  ON notification_attempts (recipient_id);

CREATE TABLE notification_outbox (
  id UUID PRIMARY KEY,
  notification_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  channel VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  attempts INTEGER,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ix_notification_outbox_status
  ON notification_outbox (status);

CREATE INDEX ix_notification_outbox_recipient
  ON notification_outbox (recipient_id);

CREATE TABLE notification_dead_letter (
  id UUID PRIMARY KEY,
  outbox_id UUID NOT NULL,
  reason TEXT,
  payload TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ix_notification_dead_letter_outbox
  ON notification_dead_letter (outbox_id);

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  channel VARCHAR(50) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours_start VARCHAR(10),
  quiet_hours_end VARCHAR(10),
  locale VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX ux_notification_preferences_user_channel
  ON notification_preferences (user_id, channel);

CREATE TABLE notification_templates (
  id UUID PRIMARY KEY,
  template_key VARCHAR(255) NOT NULL,
  channel VARCHAR(50) NOT NULL,
  subject VARCHAR(255),
  html_body TEXT,
  text_body TEXT,
  variables_schema TEXT,
  version INTEGER DEFAULT 1,
  locale VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX ux_notification_templates_key_channel_locale
  ON notification_templates (template_key, channel, locale);

CREATE TABLE notification_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT,
  auth TEXT,
  expiration_time BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX ux_notification_subscriptions_user_endpoint
  ON notification_subscriptions (user_id, endpoint);
