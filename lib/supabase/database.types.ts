export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      roles: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          role_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          role_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          role_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      trainer_trainees: {
        Row: {
          id: string;
          trainer_id: string;
          trainee_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          trainee_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          trainer_id?: string;
          trainee_id?: string;
          created_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          deadline: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          deadline: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          deadline?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      activities: {
        Row: {
          id: string;
          goal_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          goal_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          goal_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      reflections: {
        Row: {
          id: string;
          activity_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          activity_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          activity_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

