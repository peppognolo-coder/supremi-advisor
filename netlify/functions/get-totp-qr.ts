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

import QRCode from 'qrcode';
import type { Handler, HandlerEvent } from '@netlify/functions';

function json(statusCode: number, body: object) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

/**
 * Costruisce l'URL otpauth:// secondo RFC 6238.
 * Formato: otpauth://totp/ISSUER:ACCOUNT?secret=S&issuer=I&algorithm=SHA1&digits=6&period=30
 * Compatibile con Google Authenticator, Authy e tutte le app TOTP standard.
 * Non usa generateURI di otplib per evitare problemi di encoding.
 */
function buildOtpauthUrl(secret: string): string {
  const issuer  = 'Trenord';
  const account = 'Supremi Advisor';
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
  const otpauthUrl = buildOtpauthUrl(secret);

  // Converte in QR code PNG come data URL
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });

  return json(200, { qrDataUrl, secret });
};
