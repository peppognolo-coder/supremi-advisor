import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  MapPin,
  Pencil,
  Search,
  X,
  AlertCircle,
  CheckCircle,
  Building2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

import toast from 'react-hot-toast';

import {
  type StazioneCompleta,
  getStazioni,
  updateStazione,
  toggleAttivaStazione,
} from '../lib/adminApi';

// =========================
// PROPS
// =========================

type FiltroQualita =
  | '__coord__'
  | '__maps__'
  | '__indirizzo__'
  | '__pluscode__'
  | '__no_coord__'
  | '__no_maps__'
  | '__no_indirizzo__'
  | '__no_codice__'
  | '__disattivate__'
  | '__no_pluscode__'
  | '';

interface Props {
  adminPin: string;
  initialFiltro?: 'tutte' | 'attive' | 'disattivate';
  initialSearchQualita?: string;
  stazioniConAttivita?: Set<string>;
  stazioniConSalette?: Set<string>;
}

// =========================
// TIPI
// =========================

type FiltroMode = 'tutte' | 'attive' | 'disattivate';

const FILTRO_OPTIONS: { mode: FiltroMode; label: string }[] = [
  { mode: 'tutte',        label: 'Tutte' },
  { mode: 'attive',       label: 'Attive' },
  { mode: 'disattivate',  label: 'Disattivate' },
];

// =========================
// CONFIRM MODAL
// =========================

