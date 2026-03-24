CREATE TABLE training_plans (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  training_plan     jsonb       NOT NULL,
  training_progress jsonb,
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own training plan" ON training_plans
  FOR ALL
  USING     (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
