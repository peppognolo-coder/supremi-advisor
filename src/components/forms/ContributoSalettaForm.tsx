import { useState } from 'react';

import {
  ArrowLeft,
  Microwave,
  Coffee,
  Droplets,
  Snowflake,
  Users,
  Bath,
  DoorOpen,
  MoreHorizontal,
  Shirt,
  BookOpen,
  Banknote,
  Plus,
  Trash2,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../../lib/supabase';
import type { FasciaOraria } from '../../lib/getStatoApertura';

interface Props {
  onBack: () => void;
  stazionePredefinita?: string;
}

// =============================================================================
// CONFIGURAZIONE SEZIONI DELLA LOCALITÀ
//
// Fonte di verità del componente. Per aggiungere una sezione: solo qui.
//
//   id          → valore salvato nel database (stabile, non cambia mai)
//   label       → testo mostrato all'utente
//   description → descrizione breve (tooltip futuro)
//   icon        → icona Lucide nella card di selezione
//   ordine      → ordine di visualizzazione, indipendente dalla posizione nell'array
//   attiva      → false = nascosta senza toccare la logica
//   stati       → opzioni della select Stato per questa sezione ([] = campo assente)
//   campi       → campi da mostrare, nell'ordine in cui appaiono nel form
//
// Convenzione id: minuscolo, italiano, nessuno spazio.
// =============================================================================

const areeLocalita = [
  {
    id: 'equipaggi',
    label: 'Saletta equipaggi',
    description: 'Saletta riservata al personale di bordo',
    icon: Users,
    ordine: 1,
    attiva: true,
    stati: ['Aperta', 'Chiusa', 'In pulizia', 'Guasto'],
    campi: ['codice', 'ubicazione', 'stato', 'servizi', 'note'],
  },
  {
    id: 'bagni',
    label: 'Bagni',
    description: 'Servizi igienici riservati al personale',
    icon: Bath,
    ordine: 2,
    attiva: true,
    stati: ['Aperti', 'Chiusi', 'In pulizia'],
    campi: ['ubicazione', 'stato', 'modalita_accesso', 'note'],
  },
  {
    id: 'cancelletto',
    label: 'Cancelletto',
    description: 'Accesso riservato al personale ferroviario',
    icon: DoorOpen,
    ordine: 3,
    attiva: true,
    stati: [],
    campi: ['codice', 'ubicazione', 'tipologia_accesso', 'note'],
  },
  {
    id: 'trenitalia',
    label: 'Locali Trenitalia',
    description: 'Spazi e servizi Trenitalia',
    icon: MoreHorizontal,
    ordine: 4,
    attiva: true,
    stati: ['Aperto', 'Chiuso', 'Guasto'],
    campi: ['codice', 'ubicazione', 'stato', 'note'],
  },
  {
    id: 'spogliatoi',
    label: 'Spogliatoi',
    description: 'Spogliatoi riservati al personale',
    icon: Shirt,
    ordine: 5,
    attiva: true,
    stati: ['Aperti', 'Chiusi', 'In pulizia'],
    campi: ['ubicazione', 'stato', 'docce', 'armadietti', 'note'],
  },
  {
    id: 'segreteria',
    label: 'Segreteria',
    description: 'Ufficio di segreteria della stazione',
    icon: BookOpen,
    ordine: 6,
    attiva: true,
    stati: ['Aperta', 'Chiusa'],
    // fasce_orarie sostituisce il campo orari testuale:
    // stesso sistema delle attività, compatibile con getStatoApertura
    campi: ['ubicazione', 'stato', 'fasce_orarie', 'note'],
  },
  {
    id: 'versamenti',
    label: 'Ufficio versamenti',
    description: 'Ufficio per i versamenti del personale',
    icon: Banknote,
    ordine: 7,
    attiva: true,
    stati: ['Aperto', 'Chiuso'],
    campi: ['ubicazione', 'stato', 'fasce_orarie', 'note'],
  },
] as const;

type AreaId = typeof areeLocalita[number]['id'];

const MODALITA_ACCESSO  = ['Libero', 'Chiave', 'Codice', 'Badge'];
const TIPOLOGIA_ACCESSO = ['Badge', 'Tastierino', 'Citofono', 'Apertura manuale'];

const GIORNI_SETTIMANA = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

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

  const [stazione, setStazione]         = useState(stazionePredefinita || '');
  const [areaId, setAreaId]             = useState<AreaId>(areeLocalita[0].id);
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
    if (!stazione.trim()) {
      toast.error('Inserisci una stazione');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        stazione:          stazione.trim(),
        tipo:              areaId,
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
          <input
            value={stazione}
            onChange={(e) => setStazione(e.target.value)}
            placeholder="Es. Milano Centrale"
            className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base"
          />
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
