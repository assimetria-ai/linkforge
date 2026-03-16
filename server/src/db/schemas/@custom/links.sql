-- Links table for URL shortening
-- Stores short links with their target URLs and click tracking

CREATE TABLE IF NOT EXISTS links (
  id BIGSERIAL PRIMARY KEY,
  slug VARCHAR(255) NOT NULL UNIQUE,
  target_url TEXT NOT NULL,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  clicks BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  
  -- Metadata for analytics
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Indexes for performance
  CONSTRAINT slug_not_empty CHECK (slug <> ''),
  CONSTRAINT target_url_not_empty CHECK (target_url <> '')
);

-- Index for fast slug lookups (most common operation)
CREATE INDEX IF NOT EXISTS idx_links_slug ON links(slug) WHERE deleted_at IS NULL;

-- Index for user's links
CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id) WHERE deleted_at IS NULL;

-- Index for active links
CREATE INDEX IF NOT EXISTS idx_links_active ON links(is_active, created_at DESC) WHERE deleted_at IS NULL;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_links_updated_at ON links;
CREATE TRIGGER trigger_links_updated_at
  BEFORE UPDATE ON links
  FOR EACH ROW
  EXECUTE FUNCTION update_links_updated_at();
