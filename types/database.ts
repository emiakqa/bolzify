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
  winner_team_id: number | null;
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
  winner_team_id?: number | null;
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
  group_letter: string | null;  // 'A'..'L', null bei K.O.-Teams
};
type TeamInsert = {
  id: number;
  name: string;
  code?: string | null;
  logo_url?: string | null;
  tournament?: string;
  group_letter?: string | null;
};

type PlayerRow = {
  id: number;
  team_id: number;
  name: string;
  number: number | null;
  position: string | null;
  photo_url: string | null;
  tournament_goals: number;
  created_at: string;
};
type PlayerInsert = {
  id: number;
  team_id: number;
  name: string;
  number?: number | null;
  position?: string | null;
  photo_url?: string | null;
  tournament_goals?: number;
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

type SpecialTipRow = {
  user_id: string;
  tournament: string;
  champion_team_id: number | null;
  runner_up_team_id: number | null;
  semifinalist_a_team_id: number | null;
  semifinalist_b_team_id: number | null;
  top_scorer_player_id: number | null;
  created_at: string;
  updated_at: string;
};
type SpecialTipInsert = {
  user_id: string;
  tournament?: string;
  champion_team_id?: number | null;
  runner_up_team_id?: number | null;
  semifinalist_a_team_id?: number | null;
  semifinalist_b_team_id?: number | null;
  top_scorer_player_id?: number | null;
  created_at?: string;
  updated_at?: string;
};

type ScoredSpecialTipRow = {
  user_id: string;
  tournament: string;
  champion_points: number;        // 0 oder 10
  runner_up_points: number;       // 0 oder 5
  semifinalist_hits: number;      // 0..4
  semifinalist_points: number;    // = hits * 5
  top_scorer_points: number;      // 0 oder 5
  group_winner_hits: number;      // 0..12
  group_winner_points: number;    // = hits * 3
  total_points: number;           // generated
  scored_at: string;
};
type ScoredSpecialTipInsert = {
  user_id: string;
  tournament: string;
  champion_points?: number;
  runner_up_points?: number;
  semifinalist_hits?: number;
  semifinalist_points?: number;
  top_scorer_points?: number;
  group_winner_hits?: number;
  group_winner_points?: number;
  scored_at?: string;
};

type GroupWinnerTipRow = {
  user_id: string;
  tournament: string;
  group_letter: string;  // 'A'..'L'
  team_id: number;
  created_at: string;
  updated_at: string;
};
type GroupWinnerTipInsert = {
  user_id: string;
  tournament?: string;
  group_letter: string;
  team_id: number;
  created_at?: string;
  updated_at?: string;
};

type LeagueAnnouncementRow = {
  id: string;
  league_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};
type LeagueAnnouncementInsert = {
  id?: string;
  league_id: string;
  author_id: string;
  body: string;
  created_at?: string;
  updated_at?: string;
};

type AppAdminRow = {
  user_id: string;
  role: string;  // 'owner'
  added_at: string;
};
type AppAdminInsert = {
  user_id: string;
  role?: string;
  added_at?: string;
};

type BroadcastRow = {
  id: string;
  sender_id: string | null;
  body: string;
  created_at: string;
};
type BroadcastInsert = {
  id?: string;
  sender_id: string | null;
  body: string;
  created_at?: string;
};

type InboxItemRow = {
  id: string;
  recipient_id: string;
  kind: 'league_announcement' | 'broadcast';
  league_announcement_id: string | null;
  broadcast_id: string | null;
  league_id: string | null;
  league_name_snapshot: string | null;
  sender_id: string | null;
  sender_username_snapshot: string | null;
  body: string;
  created_at: string;
  read_at: string | null;
};
type InboxItemInsert = {
  id?: string;
  recipient_id: string;
  kind: 'league_announcement' | 'broadcast';
  league_announcement_id?: string | null;
  broadcast_id?: string | null;
  league_id?: string | null;
  league_name_snapshot?: string | null;
  sender_id?: string | null;
  sender_username_snapshot?: string | null;
  body: string;
  created_at?: string;
  read_at?: string | null;
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
      special_tips: {
        Row: SpecialTipRow;
        Insert: SpecialTipInsert;
        Update: Partial<SpecialTipInsert>;
        Relationships: [];
      };
      scored_special_tips: {
        Row: ScoredSpecialTipRow;
        Insert: ScoredSpecialTipInsert;
        Update: Partial<ScoredSpecialTipInsert>;
        Relationships: [];
      };
      group_winner_tips: {
        Row: GroupWinnerTipRow;
        Insert: GroupWinnerTipInsert;
        Update: Partial<GroupWinnerTipInsert>;
        Relationships: [];
      };
      league_announcements: {
        Row: LeagueAnnouncementRow;
        Insert: LeagueAnnouncementInsert;
        Update: Partial<LeagueAnnouncementInsert>;
        Relationships: [];
      };
      app_admins: {
        Row: AppAdminRow;
        Insert: AppAdminInsert;
        Update: Partial<AppAdminInsert>;
        Relationships: [];
      };
      broadcasts: {
        Row: BroadcastRow;
        Insert: BroadcastInsert;
        Update: Partial<BroadcastInsert>;
        Relationships: [];
      };
      inbox_items: {
        Row: InboxItemRow;
        Insert: InboxItemInsert;
        Update: Partial<InboxItemInsert>;
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
      delete_own_account: {
        Args: Record<string, never>;
        Returns: void;
      };
      special_tips_deadline: {
        Args: { p_tournament: string };
        Returns: string | null;
      };
      score_special_tips: {
        Args: { p_tournament: string };
        Returns: number;
      };
      is_app_admin: {
        Args: { p_user: string };
        Returns: boolean;
      };
    };
    Enums: {};
    CompositeTypes: {};
  };
};
