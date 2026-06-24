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
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: number
          metadata: Json | null
          target: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: number
          metadata?: Json | null
          target?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: number
          metadata?: Json | null
          target?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned: boolean
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          banned?: boolean
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          banned?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      server_commands: {
        Row: {
          created_at: string
          created_by: string | null
          finished_at: string | null
          id: string
          kind: Database["public"]["Enums"]["command_kind"]
          payload: Json | null
          result: Json | null
          server_id: string
          status: Database["public"]["Enums"]["command_status"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          finished_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["command_kind"]
          payload?: Json | null
          result?: Json | null
          server_id: string
          status?: Database["public"]["Enums"]["command_status"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          finished_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["command_kind"]
          payload?: Json | null
          result?: Json | null
          server_id?: string
          status?: Database["public"]["Enums"]["command_status"]
        }
        Relationships: [
          {
            foreignKeyName: "server_commands_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_files: {
        Row: {
          created_at: string
          id: string
          is_dir: boolean
          mime: string | null
          path: string
          server_id: string
          size_bytes: number
          storage_key: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_dir?: boolean
          mime?: string | null
          path: string
          server_id: string
          size_bytes?: number
          storage_key?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_dir?: boolean
          mime?: string | null
          path?: string
          server_id?: string
          size_bytes?: number
          storage_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_files_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_logs: {
        Row: {
          id: number
          level: Database["public"]["Enums"]["log_level"]
          message: string
          server_id: string
          ts: string
        }
        Insert: {
          id?: number
          level?: Database["public"]["Enums"]["log_level"]
          message: string
          server_id: string
          ts?: string
        }
        Update: {
          id?: number
          level?: Database["public"]["Enums"]["log_level"]
          message?: string
          server_id?: string
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_logs_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_metrics: {
        Row: {
          cpu_pct: number
          disk_mb: number
          id: number
          ram_mb: number
          recorded_at: string
          server_id: string
          uptime_s: number
        }
        Insert: {
          cpu_pct?: number
          disk_mb?: number
          id?: number
          ram_mb?: number
          recorded_at?: string
          server_id: string
          uptime_s?: number
        }
        Update: {
          cpu_pct?: number
          disk_mb?: number
          id?: number
          ram_mb?: number
          recorded_at?: string
          server_id?: string
          uptime_s?: number
        }
        Relationships: [
          {
            foreignKeyName: "server_metrics_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      servers: {
        Row: {
          container_id: string | null
          cpu_limit_pct: number
          created_at: string
          description: string | null
          disk_limit_mb: number
          entry_file: string | null
          id: string
          name: string
          owner_id: string
          ram_limit_mb: number
          runtime: Database["public"]["Enums"]["server_runtime"]
          started_at: string | null
          status: Database["public"]["Enums"]["server_status"]
          updated_at: string
        }
        Insert: {
          container_id?: string | null
          cpu_limit_pct?: number
          created_at?: string
          description?: string | null
          disk_limit_mb?: number
          entry_file?: string | null
          id?: string
          name: string
          owner_id: string
          ram_limit_mb?: number
          runtime: Database["public"]["Enums"]["server_runtime"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["server_status"]
          updated_at?: string
        }
        Update: {
          container_id?: string | null
          cpu_limit_pct?: number
          created_at?: string
          description?: string | null
          disk_limit_mb?: number
          entry_file?: string | null
          id?: string
          name?: string
          owner_id?: string
          ram_limit_mb?: number
          runtime?: Database["public"]["Enums"]["server_runtime"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["server_status"]
          updated_at?: string
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
    }
    Enums: {
      app_role: "admin" | "user"
      command_kind:
        | "start"
        | "stop"
        | "restart"
        | "delete"
        | "exec"
        | "sync_files"
      command_status: "pending" | "running" | "done" | "failed"
      log_level: "stdout" | "stderr" | "system"
      server_runtime: "nodejs" | "python"
      server_status:
        | "stopped"
        | "starting"
        | "running"
        | "stopping"
        | "crashed"
        | "creating"
        | "deleting"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "user"],
      command_kind: [
        "start",
        "stop",
        "restart",
        "delete",
        "exec",
        "sync_files",
      ],
      command_status: ["pending", "running", "done", "failed"],
      log_level: ["stdout", "stderr", "system"],
      server_runtime: ["nodejs", "python"],
      server_status: [
        "stopped",
        "starting",
        "running",
        "stopping",
        "crashed",
        "creating",
        "deleting",
      ],
    },
  },
} as const
