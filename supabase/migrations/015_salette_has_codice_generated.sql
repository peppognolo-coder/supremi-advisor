-- Migration 015: has_codice come colonna generata
--
-- Root cause: SaletteScreen.tsx calcolava il booleano "has_codice" con un
-- trucco di sintassi PostgREST (has_codice:codice_accesso.not.is(null))
-- dentro la select — non sintassi standard, probabilmente tollerata da una
-- versione precedente del motore. Un aggiornamento di Supabase/PostgREST
-- ha reso la grammatica più stretta: ora prova a interpretare
-- "colonna.qualcosa(...)" come chiamata a funzione di aggregazione
-- (sum/avg/count/max/min) e rifiuta "not", causando 400 Bad Request
-- (PGRST100) e di conseguenza zero salette mostrate all'utente.
--
-- Fix: has_codice diventa una colonna generata dal database. Il client la
-- seleziona come un campo qualsiasi, senza trucchi di sintassi.
-- codice_accesso resta comunque escluso dalla select lato client.

alter table salette
  add column if not exists has_codice boolean
  generated always as (codice_accesso is not null) stored;

comment on column salette.has_codice is
  'true se la saletta ha un codice di accesso impostato. Calcolata dal database per evitare di esporre codice_accesso al client.';
