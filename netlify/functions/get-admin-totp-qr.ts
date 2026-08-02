/**
 * get-admin-totp-qr
 *
 * Genera il QR per configurare il secondo fattore DEDICATO
 * all'amministrazione (ADMIN_TOTP_SECRET) — separato dal TOTP condiviso
 * col personale (TOTP_SECRET, usato per i codici salette). Vedi
 * conversazione: usare lo stesso segreto per entrambi avrebbe permesso a
 * chiunque configuri l'autenticatore per un codice saletta di generare
 * anche codici validi per cambiare il PIN admin.
 *
 * Protetto dal PIN admin attuale (verificato contro l'hash nel database).
 *
 * POST body: { adminPin: "..." }
 * Response:  { qrDataUrl: "data:image/png;base64,..." }
 */

import QRCode from 'qrcode';
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

function buildOtpauthUrl(secret: string): string {
  const issuer  = 'Trenord';
  // Etichetta volutamente diversa da quella del TOTP personale, per
  // riconoscere subito le due voci nell'app authenticator.
  const account = 'Supremi Advisor (Admin)';
  const label   = encodeURIComponent(`${issuer}:${account}`);
  return (
    `otpauth://totp/${label}` +
    `?secret=${secret}` +
    `&issuer=${encodeURIComponent(issuer)}` +
    `&algorithm=SHA1` +
    `&digits=6` +
    `&period=30`
  );
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const secret = process.env.ADMIN_TOTP_SECRET;
  if (!secret) {
    return json(500, { error: 'ADMIN_TOTP_SECRET non configurato. Aggiungilo alle variabili Netlify (deve essere diverso da TOTP_SECRET).' });
  }

  let body: { adminPin?: string };
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, { error: 'Body non valido.' });
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  if (!(await checkAdminPin(supabase, body.adminPin))) {
    return json(403, { error: 'PIN admin non valido.' });
  }

  const otpauthUrl = buildOtpauthUrl(secret);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });

  return json(200, { qrDataUrl, secret });
};
