import { useState, useEffect } from 'react';

import {
  ArrowLeft,
  Microwave,
  Coffee,
  Droplets,
  Snowflake,
  Shirt,
  Plus,
  Trash2,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../../lib/supabase';
import type { FasciaOraria } from '../../lib/getStatoApertura';
import {
  SEZIONI_LOCALITA as areeLocalita,
  type SezioneId as AreaId,
  MODALITA_ACCESSO,
  TIPOLOGIA_ACCESSO,
  GIORNI_SETTIMANA,
} from '../../lib/localitaSezioni';

interface Props {
  onBack: () => void;
  stazionePredefinita?: string;
}

function nuovaFascia(): FasciaOraria {
  return { giorni: [], apertura: '', chiusura: '' };
}

export default function ContributoSalettaForm({
  onBack,
  stazionePredefinita,
}: Props) {

  // =========================
  // FORM STATE
  // =========================

  const [stazioni, setStazioni] = useState<{ id: string; nome: string }[]>([]);
  const [loadingStazioni, setLoadingStazioni] = useState(true);
  const [stazioneId, setStazioneId] = useState('');
  const [stazioneTestoLibero, setStazioneTestoLibero] = useState(stazionePredefinita || '');
  const [usaTestoLibero, setUsaTestoLibero] = useState(false);

  // Carica le stazioni attive e prova a pre-selezionare quella eventualmente
  // passata da chi ha aperto il form (es. da "Segnala problema" su una
  // saletta di ricerca già filtrata per stazione).
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingStazioni(true);
      try {
        const { data, error } = await supabase
          .from('stazioni')
          .select('id, nome')
          .eq('attiva', true)
          .order('nome', { ascending: true });

        if (error) throw error;
        if (cancelled) return;

        const lista = data ?? [];
        setStazioni(lista);

        if (stazionePredefinita) {
          const norm = (s: string) => s.trim().toLowerCase();
          const match = lista.find((s) => norm(s.nome) === norm(stazionePredefinita));
          if (match) setStazioneId(match.id);
          else setUsaTestoLibero(true);
        } else if (lista.length > 0) {
          setStazioneId(lista[0].id);
        }
      } catch (err) {
        console.error('[ContributoSalettaForm] Errore caricamento stazioni:', err);
      } finally {
        if (!cancelled) setLoadingStazioni(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [stazionePredefinita]);

  const [areaId, setAreaId]             = useState<AreaId>(areeLocalita[0].id);
  const [etichetta, setEtichetta]       = useState('');
  const [codice, setCodice]             = useState('');
  const [ubicazione, setUbicazione]     = useState('');
  const [stato, setStato]               = useState('');
  const [note, setNote]                 = useState('');

  // Servizi (equipaggi)
  const [microonde, setMicroonde]       = useState(false);
  const [distributori, setDistributori] = useState(false);
  const [acqua, setAcqua]               = useState(false);
  const [climatizzata, setClimatizzata] = useState(false);

  // Campi contestuali
  const [modalitaAccesso, setModalitaAccesso]   = useState(MODALITA_ACCESSO[0]);
  const [tipologiaAccesso, setTipologiaAccesso] = useState(TIPOLOGIA_ACCESSO[0]);
  const [docce, setDocce]                       = useState(false);
  const [armadietti, setArmadietti]             = useState(false);

  // Fasce orarie (segreteria e versamenti) — stesso tipo e logica delle attività
  const [fasceOrarie, setFasceOrarie] = useState<FasciaOraria[]>([nuovaFascia()]);

  const [loading, setLoading] = useState(false);

  const sezioneAttiva = areeLocalita.find((s) => s.id === areaId)!;
  const mostra = (campo: string) =>
    (sezioneAttiva.campi as readonly string[]).includes(campo);

  function handleAreaChange(id: AreaId) {
    setAreaId(id);
    const sezione = areeLocalita.find((s) => s.id === id)!;
    setStato(sezione.stati[0] ?? '');
  }

  // =========================
  // GESTIONE FASCE ORARIE
  // Identico a ContributoAttivitaForm
  // =========================

  function addFascia() {
    setFasceOrarie([...fasceOrarie, nuovaFascia()]);
  }

  function removeFascia(index: number) {
    setFasceOrarie(fasceOrarie.filter((_, i) => i !== index));
  }

  function updateFascia(index: number, field: string, value: any) {
    const updated = [...fasceOrarie];
    updated[index] = { ...updated[index], [field]: value };
    setFasceOrarie(updated);
  }

  function toggleGiorno(fasciaIndex: number, giorno: string) {
    const fascia = fasceOrarie[fasciaIndex];
    const nuoviGiorni = fascia.giorni.includes(giorno)
      ? fascia.giorni.filter((g) => g !== giorno)
      : [...fascia.giorni, giorno];
    updateFascia(fasciaIndex, 'giorni', nuoviGiorni);
  }

  // =========================
  // SUBMIT
  // Il payload include fasce_orarie nello stesso formato delle attività,
  // compatibile con getStatoApertura. Nessuna modifica al database.
  // =========================

  async function submit() {
    const nomeStazioneSelezionata = stazioni.find((s) => s.id === stazioneId)?.nome ?? '';
    const nomeStazioneFinale = usaTestoLibero ? stazioneTestoLibero.trim() : nomeStazioneSelezionata;

    if (!nomeStazioneFinale) {
      toast.error(usaTestoLibero ? 'Inserisci il nome della stazione' : 'Seleziona una stazione');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        stazione:          nomeStazioneFinale,
        // null quando l'utente ha usato "La mia stazione non è in elenco":
        // il contributo va in revisione admin per essere collegato a mano.
        stazione_id:       usaTestoLibero ? null : stazioneId,
        tipo:              areaId,
        etichetta:         etichetta.trim() || null,
        codice_accesso:    codice.trim(),
        ubicazione:        ubicazione.trim(),
        stato,
        modalita_accesso:  modalitaAccesso,
        tipologia_accesso: tipologiaAccesso,
        fasce_orarie:      fasceOrarie,
        note:              note.trim(),
        servizi: {
          microonde,
          distributori,
          acqua,
          climatizzata,
          docce,
          armadietti,
        },
      };

      const { error } = await supabase
        .from('contributi')
        .insert({ tipo: 'saletta', dati: payload, stato: 'pending' });

      if (error) {
        console.error(error);
        toast.error('Errore invio contributo');
        setLoading(false);
        return;
      }

      toast.success('Contributo inviato');
      setLoading(false);
      onBack();

    } catch (err) {
      console.error(err);
      toast.error('Errore imprevisto');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">

      {/* BACK */}
      <button
        onClick={onBack}
        className="self-start px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm"
      >
        <div className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Indietro
        </div>
      </button>

      {/* TITLE */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Contributo Località Operativa
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Invia nuove informazioni o aggiornamenti
        </p>
      </div>

      {/* SEZIONE DELLA LOCALITÀ */}
      <div>
        <label className="text-xs font-semibold text-gray-400 uppercase">
          Sezione della località
        </label>
        <div className="mt-2 flex flex-col gap-2">
          {[...areeLocalita]
            .filter((s) => s.attiva)
            .sort((a, b) => a.ordine - b.ordine)
            .map((sezione) => {
              const Icon = sezione.icon;
              const selected = areaId === sezione.id;
              return (
                <button
                  key={sezione.id}
                  type="button"
                  onClick={() => handleAreaChange(sezione.id)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    selected
                      ? 'bg-trenord-green text-white border-trenord-green'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-trenord-green/50'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{sezione.label}</span>
                </button>
              );
            })}
        </div>
      </div>

      {/* FORM DINAMICO */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-4">

        {/* STAZIONE — sempre presente */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase">
            Stazione
          </label>

          {!usaTestoLibero ? (
            <>
              <select
                value={stazioneId}
                onChange={(e) => setStazioneId(e.target.value)}
                disabled={loadingStazioni}
                className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base disabled:opacity-50"
              >
                {loadingStazioni && <option>Caricamento stazioni...</option>}
                {!loadingStazioni && stazioni.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setUsaTestoLibero(true)}
                className="mt-1.5 text-xs text-trenord-green underline"
              >
                La mia stazione non è in elenco
              </button>
            </>
          ) : (
            <>
              <input
                value={stazioneTestoLibero}
                onChange={(e) => setStazioneTestoLibero(e.target.value)}
                placeholder="Es. Milano Centrale"
                className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base"
              />
              <p className="mt-1.5 text-xs text-gray-400">
                Verrà verificata da un admin prima di essere pubblicata.
              </p>
              <button
                type="button"
                onClick={() => setUsaTestoLibero(false)}
                className="mt-1 text-xs text-trenord-green underline"
              >
                Seleziona dall'elenco
              </button>
            </>
          )}
        </div>

        {/* ETICHETTA — sempre presente, per distinguere più elementi della
            stessa sezione nella stessa stazione (es. "Trenord"/"Trenitalia",
            "Accesso esterno"/"Accesso saletta") */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase">
            Etichetta (facoltativa)
          </label>
          <input
            value={etichetta}
            onChange={(e) => setEtichetta(e.target.value)}
            placeholder="Es. Trenord, Trenitalia, Accesso saletta..."
            className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base"
          />
          <p className="mt-1.5 text-xs text-gray-400">
            Utile solo se in questa stazione ci sono più elementi della stessa sezione (es. due sale equipaggi).
          </p>
        </div>

        {/* CODICE */}
        {mostra('codice') && (
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase">
              Codice accesso
            </label>
            <input
              value={codice}
              onChange={(e) => setCodice(e.target.value)}
              placeholder="Es. 14579B"
              className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base"
            />
          </div>
        )}

        {/* UBICAZIONE */}
        {mostra('ubicazione') && (
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase">
              Ubicazione
            </label>
            <input
              value={ubicazione}
              onChange={(e) => setUbicazione(e.target.value)}
              placeholder="Es. Binario 1 lato Milano"
              className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base"
            />
          </div>
        )}

        {/* STATO — opzioni specifiche per sezione */}
        {mostra('stato') && sezioneAttiva.stati.length > 0 && (
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase">
              Stato
            </label>
            <select
              value={stato}
              onChange={(e) => setStato(e.target.value)}
              className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base"
            >
              {sezioneAttiva.stati.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {/* MODALITÀ ACCESSO — bagni */}
        {mostra('modalita_accesso') && (
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase">
              Modalità di accesso
            </label>
            <select
              value={modalitaAccesso}
              onChange={(e) => setModalitaAccesso(e.target.value)}
              className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base"
            >
              {MODALITA_ACCESSO.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>
        )}

        {/* TIPOLOGIA ACCESSO — cancelletto */}
        {mostra('tipologia_accesso') && (
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase">
              Tipologia di accesso
            </label>
            <select
              value={tipologiaAccesso}
              onChange={(e) => setTipologiaAccesso(e.target.value)}
              className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base"
            >
              {TIPOLOGIA_ACCESSO.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>
        )}

        {/* SERVIZI — equipaggi */}
        {mostra('servizi') && (
          <div className="flex flex-col gap-3">
            <label className="text-xs font-semibold text-gray-400 uppercase">
              Servizi
            </label>
            <ServiceToggle active={microonde}     onClick={() => setMicroonde(!microonde)}         icon={<Microwave className="w-5 h-5" />} label="Microonde" />
            <ServiceToggle active={distributori}  onClick={() => setDistributori(!distributori)}   icon={<Coffee    className="w-5 h-5" />} label="Distributori" />
            <ServiceToggle active={acqua}         onClick={() => setAcqua(!acqua)}                 icon={<Droplets  className="w-5 h-5" />} label="Acqua" />
            <ServiceToggle active={climatizzata}  onClick={() => setClimatizzata(!climatizzata)}   icon={<Snowflake className="w-5 h-5" />} label="Climatizzata" />
          </div>
        )}

        {/* DOCCE — spogliatoi */}
        {mostra('docce') && (
          <ServiceToggle active={docce} onClick={() => setDocce(!docce)}
            icon={<Droplets className="w-5 h-5" />} label="Docce disponibili" />
        )}

        {/* ARMADIETTI — spogliatoi */}
        {mostra('armadietti') && (
          <ServiceToggle active={armadietti} onClick={() => setArmadietti(!armadietti)}
            icon={<Shirt className="w-5 h-5" />} label="Armadietti disponibili" />
        )}

        {/* FASCE ORARIE — segreteria e versamenti
            Stesso componente e stessa struttura dati delle attività:
            compatibile con getStatoApertura out of the box. */}
        {mostra('fasce_orarie') && (
          <div className="flex flex-col gap-4">

            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-400 uppercase">
                Orari di apertura
              </label>
              <button
                type="button"
                onClick={addFascia}
                className="flex items-center gap-2 text-sm text-trenord-green font-medium"
              >
                <Plus className="w-4 h-4" />
                Aggiungi fascia
              </button>
            </div>

            {fasceOrarie.map((fascia, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-2xl p-4 flex flex-col gap-4"
              >

                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800 text-sm">
                    Fascia {index + 1}
                  </span>
                  {fasceOrarie.length > 1 && (
                    <button type="button" onClick={() => removeFascia(index)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  )}
                </div>

                {/* Giorni */}
                <div className="grid grid-cols-4 gap-2">
                  {GIORNI_SETTIMANA.map((giorno) => {
                    const active = fascia.giorni.includes(giorno);
                    return (
                      <button
                        key={giorno}
                        type="button"
                        onClick={() => toggleGiorno(index, giorno)}
                        className={`rounded-xl border py-2 text-sm font-medium transition-colors ${
                          active
                            ? 'bg-trenord-green text-white border-trenord-green'
                            : 'bg-white border-gray-200 text-gray-700'
                        }`}
                      >
                        {giorno}
                      </button>
                    );
                  })}
                </div>

                {/* Orari */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Apertura</label>
                    <input
                      type="time"
                      value={fascia.apertura}
                      onChange={(e) => updateFascia(index, 'apertura', e.target.value)}
                      className="border border-gray-200 rounded-xl px-3 py-2 w-full text-base"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Chiusura</label>
                    <input
                      type="time"
                      value={fascia.chiusura}
                      onChange={(e) => updateFascia(index, 'chiusura', e.target.value)}
                      className="border border-gray-200 rounded-xl px-3 py-2 w-full text-base"
                    />
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* NOTE — sempre presente */}
        {mostra('note') && (
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase">
              Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Inserisci eventuali informazioni aggiuntive..."
              className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full min-h-[120px] text-base"
            />
          </div>
        )}

        {/* SUBMIT */}
        <button
          onClick={submit}
          disabled={loading}
          className="bg-trenord-green text-white rounded-xl py-3 font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Invio...' : 'Invia contributo'}
        </button>

      </div>

    </div>
  );
}

// =========================
// SERVICE TOGGLE
// =========================

function ServiceToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
        active
          ? 'bg-trenord-green text-white border-trenord-green'
          : 'bg-white border-gray-200 text-gray-700'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        {label}
      </div>
      <span>{active ? 'SI' : 'NO'}</span>
    </button>
  );
}
