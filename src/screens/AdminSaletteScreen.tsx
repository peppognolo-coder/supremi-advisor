import { useEffect, useState } from 'react';

import {
  Save,
  Trash2,
  Plus,
  Search,
  X,
  Microwave,
  Coffee,
  Droplets,
  Snowflake,
  Shirt,
  Power,
  PowerOff,
  RotateCcw,
  MapPin,
} from 'lucide-react';

import toast from 'react-hot-toast';

import {
  type Saletta,
  type StazioneCompleta,
  getSalette,
  getStazioni,
  addSaletta,
  updateSaletta,
  deleteSaletta,
  ripristinaSaletta,
  hardDeleteSaletta,
  toggleAttivaSaletta,
} from '../lib/adminApi';

import ConfirmHardDeleteModal from '../components/ConfirmHardDeleteModal';

import {
  SEZIONI_LOCALITA,
  getSezione,
  MODALITA_ACCESSO,
  TIPOLOGIA_ACCESSO,
  GIORNI_SETTIMANA,
} from '../lib/localitaSezioni';

// =========================
// PROPS
// =========================

interface Props {
  adminPin: string;
  initialFiltroQualita?: string;
}

// =========================
// FILTRO STATO
// =========================

type FiltroStato = 'attive' | 'eliminate' | 'tutte';

const FILTRO_STATO_OPTIONS: { mode: FiltroStato; label: string }[] = [
  { mode: 'attive',    label: 'Attive' },
  { mode: 'eliminate', label: 'Eliminate' },
  { mode: 'tutte',     label: 'Tutte' },
];

function formatDeletedAt(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
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
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        {label}
      </div>
      <span className="text-sm font-medium">
        {active ? 'SI' : 'NO'}
      </span>
    </button>
  );
}

// =========================
// MODAL AGGIUNGI SALETTA
// =========================

function AddSalettaModal({
  adminPin,
  stazioni,
  onClose,
  onAdded,
}: {
  adminPin: string;
  stazioni: StazioneCompleta[];
  onClose: () => void;
  onAdded: (s: Saletta) => void;
}) {
  const [stazioneId, setStazioneId] = useState(stazioni[0]?.id ?? '');
  const [sezioneId, setSezioneId] = useState(SEZIONI_LOCALITA[0].id);
  const [etichetta, setEtichetta] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!stazioneId) {
      toast.error('Seleziona la stazione');
      return;
    }

    setLoading(true);
    const res = await addSaletta(adminPin, {
      stazione_id: stazioneId,
      tipo: sezioneId,
      etichetta: etichetta.trim() || undefined,
    });
    setLoading(false);

    if (!res.ok || !res.data) {
      toast.error(res.error?.message ?? "Errore durante l'aggiunta");
      return;
    }

    toast.success('Elemento aggiunto');
    onAdded(res.data);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4 max-h-[90dvh] overflow-y-auto">

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Nuovo elemento Località Operativa</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-400 uppercase">
            Stazione *
          </label>
          <select
            value={stazioneId}
            onChange={(e) => setStazioneId(e.target.value)}
            className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            autoFocus
          >
            {stazioni.length === 0 && <option value="">Nessuna stazione disponibile</option>}
            {stazioni.map((s) => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-400 uppercase">
            Sezione *
          </label>
          <select
            value={sezioneId}
            onChange={(e) => setSezioneId(e.target.value)}
            className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {SEZIONI_LOCALITA.filter((s) => s.attiva).sort((a, b) => a.ordine - b.ordine).map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-400 uppercase">
            Etichetta (facoltativa)
          </label>
          <input
            value={etichetta}
            onChange={(e) => setEtichetta(e.target.value)}
            placeholder="Es. Trenord, Trenitalia, Accesso saletta..."
            className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <p className="text-xs text-gray-400">
            Utile solo se in questa stazione ci sono più elementi della stessa sezione.
          </p>
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-trenord-green text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading && (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          )}
          {loading ? 'Aggiunta...' : 'Aggiungi'}
        </button>

      </div>
    </div>
  );
}

