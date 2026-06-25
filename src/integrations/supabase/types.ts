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
      addresses: {
        Row: {
          city: string
          country: string
          created_at: string
          id: string
          is_default: boolean
          label: string
          line1: string
          line2: string | null
          phone: string | null
          postal_code: string | null
          recipient: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city: string
          country?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label: string
          line1: string
          line2?: string | null
          phone?: string | null
          postal_code?: string | null
          recipient: string
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          line1?: string
          line2?: string | null
          phone?: string | null
          postal_code?: string | null
          recipient?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_otp_verifications: {
        Row: {
          updated_at: string
          user_id: string
          verified_at: string
        }
        Insert: {
          updated_at?: string
          user_id: string
          verified_at: string
        }
        Update: {
          updated_at?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: []
      }
      ai_assistant_settings: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          max_tokens: number
          model: string
          system_prompt: string
          temperature: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          max_tokens?: number
          model?: string
          system_prompt?: string
          temperature?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          max_tokens?: number
          model?: string
          system_prompt?: string
          temperature?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_campaigns: {
        Row: {
          body: string | null
          clicks_count: number
          created_at: string
          created_by: string
          id: string
          opens_count: number
          prompt: string | null
          recipients_count: number
          scheduled_for: string | null
          sent_at: string | null
          status: string
          subject: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          clicks_count?: number
          created_at?: string
          created_by: string
          id?: string
          opens_count?: number
          prompt?: string | null
          recipients_count?: number
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          clicks_count?: number
          created_at?: string
          created_by?: string
          id?: string
          opens_count?: number
          prompt?: string | null
          recipients_count?: number
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json
          severity: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          severity?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          severity?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      business_hours: {
        Row: {
          business_id: string
          closes_at: string
          created_at: string
          day_of_week: number
          id: string
          is_open: boolean
          opens_at: string
          updated_at: string
        }
        Insert: {
          business_id: string
          closes_at: string
          created_at?: string
          day_of_week: number
          id?: string
          is_open?: boolean
          opens_at: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          closes_at?: string
          created_at?: string
          day_of_week?: number
          id?: string
          is_open?: boolean
          opens_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_onboarding_documents: {
        Row: {
          business_id: string
          created_at: string
          document_type: string
          file_name: string | null
          id: string
          mime_type: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          size_bytes: number | null
          storage_path: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          business_id: string
          created_at?: string
          document_type: string
          file_name?: string | null
          id?: string
          mime_type?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          business_id?: string
          created_at?: string
          document_type?: string
          file_name?: string | null
          id?: string
          mime_type?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      business_settings: {
        Row: {
          availability: string
          away_until: string | null
          business_id: string
          cover_url: string | null
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          availability?: string
          away_until?: string | null
          business_id: string
          cover_url?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          availability?: string
          away_until?: string | null
          business_id?: string
          cover_url?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_verification_checks: {
        Row: {
          business_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          is_completed: boolean
          notes: string | null
          step: string
          updated_at: string
        }
        Insert: {
          business_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          step: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          step?: string
          updated_at?: string
        }
        Relationships: []
      }
      businesses: {
        Row: {
          address: string | null
          category: string | null
          city: string | null
          country: string | null
          cover_url: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          email: string | null
          id: string
          is_onboarded: boolean
          is_published: boolean
          is_verified: boolean
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          rating_avg: number
          rating_count: number
          registration_number: string | null
          slug: string
          tagline: string | null
          tradesafe_token_id: string | null
          trading_address: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_onboarded?: boolean
          is_published?: boolean
          is_verified?: boolean
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          rating_avg?: number
          rating_count?: number
          registration_number?: string | null
          slug: string
          tagline?: string | null
          tradesafe_token_id?: string | null
          trading_address?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_onboarded?: boolean
          is_published?: boolean
          is_verified?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          rating_avg?: number
          rating_count?: number
          registration_number?: string | null
          slug?: string
          tagline?: string | null
          tradesafe_token_id?: string | null
          trading_address?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      crew_members: {
        Row: {
          business_id: string
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          role_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          role_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          role_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          business_id: string
          created_at: string
          customer_id: string
          details: string | null
          id: string
          opened_by: string
          order_id: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_id: string
          details?: string | null
          id?: string
          opened_by: string
          order_id: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_id?: string
          details?: string | null
          id?: string
          opened_by?: string
          order_id?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_change_requests: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          new_email: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          new_email: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          new_email?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_url: string | null
          body: string
          created_at: string
          id: string
          order_id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          body: string
          created_at?: string
          id?: string
          order_id: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          body?: string
          created_at?: string
          id?: string
          order_id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          source: string | null
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          source?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          source?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          message: string | null
          order_id: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          order_id: string
          type: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          order_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payments: {
        Row: {
          amount: number
          checkout_url: string | null
          created_at: string
          currency: string
          fee_business: number
          fee_customer: number
          funded_at: string | null
          id: string
          last_error: string | null
          order_id: string
          provider: string
          raw: Json | null
          refunded_at: string | null
          released_at: string | null
          status: string
          tradesafe_allocation_id: string | null
          tradesafe_transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          checkout_url?: string | null
          created_at?: string
          currency?: string
          fee_business?: number
          fee_customer?: number
          funded_at?: string | null
          id?: string
          last_error?: string | null
          order_id: string
          provider?: string
          raw?: Json | null
          refunded_at?: string | null
          released_at?: string | null
          status?: string
          tradesafe_allocation_id?: string | null
          tradesafe_transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          checkout_url?: string | null
          created_at?: string
          currency?: string
          fee_business?: number
          fee_customer?: number
          funded_at?: string | null
          id?: string
          last_error?: string | null
          order_id?: string
          provider?: string
          raw?: Json | null
          refunded_at?: string | null
          released_at?: string | null
          status?: string
          tradesafe_allocation_id?: string | null
          tradesafe_transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_progress: {
        Row: {
          author_id: string
          business_id: string
          created_at: string
          id: string
          media_urls: string[]
          note: string | null
          order_id: string
          stage: string | null
          task_id: string | null
        }
        Insert: {
          author_id: string
          business_id: string
          created_at?: string
          id?: string
          media_urls?: string[]
          note?: string | null
          order_id: string
          stage?: string | null
          task_id?: string | null
        }
        Update: {
          author_id?: string
          business_id?: string
          created_at?: string
          id?: string
          media_urls?: string[]
          note?: string | null
          order_id?: string
          stage?: string | null
          task_id?: string | null
        }
        Relationships: []
      }
      order_tasks: {
        Row: {
          business_id: string
          created_at: string
          crew_member_id: string | null
          due_at: string | null
          id: string
          instructions: string | null
          order_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          crew_member_id?: string | null
          due_at?: string | null
          id?: string
          instructions?: string | null
          order_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          crew_member_id?: string | null
          due_at?: string | null
          id?: string
          instructions?: string | null
          order_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          address_id: string | null
          business_id: string
          created_at: string
          currency: string
          customer_id: string
          delivery_distance_km: number | null
          delivery_fee: number
          delivery_option: Json | null
          estimated_completion_at: string | null
          fulfillment_type: string
          id: string
          notes: string | null
          reference_image_url: string | null
          rejected_reason: string | null
          scheduled_for: string | null
          service_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          total: number
          tradesafe_transaction_id: string | null
          updated_at: string
        }
        Insert: {
          address_id?: string | null
          business_id: string
          created_at?: string
          currency?: string
          customer_id: string
          delivery_distance_km?: number | null
          delivery_fee?: number
          delivery_option?: Json | null
          estimated_completion_at?: string | null
          fulfillment_type?: string
          id?: string
          notes?: string | null
          reference_image_url?: string | null
          rejected_reason?: string | null
          scheduled_for?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          tradesafe_transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          address_id?: string | null
          business_id?: string
          created_at?: string
          currency?: string
          customer_id?: string
          delivery_distance_km?: number | null
          delivery_fee?: number
          delivery_option?: Json | null
          estimated_completion_at?: string | null
          fulfillment_type?: string
          id?: string
          notes?: string | null
          reference_image_url?: string | null
          rejected_reason?: string | null
          scheduled_for?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          tradesafe_transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_webhook_events: {
        Row: {
          created_at: string
          event_type: string | null
          external_event_id: string
          id: string
          payload: Json
          processed_at: string | null
          provider: string
        }
        Insert: {
          created_at?: string
          event_type?: string | null
          external_event_id: string
          id?: string
          payload: Json
          processed_at?: string | null
          provider?: string
        }
        Update: {
          created_at?: string
          event_type?: string | null
          external_event_id?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          currency: string
          id: string
          order_id: string | null
          paid_at: string | null
          released_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          business_id: string
          created_at?: string
          currency?: string
          id?: string
          order_id?: string | null
          paid_at?: string | null
          released_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          currency?: string
          id?: string
          order_id?: string | null
          paid_at?: string | null
          released_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profile_change_requests: {
        Row: {
          business_id: string | null
          created_at: string
          current_value: string | null
          decision_reason: string | null
          field: string
          id: string
          reason: string | null
          requested_value: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string
          target_user_id: string | null
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          current_value?: string | null
          decision_reason?: string | null
          field: string
          id?: string
          reason?: string | null
          requested_value: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by: string
          target_user_id?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          current_value?: string | null
          decision_reason?: string | null
          field?: string
          id?: string
          reason?: string | null
          requested_value?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string
          target_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_name: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          tradesafe_token_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          tradesafe_token_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          tradesafe_token_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          business_id: string
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          order_id: string
          rating: number
          updated_at: string
        }
        Insert: {
          business_id: string
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          order_id: string
          rating: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          order_id?: string
          rating?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          business_id: string
          created_at: string
          currency: string
          delivery_available: boolean
          delivery_options: Json
          delivery_price_per_km: number
          description: string | null
          duration_minutes: number | null
          id: string
          image_url: string | null
          is_active: boolean
          kind: string
          price: number
          price_max: number | null
          price_min: number | null
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          currency?: string
          delivery_available?: boolean
          delivery_options?: Json
          delivery_price_per_km?: number
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind?: string
          price?: number
          price_max?: number | null
          price_min?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          currency?: string
          delivery_available?: boolean
          delivery_options?: Json
          delivery_price_per_km?: number
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind?: string
          price?: number
          price_max?: number | null
          price_min?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used_at: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used_at?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
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
      verification_requests: {
        Row: {
          business_id: string
          created_at: string
          decision_reason: string | null
          document_urls: string[]
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          decision_reason?: string | null
          document_urls?: string[]
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          decision_reason?: string | null
          document_urls?: string[]
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: []
      }
      waitlist_signups: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string
          user_agent?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_user: { Args: { _user_id: string }; Returns: undefined }
      admin_finalize_business_verification: {
        Args: { _business_id: string; _verify: boolean }
        Returns: undefined
      }
      admin_issue_otp: { Args: { _user_id: string }; Returns: string }
      admin_purge_business: {
        Args: { _business_id: string }
        Returns: undefined
      }
      admin_resolve_change_request: {
        Args: {
          _approve: boolean
          _decision_reason?: string
          _request_id: string
        }
        Returns: undefined
      }
      admin_restore_business: {
        Args: { _business_id: string }
        Returns: undefined
      }
      admin_soft_delete_business: {
        Args: { _business_id: string; _reason?: string }
        Returns: undefined
      }
      admin_verify_otp: {
        Args: { _code: string; _user_id: string }
        Returns: boolean
      }
      business_capacity: { Args: { _business_id: string }; Returns: number }
      can_access_verification_object: {
        Args: { _bucket_id: string; _object_name: string; _user_id: string }
        Returns: boolean
      }
      crew_member_id_for: {
        Args: { _business_id: string; _user_id: string }
        Returns: string
      }
      customer_confirm_completion: {
        Args: { _order_id: string }
        Returns: undefined
      }
      expire_unpaid_orders: { Args: never; Returns: number }
      get_primary_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_business_owner: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      is_crew_of_business: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      is_slot_available: {
        Args: { _business_id: string; _end: string; _start: string }
        Returns: boolean
      }
      issue_signup_otp: { Args: { _email: string }; Returns: string }
      list_day_slots: {
        Args: {
          _business_id: string
          _date: string
          _duration_minutes?: number
        }
        Returns: {
          booked: number
          capacity: number
          slot_end: string
          slot_start: string
        }[]
      }
      list_free_slots: {
        Args: {
          _business_id: string
          _date: string
          _duration_minutes?: number
        }
        Returns: string[]
      }
      notify_user: {
        Args: {
          _body?: string
          _link?: string
          _title: string
          _type: string
          _user_id: string
        }
        Returns: string
      }
      open_dispute: {
        Args: { _details: string; _order_id: string; _reason: string }
        Returns: string
      }
      post_order_progress_update: {
        Args: {
          _business_id: string
          _media_urls?: string[]
          _note?: string
          _order_id: string
          _stage?: string
          _task_id?: string
        }
        Returns: string
      }
      promote_test_admin: { Args: never; Returns: undefined }
      promote_test_crew: { Args: never; Returns: undefined }
      request_email_change: {
        Args: { _new_email: string; _user_id: string }
        Returns: string
      }
      save_business_onboarding_document: {
        Args: {
          _business_id: string
          _document_type: string
          _file_name?: string
          _mime_type?: string
          _size_bytes?: number
          _storage_path: string
        }
        Returns: {
          business_id: string
          created_at: string
          document_type: string
          file_name: string | null
          id: string
          mime_type: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          size_bytes: number | null
          storage_path: string
          updated_at: string
          uploaded_by: string
        }
        SetofOptions: {
          from: "*"
          to: "business_onboarding_documents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_verification_check: {
        Args: {
          _business_id: string
          _completed: boolean
          _notes?: string
          _step: string
        }
        Returns: undefined
      }
      verify_email_change: {
        Args: { _code: string; _user_id: string }
        Returns: string
      }
      verify_signup_otp: {
        Args: { _code: string; _email: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "customer" | "business" | "admin" | "crew"
      order_status:
        | "awaiting_payment"
        | "pending"
        | "accepted"
        | "in_progress"
        | "ready"
        | "completed"
        | "cancelled"
        | "out_for_delivery"
        | "ready_for_review"
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
      app_role: ["customer", "business", "admin", "crew"],
      order_status: [
        "awaiting_payment",
        "pending",
        "accepted",
        "in_progress",
        "ready",
        "completed",
        "cancelled",
        "out_for_delivery",
        "ready_for_review",
      ],
    },
  },
} as const
