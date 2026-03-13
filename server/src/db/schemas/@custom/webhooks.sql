-- Webhooks table for user-defined webhook endpoints
CREATE TABLE IF NOT EXISTS webhooks (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  url           TEXT NOT NULL,
  secret        VARCHAR(255),
  events        TEXT[] NOT NULL DEFAULT '{link.click}',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(user_id, is_active);

-- Webhook delivery log for tracking and retry
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id            SERIAL PRIMARY KEY,
  webhook_id    INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type    VARCHAR(100) NOT NULL,
  payload       JSONB NOT NULL,
  status_code   INTEGER,
  response_body TEXT,
  attempt       INTEGER NOT NULL DEFAULT 1,
  max_attempts  INTEGER NOT NULL DEFAULT 3,
  success       BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  delivered_at  TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_pending ON webhook_deliveries(success, next_retry_at) WHERE success = false;
