/**
 * Database types generated from Supabase schema
 * This file provides type safety for Supabase queries
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_sessions: {
        Row: {
          id: string
          client_uuid: string
          display_name: string | null
          created_at: string
          last_active_at: string
        }
        Insert: {
          id?: string
          client_uuid: string
          display_name?: string | null
          created_at?: string
          last_active_at?: string
        }
        Update: {
          id?: string
          client_uuid?: string
          display_name?: string | null
          created_at?: string
          last_active_at?: string
        }
      }
      rooms: {
        Row: {
          id: string
          room_code: string
          host_client_uuid: string
          host_key: string
          title: string
          is_preset: boolean
          preset_expires_at: string | null
          created_at: string
          last_activity_at: string
          expires_at: string
          settings: Json
          game_state: Json
        }
        Insert: {
          id?: string
          room_code: string
          host_client_uuid: string
          host_key: string
          title?: string
          is_preset?: boolean
          preset_expires_at?: string | null
          created_at?: string
          last_activity_at?: string
          expires_at?: string
          settings?: Json
          game_state?: Json
        }
        Update: {
          id?: string
          room_code?: string
          host_client_uuid?: string
          host_key?: string
          title?: string
          is_preset?: boolean
          preset_expires_at?: string | null
          created_at?: string
          last_activity_at?: string
          expires_at?: string
          settings?: Json
          game_state?: Json
        }
      }
      players: {
        Row: {
          id: string
          room_id: string
          client_uuid: string
          display_name: string
          connected: boolean
          last_seen_at: string
          points: number
          metadata: Json
          joined_at: string
        }
        Insert: {
          id?: string
          room_id: string
          client_uuid: string
          display_name: string
          connected?: boolean
          last_seen_at?: string
          points?: number
          metadata?: Json
          joined_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          client_uuid?: string
          display_name?: string
          connected?: boolean
          last_seen_at?: string
          points?: number
          metadata?: Json
          joined_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          room_id: string
          round_number: number
          question_number: number
          stem: string
          choices: Json
          scavenger_instruction: string
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          round_number: number
          question_number: number
          stem: string
          choices: Json
          scavenger_instruction: string
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          round_number?: number
          question_number?: number
          stem?: string
          choices?: Json
          scavenger_instruction?: string
          created_at?: string
        }
      }
      submissions: {
        Row: {
          id: string
          room_id: string
          player_id: string
          question_id: string
          answer_choice_id: string
          answered_at: string
          answer_time_ms: number
          is_correct: boolean
          points_awarded: number
        }
        Insert: {
          id?: string
          room_id: string
          player_id: string
          question_id: string
          answer_choice_id: string
          answered_at?: string
          answer_time_ms: number
          is_correct: boolean
          points_awarded?: number
        }
        Update: {
          id?: string
          room_id?: string
          player_id?: string
          question_id?: string
          answer_choice_id?: string
          answered_at?: string
          answer_time_ms?: number
          is_correct?: boolean
          points_awarded?: number
        }
      }
      scavenger_submissions: {
        Row: {
          id: string
          room_id: string
          player_id: string
          question_id: string
          submitted_at: string
          submission_order: number
          approved: boolean | null
          approved_by_host_at: string | null
          points_awarded: number
        }
        Insert: {
          id?: string
          room_id: string
          player_id: string
          question_id: string
          submitted_at?: string
          submission_order: number
          approved?: boolean | null
          approved_by_host_at?: string | null
          points_awarded?: number
        }
        Update: {
          id?: string
          room_id?: string
          player_id?: string
          question_id?: string
          submitted_at?: string
          submission_order?: number
          approved?: boolean | null
          approved_by_host_at?: string | null
          points_awarded?: number
        }
      }
      leaderboard_snapshots: {
        Row: {
          id: string
          room_id: string
          snapshot_at: string
          payload: Json
        }
        Insert: {
          id?: string
          room_id: string
          snapshot_at?: string
          payload: Json
        }
        Update: {
          id?: string
          room_id?: string
          snapshot_at?: string
          payload?: Json
        }
      }
    }
    Functions: {
      cleanup_expired_data: {
        Args: Record<string, never>
        Returns: void
      }
    }
  }
}
