export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      leagues: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          created_by: string;
          tournament: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code: string;
          created_by: string;
          tournament?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['leagues']['Insert']>;
      };
      league_members: {
        Row: {
          league_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          league_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: Partial<Database['public']['Tables']['league_members']['Insert']>;
      };
      matches: {
        Row: {
          id: number;
          tournament: string;
          kickoff_at: string;
          home_team: string;
          away_team: string;
          home_team_code: string | null;
          away_team_code: string | null;
          stage: string | null;
          status: string;
          home_goals: number | null;
          away_goals: number | null;
          first_scorer: string | null;
          updated_at: string;
        };
        Insert: {
          id: number;
          tournament?: string;
          kickoff_at: string;
          home_team: string;
          away_team: string;
          home_team_code?: string | null;
          away_team_code?: string | null;
          stage?: string | null;
          status?: string;
          home_goals?: number | null;
          away_goals?: number | null;
          first_scorer?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['matches']['Insert']>;
      };
      tips: {
        Row: {
          id: string;
          user_id: string;
          match_id: number;
          home_goals: number;
          away_goals: number;
          first_scorer: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          match_id: number;
          home_goals: number;
          away_goals: number;
          first_scorer?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tips']['Insert']>;
      };
      scored_tips: {
        Row: {
          tip_id: string;
          user_id: string;
          match_id: number;
          points: number;
          scorer_bonus: number;
          total_points: number;
          scored_at: string;
        };
        Insert: {
          tip_id: string;
          user_id: string;
          match_id: number;
          points?: number;
          scorer_bonus?: number;
          scored_at?: string;
        };
        Update: Partial<Database['public']['Tables']['scored_tips']['Insert']>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
};
