-- Migration 013: toggle attiva/disattiva per le salette
--
-- Le salette potevano essere solo modificate o eliminate definitivamente
-- dal pannello admin: non esisteva un modo per nasconderle temporaneamente
-- lato utente senza cancellarle. Aggiunge lo stesso meccanismo già usato
-- per le stazioni (colonna "attiva").
--
-- Idempotente: se la colonna esiste già non fa nulla.

alter table salette
  add column if not exists attiva boolean not null default true;

comment on column salette.attiva is
  'Se false, la saletta è nascosta lato utente (lista e ricerca) pur restando nel database.';

create index if not exists idx_salette_attiva on salette(attiva);
