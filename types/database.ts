export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type WeatherHighlight = 'red' | 'yellow' | 'grey'
export type MemberRole = 'creator' | 'member'
export type ItemType = 'group' | 'personal' | 'scaled'
export type ScaledMultiplier = 'per_person' | 'per_night' | 'per_person_per_night'

export interface Database {
  public: {
    Views: Record<string, never>
    Functions: {
      get_trip_by_invite: {
        Args: { code: string }
        Returns: Array<{
          id: string
          name: string
          location_name: string
          start_date: string
          end_date: string
          member_count: number
        }>
      }
      update_my_profile: {
        Args: { new_name: string; new_avatar_url?: string | null }
        Returns: void
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          name: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          name: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          name?: string
          avatar_url?: string | null
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: 'trip_members_trip_id_fkey'
            columns: ['trip_id']
            isOneToOne: false
            referencedRelation: 'trips'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'trip_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
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
          item_type: ItemType
          scaled_multiplier: ScaledMultiplier | null
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
          item_type?: ItemType
          scaled_multiplier?: ScaledMultiplier | null
          created_at?: string
        }
        Update: {
          category?: string
          name?: string
          quantity?: number
          weather_highlight?: WeatherHighlight
          highlight_reason?: string | null
          item_type?: ItemType
          scaled_multiplier?: ScaledMultiplier | null
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: 'item_claims_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'packing_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'item_claims_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
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
        Relationships: [
          {
            foreignKeyName: 'messages_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      message_reactions: {
        Row: {
          id: string
          message_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          emoji?: string
        }
        Relationships: []
      }
      chat_reads: {
        Row: {
          user_id: string
          trip_id: string
          last_read_at: string
        }
        Insert: {
          user_id: string
          trip_id: string
          last_read_at?: string
        }
        Update: {
          last_read_at?: string
        }
        Relationships: []
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
export type Notification = Database['public']['Tables']['notifications']['Row']
export type MessageReaction = Database['public']['Tables']['message_reactions']['Row']
export type ChatRead = Database['public']['Tables']['chat_reads']['Row']
