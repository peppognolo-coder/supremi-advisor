/**
 * change-admin-pin
 *
 * Cambia il PIN admin. Richiede DUE cose, non solo il PIN attuale:
 *   1. Il PIN attuale
 *   2. Un codice a 6 cifre dal TOTP admin DEDICATO (ADMIN_TOTP_SECRET) —
 *      un segreto separato da quello usato dal personale per i codici
 *      salette (TOTP_SECRET). Chiunque abbia configurato l'autenticatore
 *      per vedere un codice saletta NON può generare codici validi qui:
 *      sono due segreti diversi. Vedi conversazione.
 *
 * Verifica e aggiornamento avvengono in un'unica operazione atomica lato
 * database (change_admin_pin, migration 018): se il PIN attuale è
 * sbagliato non viene toccato nulla.
 *
 * POST body: { currentPin: string, newPin: string, totpToken: string }
 * Response:  { ok: boolean, error?: string }
 */

import { createClient } from '@supabase/supabase-js';
import { verifySync } from 'otplib';
import type { Handler, HandlerEvent } from '@netlify/functions';

function json(statusCode: number, body: object) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  const totpSecret = process.env.ADMIN_TOTP_SECRET;
  if (!totpSecret) {
    return json(500, { ok: false, error: 'ADMIN_TOTP_SECRET non configurato. Aggiungilo alle variabili Netlify prima di poter cambiare il PIN.' });
  }

  let body: { currentPin?: string; newPin?: string; totpToken?: string };
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, { ok: false, error: 'Body non valido' });
  }

  const { currentPin, newPin, totpToken } = body;

  if (!currentPin) return json(400, { ok: false, error: 'PIN attuale mancante' });
  if (!newPin || !/^\d{4}$/.test(newPin)) {
    return json(400, { ok: false, error: 'Il nuovo PIN deve essere di 4 cifre' });
  }
  if (newPin === currentPin) {
    return json(400, { ok: false, error: 'Il nuovo PIN deve essere diverso da quello attuale' });
  }
  if (!totpToken || !/^\d{6}$/.test(totpToken)) {
    return json(400, { ok: false, error: 'Codice autenticatore admin mancante o non valido (6 cifre)' });
  }

  // Secondo fattore: TOTP admin dedicato, mai il TOTP condiviso col personale.
  const totpResult = verifySync({ type: 'totp', token: totpToken, secret: totpSecret });
  if (!totpResult.valid) {
    return json(401, { ok: false, error: 'Codice autenticatore admin non valido o scaduto' });
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.rpc('change_admin_pin', {
    p_old_pin: currentPin,
    p_new_pin: newPin,
  });

  if (error) {
    console.error('[change-admin-pin]', error.message);
    return json(500, { ok: false, error: 'Errore durante il cambio PIN' });
  }

  if (data !== true) {
    return json(401, { ok: false, error: 'PIN attuale non corretto' });
  }

  return json(200, { ok: true });
};
