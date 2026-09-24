/**
 * upload-hotel-qr
 *
 * Riceve un'immagine QR in base64, la carica su Supabase Storage
 * nel bucket "hotel-qr" e aggiorna attivita_stazione con l'URL pubblico.
 *
 * Prima del caricamento tenta di leggere il contenuto del QR
 * dall'immagine ricevuta e, se ci riesce, scarta l'immagine originale
 * e ne genera una pulita, vettoriale, sempre nitida a qualsiasi
 * dimensione — indipendentemente da quanto fosse sgranata/compressa
 * la sorgente (foto, screenshot, PDF esportato male, ecc). Se la
 * lettura fallisce (immagine troppo degradata, o non è nemmeno un
 * QR), si usa comunque l'immagine originale così come arriva: nessuna
 * regressione rispetto al comportamento precedente. Vedi conversazione.
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
import { Jimp } from 'jimp';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { checkAdminPin } from './_shared/verifyAdminPin';

/**
 * Prova a leggere il contenuto codificato nel QR presente nell'immagine
 * e, se riesce, restituisce un PNG pulito rigenerato da zero. Ritorna
 * null per qualsiasi problema (formato immagine non decodificabile,
 * nessun QR trovato, QR illeggibile) — il chiamante usa l'originale
 * in quel caso, senza mai far fallire l'intera richiesta per questo.
 */
async function rigeneraQrPulito(buffer: Buffer): Promise<Buffer | null> {
  try {
    const img = await Jimp.read(buffer);
    const { data, width, height } = img.bitmap;
    // jsQR vuole un Uint8ClampedArray: il Buffer di Jimp è già RGBA,
    // basta ricondividerne la stessa memoria nel tipo richiesto.
    const pixels = new Uint8ClampedArray(data.buffer, data.byteOffset, data.length);
    const risultato = jsQR(pixels, width, height);
    if (!risultato?.data) return null;

    return await QRCode.toBuffer(risultato.data, {
      type: 'png',
      width: 600,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
  } catch (e) {
    console.warn('[upload-hotel-qr] Rigenerazione QR non riuscita, uso immagine originale:', e);
    return null;
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = 'hotel-qr';
// 4MB, non 5: in base64 un'immagine cresce di circa un terzo, e deve
// restare sotto il tetto di ~6MB per richiesta/risposta imposto da
// Netlify sulle sue funzioni sincrone, con margine per l'overhead del
// JSON che la contiene. Stesso limite lato client in
// QrCheckinUpload.tsx: vanno tenuti allineati. Vedi conversazione.
const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4MB

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

  // Verifica PIN admin — hash nel database (migration 018)
  if (!(await checkAdminPin(supabase, body.adminPin))) {
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
    return json(400, { error: 'Immagine troppo grande. Massimo 4MB.' });
  }

  // Se il QR è leggibile, si sostituisce l'immagine ricevuta con una
  // versione pulita rigenerata da zero (sempre nitida). Altrimenti si
  // prosegue con l'originale, invariato. Vedi commento su
  // rigeneraQrPulito più sopra.
  const immaginePulita = await rigeneraQrPulito(buffer);
  const bufferDaCaricare = immaginePulita ?? buffer;
  const mimeDaCaricare   = immaginePulita ? 'image/png' : mime;

  // Nome file fisso per hotel: sovrascrive automaticamente il vecchio QR
  const ext      = mimeDaCaricare.split('/')[1];
  const filename = `${attivitaId}.${ext}`;

  // Upload su Supabase Storage — upsert sovrascrive il file esistente
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filename, bufferDaCaricare, {
      contentType: mimeDaCaricare,
      upsert: true,
    });

  if (uploadError) {
    console.error('[upload-hotel-qr] Storage error:', uploadError);
    return json(500, { error: 'Errore caricamento immagine: ' + uploadError.message });
  }

  // Pulizia best-effort: se un caricamento precedente per la stessa
  // attività aveva un'estensione diversa (es. era .jpg ed ora, rigenerato,
  // è .png), quel vecchio file resterebbe orfano nel bucket — non è mai
  // referenziato da attivita_stazione, ma occupa spazio inutilmente.
  // Un fallimento qui non deve mai bloccare la risposta di successo.
  const altreEstensioni = ['jpeg', 'jpg', 'png', 'webp'].filter((e) => e !== ext);
  await supabase.storage
    .from(BUCKET)
    .remove(altreEstensioni.map((e) => `${attivitaId}.${e}`))
    .catch(() => {});

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
