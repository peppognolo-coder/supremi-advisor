import { supabase } from './supabase';
import { getDeviceId } from './device';
import type { QrCheckinData } from '../components/forms/QrCheckinUpload';

/**
 * Invia un contributo di tipo 'hotel_qr' (nuovo QR check-in o aggiornamento
 * di uno esistente) per un'attività Hotel già esistente. Stessa logica
 * usata sia dalla scorciatoia rapida nella scheda di sola lettura
 * (HotelSheet.tsx) sia da "Proponi modifica" (ProponiModificaAttivitaModal.tsx)
 * — un solo posto da mantenere invece di due implementazioni parallele che
 * rischiano di scollarsi nel tempo. Vedi conversazione.
 */
export async function submitHotelQrContributo(params: {
  attivitaId: string;
  hotelNome: string;
  qrData: QrCheckinData;
}): Promise<{ ok: true } | { ok: false; error: string }> {

  const { error } = await supabase.from('contributi').insert({
    tipo: 'hotel_qr',
    stato: 'pending',
    device_id: getDeviceId(),
    dati: {
      attivita_id: params.attivitaId,
      hotel_nome: params.hotelNome,
      imageBase64: params.qrData.imageBase64,
      mimeType: params.qrData.mimeType,
      scadenza: params.qrData.scadenza,
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
