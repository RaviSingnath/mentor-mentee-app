export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      availability_slots: {
        Row: {
          end_time: string
          id: string
          profile_id: string
          start_time: string
          weekday: number
        }
        Insert: {
          end_time: string
          id?: string
          profile_id: string
          start_time: string
          weekday: number
        }
        Update: {
          end_time?: string
          id?: string
          profile_id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string
          id: string
          page_number: number | null
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding: string
          id?: string
          page_number?: number | null
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string
          id?: string
          page_number?: number | null
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          chunk_count: number
          content_hash: string | null
          created_at: string
          error_message: string | null
          id: string
          mime_type: string
          original_filename: string
          size_bytes: number
          status: Database["public"]["Enums"]["document_status"]
          storage_path: string
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          chunk_count?: number
          content_hash?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          mime_type: string
          original_filename: string
          size_bytes: number
          status?: Database["public"]["Enums"]["document_status"]
          storage_path: string
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          chunk_count?: number
          content_hash?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          mime_type?: string
          original_filename?: string
          size_bytes?: number
          status?: Database["public"]["Enums"]["document_status"]
          storage_path?: string
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_user_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string
          expires_at: string
          full_name: string
          id: string
          invited_by: string
          revoked_at: string | null
          revoked_by: string | null
          revoked_reason: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_user_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email: string
          expires_at: string
          full_name: string
          id?: string
          invited_by: string
          revoked_at?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          role: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_user_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          invited_by?: string
          revoked_at?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_created_user_id_fkey"
            columns: ["created_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_interactions: {
        Row: {
          action: Database["public"]["Enums"]["match_action"]
          actor_id: string
          candidate_id: string
          created_at: string
          id: string
          score: number | null
          subject_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["match_action"]
          actor_id: string
          candidate_id: string
          created_at?: string
          id?: string
          score?: number | null
          subject_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["match_action"]
          actor_id?: string
          candidate_id?: string
          created_at?: string
          id?: string
          score?: number | null
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_interactions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_interactions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_interactions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_topics: {
        Row: {
          profile_id: string
          relation: Database["public"]["Enums"]["topic_relation"]
          topic_id: string
        }
        Insert: {
          profile_id: string
          relation: Database["public"]["Enums"]["topic_relation"]
          topic_id: string
        }
        Update: {
          profile_id?: string
          relation?: Database["public"]["Enums"]["topic_relation"]
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_topics_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string
          experience_level:
            | Database["public"]["Enums"]["experience_level"]
            | null
          full_name: string
          id: string
          is_seed: boolean
          languages: string[]
          role: Database["public"]["Enums"]["user_role"]
          state: string | null
          status: Database["public"]["Enums"]["profile_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email: string
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          full_name: string
          id: string
          is_seed?: boolean
          languages?: string[]
          role: Database["public"]["Enums"]["user_role"]
          state?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          full_name?: string
          id?: string
          is_seed?: boolean
          languages?: string[]
          role?: Database["public"]["Enums"]["user_role"]
          state?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_matches: {
        Row: {
          actor_id: string
          candidate_id: string
          created_at: string
          subject_id: string
        }
        Insert: {
          actor_id: string
          candidate_id: string
          created_at?: string
          subject_id: string
        }
        Update: {
          actor_id?: string
          candidate_id?: string
          created_at?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_matches_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_matches_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_matches_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_active_member: { Args: never; Returns: boolean }
      is_active_profile: { Args: { p_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      match_document_chunks: {
        Args: {
          match_count?: number
          min_similarity?: number
          query_embedding: string
        }
        Returns: {
          chunk_id: string
          content: string
          document_id: string
          document_title: string
          page_number: number
          similarity: number
        }[]
      }
      match_pool: { Args: never; Returns: Json }
      normalize_tags: {
        Args: { p_goals: string[]; p_interests: string[]; p_skills: string[] }
        Returns: {
          tag_name: string
          tag_relation: Database["public"]["Enums"]["topic_relation"]
          tag_slug: string
        }[]
      }
      purge_seed_users: { Args: never; Returns: number }
      replace_profile_topics: {
        Args: {
          p_goals?: string[]
          p_interests?: string[]
          p_profile_id: string
          p_skills?: string[]
        }
        Returns: undefined
      }
      set_profile_topics: {
        Args: {
          p_goals?: string[]
          p_interests?: string[]
          p_skills?: string[]
        }
        Returns: undefined
      }
      slugify_topic: { Args: { input: string }; Returns: string }
    }
    Enums: {
      document_status: "uploaded" | "processing" | "ready" | "failed"
      experience_level: "student" | "junior" | "mid" | "senior" | "lead"
      invitation_status:
        | "pending"
        | "accepted"
        | "expired"
        | "revoked"
        | "cancelled"
      match_action: "viewed" | "saved" | "unsaved" | "dismissed"
      profile_status: "active" | "inactive"
      topic_relation: "skill" | "goal" | "interest"
      user_role: "super_admin" | "admin" | "mentor" | "mentee"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      document_status: ["uploaded", "processing", "ready", "failed"],
      experience_level: ["student", "junior", "mid", "senior", "lead"],
      invitation_status: [
        "pending",
        "accepted",
        "expired",
        "revoked",
        "cancelled",
      ],
      match_action: ["viewed", "saved", "unsaved", "dismissed"],
      profile_status: ["active", "inactive"],
      topic_relation: ["skill", "goal", "interest"],
      user_role: ["super_admin", "admin", "mentor", "mentee"],
    },
  },
} as const
