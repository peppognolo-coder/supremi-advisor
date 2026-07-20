import { useState } from 'react';

import {
  ArrowLeft,
  Microwave,
  Coffee,
  Droplets,
  Snowflake,
  Users,
  Toilet,
  DoorOpen,
  MoreHorizontal,
  Shirt,
  BookOpen,
  Banknote,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../../lib/supabase';

interface Props {
  onBack: () => void;
  stazionePredefinita?: string;
}

// =============================================================================
// CONFIGURAZIONE SEZIONI DELLA LOCALITÀ
//
// Questa è la fonte di verità del componente.
// Per aggiungere una nuova sezione basta aggiungere un oggetto qui sotto —
// il resto del componente non va toccato.
//
// Struttura di ogni sezione:
//   id          → valore salvato nel database (stabile, non cambia mai)
//   label       → testo mostrato all'utente (modificabile liberamente)
//   description → descrizione breve (usata in futuro come tooltip o sottotitolo)
//   icon        → componente Lucide da mostrare nella card di selezione
//   ordine      → determina l'ordine di visualizzazione; indipendente dalla
//                 posizione nell'array, così si può riordinare senza spostare oggetti
//   attiva      → se false la sezione viene nascosta senza modificare la logica
//   campi       → campi da mostrare nel form per questa sezione.
//                 Per ora è solo una dichiarazione di intenzione: nel prossimo
//                 step, questa proprietà guiderà il rendering dinamico dei campi,
//                 eliminando qualsiasi blocco if/else nel componente.
//
// Convenzione per gli id: minuscolo, italiano, nessuno spazio.
// =============================================================================

const areeLocalita = [
  {
    id: 'equipaggi',
    label: 'Saletta equipaggi',
    description: 'Saletta riservata al personale di bordo',
    icon: Users,
    ordine: 1,
    attiva: true,
    // stati specifici per la saletta equipaggi
    stati: ['Aperta', 'Chiusa', 'In pulizia', 'Guasto'],
    campi: ['codice', 'ubicazione', 'stato', 'servizi', 'note'],
  },
  {
    id: 'bagni',
    label: 'Bagni',
    description: 'Servizi igienici riservati al personale',
    icon: Toilet,
    ordine: 2,
    attiva: true,
    // i bagni non hanno "Guasto" come stato distinto — usano stato generale
    stati: ['Aperti', 'Chiusi', 'In pulizia'],
    // modalita_accesso sostituisce accessibilita: l'info utile è come si entra
    campi: ['ubicazione', 'stato', 'modalita_accesso', 'note'],
  },
  {
    id: 'cancelletto',
    label: 'Cancelletto',
    description: 'Accesso riservato al personale ferroviario',
    icon: DoorOpen,
    ordine: 3,
    attiva: true,
    // il cancelletto non ha uno "stato operativo" rilevante
    stati: [],
    // tipologia_accesso descrive il meccanismo (badge, tastierino, ecc.)
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
    // docce e armadietti al posto di accessibilita: info concreta e operativa
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
    // orari è la vera informazione utile per segreteria e versamenti
    campi: ['ubicazione', 'stato', 'orari', 'note'],
  },
  {
    id: 'versamenti',
    label: 'Ufficio versamenti',
    description: 'Ufficio per i versamenti del personale',
    icon: Banknote,
    ordine: 7,
    attiva: true,
    stati: ['Aperto', 'Chiuso'],
    campi: ['ubicazione', 'stato', 'orari', 'note'],
  },
] as const;

// Tipo derivato automaticamente dalla configurazione.
// Quando si aggiunge un'area all'array, il tipo si aggiorna senza intervento.
type AreaId = typeof areeLocalita[number]['id'];

// =========================
// STATI SALETTA
// =========================

const stati = [
  'Aperta',
  'Chiusa',
  'Pulizie',
  'Guasto',
];

export default function ContributoSalettaForm({
  onBack,
  stazionePredefinita,
}: Props) {

  // =========================
  // FORM STATE
  // =========================

  const [stazione, setStazione] =
    useState(stazionePredefinita || '');

  // areaId contiene l'id dell'area selezionata, che viene salvato nel payload
  // come campo "tipo". Corrisponde esattamente al vecchio array di stringhe:
  // 'Equipaggi' → 'equipaggi', 'Bagni' → 'bagni', ecc.
  const [areaId, setAreaId] =
    useState<AreaId>(areeLocalita[0].id);

  const [codice, setCodice] =
    useState('');

  const [ubicazione, setUbicazione] =
    useState('');

  const [stato, setStato] =
    useState(stati[0]);

  const [note, setNote] =
    useState('');

  const [microonde, setMicroonde] =
    useState(false);

  const [distributori, setDistributori] =
    useState(false);

  const [acqua, setAcqua] =
    useState(false);

  const [climatizzata, setClimatizzata] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  // =========================
  // SUBMIT
  // Payload identico a prima. Il campo "tipo" dentro dati contiene l'id
  // dell'area selezionata. Nessuna modifica a Supabase, al database o
  // alla logica di approvazione in AdminScreen.
  // =========================

  async function submit() {

    if (!stazione.trim()) {
      toast.error('Inserisci una stazione');
      return;
    }

    setLoading(true);

    try {

      const payload = {
        stazione:       stazione.trim(),
        tipo:           areaId,   // id area — stesso campo di prima
        codice_accesso: codice.trim(),
        ubicazione:     ubicazione.trim(),
        stato,
        note:           note.trim(),
        servizi: {
          microonde,
          distributori,
          acqua,
          climatizzata,
        },
      };

      const { error } = await supabase
        .from('contributi')
        .insert({
          tipo:  'saletta',
          dati:  payload,
          stato: 'pending',
        });

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

      {/* SEZIONE DELLA LOCALITÀ
          Card selezionabili touch-friendly, generate dalla configurazione
          areeLocalita. Per aggiungere una sezione: solo l'array sopra.
          Nel prossimo step, il cambio di areaId mostrerà i campi definiti
          in sezione.campi, senza if/else nel JSX. */}
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
                onClick={() => setAreaId(sezione.id)}
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

      {/* FORM
          Per ora i campi sono gli stessi per tutte le sezioni.
          Nel prossimo step ogni blocco diventerà condizionale su sezione.campi,
          guidato dalla configurazione invece che da if/else espliciti. */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-4">

        {/* STAZIONE */}
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

        {/* UBICAZIONE */}
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

        {/* STATO */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase">
            Stato
          </label>
          <select
            value={stato}
            onChange={(e) => setStato(e.target.value)}
            className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base"
          >
            {stati.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* SERVIZI */}
        <div className="flex flex-col gap-3">

          <label className="text-xs font-semibold text-gray-400 uppercase">
            Servizi
          </label>

          <ServiceToggle
            active={microonde}
            onClick={() => setMicroonde(!microonde)}
            icon={<Microwave className="w-5 h-5" />}
            label="Microonde"
          />

          <ServiceToggle
            active={distributori}
            onClick={() => setDistributori(!distributori)}
            icon={<Coffee className="w-5 h-5" />}
            label="Distributori"
          />

          <ServiceToggle
            active={acqua}
            onClick={() => setAcqua(!acqua)}
            icon={<Droplets className="w-5 h-5" />}
            label="Acqua"
          />

          <ServiceToggle
            active={climatizzata}
            onClick={() => setClimatizzata(!climatizzata)}
            icon={<Snowflake className="w-5 h-5" />}
            label="Climatizzata"
          />

        </div>

        {/* NOTE */}
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
}: any) {

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
