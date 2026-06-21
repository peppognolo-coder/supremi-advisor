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
} from 'lucide-react';

import toast from 'react-hot-toast';

import { formatTitle } from '../lib/format';

import {
  type Saletta,
  getSalette,
  addSaletta,
  updateSaletta,
  deleteSaletta,
} from '../lib/adminApi';

// =========================
// PROPS
// =========================

interface Props {
  adminPin: string;
  initialFiltroQualita?: string;
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
  onClose,
  onAdded,
}: {
  adminPin: string;
  onClose: () => void;
  onAdded: (s: Saletta) => void;
}) {
  const [stazione, setStazione] = useState('');
  const [tipo, setTipo] = useState('Equipaggi');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!stazione.trim()) {
      toast.error('Inserisci il nome della stazione');
      return;
    }

    setLoading(true);
    const res = await addSaletta(adminPin, { stazione: stazione.trim(), tipo });
    setLoading(false);

    if (!res.ok || !res.data) {
      toast.error(res.error?.message ?? "Errore durante l'aggiunta");
      return;
    }

    toast.success('Saletta aggiunta');
    onAdded(res.data);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4">

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Nuova saletta</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-400 uppercase">
            Stazione *
          </label>
          <input
            value={stazione}
            onChange={(e) => setStazione(e.target.value)}
            placeholder="es. Milano Centrale"
            className="border border-gray-200 rounded-xl px-3 py-2 text-base"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-400 uppercase">
            Tipo
          </label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-base"
          >
            <option>Equipaggi</option>
            <option>Macchinisti</option>
            <option>Capitreno</option>
            <option>DM</option>
            <option>Personale</option>
          </select>
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-trenord-green text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading && (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          )}
          {loading ? 'Aggiunta...' : 'Aggiungi saletta'}
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
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {loading ? 'Eliminazione...' : 'Elimina'}
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
  const [search, setSearch]     = useState('');
  const [showAdd, setShowAdd]   = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filtroQualita, setFiltroQualita] = useState<string>(initialFiltroQualita);
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    nome: string;
    loading: boolean;
  } | null>(null);

  // =========================
  // LOAD
  // =========================

  async function load() {
    setLoading(true);
    const res = await getSalette(adminPin);

    if (!res.ok) {
      toast.error(res.error?.message ?? 'Errore caricamento salette');
      setLoading(false);
      return;
    }

    setSalette(res.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // =========================
  // SEARCH
  // =========================

  const filtered = salette.filter((s) => {
    // Filtro qualità (proveniente dalla dashboard)
    if (filtroQualita === '__no_ubicazione__' && s.ubicazione?.trim()) return false;
    if (filtroQualita === '__no_codice__' && s.codice_accesso?.trim())  return false;

    // Ricerca testuale
    const q = search.trim().toLowerCase();
    return (
      !q ||
      s.stazione?.toLowerCase().includes(q) ||
      s.tipo?.toLowerCase().includes(q)
    );
  });

  // =========================
  // UPDATE FIELD LOCALE
  // =========================

  function updateField(id: string, field: keyof Saletta, value: unknown) {
    setSalette((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  }

  // =========================
  // SAVE
  // =========================

  async function saveSaletta(saletta: Saletta) {
    setSavingId(saletta.id);

    const res = await updateSaletta(adminPin, {
      id:             saletta.id,
      stazione:       saletta.stazione,
      tipo:           saletta.tipo,
      codice_accesso: saletta.codice_accesso,
      ubicazione:     saletta.ubicazione,
      note:           saletta.note,
      microonde:      saletta.microonde,
      distributori:   saletta.distributori,
      acqua:          saletta.acqua,
      climatizzata:   saletta.climatizzata,
    });

    setSavingId(null);

    if (!res.ok) {
      toast.error(res.error?.message ?? 'Errore salvataggio');
      return;
    }

    toast.success('Saletta aggiornata');
  }

  // =========================
  // DELETE
  // =========================

  function richiediElimina(s: Saletta) {
    setConfirmDelete({ id: s.id, nome: `${s.stazione} — ${s.tipo}`, loading: false });
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

    toast.success('Saletta eliminata');
    setConfirmDelete(null);
    setSalette((prev) => prev.filter((s) => s.id !== confirmDelete.id));
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
            <h1 className="text-2xl font-bold text-gray-900">
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
            placeholder="Cerca stazione o tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-9 py-2.5 text-base"
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

        {/* LOADING */}
        {loading && (
          <div className="text-sm text-gray-500">Caricamento...</div>
        )}

        {/* EMPTY */}
        {!loading && filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">
            {search
              ? `Nessuna saletta trovata per "${search}"`
              : 'Nessuna saletta presente.'}
          </div>
        )}

        {/* LIST */}
        <div className="flex flex-col gap-4">
          {filtered.map((s) => {
            const isSaving = savingId === s.id;
            return (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col gap-4"
              >

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Stazione</label>
                  <input
                    value={s.stazione ?? ''}
                    onChange={(e) => updateField(s.id, 'stazione', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-base"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Tipo</label>
                  <input
                    value={formatTitle(s.tipo ?? '')}
                    onChange={(e) => updateField(s.id, 'tipo', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-base"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Codice accesso</label>
                  <input
                    value={s.codice_accesso ?? ''}
                    onChange={(e) => updateField(s.id, 'codice_accesso', e.target.value || null)}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-base"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Ubicazione</label>
                  <input
                    value={s.ubicazione ?? ''}
                    onChange={(e) => updateField(s.id, 'ubicazione', e.target.value || null)}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-base"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Note</label>
                  <textarea
                    value={s.note ?? ''}
                    onChange={(e) => updateField(s.id, 'note', e.target.value || null)}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-base min-h-[80px]"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase">Servizi</label>
                  <ServiceToggle active={s.microonde ?? false} onClick={() => updateField(s.id, 'microonde', !s.microonde)} icon={<Microwave className="w-5 h-5" />} label="Microonde" />
                  <ServiceToggle active={s.distributori ?? false} onClick={() => updateField(s.id, 'distributori', !s.distributori)} icon={<Coffee className="w-5 h-5" />} label="Distributori" />
                  <ServiceToggle active={s.acqua ?? false} onClick={() => updateField(s.id, 'acqua', !s.acqua)} icon={<Droplets className="w-5 h-5" />} label="Acqua" />
                  <ServiceToggle active={s.climatizzata ?? false} onClick={() => updateField(s.id, 'climatizzata', !s.climatizzata)} icon={<Snowflake className="w-5 h-5" />} label="Climatizzata" />
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
          onClose={() => setShowAdd(false)}
          onAdded={(s) => setSalette((prev) => [s, ...prev])}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          message={`Eliminare la saletta "${confirmDelete.nome}"? L'operazione è irreversibile.`}
          onConfirm={confermaElimina}
          onCancel={() => setConfirmDelete(null)}
          loading={confirmDelete.loading}
        />
      )}
    </>
  );
}
