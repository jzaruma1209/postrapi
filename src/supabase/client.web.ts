// ─── STUB WEB ─────────────────────────────────────────────
// En web no se necesita el polyfill de URL de React Native.
// Metro carga este archivo en lugar de client.ts en plataforma web.
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Variables de Supabase no configuradas. Sync desactivado.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;
