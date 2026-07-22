/**
 * get-codice-saletta
 *
 * Restituisce il codice_accesso di una saletta.
 * Chiamata SOLO dopo che verify-totp ha confermato un token valido.
 * Non raccoglie dati personali.
 *
 * POST body: { saletta_id: string }
 * Response:  { codice_accesso: string | null }
 */

import { createClient } from '@supabase/supabase-js';
import type { Handler, HandlerEvent } from '@netlify/functions';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function json(statusCode: number, body: object) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export const handler: Handler = async (event: HandlerEvent) => {

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  let body: { saletta_id?: string };
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, { error: 'Body non valido' });
  }

  const { saletta_id } = body;

  if (!saletta_id) {
    return json(400, { error: 'saletta_id mancante' });
  }

  const { data, error } = await supabase
    .from('salette')
    .select('codice_accesso')
    .eq('id', saletta_id)
    .single();

  if (error || !data) {
    return json(404, { error: 'Saletta non trovata' });
  }

  return json(200, { codice_accesso: data.codice_accesso ?? null });
};
