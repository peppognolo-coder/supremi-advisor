/**
 * telegram-notify
 *
 * Riceve i Database Webhook di Supabase (configurati sulle tabelle
 * `contributi` e `saletta_problemi`, evento INSERT) e inoltra una
 * notifica al bot Telegram dell'admin — così un nuovo contributo o una
 * nuova segnalazione arrivano come notifica push sul telefono, invece di
 * dover controllare periodicamente il pannello admin. Vedi conversazione.
 *
 * Configurazione richiesta (variabili d'ambiente Netlify):
 * - TELEGRAM_BOT_TOKEN   → token del bot, ottenuto da @BotFather
 * - TELEGRAM_CHAT_ID     → id della chat Telegram dell'admin
 * - WEBHOOK_SHARED_SECRET → stringa segreta a scelta, condivisa con
 *   l'header custom del Database Webhook su Supabase — impedisce che
 *   chiunque scopra l'URL possa mandare notifiche a piacere.
 *
 * Payload atteso (formato standard dei Database Webhook di Supabase):
 * { type: 'INSERT', table: 'contributi' | 'saletta_problemi', record: {...} }
 */

import type { Handler, HandlerEvent } from '@netlify/functions';

function json(statusCode: number, body: object) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

// Escape minimo per l'HTML parse mode di Telegram — evita che caratteri
// come < o & nei dati inseriti dagli utenti rompano la formattazione
// del messaggio.
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const APP_URL = 'https://supremi-advisor.netlify.app/';

/**
 * Costruisce il testo del messaggio in base alla tabella/tipo di riga
 * inserita. Restituisce null se non c'è nulla di sensato da notificare
 * (es. tabella non prevista) — in quel caso la function risponde comunque
 * 200 senza inviare nulla, per non far fallire il webhook lato Supabase.
 */
function buildMessage(table: string, record: Record<string, any>): string | null {

  if (table === 'contributi') {
    const tipo = record.tipo;
    const dati = record.dati ?? {};

    switch (tipo) {
      case 'attivita':
        return (
          `🆕 <b>Nuova attività proposta</b>\n` +
          `${escapeHtml(dati.nome ?? 'senza nome')} — ${escapeHtml(dati.categoria ?? '')}\n` +
          `📍 ${escapeHtml(dati.stazione ?? '')}\n\n` +
          `👉 ${APP_URL}`
        );

      case 'stazione':
        return (
          `🆕 <b>Nuova stazione proposta</b>\n` +
          `${escapeHtml(dati.nome ?? '')}\n\n` +
          `👉 ${APP_URL}`
        );

      case 'saletta':
        return (
          `🆕 <b>Nuovo elemento Località Operativa</b>\n` +
          `${escapeHtml(dati.stazione ?? '')} — ${escapeHtml(dati.tipo ?? '')}\n\n` +
          `👉 ${APP_URL}`
        );

      case 'modifica_attivita':
        return (
          `✏️ <b>Proposta di modifica attività</b>\n` +
          `${escapeHtml(dati.nome_attivita ?? '')}\n\n` +
          `👉 ${APP_URL}`
        );

      case 'segnalazione_saletta':
        return (
          `🛋️ <b>Aggiornamento saletta segnalato</b>\n\n` +
          `👉 ${APP_URL}`
        );

      case 'hotel_qr':
        return (
          `📱 <b>Nuovo QR check-in hotel</b>\n` +
          `${escapeHtml(dati.hotel_nome ?? '')}\n\n` +
          `👉 ${APP_URL}`
        );

      default:
        return (
          `🔔 <b>Nuovo contributo</b> (${escapeHtml(tipo ?? 'tipo sconosciuto')})\n\n` +
          `👉 ${APP_URL}`
        );
    }
  }

  if (table === 'saletta_problemi') {
    return (
      `⚠️ <b>Nuova segnalazione saletta</b>\n` +
      `Tipo: ${escapeHtml(record.tipo_problema ?? '—')}\n\n` +
      `👉 ${APP_URL}`
    );
  }

  return null;
}

export const handler: Handler = async (event: HandlerEvent) => {

  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  const sharedSecret = process.env.WEBHOOK_SHARED_SECRET;
  if (!sharedSecret) {
    console.error('[telegram-notify] WEBHOOK_SHARED_SECRET non configurato');
    return json(500, { ok: false, error: 'Configurazione mancante sul server.' });
  }

  // Header custom impostato lato Supabase Database Webhook — vedi
  // istruzioni di configurazione fornite a parte.
  const incomingSecret = event.headers['x-webhook-secret'] ?? event.headers['X-Webhook-Secret'];
  if (incomingSecret !== sharedSecret) {
    console.warn('[telegram-notify] Richiesta con secret mancante o errato');
    return json(401, { ok: false, error: 'Non autorizzato' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    console.error('[telegram-notify] TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID non configurati');
    return json(500, { ok: false, error: 'Configurazione mancante sul server.' });
  }

  let payload: { type?: string; table?: string; record?: Record<string, any> };
  try {
    payload = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, { ok: false, error: 'Body non valido.' });
  }

  const { type, table, record } = payload;

  // Notifichiamo solo i nuovi inserimenti — un UPDATE o un DELETE su
  // queste tabelle non richiede un intervento tempestivo allo stesso modo.
  if (type !== 'INSERT' || !table || !record) {
    return json(200, { ok: true });
  }

  const message = buildMessage(table, record);
  if (!message) {
    return json(200, { ok: true });
  }

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!tgRes.ok) {
      const errText = await tgRes.text();
      console.error('[telegram-notify] Errore risposta Telegram:', errText);
      return json(502, { ok: false, error: 'Errore invio notifica Telegram' });
    }
  } catch (err) {
    console.error('[telegram-notify] Errore chiamata Telegram:', err);
    return json(502, { ok: false, error: 'Errore di rete verso Telegram' });
  }

  return json(200, { ok: true });
};
