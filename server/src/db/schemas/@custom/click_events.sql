-- Click events table for detailed link analytics
-- Tracks each click with browser fingerprint for unique visitor identification
-- Privacy-friendly: no cookies, fingerprint is a one-way hash

CREATE TABLE IF NOT EXISTS click_events (
  id BIGSERIAL PRIMARY KEY,
  link_id BIGINT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  slug VARCHAR(255) NOT NULL,

  -- Fingerprint (SHA-256 hash of combined signals)
  fingerprint_hash VARCHAR(64),

  -- Raw signals (stored for analytics breakdowns)
  user_agent TEXT,
  accept_language VARCHAR(255),
  screen_resolution VARCHAR(20),
  timezone VARCHAR(100),
  platform VARCHAR(100),
  color_depth INTEGER,
  canvas_hash VARCHAR(64),

  -- Request metadata
  ip_address INET,
  referer TEXT,
  country VARCHAR(2),
  city VARCHAR(100),

  -- Timestamps
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for link-level analytics
CREATE INDEX IF NOT EXISTS idx_click_events_link_id ON click_events(link_id);
CREATE INDEX IF NOT EXISTS idx_click_events_slug ON click_events(slug);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_click_events_clicked_at ON click_events(clicked_at);

-- Index for unique visitor counting (fingerprint per link)
CREATE INDEX IF NOT EXISTS idx_click_events_fingerprint ON click_events(link_id, fingerprint_hash);

-- Composite index for date-range analytics
CREATE INDEX IF NOT EXISTS idx_click_events_link_date ON click_events(link_id, clicked_at DESC);
