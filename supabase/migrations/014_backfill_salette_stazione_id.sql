-- Migration 014: collega le salette esistenti alla loro stazione reale
--
-- Root cause (vedi conversazione): salette.stazione è testo libero digitato
-- dall'admin, mai validato contro stazioni.nome. stazione_id esiste come
-- colonna ma non è mai stato valorizzato da addSaletta/updateSaletta.
-- Verificato con query diagnostica: 45/45 salette hanno una corrispondenza
-- esatta (normalizzata: minuscolo, trim, senza accenti) con stazioni.nome,
-- quindi il backfill è sicuro al 100% sui dati attuali.
--
-- Da qui in avanti "Aggiungi/Modifica saletta" e "Segnala saletta mancante"
-- selezionano la stazione da un elenco (stazione_id), non più testo libero.

update salette s
set stazione_id = st.id
from stazioni st
where s.stazione_id is null
  and lower(trim(unaccent(s.stazione))) = lower(trim(unaccent(st.nome)));

create index if not exists idx_salette_stazione_id on salette(stazione_id);

-- Query di verifica post-migration (facoltativa, sola lettura):
-- select count(*) filter (where stazione_id is null) as ancora_orfane,
--        count(*) as totale
-- from salette;
