-- daily_checkins: stores one check-in per user per calendar day
CREATE TABLE daily_checkins (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date         date        NOT NULL,
  day_type     text        NOT NULL CHECK (day_type IN ('training', 'rest')),
  energy_level text        CHECK (energy_level IN ('low', 'medium', 'high')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own daily checkins"
  ON daily_checkins FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
