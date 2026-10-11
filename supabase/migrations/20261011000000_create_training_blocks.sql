-- training_blocks: one row per training block (4/8/12 weeks) per user.
-- Progress is computed from existing workout_sessions — no session data is stored here.
CREATE TABLE training_blocks (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date   date        NOT NULL,
  length_weeks smallint    NOT NULL CHECK (length_weeks IN (4, 8, 12)),
  status       text        NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'completed', 'cancelled')),
  ended_at     date,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX training_blocks_user_start_idx
  ON training_blocks (user_id, start_date DESC);

-- Only one active block per user
CREATE UNIQUE INDEX training_blocks_one_active_per_user
  ON training_blocks (user_id) WHERE status = 'active';

ALTER TABLE training_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own training blocks"
  ON training_blocks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
