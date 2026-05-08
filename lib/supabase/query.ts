/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from '@supabase/supabase-js'

// Supabase SSR without a full Database generic produces `never` for Schema.
// This helper casts the client to `any` so queries type-check cleanly while
// keeping runtime behaviour identical.
export function db(supabase: SupabaseClient<any>) {
  return supabase as any
}
