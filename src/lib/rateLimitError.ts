/**
 * Il trigger di rate limit (migration 020) rifiuta l'insert con un
 * messaggio che inizia con "[RATE_LIMIT]" — qui lo riconosciamo per
 * mostrare il testo pensato per l'utente invece dell'errore tecnico grezzo
 * di Postgres, in tutti gli 8 punti dell'app che inviano contributi o
 * segnalazioni.
 */
export function messaggioErroreInvio(error: { message?: string } | null | undefined): string {
  const msg = error?.message ?? '';
  const match = msg.match(/\[RATE_LIMIT\]\s*(.+)/);
  if (match) return match[1];
  return "Errore durante l'invio. Riprova.";
}
