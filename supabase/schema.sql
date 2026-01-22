-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name) VALUES ('trainee'), ('trainer'), ('admin');

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trainer-Trainee assignments
CREATE TABLE trainer_trainees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trainee_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals table
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  deadline DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'achieved', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities table
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reflections table
CREATE TABLE reflections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_activities_goal_id ON activities(goal_id);
CREATE INDEX idx_reflections_activity_id ON reflections(activity_id);
CREATE INDEX idx_trainer_trainees_trainer_id ON trainer_trainees(trainer_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reflections_updated_at BEFORE UPDATE ON reflections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_trainees ENABLE ROW LEVEL SECURITY;

-- Helper: admin判定（RLS回避のため SECURITY DEFINER を使用）
-- NOTE: Supabase SQL Editorで実行する際は、必ず public スキーマで作成されることを確認してください
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid()
      AND r.name = 'admin'
  );
$$;

-- Helper: トレーナーが特定のトレーニーを担当しているかチェック（RLS回避のため SECURITY DEFINER を使用）
CREATE OR REPLACE FUNCTION public.is_trainer_of(trainee_user_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trainer_trainees tt
    WHERE tt.trainer_id = auth.uid()
      AND tt.trainee_id = trainee_user_id
  );
$$;

-- RLS Policies for users
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (public.is_admin());

-- トレーナーが担当トレーニーのプロフィールを閲覧可能
CREATE POLICY "Trainers can view assigned trainee profiles" ON users
  FOR SELECT USING (public.is_trainer_of(users.id));

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view trainers and trainees" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trainer_trainees
      WHERE (trainer_id = auth.uid() AND trainee_id = users.id)
         OR (trainee_id = auth.uid() AND trainer_id = users.id)
    )
  );

-- RLS Policies for goals
CREATE POLICY "Users can view own goals" ON goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Trainers can view assigned trainee goals" ON goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trainer_trainees
      WHERE trainer_id = auth.uid() AND trainee_id = goals.user_id
    )
  );

CREATE POLICY "Users can insert own goals" ON goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON goals
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for activities
CREATE POLICY "Users can view own activities" ON activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = activities.goal_id AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can view assigned trainee activities" ON activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM goals
      JOIN trainer_trainees ON trainer_trainees.trainee_id = goals.user_id
      WHERE goals.id = activities.goal_id AND trainer_trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own activities" ON activities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = activities.goal_id AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own activities" ON activities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = activities.goal_id AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own activities" ON activities
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = activities.goal_id AND goals.user_id = auth.uid()
    )
  );

-- RLS Policies for reflections
CREATE POLICY "Users can view own reflections" ON reflections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM activities
      JOIN goals ON goals.id = activities.goal_id
      WHERE activities.id = reflections.activity_id AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can view assigned trainee reflections" ON reflections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM activities
      JOIN goals ON goals.id = activities.goal_id
      JOIN trainer_trainees ON trainer_trainees.trainee_id = goals.user_id
      WHERE activities.id = reflections.activity_id AND trainer_trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own reflections" ON reflections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM activities
      JOIN goals ON goals.id = activities.goal_id
      WHERE activities.id = reflections.activity_id AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own reflections" ON reflections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM activities
      JOIN goals ON goals.id = activities.goal_id
      WHERE activities.id = reflections.activity_id AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own reflections" ON reflections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM activities
      JOIN goals ON goals.id = activities.goal_id
      WHERE activities.id = reflections.activity_id AND goals.user_id = auth.uid()
    )
  );

-- RLS Policies for trainer_trainees
CREATE POLICY "Trainers can view own assignments" ON trainer_trainees
  FOR SELECT USING (trainer_id = auth.uid());

CREATE POLICY "Trainees can view own assignments" ON trainer_trainees
  FOR SELECT USING (trainee_id = auth.uid());

CREATE POLICY "Admins can manage all assignments" ON trainer_trainees
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

