export type Role = 'trainee' | 'trainer' | 'admin';

export type GoalStatus = 'in_progress' | 'achieved' | 'cancelled';

export interface RoleData {
  id: string;
  name: Role;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role_id: string;
  created_at: string;
  updated_at: string;
  role?: RoleData;
}

export interface TrainerTrainee {
  id: string;
  trainer_id: string;
  trainee_id: string;
  created_at: string;
  trainer?: User;
  trainee?: User;
}

export interface Goal {
  id: string;
  user_id: string;
  content: string;
  deadline: string;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
  user?: User;
  activities?: Activity[];
}

export interface Activity {
  id: string;
  goal_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  goal?: Goal;
  reflections?: Reflection[];
}

export interface Reflection {
  id: string;
  activity_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  activity?: Activity;
}

