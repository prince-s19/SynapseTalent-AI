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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      career_roadmaps: {
        Row: {
          created_at: string
          employee_id: string
          estimated_months: number
          id: string
          roadmap: Json
          target_role_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          estimated_months?: number
          id?: string
          roadmap?: Json
          target_role_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          estimated_months?: number
          id?: string
          roadmap?: Json
          target_role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_roadmaps_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_roadmaps_target_role_id_fkey"
            columns: ["target_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_settings: {
        Row: {
          ai_analysis_enabled: boolean
          created_at: string
          employee_id: string
          github_enabled: boolean
          id: string
          portfolio_enabled: boolean
          public_web_enabled: boolean
          updated_at: string
        }
        Insert: {
          ai_analysis_enabled?: boolean
          created_at?: string
          employee_id: string
          github_enabled?: boolean
          id?: string
          portfolio_enabled?: boolean
          public_web_enabled?: boolean
          updated_at?: string
        }
        Update: {
          ai_analysis_enabled?: boolean
          created_at?: string
          employee_id?: string
          github_enabled?: boolean
          id?: string
          portfolio_enabled?: boolean
          public_web_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_settings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_skills: {
        Row: {
          confidence: number
          created_at: string
          employee_id: string
          evidence: string | null
          id: string
          proficiency: number
          skill_id: string
          skill_type: string
          source: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          employee_id: string
          evidence?: string | null
          id?: string
          proficiency?: number
          skill_id: string
          skill_type?: string
          source?: string
        }
        Update: {
          confidence?: number
          created_at?: string
          employee_id?: string
          evidence?: string | null
          id?: string
          proficiency?: number
          skill_id?: string
          skill_type?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          avatar_url: string | null
          bio: string | null
          career_goal: string | null
          career_goal_timeline: string | null
          certifications: string[]
          created_at: string
          current_role: string
          demo_employee: boolean
          department: string
          email: string
          github_url: string | null
          id: string
          job_title: string | null
          linkedin_url: string | null
          name: string
          portfolio_url: string | null
          slack_url: string | null
          tenure_years: number
          user_id: string | null
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          career_goal?: string | null
          career_goal_timeline?: string | null
          certifications?: string[]
          created_at?: string
          current_role?: string
          demo_employee?: boolean
          department: string
          email: string
          github_url?: string | null
          id?: string
          job_title?: string | null
          linkedin_url?: string | null
          name: string
          portfolio_url?: string | null
          slack_url?: string | null
          tenure_years?: number
          user_id?: string | null
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          career_goal?: string | null
          career_goal_timeline?: string | null
          certifications?: string[]
          created_at?: string
          current_role?: string
          demo_employee?: boolean
          department?: string
          email?: string
          github_url?: string | null
          id?: string
          job_title?: string | null
          linkedin_url?: string | null
          name?: string
          portfolio_url?: string | null
          slack_url?: string | null
          tenure_years?: number
          user_id?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      enrichment_runs: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          provider: string
          raw_summary: Json | null
          status: string
          target: string | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          provider: string
          raw_summary?: Json | null
          status?: string
          target?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          provider?: string
          raw_summary?: Json | null
          status?: string
          target?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_runs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_reports: {
        Row: {
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          payload: Json
          summary: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          payload?: Json
          summary?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          payload?: Json
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_trends_cache: {
        Row: {
          fetched_at: string
          id: string
          scope_key: string
          source: string
          trends: Json
        }
        Insert: {
          fetched_at?: string
          id?: string
          scope_key: string
          source?: string
          trends?: Json
        }
        Update: {
          fetched_at?: string
          id?: string
          scope_key?: string
          source?: string
          trends?: Json
        }
        Relationships: []
      }
      mobility_messages: {
        Row: {
          body: string
          candidate_id: string
          created_at: string
          id: string
          responded_at: string | null
          response: string | null
          response_note: string | null
          sent_by: string | null
          subject: string
        }
        Insert: {
          body: string
          candidate_id: string
          created_at?: string
          id?: string
          responded_at?: string | null
          response?: string | null
          response_note?: string | null
          sent_by?: string | null
          subject: string
        }
        Update: {
          body?: string
          candidate_id?: string
          created_at?: string
          id?: string
          responded_at?: string | null
          response?: string | null
          response_note?: string | null
          sent_by?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "mobility_messages_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "pipeline_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_candidates: {
        Row: {
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          notes: string | null
          role_id: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          role_id?: string | null
          stage?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          role_id?: string | null
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_candidates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_candidates_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_analyses: {
        Row: {
          analysis: Json
          created_at: string
          employee_id: string
          generated_by: string | null
          id: string
          sources: Json
        }
        Insert: {
          analysis?: Json
          created_at?: string
          employee_id: string
          generated_by?: string | null
          id?: string
          sources?: Json
        }
        Update: {
          analysis?: Json
          created_at?: string
          employee_id?: string
          generated_by?: string | null
          id?: string
          sources?: Json
        }
        Relationships: [
          {
            foreignKeyName: "profile_analyses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          duration: string | null
          employee_id: string
          evidence_url: string | null
          id: string
          name: string
          role: string | null
          tech_stack: string[]
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: string | null
          employee_id: string
          evidence_url?: string | null
          id?: string
          name: string
          role?: string | null
          tech_stack?: string[]
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: string | null
          employee_id?: string
          evidence_url?: string | null
          id?: string
          name?: string
          role?: string | null
          tech_stack?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "projects_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      recognitions: {
        Row: {
          awarded_by: string | null
          badge: string
          created_at: string
          employee_id: string
          id: string
          message: string | null
        }
        Insert: {
          awarded_by?: string | null
          badge: string
          created_at?: string
          employee_id: string
          id?: string
          message?: string | null
        }
        Update: {
          awarded_by?: string | null
          badge?: string
          created_at?: string
          employee_id?: string
          id?: string
          message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recognitions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      role_matches: {
        Row: {
          created_at: string
          employee_id: string
          explanation: Json
          id: string
          match_score: number
          role_id: string
          semantic_score: number
          skill_coverage_score: number
          skill_gaps: Json
          transferable_score: number
        }
        Insert: {
          created_at?: string
          employee_id: string
          explanation?: Json
          id?: string
          match_score?: number
          role_id: string
          semantic_score?: number
          skill_coverage_score?: number
          skill_gaps?: Json
          transferable_score?: number
        }
        Update: {
          created_at?: string
          employee_id?: string
          explanation?: Json
          id?: string
          match_score?: number
          role_id?: string
          semantic_score?: number
          skill_coverage_score?: number
          skill_gaps?: Json
          transferable_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "role_matches_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_matches_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          department: string
          description: string | null
          id: string
          nice_to_have_skills: Json
          required_skills: Json
          responsibilities: string | null
          seniority: string | null
          title: string
        }
        Insert: {
          created_at?: string
          department: string
          description?: string | null
          id?: string
          nice_to_have_skills?: Json
          required_skills?: Json
          responsibilities?: string | null
          seniority?: string | null
          title: string
        }
        Update: {
          created_at?: string
          department?: string
          description?: string | null
          id?: string
          nice_to_have_skills?: Json
          required_skills?: Json
          responsibilities?: string | null
          seniority?: string | null
          title?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_demo_employee: { Args: { _employee_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "hr" | "employee"
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
      app_role: ["hr", "employee"],
    },
  },
} as const