function ConfirmModal({
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4">
        <p className="text-sm text-gray-700">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-trenord-green text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {loading ? 'Attendere...' : 'Conferma'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================
// COMPONENTE PRINCIPALE
// =========================

export default function AdminStazioniScreen({
  adminPin,
  initialFiltro = 'tutte',
  initialSearchQualita = '',
  stazioniConAttivita,
  stazioniConSalette,
}: Props) {
  console.log('ADMIN PIN', adminPin);

  const [loading, setLoading]   = useState(true);
  const [stazioni, setStazioni] = useState<StazioneCompleta[]>([]);
  const [search, setSearch]     = useState('');
  const [filtro, setFiltro]         = useState<FiltroMode>(initialFiltro);
  const [filtroQualita, setFiltroQualita] = useState<string>(initialSearchQualita);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editing, setEditing]   = useState<StazioneCompleta | null>(null);
  const [saving, setSaving]     = useState(false);
  const [confirm, setConfirm]   = useState<{
    message: string;
    onConfirm: () => void;
    loading: boolean;
  } | null>(null);

  // =========================
  // LOAD
  // =========================

  async function load() {
    setLoading(true);
    const res = await getStazioni(adminPin);
    if (!res.ok) {
      toast.error(res.error?.message ?? 'Errore caricamento stazioni');
      setLoading(false);
      return;
    }
    setStazioni(res.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // =========================
  // STATISTICHE
  // =========================

  const stats = useMemo(() => {
    const totale        = stazioni.length;
    const attive        = stazioni.filter((s) => s.attiva).length;
    const disattivate   = stazioni.filter((s) => !s.attiva).length;
    const senzaCoord    = stazioni.filter((s) => !s.lat || !s.lng).length;
    const senzaCodice   = stazioni.filter((s) => !s.codice).length;
    return { totale, attive, disattivate, senzaCoord, senzaCodice };
  }, [stazioni]);

  // =========================
  // FILTRO + RICERCA
  // =========================

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stazioni.filter((s) => {
      // Filtro stato
      const matchFiltro =
        filtro === 'tutte'       ? true :
        filtro === 'attive'      ? s.attiva :
        !s.attiva;
      if (!matchFiltro) return false;

      // Filtro qualità (proveniente dalla dashboard)
      if (filtroQualita) {
        if (filtroQualita === '__coord__'        && !(s.lat && s.lng))         return false;
        if (filtroQualita === '__maps__'         && !s.maps_query?.trim())     return false;
        if (filtroQualita === '__indirizzo__'    && !s.indirizzo?.trim())      return false;
        if (filtroQualita === '__pluscode__'     && !s.plus_code?.trim())      return false;
        if (filtroQualita === '__no_coord__'     && (s.lat && s.lng))          return false;
        if (filtroQualita === '__no_maps__'      && s.maps_query?.trim())      return false;
        if (filtroQualita === '__no_indirizzo__' && s.indirizzo?.trim())       return false;
        if (filtroQualita === '__no_codice__'    && s.codice?.trim())          return false;
        if (filtroQualita === '__no_pluscode__'  && (s as any).plus_code?.trim()) return false;
        if (filtroQualita === '__disattivate__'  && s.attiva)                  return false;
        // Integrità — questi richiedono dati esterni: passati via ID set nelle props
        if (filtroQualita === '__no_attivita__'  && stazioniConAttivita?.has(s.id))  return false;
        if (filtroQualita === '__no_salette__'   && stazioniConSalette?.has(s.nome?.toLowerCase().trim())) return false;
      }

      // Ricerca testuale
      if (!q) return true;
      return (
        s.nome?.toLowerCase().includes(q) ||
        s.codice?.toLowerCase().includes(q) ||
        s.regione?.toLowerCase().includes(q) ||
        s.provincia?.toLowerCase().includes(q)
      );
    });
  }, [stazioni, filtro, filtroQualita, search]);

  // =========================
  // TOGGLE ATTIVA
  // =========================

  function richiediToggle(s: StazioneCompleta) {
    const azione = s.attiva ? 'Disattivare' : 'Attivare';
    const nuovoStato = !s.attiva;
    setConfirm({
      message: `${azione} la stazione "${s.nome}"?`,
      loading: false,
      onConfirm: async () => {
        setConfirm((prev) => prev ? { ...prev, loading: true } : null);
        setProcessingId(s.id);
        const res = await toggleAttivaStazione(adminPin, s.id, nuovoStato);
        setProcessingId(null);
        setConfirm(null);
        if (!res.ok) { toast.error(res.error?.message ?? 'Errore'); return; }
        toast.success(nuovoStato ? 'Stazione attivata' : 'Stazione disattivata');
        setStazioni((prev) =>
          prev.map((item) => item.id === s.id ? { ...item, attiva: nuovoStato } : item)
        );
      },
    });
  }

  // =========================
  // MODIFICA
  // =========================

  function apriModifica(s: StazioneCompleta) {
    setEditing({ ...s });
  }

  function setField<K extends keyof StazioneCompleta>(key: K, value: StazioneCompleta[K]) {
    if (!editing) return;
    setEditing({ ...editing, [key]: value });
  }

  async function salvaModifica() {
    if (!editing) return;
    if (!editing.nome?.trim()) { toast.error('Il nome è obbligatorio'); return; }

    setSaving(true);
    const res = await updateStazione(adminPin, {
      id:         editing.id,
      nome:       editing.nome,
      codice:     editing.codice,
      regione:    editing.regione,
      provincia:  editing.provincia,
      indirizzo:  editing.indirizzo,
      maps_query: editing.maps_query,
      plus_code:  editing.plus_code,
      lat:        editing.lat,
      lng:        editing.lng,
      note:       editing.note,
      attiva:     editing.attiva,
    });
    setSaving(false);

    if (!res.ok) { toast.error(res.error?.message ?? 'Errore salvataggio'); return; }

    toast.success('Stazione aggiornata');
    setStazioni((prev) =>
      prev.map((item) => item.id === editing.id ? { ...item, ...res.data } : item)
    );
    setEditing(null);
  }

  // =========================
  // HELPER
  // =========================

  function coordMancanti(s: StazioneCompleta) { return !s.lat || !s.lng; }
  function codiceMancante(s: StazioneCompleta) { return !s.codice; }

  // =========================
  // UI
  // =========================

  return (
    <>
      <div className="flex flex-col gap-4">

        {/* TITOLO */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestione Stazioni</h1>
          <p className="text-sm text-gray-500 mt-1">
            Visualizza e modifica le stazioni nel database
          </p>
        </div>

        {/* STATISTICHE */}
        {!loading && (
          <div className="grid grid-cols-2 gap-3">

            <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totale}</div>
              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Totali</div>
            </div>

            <div className="bg-white rounded-2xl border border-emerald-100 p-3 shadow-sm text-center">
              <div className="text-2xl font-bold text-emerald-600">{stats.attive}</div>
              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Attive</div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm text-center">
              <div className="text-2xl font-bold text-gray-400">{stats.disattivate}</div>
              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Disattivate</div>
            </div>

            <div className={`rounded-2xl border p-3 shadow-sm text-center ${stats.senzaCoord > 0 ? 'bg-white border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
              <div className={`text-2xl font-bold ${stats.senzaCoord > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                {stats.senzaCoord}
              </div>
              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Senza coord.</div>
            </div>

            <div className={`rounded-2xl border p-3 shadow-sm text-center col-span-2 ${stats.senzaCodice > 0 ? 'bg-white border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
              <div className={`text-2xl font-bold ${stats.senzaCodice > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {stats.senzaCodice}
              </div>
              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Senza codice RFI</div>
            </div>

          </div>
        )}

        {/* RICERCA */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per nome, codice, regione, provincia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-9 py-2.5 text-sm"
          />
          {search.length > 0 && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* FILTRI */}
        {!loading && (
          <div className="flex gap-2">
            {FILTRO_OPTIONS.map((opt) => (
              <button
                key={opt.mode}
                type="button"
                onClick={() => setFiltro(opt.mode)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  filtro === opt.mode
                    ? 'bg-trenord-green text-white border-trenord-green'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-trenord-green hover:text-trenord-green'
                }`}
              >
                {opt.label}
                {opt.mode === 'attive' && (
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    filtro === 'attive' ? 'bg-white/20' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {stats.attive}
                  </span>
                )}
                {opt.mode === 'disattivate' && (
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    filtro === 'disattivate' ? 'bg-white/20' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {stats.disattivate}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* BANNER FILTRO QUALITA */}
        {filtroQualita !== '' && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
            <span className="text-sm text-blue-700 font-medium">
              Filtro dashboard: {{
                '__coord__': 'Con coordinate',
                '__maps__': 'Con Maps Query',
                '__indirizzo__': 'Con indirizzo',
                '__pluscode__': 'Con Plus Code',
                '__no_coord__': 'Senza coordinate',
                '__no_maps__': 'Senza Maps Query',
                '__no_indirizzo__': 'Senza indirizzo',
                '__no_codice__': 'Senza codice RFI',
                '__disattivate__': 'Disattivate',
                '__no_attivita__': 'Senza attività',
                '__no_salette__': 'Senza salette',
                '__no_pluscode__': 'Senza Plus Code',
              }[filtroQualita] ?? filtroQualita}
            </span>
            <button
              onClick={() => setFiltroQualita('')}
              className="text-blue-500 hover:text-blue-700 text-xs underline"
            >
              Rimuovi filtro
            </button>
          </div>
        )}

        {/* LOADING */}
        {loading && <div className="text-sm text-gray-500">Caricamento...</div>}

        {/* EMPTY */}
        {!loading && filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-gray-500 text-center">
            {search
              ? `Nessuna stazione trovata per "${search}"`
              : 'Nessuna stazione presente'}
          </div>
        )}

        {/* LISTA */}
        {!loading && (
          <div className="flex flex-col gap-3">
            {filtered.map((s) => {
              const isProcessing  = processingId === s.id;
              const missingCoord  = coordMancanti(s);
              const missingCodice = codiceMancante(s);

              return (
                <div
                  key={s.id}
                  className={`bg-white rounded-2xl border p-4 shadow-sm flex flex-col gap-3 transition-opacity ${
                    s.attiva ? 'border-gray-100' : 'border-gray-200 opacity-60'
                  }`}
                >

                  {/* TOP */}
                  <div className="flex items-start gap-3">

                    {/* ICONA */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center ${
                      s.attiva ? 'bg-trenord-green/10' : 'bg-gray-100'
                    }`}>
                      <Building2 className={`w-5 h-5 ${s.attiva ? 'text-trenord-green' : 'text-gray-400'}`} />
                    </div>

                    {/* INFO */}
                    <div className="flex-1 min-w-0">

                      {/* NOME + BADGE STATO */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{s.nome}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          s.attiva ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {s.attiva ? '🟢 Attiva' : '⚫ Disattivata'}
                        </span>
                      </div>

                      {/* CODICE + REGIONE */}
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {s.codice ? (
                          <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                            {s.codice}
                          </span>
                        ) : (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-md font-medium">
                            Codice mancante
                          </span>
                        )}
                        {(s.provincia || s.regione) && (
                          <span className="text-xs text-gray-400">
                            {[s.provincia, s.regione].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </div>

                      {/* BADGE QUALITÀ */}
                      {(missingCoord || missingCodice) && (
                        <div className="flex gap-2 mt-1.5 flex-wrap">
                          {missingCoord && (
                            <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                              <AlertCircle className="w-3 h-3" />
                              Coordinate mancanti
                            </span>
                          )}
                        </div>
                      )}

                      {/* COORDINATE */}
                      {s.lat && s.lng && (
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-gray-300" />
                          <span className="text-xs text-gray-400 font-mono">
                            {Number(s.lat).toFixed(4)}, {Number(s.lng).toFixed(4)}
                          </span>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* AZIONI */}
                  <div className="flex gap-2 flex-wrap">

                    {/* MODIFICA */}
                    <button
                      type="button"
                      onClick={() => apriModifica(s)}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      <Pencil className="w-4 h-4" />
                      Modifica
                    </button>

                    {/* TOGGLE ATTIVA/DISATTIVA */}
                    <button
                      type="button"
                      onClick={() => richiediToggle(s)}
                      disabled={isProcessing}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 ${
                        s.attiva
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {isProcessing
                        ? <span className="w-4 h-4 border-2 border-current/40 border-t-current rounded-full animate-spin" />
                        : s.attiva
                          ? <ToggleRight className="w-4 h-4" />
                          : <ToggleLeft className="w-4 h-4" />
                      }
                      {isProcessing ? 'Attendere...' : s.attiva ? 'Disattiva' : 'Attiva'}
                    </button>

                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ========================= */}
      {/* MODAL MODIFICA            */}
      {/* ========================= */}

      {editing && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEditing(null); }}
        >
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 pb-24 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">

            {/* HEADER */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Modifica stazione</h2>
                <p className="text-xs text-gray-400 mt-0.5">{editing.id}</p>
              </div>
              <button type="button" onClick={() => setEditing(null)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* NOME */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-400 uppercase">Nome *</label>
              <input
                value={editing.nome ?? ''}
                onChange={(e) => setField('nome', e.target.value)}
                placeholder="es. Milano Centrale"
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />
            </div>

            {/* CODICE */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-400 uppercase">Codice RFI</label>
              <input
                value={editing.codice ?? ''}
                onChange={(e) => setField('codice', e.target.value || null)}
                placeholder="es. MCTL"
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono"
              />
            </div>

            {/* REGIONE + PROVINCIA */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Regione</label>
                <input
                  value={editing.regione ?? ''}
                  onChange={(e) => setField('regione', e.target.value || null)}
                  placeholder="es. Lombardia"
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Provincia</label>
                <input
                  value={editing.provincia ?? ''}
                  onChange={(e) => setField('provincia', e.target.value || null)}
                  placeholder="es. Milano"
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* INDIRIZZO */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-400 uppercase">Indirizzo</label>
              <input
                value={editing.indirizzo ?? ''}
                onChange={(e) => setField('indirizzo', e.target.value || null)}
                placeholder="es. Piazza Duca d'Aosta 1, Milano"
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />
            </div>

            {/* MAPS QUERY */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-400 uppercase">Maps Query</label>
              <input
                value={editing.maps_query ?? ''}
                onChange={(e) => setField('maps_query', e.target.value || null)}
                placeholder="es. Milano Centrale stazione ferroviaria"
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />
            </div>

            {/* PLUS CODE */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-400 uppercase">Plus Code</label>
              <input
                value={editing.plus_code ?? ''}
                onChange={(e) => setField('plus_code', e.target.value || null)}
                placeholder="es. 8FQ9+WF"
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono"
              />
            </div>

            {/* LAT + LNG */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Latitudine</label>
                <input
                  type="number"
                  step="any"
                  value={editing.lat ?? ''}
                  onChange={(e) => setField('lat', e.target.value === '' ? null : Number(e.target.value))}
                  placeholder="es. 45.4858"
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Longitudine</label>
                <input
                  type="number"
                  step="any"
                  value={editing.lng ?? ''}
                  onChange={(e) => setField('lng', e.target.value === '' ? null : Number(e.target.value))}
                  placeholder="es. 9.2042"
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono"
                />
              </div>
            </div>

            {/* NOTE */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-400 uppercase">Note</label>
              <textarea
                value={editing.note ?? ''}
                onChange={(e) => setField('note', e.target.value || null)}
                rows={3}
                placeholder="Note aggiuntive sulla stazione..."
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none"
              />
            </div>

            {/* ATTIVA TOGGLE */}
            <button
              type="button"
              onClick={() => setField('attiva', !editing.attiva)}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
                editing.attiva
                  ? 'bg-trenord-green text-white border-trenord-green'
                  : 'bg-white border-gray-200 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                {editing.attiva
                  ? <CheckCircle className="w-5 h-5" />
                  : <AlertCircle className="w-5 h-5" />
                }
                <span className="font-medium text-sm">
                  {editing.attiva ? 'Stazione attiva' : 'Stazione disattivata'}
                </span>
              </div>
              <span className="text-sm font-medium">
                {editing.attiva ? 'SI' : 'NO'}
              </span>
            </button>

            {/* SALVA */}
            <button
              type="button"
              onClick={salvaModifica}
              disabled={saving}
              className="bg-trenord-green text-white rounded-xl py-3 font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {saving && (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              {saving ? 'Salvataggio...' : 'Salva modifiche'}
            </button>

          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
          loading={confirm.loading}
        />
      )}
    </>
  );
}
