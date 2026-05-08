export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type WeatherHighlight = 'red' | 'yellow' | 'grey'
export type MemberRole = 'creator' | 'member'

export interface Database {
  public: {
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          avatar_url?: string | null
        }
      }
      trips: {
        Row: {
          id: string
          name: string
          location_name: string
          lat: number
          lng: number
          start_date: string
          end_date: string
          description: string | null
          invite_code: string
          creator_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          location_name: string
          lat: number
          lng: number
          start_date: string
          end_date: string
          description?: string | null
          invite_code: string
          creator_id: string
          created_at?: string
        }
        Update: {
          name?: string
          location_name?: string
          lat?: number
          lng?: number
          start_date?: string
          end_date?: string
          description?: string | null
        }
      }
      trip_members: {
        Row: {
          id: string
          trip_id: string
          user_id: string
          role: MemberRole
          joined_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          user_id: string
          role?: MemberRole
          joined_at?: string
        }
        Update: {
          role?: MemberRole
        }
      }
      packing_items: {
        Row: {
          id: string
          trip_id: string
          category: string
          name: string
          quantity: number
          is_custom: boolean
          weather_highlight: WeatherHighlight
          highlight_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          category: string
          name: string
          quantity?: number
          is_custom?: boolean
          weather_highlight?: WeatherHighlight
          highlight_reason?: string | null
          created_at?: string
        }
        Update: {
          category?: string
          name?: string
          quantity?: number
          weather_highlight?: WeatherHighlight
          highlight_reason?: string | null
        }
      }
      item_claims: {
        Row: {
          id: string
          item_id: string
          trip_id: string
          user_id: string
          quantity_claimed: number
          confirmed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          item_id: string
          trip_id: string
          user_id: string
          quantity_claimed: number
          confirmed?: boolean
          created_at?: string
        }
        Update: {
          quantity_claimed?: number
          confirmed?: boolean
        }
      }
      messages: {
        Row: {
          id: string
          trip_id: string
          user_id: string
          content: string
          pinned: boolean
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          user_id: string
          content: string
          pinned?: boolean
          created_at?: string
        }
        Update: {
          content?: string
          pinned?: boolean
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          trip_id: string
          type: string
          message: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          trip_id: string
          type: string
          message: string
          read?: boolean
          created_at?: string
        }
        Update: {
          read?: boolean
        }
      }
      weather_cache: {
        Row: {
          id: string
          trip_id: string
          fetched_at: string
          forecast_json: Json
        }
        Insert: {
          id?: string
          trip_id: string
          fetched_at?: string
          forecast_json: Json
        }
        Update: {
          fetched_at?: string
          forecast_json?: Json
        }
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          subscription: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subscription: Json
          created_at?: string
        }
        Update: {
          subscription?: Json
        }
      }
    }
  }
}

export type Trip = Database['public']['Tables']['trips']['Row']
export type TripInsert = Database['public']['Tables']['trips']['Insert']
export type TripMember = Database['public']['Tables']['trip_members']['Row']
export type PackingItem = Database['public']['Tables']['packing_items']['Row']
export type ItemClaim = Database['public']['Tables']['item_claims']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type UserProfile = Database['public']['Tables']['users']['Row']
export type WeatherCache = Database['public']['Tables']['weather_cache']['Row']
