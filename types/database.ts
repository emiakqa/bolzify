export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type ProfileRow = {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};
type ProfileInsert = {
  id: string;
  username: string;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

type LeagueRow = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  tournament: string;
  created_at: string;
};
type LeagueInsert = {
  id?: string;
  name: string;
  invite_code: string;
  created_by: string;
  tournament?: string;
  created_at?: string;
};

type LeagueMemberRow = {
  league_id: string;
  user_id: string;
  joined_at: string;
};
type LeagueMemberInsert = {
  league_id: string;
  user_id: string;
  joined_at?: string;
};

type MatchRow = {
  id: number;
  tournament: string;
  kickoff_at: string;
  home_team: string;
  away_team: string;
  home_team_id: number | null;
  away_team_id: number | null;
  home_team_code: string | null;
  away_team_code: string | null;
  stage: string | null;
  status: string;
  home_goals: number | null;
  away_goals: number | null;
  first_scorer: string | null;
  first_scorer_id: number | null;
  updated_at: string;
};
type MatchInsert = {
  id: number;
  tournament?: string;
  kickoff_at: string;
  home_team: string;
  away_team: string;
  home_team_id?: number | null;
  away_team_id?: number | null;
  home_team_code?: string | null;
  away_team_code?: string | null;
  stage?: string | null;
  status?: string;
  home_goals?: number | null;
  away_goals?: number | null;
  first_scorer?: string | null;
  first_scorer_id?: number | null;
  updated_at?: string;
};

type TeamRow = {
  id: number;
  name: string;
  code: string | null;
  logo_url: string | null;
  tournament: string;
};
type TeamInsert = {
  id: number;
  name: string;
  code?: string | null;
  logo_url?: string | null;
  tournament?: string;
};

type PlayerRow = {
  id: number;
  team_id: number;
  name: string;
  number: number | null;
  position: string | null;
  photo_url: string | null;
  created_at: string;
};
type PlayerInsert = {
  id: number;
  team_id: number;
  name: string;
  number?: number | null;
  position?: string | null;
  photo_url?: string | null;
  created_at?: string;
};

type TipRow = {
  id: string;
  user_id: string;
  match_id: number;
  home_goals: number;
  away_goals: number;
  first_scorer: string | null;
  first_scorer_id: number | null;
  created_at: string;
  updated_at: string;
};
type TipInsert = {
  id?: string;
  user_id: string;
  match_id: number;
  home_goals: number;
  away_goals: number;
  first_scorer?: string | null;
  first_scorer_id?: number | null;
  created_at?: string;
  updated_at?: string;
};

type ScoredTipRow = {
  tip_id: string;
  user_id: string;
  match_id: number;
  points: number;
  scorer_bonus: number;
  total_points: number;
  scored_at: string;
};
type ScoredTipInsert = {
  tip_id: string;
  user_id: string;
  match_id: number;
  points?: number;
  scorer_bonus?: number;
  scored_at?: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: Partial<ProfileInsert>;
        Relationships: [];
      };
      leagues: {
        Row: LeagueRow;
        Insert: LeagueInsert;
        Update: Partial<LeagueInsert>;
        Relationships: [];
      };
      league_members: {
        Row: LeagueMemberRow;
        Insert: LeagueMemberInsert;
        Update: Partial<LeagueMemberInsert>;
        Relationships: [];
      };
      matches: {
        Row: MatchRow;
        Insert: MatchInsert;
        Update: Partial<MatchInsert>;
        Relationships: [];
      };
      teams: {
        Row: TeamRow;
        Insert: TeamInsert;
        Update: Partial<TeamInsert>;
        Relationships: [];
      };
      players: {
        Row: PlayerRow;
        Insert: PlayerInsert;
        Update: Partial<PlayerInsert>;
        Relationships: [];
      };
      tips: {
        Row: TipRow;
        Insert: TipInsert;
        Update: Partial<TipInsert>;
        Relationships: [];
      };
      scored_tips: {
        Row: ScoredTipRow;
        Insert: ScoredTipInsert;
        Update: Partial<ScoredTipInsert>;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      join_league_by_code: {
        Args: { p_code: string };
        Returns: { league_id: string; league_name: string }[];
      };
      score_match: {
        Args: { p_match_id: number };
        Returns: number;
      };
    };
    Enums: {};
    CompositeTypes: {};
  };
};
