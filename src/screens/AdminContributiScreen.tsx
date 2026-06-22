import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Check,
  X,
  Clock3,
  FileJson,
  Microwave,
  Coffee,
  Droplets,
  Snowflake,
} from 'lucide-react';

import toast from 'react-hot-toast';

import {
  type Contributo,
  type StazioneRow,
  getContributi,
  updateContributoDati,
  approveContributo,
  rejectContributo,
  CATEGORIE_ATTIVITA,   // FIX P2: import da adminApi invece di array locale
  DISTANZE_ATTIVITA,    // FIX P2: import da adminApi invece di array locale
} from '../lib/adminApi';

// =========================
// PROPS
// =========================

interface Props {
  adminPin: string;
}

// =========================
// COSTANTI
// =========================

// FIX P2: CATEGORIE e DISTANZE rimosse — ora importate da adminApi come
// CATEGORIE_ATTIVITA e DISTANZE_ATTIVITA (sorgente di verità unica)

const GIORNI_SETTIMANA = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const TIPI_SALETTA    = ['Equipaggi', 'Bagni', 'Cancelletto', 'Trenitalia', 'Sala Relax'];
const STATI_SALETTA   = ['Aperta', 'Chiusa', 'Pulizie', 'Guasto'];

// =========================
// HELPER renderValore
// =========================

