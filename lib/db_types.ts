export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      chats: {
        Row: {
          id: string
          payload: Json | null
          user_id: string | null
        }
        Insert: {
          id: string
          payload?: Json | null
          user_id?: string | null
        }
        Update: {
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          display_name: string | null
          id: string
          metadata: Json
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          metadata?: Json
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          metadata?: Json
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          metadata: Json
          plan: string
          provider: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          plan?: string
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          plan?: string
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subscriptions_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      cases: {
        Row: {
          category: string
          created_at: string
          id: string
          input_text: string | null
          input_url: string | null
          input_type: string | null
          source: string
          risk_level: string
          risk_score: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          input_text?: string | null
          input_url?: string | null
          input_type?: string | null
          source?: string
          risk_level?: string
          risk_score?: number
          status?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          input_text?: string | null
          input_url?: string | null
          input_type?: string | null
          source?: string
          risk_level?: string
          risk_score?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cases_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      case_messages: {
        Row: {
          case_id: string
          content: string
          created_at: string
          id: string
          metadata: Json
          sender_role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id: string
          content: string
          created_at?: string
          id?: string
          metadata?: Json
          sender_role?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          case_id?: string
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          sender_role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'case_messages_case_id_fkey'
            columns: ['case_id']
            referencedRelation: 'cases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'case_messages_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      case_attachments: {
        Row: {
          case_id: string
          content_type: string | null
          created_at: string
          file_name: string
          file_size: number | null
          id: string
          message_id: string | null
          metadata: Json
          storage_bucket: string
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id: string
          content_type?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          id?: string
          message_id?: string | null
          metadata?: Json
          storage_bucket: string
          storage_path: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          case_id?: string
          content_type?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          id?: string
          message_id?: string | null
          metadata?: Json
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'case_attachments_case_id_fkey'
            columns: ['case_id']
            referencedRelation: 'cases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'case_attachments_message_case_fkey'
            columns: ['message_id', 'case_id']
            referencedRelation: 'case_messages'
            referencedColumns: ['id', 'case_id']
          },
          {
            foreignKeyName: 'case_attachments_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      case_feedback: {
        Row: {
          id: string
          case_id: string
          user_id: string | null
          email: string | null
          token: string | null
          rating: 'accurate' | 'not_right'
          reason:
            | 'too_risky'
            | 'not_risky_enough'
            | 'missed_red_flag'
            | 'wrong_category'
            | 'confusing_explanation'
            | 'other'
            | null
          note: string | null
          source: 'dashboard' | 'email' | 'sms'
          ip_hash: string | null
          user_agent: string | null
          admin_status:
            | 'reviewed'
            | 'false_positive'
            | 'false_negative'
            | 'needs_rule_update'
            | 'needs_prompt_update'
            | null
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          case_id: string
          user_id?: string | null
          email?: string | null
          token?: string | null
          rating: 'accurate' | 'not_right'
          reason?:
            | 'too_risky'
            | 'not_risky_enough'
            | 'missed_red_flag'
            | 'wrong_category'
            | 'confusing_explanation'
            | 'other'
            | null
          note?: string | null
          source?: 'dashboard' | 'email' | 'sms'
          ip_hash?: string | null
          user_agent?: string | null
          admin_status?:
            | 'reviewed'
            | 'false_positive'
            | 'false_negative'
            | 'needs_rule_update'
            | 'needs_prompt_update'
            | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          user_id?: string | null
          email?: string | null
          token?: string | null
          rating?: 'accurate' | 'not_right'
          reason?:
            | 'too_risky'
            | 'not_risky_enough'
            | 'missed_red_flag'
            | 'wrong_category'
            | 'confusing_explanation'
            | 'other'
            | null
          note?: string | null
          source?: 'dashboard' | 'email' | 'sms'
          ip_hash?: string | null
          user_agent?: string | null
          admin_status?:
            | 'reviewed'
            | 'false_positive'
            | 'false_negative'
            | 'needs_rule_update'
            | 'needs_prompt_update'
            | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'case_feedback_case_id_fkey'
            columns: ['case_id']
            referencedRelation: 'cases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'case_feedback_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      risk_reports: {
        Row: {
          case_id: string
          category: string | null
          created_at: string
          disclaimer: string | null
          id: string
          model_used: string | null
          recommended_actions: Json
          red_flags: Json
          risk_level: string
          risk_score: number | null
          safe_reply: string | null
          sources: Json
          summary: string | null
          user_id: string | null
        }
        Insert: {
          case_id: string
          category?: string | null
          created_at?: string
          disclaimer?: string | null
          id?: string
          model_used?: string | null
          recommended_actions?: Json
          red_flags?: Json
          risk_level?: string
          risk_score?: number | null
          safe_reply?: string | null
          sources?: Json
          summary?: string | null
          user_id?: string | null
        }
        Update: {
          case_id?: string
          category?: string | null
          created_at?: string
          disclaimer?: string | null
          id?: string
          model_used?: string | null
          recommended_actions?: Json
          red_flags?: Json
          risk_level?: string
          risk_score?: number | null
          safe_reply?: string | null
          sources?: Json
          summary?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'risk_reports_case_id_fkey'
            columns: ['case_id']
            referencedRelation: 'cases'
            referencedColumns: ['id']
          }
        ]
      }
      usage_events: {
        Row: {
          anonymous_id: string | null
          case_id: string | null
          cost_estimate: number | null
          created_at: string
          event_type: string
          id: string
          user_id: string
        }
        Insert: {
          anonymous_id?: string | null
          case_id?: string | null
          cost_estimate?: number | null
          created_at?: string
          event_type: string
          id?: string
          user_id?: string
        }
        Update: {
          anonymous_id?: string | null
          case_id?: string | null
          cost_estimate?: number | null
          created_at?: string
          event_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'usage_events_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      phone_numbers: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          label: string | null
          phone_number: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          phone_number: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          phone_number?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'phone_numbers_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      email_aliases: {
        Row: {
          created_at: string
          email: string
          id: string
          is_primary: boolean
          label: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_primary?: boolean
          label?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'email_aliases_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      scam_intel: {
        Row: {
          id: string
          name: string
          category: string
          severity: string
          description: string
          signals: Json
          recommended_action: string
          source_type: string
          source_url: string | null
          confidence: string
          status: string
          example_text: string | null
          expected_risk_level: string | null
          expected_category: string | null
          last_tested_at: string | null
          last_test_result: Json | null
          first_seen: string
          last_seen: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          severity?: string
          description?: string
          signals?: Json
          recommended_action?: string
          source_type?: string
          source_url?: string | null
          confidence?: string
          status?: string
          example_text?: string | null
          expected_risk_level?: string | null
          expected_category?: string | null
          last_tested_at?: string | null
          last_test_result?: Json | null
          first_seen?: string
          last_seen?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          severity?: string
          description?: string
          signals?: Json
          recommended_action?: string
          source_type?: string
          source_url?: string | null
          confidence?: string
          status?: string
          example_text?: string | null
          expected_risk_level?: string | null
          expected_category?: string | null
          last_tested_at?: string | null
          last_test_result?: Json | null
          first_seen?: string
          last_seen?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      scam_intel_pending: {
        Row: {
          id: string
          name: string | null
          category: string | null
          severity: string | null
          description: string
          signals: Json
          recommended_action: string
          source_type: string
          source_url: string | null
          confidence: string
          review_status: string
          notes: string | null
          promoted_scam_intel_id: string | null
          raw: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          category?: string | null
          severity?: string | null
          description?: string
          signals?: Json
          recommended_action?: string
          source_type?: string
          source_url?: string | null
          confidence?: string
          review_status?: string
          notes?: string | null
          promoted_scam_intel_id?: string | null
          raw?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          category?: string | null
          severity?: string | null
          description?: string
          signals?: Json
          recommended_action?: string
          source_type?: string
          source_url?: string | null
          confidence?: string
          review_status?: string
          notes?: string | null
          promoted_scam_intel_id?: string | null
          raw?: Json
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          public: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'buckets_owner_fkey'
            columns: ['owner']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          path_tokens: string[] | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'objects_bucketId_fkey'
            columns: ['bucket_id']
            referencedRelation: 'buckets'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_insert_object: {
        Args: {
          bucketid: string
          name: string
          owner: string
          metadata: Json
        }
        Returns: undefined
      }
      extension: {
        Args: {
          name: string
        }
        Returns: string
      }
      filename: {
        Args: {
          name: string
        }
        Returns: string
      }
      foldername: {
        Args: {
          name: string
        }
        Returns: unknown
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      search: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
