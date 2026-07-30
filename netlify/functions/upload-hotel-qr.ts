/**
 * upload-hotel-qr
 *
 * Riceve un'immagine QR in base64, la carica su Supabase Storage
 * nel bucket "hotel-qr" e aggiorna attivita_stazione con l'URL pubblico.
 *
 * Chiamata solo al momento dell'approvazione del contributo da admin.
 * Richiede PIN admin + verifica TOTP per visualizzazione lato utente.
 *
 * POST body: {
 *   adminPin:    string,
 *   attivitaId:  string,
 *   imageBase64: string,   // data:image/jpeg;base64,... oppure solo la parte base64
 *   mimeType:    string,   // "image/jpeg" | "image/png" | "image/webp"
 *   scadenza:    string,   // "YYYY-MM-DD" — opzionale
 * }
 */

import { createClient } from '@supabase/supabase-js';
import type { Handler, HandlerEvent } from '@netlify/functions';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = 'hotel-qr';
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

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

  let body: {
    adminPin?: string;
    attivitaId?: string;
    imageBase64?: string;
    mimeType?: string;
    scadenza?: string;
  };

  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, { error: 'Body non valido' });
  }

  // Verifica PIN admin
  if (!body.adminPin || body.adminPin !== process.env.ADMIN_PIN) {
    return json(403, { error: 'PIN admin non valido' });
  }

  const { attivitaId, imageBase64, mimeType, scadenza } = body;

  if (!attivitaId) return json(400, { error: 'attivitaId mancante' });
  if (!imageBase64) return json(400, { error: 'imageBase64 mancante' });

  const mime = mimeType ?? 'image/jpeg';
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(mime)) {
    return json(400, { error: 'Formato non supportato. Usa JPG, PNG o WebP.' });
  }

  // Rimuove eventuale prefisso data URL
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  if (buffer.byteLength > MAX_SIZE_BYTES) {
    return json(400, { error: 'Immagine troppo grande. Massimo 5MB.' });
  }

  // Nome file fisso per hotel: sovrascrive automaticamente il vecchio QR
  const ext      = mime.split('/')[1];
  const filename = `${attivitaId}.${ext}`;

  // Upload su Supabase Storage — upsert sovrascrive il file esistente
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, {
      contentType: mime,
      upsert: true,
    });

  if (uploadError) {
    console.error('[upload-hotel-qr] Storage error:', uploadError);
    return json(500, { error: 'Errore caricamento immagine: ' + uploadError.message });
  }

  // Genera URL pubblico
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filename);

  const publicUrl = urlData.publicUrl;

  // Aggiorna attivita_stazione con l'URL e la scadenza
  const updatePayload: Record<string, unknown> = {
    qr_checkin_url: publicUrl,
  };
  if (scadenza) updatePayload.qr_scadenza = scadenza;

  const { error: updateError } = await supabase
    .from('attivita_stazione')
    .update(updatePayload)
    .eq('id', attivitaId);

  if (updateError) {
    return json(500, { error: 'Errore aggiornamento database: ' + updateError.message });
  }

  return json(200, { ok: true, qr_checkin_url: publicUrl });
};
