// ─── STUB WEB ─────────────────────────────────────────────
// En web no se necesita el polyfill de URL de React Native.
// Metro carga este archivo en lugar de client.ts en plataforma web.
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Variables de Supabase no configuradas. Sync desactivado.");
}

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

// createClient lanza error si la URL está vacía; con valores de relleno la app
// arranca igual y el sync queda desactivado por isSupabaseConfigured.
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : "http://localhost",
  isSupabaseConfigured ? supabaseAnonKey : "sin-configurar",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);
