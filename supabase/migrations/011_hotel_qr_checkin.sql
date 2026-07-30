-- Migration 011: QR check-in hotel
-- Aggiunge i campi per il QR code di check-in alla tabella attivita_stazione.
-- L'immagine è conservata su Supabase Storage (bucket hotel-qr).
-- qr_scadenza è solo informativa — non blocca la visualizzazione.

alter table attivita_stazione
  add column if not exists qr_checkin_url text,
  add column if not exists qr_scadenza    date;

comment on column attivita_stazione.qr_checkin_url is
  'URL pubblico del QR di check-in nel bucket Supabase Storage hotel-qr';
comment on column attivita_stazione.qr_scadenza is
  'Data di scadenza del QR (informativa). Aggiornata insieme al QR.';
