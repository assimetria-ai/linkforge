-- Custom domains table for branded short links
-- Stores domain configuration, DNS verification status, and SSL provisioning

CREATE TABLE IF NOT EXISTS custom_domains (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  
  -- Verification
  verification_token VARCHAR(64) NOT NULL,
  verification_method VARCHAR(20) DEFAULT 'cname',  -- 'cname' or 'txt'
  verified_at TIMESTAMPTZ NULL,
  
  -- SSL
  ssl_status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'provisioning', 'active', 'failed'
  ssl_provisioned_at TIMESTAMPTZ NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT FALSE,
  is_primary BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  
  -- Constraints
  CONSTRAINT domain_not_empty CHECK (domain <> ''),
  CONSTRAINT unique_active_domain UNIQUE (domain)
);

-- Index for fast domain lookups (redirect resolution)
CREATE INDEX IF NOT EXISTS idx_custom_domains_domain ON custom_domains(domain) WHERE deleted_at IS NULL AND is_active = TRUE;

-- Index for user's domains
CREATE INDEX IF NOT EXISTS idx_custom_domains_user_id ON custom_domains(user_id) WHERE deleted_at IS NULL;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_custom_domains_updated_at ON custom_domains;
CREATE TRIGGER trigger_custom_domains_updated_at
  BEFORE UPDATE ON custom_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_domains_updated_at();
