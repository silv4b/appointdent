export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      anamnese_sessions: {
        Row: {
          appointment_id: string | null
          created_at: string
          dentist_id: string
          fields: Json
          id: string
          notes: string | null
          patient_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          dentist_id: string
          fields?: Json
          id?: string
          notes?: string | null
          patient_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          dentist_id?: string
          fields?: Json
          id?: string
          notes?: string | null
          patient_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamnese_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnese_sessions_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnese_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          created_at: string
          dentist_id: string
          end_time: string
          finished_at?: string | null
          id: string
          notes: string | null
          patient_id: string
          procedure_id: string | null
          return_to_id: string | null
          start_time: string
          started_at?: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dentist_id: string
          end_time: string
          finished_at?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          procedure_id?: string | null
          return_to_id?: string | null
          start_time: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dentist_id?: string
          end_time?: string
          finished_at?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          procedure_id?: string | null
          return_to_id?: string | null
          start_time?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_return_to_id_fkey"
            columns: ["return_to_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_hours: {
        Row: {
          id: string
          day_of_week: number
          open_time: string
          close_time: string
          is_open: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          day_of_week: number
          open_time: string
          close_time: string
          is_open?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          day_of_week?: number
          open_time?: string
          close_time?: string
          is_open?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      receptionist_dentists: {
        Row: {
          id: string
          receptionist_id: string
          dentist_id: string
          created_at: string
        }
        Insert: {
          id?: string
          receptionist_id: string
          dentist_id: string
          created_at?: string
        }
        Update: {
          id?: string
          receptionist_id?: string
          dentist_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receptionist_dentists_receptionist_id_fkey"
            columns: ["receptionist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receptionist_dentists_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_slots: {
        Row: {
          created_at: string
          day_of_week: number
          dentist_id: string
          end_time: string
          id: string
          slot_type: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          dentist_id: string
          end_time: string
          id?: string
          slot_type?: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          dentist_id?: string
          end_time?: string
          id?: string
          slot_type?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
        ]
      }
      dentist_procedures: {
        Row: {
          active: boolean
          created_at: string
          dentist_id: string
          duration_minutes: number | null
          id: string
          price: number | null
          procedure_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          dentist_id: string
          duration_minutes?: number | null
          id?: string
          price?: number | null
          procedure_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          dentist_id?: string
          duration_minutes?: number | null
          id?: string
          price?: number | null
          procedure_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dentist_procedures_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dentist_procedures_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      anamnesis_templates: {
        Row: {
          id: string
          dentist_id: string
          name: string
          fields: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          dentist_id: string
          name: string
          fields?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          dentist_id?: string
          name?: string
          fields?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_templates_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
        ]
      }
      dentists: {
        Row: {
          active: boolean
          created_at: string
          cro: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          profile_id: string | null
          specialty: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          cro?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          profile_id?: string | null
          specialty?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          cro?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          profile_id?: string | null
          specialty?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dentists_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          active: boolean
          birth_date: string | null
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      procedures: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          name: string
          price: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes: number
          id?: string
          name: string
          price?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      procedure_requests: {
        Row: {
          admin_id: string | null
          created_at: string
          dentist_id: string
          description: string | null
          duration_minutes: number
          id: string
          name: string
          price: number | null
          rejection_reason: string | null
          reviewed_at: string | null
          status: string
          updated_at: string
          created_procedure_id: string | null
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          dentist_id: string
          description?: string | null
          duration_minutes: number
          id?: string
          name: string
          price?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: string
          updated_at?: string
          created_procedure_id?: string | null
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          dentist_id?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          price?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: string
          updated_at?: string
          created_procedure_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procedure_requests_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          must_change_password: boolean | null
          name: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          must_change_password?: boolean | null
          name: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          must_change_password?: boolean | null
          name?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          id: string
          patient_id: string
          dentist_id: string
          appointment_id: string | null
          title: string
          medications: Json
          general_observations: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          dentist_id: string
          appointment_id?: string | null
          title?: string
          medications?: Json
          general_observations?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          dentist_id?: string
          appointment_id?: string | null
          title?: string
          medications?: Json
          general_observations?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key?: string
          value?: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      clinic_settings: {
        Row: {
          id: string
          name: string
          street: string
          number: string
          neighborhood: string
          city: string
          state: string
          email: string
          phone1: string
          phone2: string
          cnpj: string
          logo: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string
          street?: string
          number?: string
          neighborhood?: string
          city?: string
          state?: string
          email?: string
          phone1?: string
          phone2?: string
          cnpj?: string
          logo?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          street?: string
          number?: string
          neighborhood?: string
          city?: string
          state?: string
          email?: string
          phone1?: string
          phone2?: string
          cnpj?: string
          logo?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      criar_usuario: {
        Args: {
          usuario_email: string
          usuario_senha: string
          usuario_nome: string
          usuario_role: string
          especialidade?: string | null
        }
        Returns: string
      },
      atualizar_usuario: {
        Args: {
          usuario_id: string
          caller_id: string
          usuario_nome: string
          usuario_role: string
          nova_senha: string | null
          especialidade: string | null
          novo_email: string
        }
        Returns: undefined
      },
      excluir_usuario: {
        Args: {
          usuario_id: string
          caller_id: string
        }
        Returns: undefined
      },
      listar_usuarios: {
        Args: {
          page_size: number
          page_num: number
          caller_id: string
        }
        Returns: Array<{
          id: string
          name: string
          email: string
          role: string
          dentist_id: string | null
          created_at: string
          total: number
        }>
      },
      check_login_rate_limit: {
        Args: { ip_address: string }
        Returns: boolean
      },
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