// =========================
// CONFIRM MODAL
// =========================

function ConfirmModal({
  message,
  onConfirm,
  onCancel,
  loading,
  confirmLabel = 'Elimina',
  loadingLabel = 'Eliminazione...',
  variant = 'danger',
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  confirmLabel?: string;
  loadingLabel?: string;
  variant?: 'danger' | 'primary';
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4">
        <p className="text-sm text-gray-700 dark:text-gray-300">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 ${
              variant === 'danger' ? 'bg-red-600' : 'bg-trenord-green'
            }`}
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================
// SCHERMATA PRINCIPALE
// =========================

export default function AdminSaletteScreen({
  adminPin,
  initialFiltroQualita = '',
}: Props) {

  const [loading, setLoading]   = useState(true);
  const [salette, setSalette]   = useState<Saletta[]>([]);
  const [stazioni, setStazioni] = useState<StazioneCompleta[]>([]);
  const [search, setSearch]     = useState('');
  const [showAdd, setShowAdd]   = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filtroQualita, setFiltroQualita] = useState<string>(initialFiltroQualita);
  const [filtroStato, setFiltroStato] = useState<FiltroStato>('attive');
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    nome: string;
    loading: boolean;
  } | null>(null);

  const [confirmRipristina, setConfirmRipristina] = useState<{
    id: string;
    nome: string;
    loading: boolean;
  } | null>(null);

  const [confirmHardDelete, setConfirmHardDelete] = useState<{
    id: string;
    nome: string;
    loading: boolean;
  } | null>(null);

  const [confirmToggle, setConfirmToggle] = useState<{
    id: string;
    nome: string;
    nuovoStato: boolean;
    loading: boolean;
  } | null>(null);

  // =========================
  // LOAD
  // =========================

  async function load() {
    setLoading(true);
    const [resSalette, resStazioni] = await Promise.all([
      getSalette(adminPin),
      getStazioni(adminPin),
    ]);

    if (!resSalette.ok) {
      toast.error(resSalette.error?.message ?? 'Errore caricamento salette');
      setLoading(false);
      return;
    }

    setSalette(resSalette.data ?? []);
    setStazioni(
      resStazioni.ok
        ? [...(resStazioni.data ?? [])].sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
        : []
    );
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // =========================
  // SEARCH
  // =========================

  const filtered = salette.filter((s) => {
    // Filtro stato eliminazione (vedi migrazione 016: deleted_at è
    // indipendente da attiva, che resta la disattivazione temporanea).
    if (filtroStato === 'attive'    && s.deleted_at) return false;
    if (filtroStato === 'eliminate' && !s.deleted_at) return false;

    // Filtro qualità (proveniente dalla dashboard)
    if (filtroQualita === '__no_ubicazione__' && s.ubicazione?.trim()) return false;
    if (filtroQualita === '__no_codice__' && s.codice_accesso?.trim())  return false;

    // Ricerca testuale
    const q = search.trim().toLowerCase();
    return (
      !q ||
      s.stazione?.toLowerCase().includes(q) ||
      s.tipo?.toLowerCase().includes(q) ||
      s.etichetta?.toLowerCase().includes(q)
    );
  });

  const conteggioAttive    = salette.filter((s) => !s.deleted_at).length;
  const conteggioEliminate = salette.filter((s) => !!s.deleted_at).length;

  // =========================
  // UPDATE FIELD LOCALE
  // =========================

  function updateField(id: string, field: keyof Saletta, value: unknown) {
    setSalette((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  }

  // Fasce orarie: stesso pattern di AdminContributiScreen.tsx, ma operando
  // sull'array locale `salette` invece che su un singolo editingContributo.
  function addFascia(salettaId: string) {
    const s = salette.find((x) => x.id === salettaId);
    const fasce = [...(s?.fasce_orarie ?? []), { giorni: [], apertura: '', chiusura: '' }];
    updateField(salettaId, 'fasce_orarie', fasce);
  }
  function removeFascia(salettaId: string, index: number) {
    const s = salette.find((x) => x.id === salettaId);
    const fasce = (s?.fasce_orarie ?? []).filter((_, i) => i !== index);
    updateField(salettaId, 'fasce_orarie', fasce);
  }
  function updateFascia(salettaId: string, index: number, field: string, value: unknown) {
    const s = salette.find((x) => x.id === salettaId);
    const fasce = [...(s?.fasce_orarie ?? [])];
    fasce[index] = { ...fasce[index], [field]: value };
    updateField(salettaId, 'fasce_orarie', fasce);
  }
  function toggleGiorno(salettaId: string, index: number, giorno: string) {
    const s = salette.find((x) => x.id === salettaId);
    const fascia = s?.fasce_orarie?.[index];
    if (!fascia) return;
    const giorni = fascia.giorni.includes(giorno)
      ? fascia.giorni.filter((g) => g !== giorno)
      : [...fascia.giorni, giorno];
    updateFascia(salettaId, index, 'giorni', giorni);
  }

  // =========================
  // SAVE
  // =========================

  async function saveSaletta(saletta: Saletta) {
    setSavingId(saletta.id);

    const res = await updateSaletta(adminPin, {
      id:                 saletta.id,
      stazione_id:        saletta.stazione_id ?? '',
      tipo:               saletta.tipo,
      etichetta:          saletta.etichetta,
      codice_accesso:     saletta.codice_accesso,
      ubicazione:         saletta.ubicazione,
      note:               saletta.note,
      microonde:          saletta.microonde,
      distributori:       saletta.distributori,
      acqua:              saletta.acqua,
      climatizzata:       saletta.climatizzata,
      docce:              saletta.docce,
      armadietti:         saletta.armadietti,
      modalita_accesso:   saletta.modalita_accesso,
      tipologia_accesso:  saletta.tipologia_accesso,
      fasce_orarie:       saletta.fasce_orarie,
      stato:              saletta.stato,
    });

    setSavingId(null);

    if (!res.ok) {
      toast.error(res.error?.message ?? 'Errore salvataggio');
      return;
    }

    toast.success('Aggiornato');
  }

  // =========================
  // DELETE
  // =========================

  function richiediElimina(s: Saletta) {
    setConfirmDelete({ id: s.id, nome: `${s.stazione} — ${getSezione(s.tipo).label}`, loading: false });
  }

  async function confermaElimina() {
    if (!confirmDelete) return;
    setConfirmDelete((prev) => prev ? { ...prev, loading: true } : null);

    const res = await deleteSaletta(adminPin, confirmDelete.id);

    if (!res.ok) {
      toast.error(res.error?.message ?? 'Errore eliminazione');
      setConfirmDelete((prev) => prev ? { ...prev, loading: false } : null);
      return;
    }

    toast.success('Eliminata');
    setConfirmDelete(null);
    setSalette((prev) =>
      prev.map((s) => (s.id === confirmDelete.id ? { ...s, deleted_at: new Date().toISOString() } : s))
    );
  }

  // =========================
  // RIPRISTINA
  // =========================

  function richiediRipristina(s: Saletta) {
    setConfirmRipristina({ id: s.id, nome: `${s.stazione} — ${getSezione(s.tipo).label}`, loading: false });
  }

  async function confermaRipristina() {
    if (!confirmRipristina) return;
    setConfirmRipristina((prev) => prev ? { ...prev, loading: true } : null);

    const res = await ripristinaSaletta(adminPin, confirmRipristina.id);

    if (!res.ok) {
      toast.error(res.error?.message ?? 'Errore ripristino');
      setConfirmRipristina((prev) => prev ? { ...prev, loading: false } : null);
      return;
    }

    toast.success('Ripristinata');
    setSalette((prev) =>
      prev.map((s) => (s.id === confirmRipristina.id ? { ...s, deleted_at: null } : s))
    );
    setConfirmRipristina(null);
  }

  // =========================
  // ELIMINA DEFINITIVAMENTE
  // =========================

  function richiediHardDelete(s: Saletta) {
    setConfirmHardDelete({ id: s.id, nome: `${s.stazione} — ${getSezione(s.tipo).label}`, loading: false });
  }

  async function confermaHardDelete() {
    if (!confirmHardDelete) return;
    setConfirmHardDelete((prev) => prev ? { ...prev, loading: true } : null);

    const res = await hardDeleteSaletta(adminPin, confirmHardDelete.id);

    if (!res.ok) {
      toast.error(res.error?.message ?? 'Errore eliminazione definitiva');
      setConfirmHardDelete((prev) => prev ? { ...prev, loading: false } : null);
      return;
    }

    toast.success('Eliminata definitivamente');
    setSalette((prev) => prev.filter((s) => s.id !== confirmHardDelete.id));
    setConfirmHardDelete(null);
  }

  // =========================
  // TOGGLE ATTIVA
  // =========================

  function richiediToggle(s: Saletta) {
    const nuovoStato = !(s.attiva ?? true);
    setConfirmToggle({
      id: s.id,
      nome: `${s.stazione} — ${getSezione(s.tipo).label}`,
      nuovoStato,
      loading: false,
    });
  }

  async function confermaToggle() {
    if (!confirmToggle) return;
    setConfirmToggle((prev) => prev ? { ...prev, loading: true } : null);

    const res = await toggleAttivaSaletta(adminPin, confirmToggle.id, confirmToggle.nuovoStato);

    if (!res.ok) {
      toast.error(res.error?.message ?? 'Errore aggiornamento');
      setConfirmToggle((prev) => prev ? { ...prev, loading: false } : null);
      return;
    }

    toast.success(confirmToggle.nuovoStato ? 'Attivato' : 'Disattivato');
    setSalette((prev) =>
      prev.map((s) => (s.id === confirmToggle.id ? { ...s, attiva: confirmToggle.nuovoStato } : s))
    );
    setConfirmToggle(null);
  }

  // =========================
  // UI
  // =========================

  return (
    <>
      <div className="flex flex-col gap-4">

        {/* TOP */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Gestione Salette
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Modifica dati e codici accesso
            </p>
          </div>

          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-trenord-green text-white text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Aggiungi
          </button>
        </div>

        {/* SEARCH */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca stazione, sezione o etichetta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-9 py-2.5 text-base"
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

        {/* BANNER FILTRO QUALITA */}
        {filtroQualita !== '' && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
            <span className="text-sm text-blue-700 font-medium">
              Filtro dashboard: {
                filtroQualita === '__no_ubicazione__' ? 'Salette senza ubicazione' :
                filtroQualita === '__no_codice__' ? 'Salette senza codice' :
                filtroQualita
              }
            </span>
            <button
              onClick={() => setFiltroQualita('')}
              className="text-blue-500 hover:text-blue-700 text-xs underline"
            >
              Rimuovi filtro
            </button>
          </div>
        )}

        {/* CONTATORI */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 shadow-sm text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{salette.length}</div>
              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Totali</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-emerald-100 dark:border-emerald-900 p-3 shadow-sm text-center">
              <div className="text-2xl font-bold text-emerald-600">{conteggioAttive}</div>
              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Attive</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-red-100 dark:border-red-900 p-3 shadow-sm text-center">
              <div className="text-2xl font-bold text-red-500">{conteggioEliminate}</div>
              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Eliminate</div>
            </div>
          </div>
        )}

        {/* FILTRO STATO */}
        {!loading && (
          <div className="flex gap-2">
            {FILTRO_STATO_OPTIONS.map((opt) => (
              <button
                key={opt.mode}
                type="button"
                onClick={() => setFiltroStato(opt.mode)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  filtroStato === opt.mode
                    ? 'bg-trenord-green text-white border-trenord-green'
                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-trenord-green hover:text-trenord-green'
                }`}
              >
                {opt.label}
                {opt.mode === 'attive' && (
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${filtroStato === 'attive' ? 'bg-white/20' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'}`}>
                    {conteggioAttive}
                  </span>
                )}
                {opt.mode === 'eliminate' && (
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${filtroStato === 'eliminate' ? 'bg-white/20' : 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400'}`}>
                    {conteggioEliminate}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="text-sm text-gray-500">Caricamento...</div>
        )}

        {/* EMPTY */}
        {!loading && filtered.length === 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 text-center text-sm text-gray-400">
            {search
              ? `Nessun elemento trovato per "${search}"`
              : filtroStato === 'eliminate' ? 'Nessuna saletta eliminata'
              : filtroStato === 'attive' ? 'Nessuna saletta attiva'
              : 'Nessun elemento presente.'}
          </div>
        )}

        {/* LIST */}
        <div className="flex flex-col gap-4">
          {filtered.map((s) => {
            const isSaving = savingId === s.id;
            const sezione = getSezione(s.tipo);
            const mostra = (campo: string) => (sezione.campi as readonly string[]).includes(campo);
            const isDeleted = !!s.deleted_at;

            // Card compatta di sola lettura per le salette eliminate: niente
            // form di modifica, solo il necessario per identificarla e
            // ripristinarla. Vedi conversazione.
            if (isDeleted) {
              return (
                <div
                  key={s.id}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-red-100 dark:border-red-900 p-4 shadow-sm flex items-start gap-3 opacity-70"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {s.stazione} — {sezione.label}{s.etichetta ? ` (${s.etichetta})` : ''}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                        🔴 Eliminata
                      </span>
                    </div>
                    {s.deleted_at && (
                      <p className="text-xs text-red-400 mt-1">Eliminata il {formatDeletedAt(s.deleted_at)}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => richiediRipristina(s)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:opacity-90"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Ripristina
                    </button>
                    <button
                      type="button"
                      onClick={() => richiediHardDelete(s)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 dark:border-red-900 text-red-600 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 className="w-4 h-4" />
                      Elimina definitivamente
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={s.id}
                className={`bg-white dark:bg-gray-900 rounded-2xl border p-4 shadow-sm flex flex-col gap-4 ${
                  (s.attiva ?? true) ? 'border-gray-100 dark:border-gray-800' : 'border-gray-200 dark:border-gray-700 opacity-60'
                }`}
              >

                <div className="flex items-center justify-between">
                  <div className="w-full">
                    <label className="text-xs font-semibold text-gray-400 uppercase">Stazione</label>
                    <select
                      value={s.stazione_id ?? ''}
                      onChange={(e) => updateField(s.id, 'stazione_id', e.target.value)}
                      className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      {!s.stazione_id && (
                        <option value="">{s.stazione || 'Seleziona stazione'}</option>
                      )}
                      {stazioni.map((st) => (
                        <option key={st.id} value={st.id}>{st.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <span
                  className={`self-start text-xs font-medium px-2 py-1 rounded-full ${
                    (s.attiva ?? true) ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {(s.attiva ?? true) ? '🟢 Attiva' : '⚫ Disattivata'}
                </span>

                {/* SEZIONE */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Sezione</label>
                  <select
                    value={s.tipo}
                    onChange={(e) => updateField(s.id, 'tipo', e.target.value)}
                    className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    {SEZIONI_LOCALITA.filter((sez) => sez.attiva).sort((a, b) => a.ordine - b.ordine).map((sez) => (
                      <option key={sez.id} value={sez.id}>{sez.label}</option>
                    ))}
                    {/* Valore attuale se non corrisponde a nessuna delle 7 sezioni
                        (dato legacy non ancora rimappato) — evita di perderlo silenziosamente. */}
                    {!SEZIONI_LOCALITA.some((sez) => sez.id === s.tipo) && (
                      <option value={s.tipo}>{s.tipo} (valore non standard)</option>
                    )}
                  </select>
                </div>

                {/* ETICHETTA */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">
                    Etichetta <span className="normal-case font-normal text-gray-400">(facoltativa, per distinguere più elementi della stessa sezione)</span>
                  </label>
                  <input
                    value={s.etichetta ?? ''}
                    onChange={(e) => updateField(s.id, 'etichetta', e.target.value || null)}
                    placeholder="Es. Trenord, Trenitalia, Accesso saletta..."
                    className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>

                {/* CODICE */}
                {mostra('codice') && (
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase">Codice accesso</label>
                    <input
                      value={s.codice_accesso ?? ''}
                      onChange={(e) => updateField(s.id, 'codice_accesso', e.target.value || null)}
                      className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                )}

                {/* UBICAZIONE */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Ubicazione</label>
                  <input
                    value={s.ubicazione ?? ''}
                    onChange={(e) => updateField(s.id, 'ubicazione', e.target.value || null)}
                    className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>

                {/* STATO */}
                {mostra('stato') && sezione.stati.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase">Stato</label>
                    <select
                      value={s.stato ?? sezione.stati[0]}
                      onChange={(e) => updateField(s.id, 'stato', e.target.value)}
                      className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      {sezione.stati.map((st) => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                )}

                {/* MODALITA ACCESSO — bagni */}
                {mostra('modalita_accesso') && (
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase">Modalità di accesso</label>
                    <select
                      value={s.modalita_accesso ?? MODALITA_ACCESSO[0]}
                      onChange={(e) => updateField(s.id, 'modalita_accesso', e.target.value)}
                      className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      {MODALITA_ACCESSO.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                )}

                {/* TIPOLOGIA ACCESSO — cancelletto */}
                {mostra('tipologia_accesso') && (
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase">Tipologia di accesso</label>
                    <select
                      value={s.tipologia_accesso ?? TIPOLOGIA_ACCESSO[0]}
                      onChange={(e) => updateField(s.id, 'tipologia_accesso', e.target.value)}
                      className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      {TIPOLOGIA_ACCESSO.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                )}

                {/* SERVIZI — equipaggi */}
                {mostra('servizi') && (
                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-semibold text-gray-400 uppercase">Servizi</label>
                    <ServiceToggle active={s.microonde ?? false} onClick={() => updateField(s.id, 'microonde', !s.microonde)} icon={<Microwave className="w-5 h-5" />} label="Microonde" />
                    <ServiceToggle active={s.distributori ?? false} onClick={() => updateField(s.id, 'distributori', !s.distributori)} icon={<Coffee className="w-5 h-5" />} label="Distributori" />
                    <ServiceToggle active={s.acqua ?? false} onClick={() => updateField(s.id, 'acqua', !s.acqua)} icon={<Droplets className="w-5 h-5" />} label="Acqua" />
                    <ServiceToggle active={s.climatizzata ?? false} onClick={() => updateField(s.id, 'climatizzata', !s.climatizzata)} icon={<Snowflake className="w-5 h-5" />} label="Climatizzata" />
                  </div>
                )}

                {/* DOCCE — spogliatoi */}
                {mostra('docce') && (
                  <ServiceToggle active={s.docce ?? false} onClick={() => updateField(s.id, 'docce', !s.docce)}
                    icon={<Droplets className="w-5 h-5" />} label="Docce disponibili" />
                )}

                {/* ARMADIETTI — spogliatoi */}
                {mostra('armadietti') && (
                  <ServiceToggle active={s.armadietti ?? false} onClick={() => updateField(s.id, 'armadietti', !s.armadietti)}
                    icon={<Shirt className="w-5 h-5" />} label="Armadietti disponibili" />
                )}

                {/* FASCE ORARIE — segreteria e versamenti */}
                {mostra('fasce_orarie') && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-gray-400 uppercase">Orari di apertura</label>
                      <button type="button" onClick={() => addFascia(s.id)} className="text-sm text-trenord-green font-medium">
                        + Aggiungi fascia
                      </button>
                    </div>
                    {(s.fasce_orarie ?? []).map((fascia, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-2xl p-3 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Fascia {index + 1}</span>
                          <button type="button" onClick={() => removeFascia(s.id, index)} className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {GIORNI_SETTIMANA.map((giorno) => (
                            <button key={giorno} type="button" onClick={() => toggleGiorno(s.id, index, giorno)}
                              className={`rounded-lg py-1.5 text-xs font-medium border transition-colors ${
                                fascia.giorni.includes(giorno) ? 'bg-trenord-green text-white border-trenord-green' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                              }`}>
                              {giorno}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">Apertura</label>
                            <input type="time" value={fascia.apertura}
                              onChange={(e) => updateFascia(s.id, index, 'apertura', e.target.value)}
                              className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 w-full text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">Chiusura</label>
                            <input type="time" value={fascia.chiusura}
                              onChange={(e) => updateFascia(s.id, index, 'chiusura', e.target.value)}
                              className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 w-full text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* NOTE */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Note</label>
                  <textarea
                    value={s.note ?? ''}
                    onChange={(e) => updateField(s.id, 'note', e.target.value || null)}
                    className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-base min-h-[80px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => saveSaletta(s)}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-trenord-green text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {isSaving
                      ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      : <Save className="w-4 h-4" />}
                    {isSaving ? 'Salvataggio...' : 'Salva'}
                  </button>

                  <button
                    onClick={() => richiediToggle(s)}
                    disabled={isSaving}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 ${
                      (s.attiva ?? true) ? 'bg-gray-700 text-white' : 'bg-trenord-green text-white'
                    }`}
                  >
                    {(s.attiva ?? true) ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    {(s.attiva ?? true) ? 'Disattiva' : 'Attiva'}
                  </button>

                  <button
                    onClick={() => richiediElimina(s)}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Elimina
                  </button>
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {showAdd && (
        <AddSalettaModal
          adminPin={adminPin}
          stazioni={stazioni}
          onClose={() => setShowAdd(false)}
          onAdded={(s) => setSalette((prev) => [s, ...prev])}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          message={`Eliminare "${confirmDelete.nome}"? Verrà nascosta agli utenti ma potrà essere ripristinata dalla sezione "Eliminate".`}
          onConfirm={confermaElimina}
          onCancel={() => setConfirmDelete(null)}
          loading={confirmDelete.loading}
        />
      )}

      {confirmRipristina && (
        <ConfirmModal
          message={`Ripristinare "${confirmRipristina.nome}"? Tornerà visibile agli utenti.`}
          onConfirm={confermaRipristina}
          onCancel={() => setConfirmRipristina(null)}
          loading={confirmRipristina.loading}
          confirmLabel="Ripristina"
          loadingLabel="Ripristino..."
          variant="primary"
        />
      )}

      {confirmHardDelete && (
        <ConfirmHardDeleteModal
          nome={confirmHardDelete.nome}
          entityLabel="la saletta"
          onConfirm={confermaHardDelete}
          onCancel={() => setConfirmHardDelete(null)}
          loading={confirmHardDelete.loading}
        />
      )}

      {confirmToggle && (
        <ConfirmModal
          message={
            confirmToggle.nuovoStato
              ? `Attivare "${confirmToggle.nome}"? Tornerà visibile agli utenti.`
              : `Disattivare "${confirmToggle.nome}"? Non sarà più visibile agli utenti né nelle ricerche.`
          }
          onConfirm={confermaToggle}
          onCancel={() => setConfirmToggle(null)}
          loading={confirmToggle.loading}
          confirmLabel={confirmToggle.nuovoStato ? 'Attiva' : 'Disattiva'}
          loadingLabel={confirmToggle.nuovoStato ? 'Attivazione...' : 'Disattivazione...'}
          variant={confirmToggle.nuovoStato ? 'primary' : 'danger'}
        />
      )}
    </>
  );
}
