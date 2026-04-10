ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS stress_level text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS intensity_style text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS proximity_to_failure text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS equipment_access text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS priority_muscle_groups text[];
