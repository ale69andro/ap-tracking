ALTER TABLE user_profiles
  ADD COLUMN training_plan     jsonb DEFAULT NULL,
  ADD COLUMN training_progress jsonb DEFAULT NULL;
