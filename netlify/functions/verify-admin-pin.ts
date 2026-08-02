/**
 * verify-admin-pin
 *
 * Verifica il PIN inserito nella schermata di sblocco del pannello Admin.
 * Sostituisce il confronto hardcoded che prima viveva in src/App.tsx
 * (visibile a chiunque ispezionasse il codice del browser).
 *
 * Non ritorna mai il PIN né l'hash — solo { ok: boolean }.
 *
 * POST body: { pin: string }
 * Response:  { ok: boolean }
 */

import { createClient } from '@supabase/supabase-js';
import type { Handler, HandlerEvent } from '@netlify/functions';
import { checkAdminPin } from './_shared/verifyAdminPin';

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

  let body: { pin?: string };
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, { error: 'Body non valido' });
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const ok = await checkAdminPin(supabase, body.pin);
  return json(200, { ok });
};
