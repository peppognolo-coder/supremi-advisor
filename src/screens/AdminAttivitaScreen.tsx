import {
  useEffect,
  useState,
} from 'react';

import {
  RotateCcw,
  Trash2,
  Store,
  Pencil,
  X,
} from 'lucide-react';

import toast from 'react-hot-toast';

import {
  type AttivitaRow,
  type FasciaOraria,
  type StazioneRow,
  getAttivita,
  softDeleteAttivita,
  ripristinaAttivita,
  updateAttivita,
  CATEGORIE_ATTIVITA,
  DISTANZE_ATTIVITA,
} from '../lib/adminApi';

// =========================
// PROPS
// =========================

interface Props {
  adminPin: string;
  initialEditId?: string;
}

// =========================
// TIPI
// =========================

type FiltroMode = 'tutte' | 'attive' | 'eliminate';

// =========================
// COSTANTI
// =========================

const FILTRO_OPTIONS: { mode: FiltroMode; label: string }[] = [
  { mode: 'tutte',     label: 'Tutte' },
  { mode: 'attive',    label: 'Attive' },
  { mode: 'eliminate', label: 'Eliminate' },
];

const GIORNI_SETTIMANA = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

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
          <button onClick={onCancel} disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Annulla
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
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

export default function AdminAttivitaScreen({ adminPin, initialEditId }: Props) {

  const [loading, setLoading]       = useState(true);
  const [attivita, setAttivita]     = useState<AttivitaRow[]>([]);
  const [stazioni, setStazioni]     = useState<StazioneRow[]>([]);
  const [filtro, setFiltro]         = useState<FiltroMode>('attive');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingAttivita, setEditingAttivita] = useState<AttivitaRow | null>(null);
  const [saving, setSaving]         = useState(false);

  // Confirm modal
  const [confirm, setConfirm] = useState<{
    message: string;
    onConfirm: () => void;
    loading: boolean;
  } | null>(null);

  // =========================
  // LOAD
  // =========================

  async function load() {
    setLoading(true);
    const res = await getAttivita(adminPin);
    if (!res.ok) {
      toast.error(res.error?.message ?? 'Errore caricamento');
      setLoading(false);
      return;
    }
    setAttivita(res.data?.attivita ?? []);
    setStazioni(res.data?.stazioni ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Apri modal modifica se initialEditId passato da AdminScreen
  useEffect(() => {
    if (initialEditId && attivita.length > 0) {
      const found = attivita.find((a) => a.id === initialEditId);
      if (found) apriModifica(found);
    }
  }, [initialEditId, attivita]);

  // ESC chiude modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && editingAttivita) setEditingAttivita(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingAttivita]);

  // =========================
  // SOFT DELETE
  // =========================

  function richiediSoftDelete(a: AttivitaRow) {
    setConfirm({
      message: `Eliminare "${a.nome}"? L'attività verrà nascosta ma potrà essere ripristinata.`,
      loading: false,
      onConfirm: async () => {
        setConfirm((prev) => prev ? { ...prev, loading: true } : null);
        setProcessingId(a.id);
        const res = await softDeleteAttivita(adminPin, a.id);
        setProcessingId(null);
        setConfirm(null);
        if (!res.ok) { toast.error(res.error?.message ?? 'Errore'); return; }
        toast.success('Attività eliminata');
        setAttivita((prev) => prev.map((item) =>
          item.id === a.id ? { ...item, is_active: false, deleted_at: new Date().toISOString() } : item
        ));
      },
    });
  }

  // =========================
  // RIPRISTINA
  // =========================

  function richiediRipristina(a: AttivitaRow) {
    setConfirm({
      message: `Ripristinare "${a.nome}"? L'attività tornerà visibile agli utenti.`,
      loading: false,
      onConfirm: async () => {
        setConfirm((prev) => prev ? { ...prev, loading: true } : null);
        setProcessingId(a.id);
        const res = await ripristinaAttivita(adminPin, a.id);
        setProcessingId(null);
        setConfirm(null);
        if (!res.ok) { toast.error(res.error?.message ?? 'Errore'); return; }
        toast.success('Attività ripristinata');
        setAttivita((prev) => prev.map((item) =>
          item.id === a.id ? { ...item, is_active: true, deleted_at: null } : item
        ));
      },
    });
  }

  // =========================
  // APRI MODAL MODIFICA
  // =========================

  function apriModifica(a: AttivitaRow) {
    setEditingAttivita({
      ...a,
      fasce_orarie: Array.isArray(a.fasce_orarie)
        ? a.fasce_orarie.map((f) => ({ ...f, giorni: Array.isArray(f.giorni) ? [...f.giorni] : [] }))
        : [],
    });
  }

  // =========================
  // FASCE ORARIE — HELPERS
  // =========================

  function updateFascia(index: number, field: string, value: unknown) {
    if (!editingAttivita) return;
    const nuove = [...(editingAttivita.fasce_orarie ?? [])];
    nuove[index] = { ...nuove[index], [field]: value };
    setEditingAttivita({ ...editingAttivita, fasce_orarie: nuove });
  }

  function toggleGiorno(fasciaIndex: number, giorno: string) {
    if (!editingAttivita) return;
    const fascia = editingAttivita.fasce_orarie?.[fasciaIndex];
    if (!fascia) return;
    const giorni = Array.isArray(fascia.giorni) ? fascia.giorni : [];
    const nuovi = giorni.includes(giorno) ? giorni.filter((g) => g !== giorno) : [...giorni, giorno];
    updateFascia(fasciaIndex, 'giorni', nuovi);
  }

  function addFascia() {
    if (!editingAttivita) return;
    setEditingAttivita({
      ...editingAttivita,
      fasce_orarie: [...(editingAttivita.fasce_orarie ?? []), { giorni: [], apertura: '', chiusura: '' }],
    });
  }

  function removeFascia(index: number) {
    if (!editingAttivita) return;
    setEditingAttivita({
      ...editingAttivita,
      fasce_orarie: (editingAttivita.fasce_orarie ?? []).filter((_, i) => i !== index),
    });
  }

  // =========================
  // SALVA MODIFICA
  // =========================

  async function salvaModifica() {
    if (!editingAttivita) return;

    if (!editingAttivita.nome?.trim()) { toast.error('Inserisci il nome'); return; }
    if (!editingAttivita.categoria?.trim()) { toast.error('Inserisci la categoria'); return; }

    setSaving(true);
   const res = await updateAttivita(adminPin, {
  id: editingAttivita.id,
  nome: editingAttivita.nome.trim(),
  categoria: editingAttivita.categoria,
  indirizzo: editingAttivita.indirizzo,
  ubicazione: editingAttivita.ubicazione,
  maps_query: editingAttivita.maps_query,
  distanza_piedi: editingAttivita.distanza_piedi,
  convenzionato: editingAttivita.convenzionato,
  note: editingAttivita.note,
  fasce_orarie: (editingAttivita.fasce_orarie ?? []) as FasciaOraria[],
  dati_extra: editingAttivita.dati_extra ?? null,
});
    setSaving(false);

    if (!res.ok) { toast.error(res.error?.message ?? 'Errore salvataggio'); return; }

    toast.success('Modifiche salvate');
    setAttivita((prev) => prev.map((item) => item.id === editingAttivita.id ? { ...item, ...res.data } : item));
    setEditingAttivita(null);
  }

  // =========================
  // HELPERS
  // =========================

  function getNomeStazione(stazioneId: string): string {
    return stazioni.find((s) => s.id === stazioneId)?.nome ?? stazioneId;
  }

  function formatDeletedAt(deleted_at: string | null): string {
    if (!deleted_at) return '';
    return new Date(deleted_at).toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  // =========================
  // COMPUTED
  // =========================

  const attivitaFiltrate = attivita.filter((a) => {
    if (filtro === 'attive')    return a.is_active === true;
    if (filtro === 'eliminate') return a.is_active === false;
    return true;
  });

  const conteggioAttive    = attivita.filter((a) => a.is_active === true).length;
  const conteggioEliminate = attivita.filter((a) => a.is_active === false).length;

  // =========================
  // UI
  // =========================

  return (
    <>
      <div className="flex flex-col gap-4">

        {/* TITLE */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestione Attività</h1>
          <p className="text-sm text-gray-500 mt-1">Visualizza e gestisci le attività delle stazioni</p>
        </div>

        {loading && <div className="text-sm text-gray-500">Caricamento...</div>}

        {/* CONTATORI */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm text-center">
              <div className="text-2xl font-bold text-gray-900">{attivita.length}</div>
              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Totali</div>
            </div>
            <div className="bg-white rounded-2xl border border-emerald-100 p-3 shadow-sm text-center">
              <div className="text-2xl font-bold text-emerald-600">{conteggioAttive}</div>
              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Attive</div>
            </div>
            <div className="bg-white rounded-2xl border border-red-100 p-3 shadow-sm text-center">
              <div className="text-2xl font-bold text-red-500">{conteggioEliminate}</div>
              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Eliminate</div>
            </div>
          </div>
        )}

        {/* FILTRI */}
        {!loading && (
          <div className="flex gap-2">
            {FILTRO_OPTIONS.map((opt) => (
              <button key={opt.mode} type="button" onClick={() => setFiltro(opt.mode)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  filtro === opt.mode
                    ? 'bg-trenord-green text-white border-trenord-green'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-trenord-green hover:text-trenord-green'
                }`}>
                {opt.label}
                {opt.mode === 'attive' && (
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${filtro === 'attive' ? 'bg-white/20' : 'bg-emerald-100 text-emerald-700'}`}>
                    {conteggioAttive}
                  </span>
                )}
                {opt.mode === 'eliminate' && (
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${filtro === 'eliminate' ? 'bg-white/20' : 'bg-red-100 text-red-600'}`}>
                    {conteggioEliminate}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* EMPTY */}
        {!loading && attivitaFiltrate.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-gray-500 text-center">
            {filtro === 'eliminate' ? 'Nessuna attività eliminata'
              : filtro === 'attive' ? 'Nessuna attività attiva'
              : 'Nessuna attività presente'}
          </div>
        )}

        {/* LIST */}
        {!loading && (
          <div className="flex flex-col gap-3">
            {attivitaFiltrate.map((a) => {
              const isActive     = a.is_active === true;
              const isProcessing = processingId === a.id;

              return (
                <div key={a.id}
                  className={`bg-white rounded-2xl border p-4 shadow-sm flex flex-col gap-3 transition-opacity ${isActive ? 'border-gray-100' : 'border-red-100 opacity-70'}`}>

                  {/* TOP */}
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center ${isActive ? 'bg-trenord-green/10' : 'bg-red-50'}`}>
                      <Store className={`w-5 h-5 ${isActive ? 'text-trenord-green' : 'text-red-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{a.nome}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                          {isActive ? '🟢 Attiva' : '🔴 Eliminata'}
                        </span>
                        {a.convenzionato && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-trenord-green/10 text-trenord-green">Convenzionato</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{getNomeStazione(a.stazione_id)}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-gray-400">{a.categoria}</span>
                        {a.distanza_piedi && <span className="text-xs text-gray-400">🚶 {a.distanza_piedi}</span>}
                      </div>
                      {!isActive && a.deleted_at && (
                        <p className="text-xs text-red-400 mt-1">Eliminata il {formatDeletedAt(a.deleted_at)}</p>
                      )}
                      {a.note && <p className="text-xs text-gray-400 italic mt-1">{a.note}</p>}
                    </div>
                  </div>

                  {/* AZIONI */}
                  <div className="flex gap-2 flex-wrap">
                    {isActive ? (
                      <>
                        <button type="button" onClick={() => apriModifica(a)} disabled={isProcessing}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                          <Pencil className="w-4 h-4" /> Modifica
                        </button>
                        <button type="button" onClick={() => richiediSoftDelete(a)} disabled={isProcessing}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                          {isProcessing ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          {isProcessing ? 'Attendere...' : 'Elimina'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => richiediRipristina(a)} disabled={isProcessing}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                          {isProcessing ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                          {isProcessing ? 'Attendere...' : 'Ripristina'}
                        </button>
                        <button type="button" onClick={() => apriModifica(a)} disabled={isProcessing}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                          <Pencil className="w-4 h-4" /> Modifica
                        </button>
                      </>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL MODIFICA */}
      {editingAttivita && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingAttivita(null); }}>
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 pb-24 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Modifica attività</h2>
              <button type="button" onClick={() => setEditingAttivita(null)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* STAZIONE (sola lettura) */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Stazione</label>
              <input value={getNomeStazione(editingAttivita.stazione_id)} disabled
                className="border rounded-xl px-3 py-2 bg-gray-100 text-gray-500 text-base" />
            </div>

            {/* NOME */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Nome *</label>
              <input value={editingAttivita.nome}
                onChange={(e) => setEditingAttivita({ ...editingAttivita, nome: e.target.value })}
                className="border rounded-xl px-3 py-2 text-base" />
            </div>

            {/* CATEGORIA */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Categoria *</label>
              <select value={editingAttivita.categoria || ''}
                onChange={(e) => setEditingAttivita({ ...editingAttivita, categoria: e.target.value })}
                className="border rounded-xl px-3 py-2 text-base">
                <option value="">Seleziona categoria</option>
               {CATEGORIE_ATTIVITA.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {editingAttivita.categoria === 'Hotel' && (
  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col gap-3">

    <h3 className="font-semibold text-blue-700">
      Informazioni Hotel
    </h3>

    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500">Telefono</label>
      <input
        value={editingAttivita.dati_extra?.telefono || ''}
        onChange={(e) =>
          setEditingAttivita({
            ...editingAttivita,
            dati_extra: {
  ...(editingAttivita.dati_extra ?? {}),
  telefono: e.target.value,
},
          })
        }
        className="border rounded-xl px-3 py-2 text-base"
      />
    </div>

    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={Boolean(editingAttivita.dati_extra?.reception_h24)}
        onChange={(e) =>
          setEditingAttivita({
            ...editingAttivita,
            dati_extra: {
  ...(editingAttivita.dati_extra ?? {}),
  reception_h24: e.target.checked,
},
          })
        }
      />
      Reception H24
    </label>

    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={Boolean(editingAttivita.dati_extra?.colazione)}
        onChange={(e) =>
          setEditingAttivita({
            ...editingAttivita,
            dati_extra: {
             ...(editingAttivita.dati_extra ?? {}),
              colazione: e.target.checked,
            },
          })
        }
      />
      Colazione disponibile
    </label>

    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={Boolean(editingAttivita.dati_extra?.wifi)}
        onChange={(e) =>
          setEditingAttivita({
            ...editingAttivita,
            dati_extra: {
              ...(editingAttivita.dati_extra ?? {}),
              wifi: e.target.checked,
            },
          })
        }
      />
      WiFi disponibile
    </label>

    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={Boolean(editingAttivita.dati_extra?.navetta)}
        onChange={(e) =>
          setEditingAttivita({
            ...editingAttivita,
            dati_extra: {
             ...(editingAttivita.dati_extra ?? {}),
              navetta: e.target.checked,
            },
          })
        }
      />
      Navetta disponibile
    </label>

    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={Boolean(editingAttivita.dati_extra?.ristorante)}
        onChange={(e) =>
          setEditingAttivita({
            ...editingAttivita,
            dati_extra: {
             ...(editingAttivita.dati_extra ?? {}),
              ristorante: e.target.checked,
            },
          })
        }
      />
      Ristorante interno
    </label>

    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500">
        Note equipaggi
      </label>
      <textarea
        rows={3}
        value={editingAttivita.dati_extra?.note_equipaggi || ''}
        onChange={(e) =>
          setEditingAttivita({
            ...editingAttivita,
            dati_extra: {
             ...(editingAttivita.dati_extra ?? {}),
              note_equipaggi: e.target.value,
            },
          })
        }
        className="border rounded-xl px-3 py-2 resize-none text-base"
      />
    </div>

  </div>
)}
            
            {/* INDIRIZZO */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Indirizzo</label>
              <input value={editingAttivita.indirizzo || ''}
                onChange={(e) => setEditingAttivita({ ...editingAttivita, indirizzo: e.target.value })}
                className="border rounded-xl px-3 py-2 text-base" />
            </div>

            {/* UBICAZIONE */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Ubicazione</label>
              <input value={editingAttivita.ubicazione || ''}
                onChange={(e) => setEditingAttivita({ ...editingAttivita, ubicazione: e.target.value })}
                className="border rounded-xl px-3 py-2 text-base" />
            </div>

            {/* MAPS QUERY */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Maps Query</label>
              <input value={editingAttivita.maps_query || ''}
                onChange={(e) => setEditingAttivita({ ...editingAttivita, maps_query: e.target.value })}
                className="border rounded-xl px-3 py-2 text-base" />
            </div>

            {/* DISTANZA */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Distanza a piedi</label>
              <select value={editingAttivita.distanza_piedi || ''}
                onChange={(e) => setEditingAttivita({ ...editingAttivita, distanza_piedi: e.target.value || null })}
                className="border rounded-xl px-3 py-2 text-base">
                <option value="">Non specificata</option>
               {DISTANZE_ATTIVITA.map((d) => (
  <option key={d} value={d}>{d}</option>
))}
              </select>
            </div>

            {/* CONVENZIONATO */}
            <div className="flex items-center gap-3">
              <input type="checkbox" id="convenzionato-edit"
                checked={Boolean(editingAttivita.convenzionato)}
                onChange={(e) => setEditingAttivita({ ...editingAttivita, convenzionato: e.target.checked })}
                className="w-4 h-4 text-base" />
              <label htmlFor="convenzionato-edit" className="font-medium text-sm cursor-pointer">
                Convenzionato Trenord
              </label>
            </div>

          {/* FASCE ORARIE (solo NON Hotel) */}
{editingAttivita.categoria !== 'Hotel' && (
  <div className="flex flex-col gap-4">
    <div className="flex items-center justify-between">
      <h3 className="font-semibold">Fasce orarie</h3>

      <button
        type="button"
        onClick={addFascia}
        className="text-sm text-trenord-green font-medium"
      >
        + Aggiungi fascia
      </button>
    </div>

    {(editingAttivita.fasce_orarie ?? []).map((fascia, index) => {
      const giorni = Array.isArray(fascia.giorni)
        ? fascia.giorni
        : [];

      return (
        <div
          key={index}
          className="border rounded-2xl p-4 flex flex-col gap-4"
        >
          <div className="flex items-center justify-between">
            <div className="font-medium text-sm">
              Fascia {index + 1}
            </div>

            {(editingAttivita.fasce_orarie?.length ?? 0) > 1 && (
              <button
                type="button"
                onClick={() => removeFascia(index)}
                className="text-red-600 text-sm"
              >
                Elimina
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {GIORNI_SETTIMANA.map((giorno) => (
              <button
                key={giorno}
                type="button"
                onClick={() => toggleGiorno(index, giorno)}
                className={`rounded-xl border py-2 text-sm ${
                  giorni.includes(giorno)
                    ? 'bg-trenord-green text-white border-trenord-green'
                    : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                {giorno}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">
                Apertura
              </label>

              <input
                type="time"
                value={fascia.apertura || ''}
                onChange={(e) =>
                  updateFascia(index, 'apertura', e.target.value)
                }
                className="border rounded-xl px-3 py-2 text-base"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">
                Chiusura
              </label>

              <input
                type="time"
                value={fascia.chiusura || ''}
                onChange={(e) =>
                  updateFascia(index, 'chiusura', e.target.value)
                }
                className="border rounded-xl px-3 py-2 text-base"
              />
            </div>
          </div>
        </div>
      );
    })}

    {(editingAttivita.fasce_orarie?.length ?? 0) === 0 && (
      <p className="text-sm text-gray-400 text-center py-2">
        Nessuna fascia. Clicca "+ Aggiungi fascia" per aggiungerne una.
      </p>
    )}
  </div>
)}

           {/* NOTE (solo NON Hotel) */}
{editingAttivita.categoria !== 'Hotel' && (
  <div className="flex flex-col gap-1">
    <label className="text-xs text-gray-500">
      Note
    </label>

    <textarea
      value={editingAttivita.note || ''}
      onChange={(e) =>
        setEditingAttivita({
          ...editingAttivita,
          note: e.target.value || null,
        })
      }
      rows={3}
      className="border rounded-xl px-3 py-2 resize-none text-base"
      placeholder="Note aggiuntive..."
    />
  </div>
)}

            {/* SALVA */}
            <button type="button" onClick={salvaModifica} disabled={saving}
              className="bg-blue-600 text-white rounded-xl py-3 font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90">
              {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
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
