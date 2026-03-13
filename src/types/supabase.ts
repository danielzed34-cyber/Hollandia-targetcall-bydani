/**
 * Supabase Database type definitions.
 *
 * After creating tables in Supabase, regenerate this file with:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
 *
 * Until then, the stub below keeps TypeScript happy.
 *
 * NOTE: @supabase/supabase-js v2.49+ requires Relationships: [] on every table.
 */

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
      // ── Users (extends Supabase Auth) ────────────────────
      profiles: {
        Row: {
          id: string;
          full_name: string;
          nickname: string | null;
          role: "Admin" | "Rep";
          shift_start_fixed: string | null;
          shift_end_fixed: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          nickname?: string | null;
          role?: "Admin" | "Rep";
          shift_start_fixed?: string | null;
          shift_end_fixed?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          nickname?: string | null;
          role?: "Admin" | "Rep";
          shift_start_fixed?: string | null;
          shift_end_fixed?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── Timeclock ─────────────────────────────────────────
      clock_events: {
        Row: {
          id: string;
          user_id: string;
          event_type: "clock_in" | "clock_out";
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: "clock_in" | "clock_out";
          timestamp?: string;
          created_at?: string;
        };
        Update: {
          event_type?: "clock_in" | "clock_out";
          timestamp?: string;
        };
        Relationships: [];
      };

      // ── Break Tracking ────────────────────────────────────
      active_breaks: {
        Row: {
          id: string;
          user_id: string;
          user_name: string;
          started_at: string;
          ends_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          user_name: string;
          started_at?: string;
          ends_at: string;
          created_at?: string;
        };
        Update: {
          ends_at?: string;
        };
        Relationships: [];
      };

      // ── Shift Constraints ─────────────────────────────────
      shift_constraints: {
        Row: {
          id: string;
          user_id: string;
          week_start: string; // ISO date of the Sunday
          day_of_week: 0 | 1 | 2 | 3 | 4; // Sun=0 … Thu=4
          constraint_type: "normal" | "day_off" | "short_shift";
          shift_start: string | null; // HH:MM
          shift_end: string | null;   // HH:MM
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_start: string;
          day_of_week: 0 | 1 | 2 | 3 | 4;
          constraint_type: "normal" | "day_off" | "short_shift";
          shift_start?: string | null;
          shift_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          constraint_type?: "normal" | "day_off" | "short_shift";
          shift_start?: string | null;
          shift_end?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── AI Feedback Requests ──────────────────────────────
      feedback_requests: {
        Row: {
          id: string;
          rep_id: string;
          rep_name: string;
          customer_name: string;
          customer_phone: string;
          struggle_point: string;
          status: "pending" | "processing" | "done" | "acknowledged";
          audio_url: string | null;
          transcript: string | null;
          report: Json | null;
          action_improvements: string | null;
          action_preservation: string | null;
          acknowledged_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          rep_id: string;
          rep_name: string;
          customer_name: string;
          customer_phone: string;
          struggle_point: string;
          status?: "pending" | "processing" | "done" | "acknowledged";
          audio_url?: string | null;
          transcript?: string | null;
          report?: Json | null;
          action_improvements?: string | null;
          action_preservation?: string | null;
          acknowledged_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: "pending" | "processing" | "done" | "acknowledged";
          audio_url?: string | null;
          transcript?: string | null;
          report?: Json | null;
          action_improvements?: string | null;
          action_preservation?: string | null;
          acknowledged_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── WhatsApp Exceptional Approval Requests ────────────
      whatsapp_approvals: {
        Row: {
          id: string;
          rep_id: string;
          rep_name: string;
          customer_name: string;
          customer_phone: string;
          branch: string;
          meeting_date: string;
          meeting_time: string;
          message: string;
          status: "pending" | "sent" | "rejected";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          rep_id: string;
          rep_name: string;
          customer_name: string;
          customer_phone: string;
          branch: string;
          meeting_date: string;
          meeting_time: string;
          message: string;
          status?: "pending" | "sent" | "rejected";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: "pending" | "sent" | "rejected";
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── Knowledge Base ────────────────────────────────────
      kb_articles: {
        Row: {
          id: string;
          title: string;
          content: string;
          category: string;
          tags: string[];
          status: "draft" | "pending_approval" | "approved" | "rejected";
          image_url: string | null;
          ai_generated: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          category: string;
          tags?: string[];
          status?: "draft" | "pending_approval" | "approved" | "rejected";
          image_url?: string | null;
          ai_generated?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: string;
          category?: string;
          tags?: string[];
          status?: "draft" | "pending_approval" | "approved" | "rejected";
          image_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── Call Scripts ──────────────────────────────────────
      call_scripts: {
        Row: {
          id: string;
          rep_id: string;
          rep_name: string;
          status: "draft" | "pending" | "approved" | "rejected";
          admin_note: string | null;
          section_1: string;
          section_2: string;
          section_3: string;
          section_4: string;
          section_5: string;
          section_6: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          rep_id: string;
          rep_name: string;
          status?: "draft" | "pending" | "approved" | "rejected";
          admin_note?: string | null;
          section_1?: string;
          section_2?: string;
          section_3?: string;
          section_4?: string;
          section_5?: string;
          section_6?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: "draft" | "pending" | "approved" | "rejected";
          admin_note?: string | null;
          section_1?: string;
          section_2?: string;
          section_3?: string;
          section_4?: string;
          section_5?: string;
          section_6?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── Task Management ───────────────────────────────────
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          due_date: string;
          priority: "low" | "normal" | "high";
          target_all: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          due_date: string;
          priority?: "low" | "normal" | "high";
          target_all?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          due_date?: string;
          priority?: "low" | "normal" | "high";
          target_all?: boolean;
        };
        Relationships: [];
      };
      task_targets: {
        Row: { task_id: string; user_id: string };
        Insert: { task_id: string; user_id: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      task_completions: {
        Row: { task_id: string; user_id: string; completed_at: string };
        Insert: { task_id: string; user_id: string; completed_at?: string };
        Update: Record<string, never>;
        Relationships: [];
      };

      // ── Broadcasts ────────────────────────────────────────
      broadcasts: {
        Row: {
          id: string;
          message: string;
          target_all: boolean;
          target_user_id: string | null;
          broadcast_date: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          message: string;
          target_all?: boolean;
          target_user_id?: string | null;
          broadcast_date?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      broadcast_reads: {
        Row: { broadcast_id: string; user_id: string; read_at: string };
        Insert: { broadcast_id: string; user_id: string; read_at?: string };
        Update: Record<string, never>;
        Relationships: [];
      };

      // ── AI Mentor Settings (Admin-controlled) ─────────────
      ai_settings: {
        Row: {
          id: string;
          system_prompt: string;
          daily_tip: string;
          max_breaks_per_day: number;
          max_break_minutes_per_day: number;
          updated_by: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          system_prompt: string;
          daily_tip: string;
          max_breaks_per_day?: number;
          max_break_minutes_per_day?: number;
          updated_by: string;
          updated_at?: string;
        };
        Update: {
          system_prompt?: string;
          daily_tip?: string;
          max_breaks_per_day?: number;
          max_break_minutes_per_day?: number;
          updated_by?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };

    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: "Admin" | "Rep";
    };
    CompositeTypes: Record<string, never>;
  };
};
