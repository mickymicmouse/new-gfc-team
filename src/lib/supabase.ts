import { createClient } from '@supabase/supabase-js'

const productionSupabaseUrl = 'https://pdbbawisgdqgioirueyn.supabase.co'
const productionSupabaseKey = 'sb_publishable_eU2QSAbU2pshBfNNcHjRfg_MEk2uITq'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || productionSupabaseUrl
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || productionSupabaseKey

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

const createGfcClient = (adminPin?: string) =>
  createClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: adminPin
        ? { headers: { 'x-gfc-admin-pin': adminPin } }
        : undefined,
    },
  )

export const supabase = createGfcClient()
export const createAdminClient = (adminPin: string) => createGfcClient(adminPin)
