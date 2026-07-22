/**
 * get-totp-qr
 *
 * Genera il QR code per configurare Google Authenticator.
 * Usa otplib v13 con l'API corretta (generateURI).
 * Protetto da PIN admin.
 *
 * POST body: { adminPin: "..." }
 * Response:  { qrDataUrl: "data:image/png;base64,..." }
 */

import { generateURI } from 'otplib';
import QRCode from 'qrcode';
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
    return json(405, { error: 'Method not allowed' });
  }

  const adminPin = process.env.ADMIN_PIN;
  const secret   = process.env.TOTP_SECRET;

  if (!secret) {
    return json(500, { error: 'TOTP_SECRET non configurato. Aggiungilo alle variabili Netlify.' });
  }

  let body: { adminPin?: string };
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, { error: 'Body non valido.' });
  }

  if (!body.adminPin || body.adminPin !== adminPin) {
    return json(403, { error: 'PIN admin non valido.' });
  }

  // Genera URL otpauth:// compatibile con Google Authenticator e Authy
  const otpauthUrl = generateURI({
    type:        'totp',
    label:       'SupremiAdvisor',
    issuer:      'Trenord',
    secret,
  });

  // Converte in QR code PNG come data URL
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });

  return json(200, { qrDataUrl, secret });
};
