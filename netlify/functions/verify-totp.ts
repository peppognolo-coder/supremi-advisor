/**
 * verify-totp
 *
 * Verifica un codice TOTP a 6 cifre generato da Google Authenticator.
 * La chiave segreta è in TOTP_SECRET (variabile d'ambiente Netlify).
 * Non raccoglie dati personali — non sa chi ha inserito il codice.
 *
 * POST body: { token: "123456" }
 * Response:  { ok: true } | { ok: false, error: "..." }
 */

import { authenticator } from 'otplib';
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

  const secret = process.env.TOTP_SECRET;
  if (!secret) {
    console.error('[verify-totp] TOTP_SECRET non configurato');
    return json(500, { ok: false, error: 'Configurazione mancante sul server.' });
  }

  let body: { token?: string };
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, { ok: false, error: 'Body non valido.' });
  }

  const { token } = body;

  if (!token || !/^\d{6}$/.test(token)) {
    return json(400, { ok: false, error: 'Il codice deve essere di 6 cifre.' });
  }

  // otplib verifica il token con finestra di ±1 step (±30 secondi)
  // per tollerare piccoli disallineamenti di orologio
  const valid = authenticator.verify({ token, secret });

  if (!valid) {
    return json(401, { ok: false, error: 'Codice non valido o scaduto.' });
  }

  return json(200, { ok: true });
};
