CREATE TABLE IF NOT EXISTS collaborators (
  id          SERIAL PRIMARY KEY,
  brand_id    INTEGER REFERENCES brands(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member',
  invited_by  INTEGER REFERENCES users(id),
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(brand_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collaborators_brand_id ON collaborators(brand_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user_id  ON collaborators(user_id);