function renderValore(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Sì' : 'No';
  if (Array.isArray(value)) {
    if (key === 'fasce_orarie') return `${value.length} fasce`;
    return value.join(', ');
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// =========================
// COMPONENTE
// =========================

export default function AdminContributiScreen({ adminPin }: Props) {

  const [loading, setLoading]           = useState(true);
  const [contributi, setContributi]     = useState<Contributo[]>([]);
  const [stazioni, setStazioni]         = useState<StazioneRow[]>([]);
  const [editingContributo, setEditingContributo] = useState<any>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // =========================
  // LOAD
  // =========================

  async function load() {
    setLoading(true);
    const res = await getContributi(adminPin);
    if (!res.ok) {
      toast.error(res.error?.message ?? 'Errore caricamento');
      setLoading(false);
      return;
    }
    setContributi(res.data?.contributi ?? []);
    setStazioni(res.data?.stazioni ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // =========================
  // HELPER FASCE (modal)
  // =========================

  function updateFasciaAdmin(fasciaIndex: number, field: string, value: unknown) {
    const nuoveFasce = [...(editingContributo?.dati?.fasce_orarie || [])];
    nuoveFasce[fasciaIndex] = { ...nuoveFasce[fasciaIndex], [field]: value };
    setEditingContributo({ ...editingContributo, dati: { ...editingContributo.dati, fasce_orarie: nuoveFasce } });
  }

  function toggleGiornoAdmin(fasciaIndex: number, giorno: string) {
    const fascia = editingContributo?.dati?.fasce_orarie?.[fasciaIndex];
    if (!fascia) return;
    const giorniAttuali = Array.isArray(fascia.giorni) ? fascia.giorni : [];
    const giorni = giorniAttuali.includes(giorno)
      ? giorniAttuali.filter((g: string) => g !== giorno)
      : [...giorniAttuali, giorno];
    updateFasciaAdmin(fasciaIndex, 'giorni', giorni);
  }

  function addFasciaAdmin() {
    setEditingContributo({
      ...editingContributo,
      dati: { ...editingContributo.dati,
        fasce_orarie: [...(editingContributo?.dati?.fasce_orarie || []), { giorni: [], apertura: '', chiusura: '' }] },
    });
  }

  function removeFasciaAdmin(fasciaIndex: number) {
    setEditingContributo({
      ...editingContributo,
      dati: { ...editingContributo.dati,
        fasce_orarie: (editingContributo?.dati?.fasce_orarie || []).filter((_: unknown, i: number) => i !== fasciaIndex) },
    });
  }

  function ordinaFasce(fasce: any[]) {
    return [...fasce].sort((a, b) => (a.apertura || '').localeCompare(b.apertura || ''));
  }

  // =========================
  // VALIDAZIONE
  // =========================

  function validaAttivita(dati: any): boolean {
    if (!dati.nome?.trim())       { toast.error('Inserisci il nome attività'); return false; }
    if (!dati.categoria?.trim())  { toast.error('Inserisci la categoria'); return false; }
    if (!dati.stazione_id)        { toast.error('Seleziona la stazione'); return false; }
    return true;
  }

  // =========================
  // SALVA MODIFICA CONTRIBUTO
  // =========================

  async function saveContributoModificato() {
    if (!editingContributo) return;

    const dati = { ...editingContributo.dati };
    if (editingContributo.tipo === 'attivita' && !validaAttivita(dati)) return;
    if (Array.isArray(dati.fasce_orarie)) dati.fasce_orarie = ordinaFasce(dati.fasce_orarie);

    const res = await updateContributoDati(adminPin, editingContributo.id, dati);
    if (!res.ok) { toast.error(res.error?.message ?? 'Errore salvataggio'); return; }

    await load();
    setEditingContributo(null);
    toast.success('Modifiche salvate');
  }

  // =========================
  // APPROVA / RIFIUTA
  // =========================

  async function handleApprove(c: Contributo) {
    setProcessingId(c.id);
    const res = await approveContributo(adminPin, c);
    setProcessingId(null);
    if (!res.ok) { toast.error(res.error?.message ?? 'Errore approvazione'); return; }
    toast.success('Contributo approvato');
    await load();
  }

  async function handleReject(c: Contributo) {
    setProcessingId(c.id);
    const res = await rejectContributo(adminPin, c.id);
    setProcessingId(null);
    if (!res.ok) { toast.error(res.error?.message ?? 'Errore rifiuto'); return; }
    toast.error('Contributo rifiutato');
    await load();
  }

  // =========================
  // UI
  // =========================

  return (
    <>
      <div className="flex flex-col gap-4">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Moderazione Contributi</h1>
          <p className="text-sm text-gray-500 mt-1">Gestisci contributi inviati dagli utenti</p>
        </div>

        {loading && <div className="text-sm text-gray-500">Caricamento...</div>}

        {!loading && contributi.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-gray-500 text-center">
            Nessun contributo presente
          </div>
        )}

        <div className="flex flex-col gap-4">
          {contributi.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col gap-4">

              {/* TOP */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <FileJson className="w-5 h-5 text-trenord-green" />
                    <h2 className="font-bold text-gray-900 capitalize">{c.tipo}</h2>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">ID: {c.id}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  c.stato === 'approved' ? 'bg-emerald-100 text-emerald-700'
                  : c.stato === 'rejected' ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'}`}>
                  {c.stato}
                </div>
              </div>

              {/* DATI */}
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 flex flex-col gap-3">
                {Object.entries(c.dati || {}).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4 text-sm">
                    <span className="font-medium text-gray-500">{key}</span>
                    <span className="text-gray-900 text-right break-all">{renderValore(key, value)}</span>
                  </div>
                ))}
              </div>

              {/* DATA */}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Clock3 className="w-4 h-4" />
                {new Date(c.created_at).toLocaleString('it-IT')}
              </div>

              {/* ACTIONS */}
              {c.stato === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => setEditingContributo(c)} disabled={processingId === c.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-50">
                    Modifica
                  </button>
                  <button onClick={() => handleApprove(c)} disabled={processingId === c.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                    <Check className="w-4 h-4" />
                    {processingId === c.id ? '...' : 'Approva'}
                  </button>
                  <button onClick={() => handleReject(c)} disabled={processingId === c.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                    <X className="w-4 h-4" />
                    {processingId === c.id ? '...' : 'Rifiuta'}
                  </button>
                </div>
              )}

            </div>
          ))}
        </div>
      </div>

      {/* MODAL MODIFICA */}
      {editingContributo && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingContributo(null); }}>
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 pb-24 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Modifica contributo</h2>
              <button onClick={() => setEditingContributo(null)}><X className="w-5 h-5" /></button>
            </div>

            {/* SEGNALAZIONE SALETTA */}
            {editingContributo.tipo === 'segnalazione_saletta' && (
              <div className="flex flex-col gap-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Segnalazione saletta</p>
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tipo</span>
                      <span className="font-medium text-gray-900">{editingContributo.dati?.tipo?.replace(/_/g, ' ')}</span>
                    </div>
                    {editingContributo.dati?.valore && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Valore</span>
                        <span className="font-medium text-gray-900">{editingContributo.dati.valore}</span>
                      </div>
                    )}
                    {editingContributo.dati?.nota && (
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-500">Note</span>
                        <span className="text-gray-900 bg-white rounded-lg p-2 border border-amber-100">{editingContributo.dati.nota}</span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400 text-center">Approvando questa segnalazione il campo indicato verrà aggiornato automaticamente nella saletta.</p>
              </div>
            )}

            {/* SALETTA */}
            {editingContributo.tipo === 'saletta' && (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Stazione</label>
                  <input value={editingContributo.dati?.stazione || ''} disabled
                    className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full bg-gray-100 text-gray-500 text-base" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Tipo</label>
                  <select value={editingContributo.dati?.tipo || ''}
                    onChange={(e) => setEditingContributo({ ...editingContributo, dati: { ...editingContributo.dati, tipo: e.target.value } })}
                    className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base">
                    {TIPI_SALETTA.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Codice accesso</label>
                  <input value={editingContributo.dati?.codice_accesso || ''}
                    onChange={(e) => setEditingContributo({ ...editingContributo, dati: { ...editingContributo.dati, codice_accesso: e.target.value } })}
                    placeholder="Es. 14579B" className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Ubicazione</label>
                  <input value={editingContributo.dati?.ubicazione || ''}
                    onChange={(e) => setEditingContributo({ ...editingContributo, dati: { ...editingContributo.dati, ubicazione: e.target.value } })}
                    placeholder="Es. Binario 1 lato Milano" className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Stato</label>
                  <select value={editingContributo.dati?.stato || ''}
                    onChange={(e) => setEditingContributo({ ...editingContributo, dati: { ...editingContributo.dati, stato: e.target.value } })}
                    className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base">
                    {STATI_SALETTA.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* DOTAZIONI */}
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase">Servizi</label>
                  {[
                    { key: 'microonde',    label: 'Microonde',    icon: <Microwave className="w-5 h-5" /> },
                    { key: 'distributori', label: 'Distributori', icon: <Coffee className="w-5 h-5" /> },
                    { key: 'acqua',        label: 'Acqua',        icon: <Droplets className="w-5 h-5" /> },
                    { key: 'climatizzata', label: 'Climatizzata', icon: <Snowflake className="w-5 h-5" /> },
                  ].map(({ key, label, icon }) => {
                    const val = editingContributo.dati?.[key] ?? editingContributo.dati?.servizi?.[key] ?? false;
                    return (
                      <button key={key} type="button"
                        onClick={() => setEditingContributo({ ...editingContributo, dati: { ...editingContributo.dati, [key]: !val } })}
                        className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${val ? 'bg-trenord-green text-white border-trenord-green' : 'bg-white border-gray-200 text-gray-700'}`}>
                        <div className="flex items-center gap-3">{icon}{label}</div>
                        <span>{val ? 'SI' : 'NO'}</span>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Note</label>
                  <textarea value={editingContributo.dati?.note || ''}
                    onChange={(e) => setEditingContributo({ ...editingContributo, dati: { ...editingContributo.dati, note: e.target.value } })}
                    placeholder="Inserisci eventuali informazioni aggiuntive..."
                    className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full min-h-[120px] text-base" />
                </div>
              </div>
            )}

            {/* ATTIVITA */}
            {editingContributo.tipo === 'attivita' && (
              <>
                <div className="grid gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Stazione</label>
                    <input value={stazioni.find((s) => s.id === editingContributo.dati?.stazione_id)?.nome || ''} disabled
                      className="border rounded-xl px-3 py-2 bg-gray-100 text-base" />
                  </div>
                  {[
                    { key: 'nome',       label: 'Nome' },
                    { key: 'indirizzo',  label: 'Indirizzo' },
                    { key: 'ubicazione', label: 'Ubicazione' },
                    { key: 'note',       label: 'Note' },
                    { key: 'maps_query', label: 'Maps Query' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">{label}</label>
                      <input value={editingContributo.dati?.[key] || ''}
                        onChange={(e) => setEditingContributo({ ...editingContributo, dati: { ...editingContributo.dati, [key]: e.target.value } })}
                        className="border rounded-xl px-3 py-2 text-base" />
                    </div>
                  ))}

                  {/* CATEGORIA — FIX P2: usa CATEGORIE_ATTIVITA */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Categoria</label>
                    <select value={editingContributo?.dati?.categoria || ''}
                      onChange={(e) => setEditingContributo({ ...editingContributo, dati: { ...editingContributo.dati, categoria: e.target.value } })}
                      className="border rounded-xl px-3 py-2 text-base">
                      <option value="">Seleziona categoria</option>
                      {CATEGORIE_ATTIVITA.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* DISTANZA — FIX P2: usa DISTANZE_ATTIVITA (valori canonici con "a piedi") */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Distanza a piedi</label>
                    <select value={editingContributo?.dati?.distanza_piedi || ''}
                      onChange={(e) => setEditingContributo({ ...editingContributo, dati: { ...editingContributo.dati, distanza_piedi: e.target.value } })}
                      className="border rounded-xl px-3 py-2 text-base">
                      <option value="">Non specificata</option>
                      {DISTANZE_ATTIVITA.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={Boolean(editingContributo?.dati?.convenzionato)}
                      onChange={(e) => setEditingContributo({ ...editingContributo, dati: { ...editingContributo.dati, convenzionato: e.target.checked } })} />
                    <span className="font-medium">Convenzionato Trenord</span>
                  </div>
                </div>

                {/* FASCE ORARIE (solo NON Hotel) */}
                {editingContributo.dati?.categoria !== 'Hotel' && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Fasce orarie</h3>
                      <button type="button" onClick={addFasciaAdmin} className="text-sm text-trenord-green">+ Aggiungi fascia</button>
                    </div>
                    {(editingContributo?.dati?.fasce_orarie || []).map((fascia: any, index: number) => {
                      const giorniAttuali = Array.isArray(fascia.giorni) ? fascia.giorni : [];
                      return (
                        <div key={index} className="border rounded-2xl p-4 flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">Fascia {index + 1}</div>
                            {(editingContributo?.dati?.fasce_orarie?.length || 0) > 1 && (
                              <button type="button" onClick={() => removeFasciaAdmin(index)} className="text-red-600 text-sm">Elimina</button>
                            )}
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {GIORNI_SETTIMANA.map((giorno) => (
                              <button key={giorno} type="button" onClick={() => toggleGiornoAdmin(index, giorno)}
                                className={`rounded-xl border py-2 text-sm ${giorniAttuali.includes(giorno) ? 'bg-trenord-green text-white' : 'bg-white'}`}>
                                {giorno}
                              </button>
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <input type="time" value={fascia.apertura || ''}
                              onChange={(e) => updateFasciaAdmin(index, 'apertura', e.target.value)}
                              className="border rounded-xl px-3 py-2 text-base" />
                            <input type="time" value={fascia.chiusura || ''}
                              onChange={(e) => updateFasciaAdmin(index, 'chiusura', e.target.value)}
                              className="border rounded-xl px-3 py-2 text-base" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* SEZIONE HOTEL — visibile solo se categoria === 'Hotel' */}
                {editingContributo.dati?.categoria === 'Hotel' && (
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col gap-3">
                    <h3 className="font-semibold text-blue-700">Informazioni Hotel</h3>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Telefono</label>
                      <input
                        value={editingContributo.dati?.dati_extra?.telefono || ''}
                        onChange={(e) => setEditingContributo({
                          ...editingContributo,
                          dati: {
                            ...editingContributo.dati,
                            dati_extra: { ...(editingContributo.dati?.dati_extra ?? {}), telefono: e.target.value },
                          },
                        })}
                        className="border rounded-xl px-3 py-2 text-base"
                      />
                    </div>

                    {[
                      { key: 'reception_h24', label: 'Reception H24' },
                      { key: 'colazione',     label: 'Colazione disponibile' },
                      { key: 'wifi',          label: 'WiFi disponibile' },
                      { key: 'navetta',       label: 'Navetta disponibile' },
                      { key: 'ristorante',    label: 'Ristorante interno' },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(editingContributo.dati?.dati_extra?.[key])}
                          onChange={(e) => setEditingContributo({
                            ...editingContributo,
                            dati: {
                              ...editingContributo.dati,
                              dati_extra: { ...(editingContributo.dati?.dati_extra ?? {}), [key]: e.target.checked },
                            },
                          })}
                        />
                        {label}
                      </label>
                    ))}

                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Note equipaggi</label>
                      <textarea
                        rows={3}
                        value={editingContributo.dati?.dati_extra?.note_equipaggi || ''}
                        onChange={(e) => setEditingContributo({
                          ...editingContributo,
                          dati: {
                            ...editingContributo.dati,
                            dati_extra: { ...(editingContributo.dati?.dati_extra ?? {}), note_equipaggi: e.target.value },
                          },
                        })}
                        className="border rounded-xl px-3 py-2 resize-none text-base"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* STAZIONE */}
            {editingContributo.tipo === 'stazione' && (
              <div className="flex flex-col gap-4">

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Nome stazione</label>
                  <input
                    ref={firstInputRef}
                    value={editingContributo.dati?.nome || ''}
                    onChange={(e) => setEditingContributo({ ...editingContributo, dati: { ...editingContributo.dati, nome: e.target.value } })}
                    className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Codice</label>
                  <input
                    value={editingContributo.dati?.codice || ''}
                    onChange={(e) => setEditingContributo({ ...editingContributo, dati: { ...editingContributo.dati, codice: e.target.value } })}
                    className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Regione</label>
                  <input
                    value={editingContributo.dati?.regione || ''}
                    onChange={(e) => setEditingContributo({ ...editingContributo, dati: { ...editingContributo.dati, regione: e.target.value } })}
                    className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Provincia</label>
                  <input
                    value={editingContributo.dati?.provincia || ''}
                    onChange={(e) => setEditingContributo({ ...editingContributo, dati: { ...editingContributo.dati, provincia: e.target.value } })}
                    className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Indirizzo</label>
                  <input
                    value={editingContributo.dati?.indirizzo || ''}
                    onChange={(e) => setEditingContributo({ ...editingContributo, dati: { ...editingContributo.dati, indirizzo: e.target.value } })}
                    className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Maps Query</label>
                  <input
                    value={editingContributo.dati?.maps_query || ''}
                    onChange={(e) => setEditingContributo({ ...editingContributo, dati: { ...editingContributo.dati, maps_query: e.target.value } })}
                    className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Plus Code</label>
                  <input
                    value={editingContributo.dati?.plus_code || ''}
                    onChange={(e) => setEditingContributo({ ...editingContributo, dati: { ...editingContributo.dati, plus_code: e.target.value } })}
                    className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase">Latitudine</label>
                    <input
                      type="number" step="any"
                      value={editingContributo.dati?.lat ?? ''}
                      onChange={(e) => setEditingContributo({ ...editingContributo, dati: { ...editingContributo.dati, lat: e.target.value } })}
                      className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase">Longitudine</label>
                    <input
                      type="number" step="any"
                      value={editingContributo.dati?.lng ?? ''}
                      onChange={(e) => setEditingContributo({ ...editingContributo, dati: { ...editingContributo.dati, lng: e.target.value } })}
                      className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Note</label>
                  <textarea
                    value={editingContributo.dati?.note || ''}
                    onChange={(e) => setEditingContributo({ ...editingContributo, dati: { ...editingContributo.dati, note: e.target.value } })}
                    className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full min-h-[120px] text-base"
                  />
                </div>

              </div>
            )}

            <button onClick={saveContributoModificato}
              className="bg-blue-600 text-white rounded-xl py-3 font-medium hover:opacity-90">
              Salva modifiche
            </button>

          </div>
        </div>
      )}
    </>
  );
}