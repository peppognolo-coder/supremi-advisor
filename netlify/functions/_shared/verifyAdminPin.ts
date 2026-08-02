import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Verifica un PIN admin contro l'hash salvato in admin_config, tramite la
 * funzione SQL verify_admin_pin (security definer — l'hash non lascia mai
 * il database). Usato da ogni funzione Netlify che oggi richiede il PIN.
 *
 * Richiede un client Supabase già istanziato con la service role key.
 */
export async function checkAdminPin(
  supabase: SupabaseClient,
  pin: string | null | undefined
): Promise<boolean> {
  if (!pin) return false;

  const { data, error } = await supabase.rpc('verify_admin_pin', { p_pin: pin });

  if (error) {
    console.error('[checkAdminPin]', error.message);
    return false;
  }

  return data === true;
}
