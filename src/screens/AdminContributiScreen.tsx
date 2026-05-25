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

import { supabase } from '../lib/supabase';

interface Contributo {

  id: string;

  tipo: string;

  dati: any;

  stato: string;

  created_at: string;
}

export default function AdminContributiScreen() {

  const [loading, setLoading] =
    useState(true);

  const [contributi, setContributi] =
    useState<Contributo[]>([]);

  const [stazioni, setStazioni] =
    useState<any[]>([]);

  const [
    editingContributo,
    setEditingContributo,
  ] = useState<any>(null);

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const firstInputRef =
    useRef<HTMLInputElement>(null);

  const giorniSettimana = [
    'Lun',
    'Mar',
    'Mer',
    'Gio',
    'Ven',
    'Sab',
    'Dom',
  ];

  const tipiSaletta = [
    'Equipaggi',
    'Bagni',
    'Cancelletto',
    'Trenitalia',
    'Sala Relax',
  ];

  const statiSaletta = [
    'Aperta',
    'Chiusa',
    'Pulizie',
    'Guasto',
  ];

  // =========================
  // NORMALIZE
  // =========================

  function normalizeGroupId(
    text: string
  ) {

    return text
      ?.toLowerCase()
      ?.trim()
      ?.replaceAll(' ', '_');
  }

  // =========================
  // LOAD
  // =========================

  async function load() {

    setLoading(true);

    const { data, error } =
      await supabase
        .from('contributi')
        .select('*')
        .order('created_at', {
          ascending: false,
        });

    if (!error) {

      setContributi(
        data ?? []
      );
    }

    const {
      data: stazioniData,
    } = await supabase
      .from('stazioni')
      .select('id,nome');

    setStazioni(
      stazioniData || []
    );

    setLoading(false);
  }

  useEffect(() => {

    load();

  }, []);

  // =========================
  // ESC PER CHIUDERE MODAL
  // =========================

  useEffect(() => {

    function handleKeyDown(
      e: KeyboardEvent
    ) {

      if (
        e.key === 'Escape' &&
        editingContributo
      ) {

        setEditingContributo(null);
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () =>
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );

  }, [editingContributo]);

  // =========================
  // AUTOFOCUS PRIMO INPUT
  // =========================

  useEffect(() => {

    if (editingContributo) {

      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 50);
    }

  }, [editingContributo]);

  // =========================
  // FASCE ORARIE
  // =========================

  function updateFasciaAdmin(
    fasciaIndex: number,
    field: string,
    value: any
  ) {

    const nuoveFasce = [
      ...(editingContributo
        ?.dati
        ?.fasce_orarie || [])
    ];

    nuoveFasce[fasciaIndex] = {

      ...nuoveFasce[fasciaIndex],

      [field]: value,
    };

    setEditingContributo({

      ...editingContributo,

      dati: {

        ...editingContributo.dati,

        fasce_orarie: nuoveFasce,
      },
    });
  }

  function toggleGiornoAdmin(
    fasciaIndex: number,
    giorno: string
  ) {

    const fascia =
      editingContributo
        ?.dati
        ?.fasce_orarie?.[fasciaIndex];

    if (!fascia) return;

    const giorniAttuali =
      Array.isArray(fascia.giorni)
        ? fascia.giorni
        : [];

    const giorni =
      giorniAttuali.includes(giorno)
        ? giorniAttuali.filter(
            (g: string) => g !== giorno
          )
        : [...giorniAttuali, giorno];

    updateFasciaAdmin(
      fasciaIndex,
      'giorni',
      giorni
    );
  }

  function addFasciaAdmin() {

    const nuoveFasce = [

      ...(editingContributo
        ?.dati
        ?.fasce_orarie || []),

      {
        giorni: [],
        apertura: '',
        chiusura: '',
      },
    ];

    setEditingContributo({

      ...editingContributo,

      dati: {

        ...editingContributo.dati,

        fasce_orarie: nuoveFasce,
      },
    });
  }

  function removeFasciaAdmin(
    fasciaIndex: number
  ) {

    const nuoveFasce =
      (
        editingContributo
          ?.dati
          ?.fasce_orarie || []
      ).filter(
        (
          _: any,
          index: number
        ) => index !== fasciaIndex
      );

    setEditingContributo({

      ...editingContributo,

      dati: {

        ...editingContributo.dati,

        fasce_orarie: nuoveFasce,
      },
    });
  }

  // =========================
  // ORDINAMENTO FASCE
  // =========================

  function ordinaFasce(
    fasce: any[]
  ) {

    return [...fasce].sort(
      (a, b) => {

        const aAp = a.apertura || '';
        const bAp = b.apertura || '';

        return aAp.localeCompare(bAp);
      }
    );
  }

  // =========================
  // VALIDAZIONE ATTIVITA
  // =========================

  function validaAttivita(
    dati: any
  ): boolean {

    if (!dati.nome?.trim()) {

      alert(
        'Compila i campi obbligatori: nome'
      );

      return false;
    }

    if (!dati.categoria?.trim()) {

      alert(
        'Compila i campi obbligatori: categoria'
      );

      return false;
    }

    if (!dati.stazione_id) {

      alert(
        'Compila i campi obbligatori: stazione'
      );

      return false;
    }

    return true;
  }

  // =========================
  // SALVA CONTRIBUTO
  // =========================

  async function saveContributoModificato() {

    if (!editingContributo) return;

    const dati = {
      ...editingContributo.dati,
    };

    if (
      editingContributo.tipo ===
      'attivita'
    ) {

      if (!validaAttivita(dati)) return;
    }

    if (
      Array.isArray(dati.fasce_orarie)
    ) {

      dati.fasce_orarie =
        ordinaFasce(dati.fasce_orarie);
    }

    const { error } =
      await supabase
        .from('contributi')
        .update({ dati })
        .eq(
          'id',
          editingContributo.id
        );

    if (error) {

      console.error(error);

      alert(
        'Errore durante il salvataggio'
      );

      return;
    }

    await load();

    setEditingContributo(null);

    alert('Modifiche salvate');
  }

  // =========================
  // RENDER VALORE
  // =========================

  function renderValore(
    key: string,
    value: any
  ): string {

    if (
      value === null ||
      value === undefined
    ) {
      return '—';
    }

    if (typeof value === 'boolean') {
      return value ? 'Sì' : 'No';
    }

    if (
      key === 'fasce_orarie' &&
      Array.isArray(value)
    ) {

      if (value.length === 0) {
        return 'Nessuna fascia';
      }

      return value
        .map((f: any) => {

          const giorni =
            Array.isArray(f.giorni) &&
            f.giorni.length > 0
              ? f.giorni.join(', ')
              : '—';

          const orari =
            f.apertura && f.chiusura
              ? `${f.apertura}–${f.chiusura}`
              : '—';

          return `${giorni} ${orari}`;
        })
        .join(' | ');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  // =========================
  // UPDATE STATUS
  // =========================

  async function updateStatus(
    contributo: Contributo,
    stato: string
  ) {

    if (stato === 'approved') {

      if (
        !confirm(
          'Approvare questo contributo?'
        )
      ) {
        return;
      }

    } else {

      if (
        !confirm(
          'Rifiutare questo contributo?'
        )
      ) {
        return;
      }
    }

    setProcessingId(contributo.id);

    if (stato === 'approved') {

      // =========================
      // SALETTA
      // =========================

      if (
        contributo.tipo === 'saletta'
      ) {

        const dati = contributo.dati;

        const groupId =
          normalizeGroupId(
            dati.stazione
          );

        const {
          data: existing,
        } = await supabase
          .from('salette')
          .select('*')
          .eq(
            'saletta_group_id',
            groupId
          )
          .eq('tipo', dati.tipo)
          .maybeSingle();

        if (existing) {

          const { error } =
            await supabase
              .from('salette')
              .update({

                codice_accesso:
                  dati.codice_accesso,

                ubicazione:
                  dati.ubicazione,

                stato:
                  dati.stato,

                note:
                  dati.note,

                microonde:
                  dati.microonde,

                distributori:
                  dati.distributori,

                acqua:
                  dati.acqua,

                climatizzata:
                  dati.climatizzata,
              })
              .eq('id', existing.id);

          if (error) {

            console.error(error);

            alert(
              'Errore durante il salvataggio'
            );

            setProcessingId(null);

            return;
          }

        } else {

          const { error } =
            await supabase
              .from('salette')
              .insert({

                saletta_group_id:
                  groupId,

                stazione:
                  dati.stazione,

                nome:
                  dati.stazione,

                tipo:
                  dati.tipo,

                codice_accesso:
                  dati.codice_accesso,

                ubicazione:
                  dati.ubicazione,

                stato:
                  dati.stato,

                note:
                  dati.note,

                microonde:
                  dati.microonde,

                distributori:
                  dati.distributori,

                acqua:
                  dati.acqua,

                climatizzata:
                  dati.climatizzata,
              });

          if (error) {

            console.error(error);

            alert(
              'Errore durante il salvataggio'
            );

            setProcessingId(null);

            return;
          }
        }
      }

      // =========================
      // ATTIVITA
      // =========================

      if (
        contributo.tipo === 'attivita'
      ) {

        const dati = contributo.dati;

        const fasceSalvate =
          Array.isArray(dati.fasce_orarie)
            ? ordinaFasce(
                dati.fasce_orarie
              )
            : [];

        const {
          data: existing,
        } = await supabase
          .from('attivita_stazione')
          .select('id')
          .eq(
            'stazione_id',
            dati.stazione_id
          )
          .eq('nome', dati.nome)
          .maybeSingle();

        if (existing) {

          const { error } =
            await supabase
              .from('attivita_stazione')
              .update({

                categoria:
                  dati.categoria,

                indirizzo:
                  dati.indirizzo,

                maps_query:
                  dati.maps_query,

                distanza_piedi:
                  dati.distanza_piedi,

                ubicazione:
                  dati.ubicazione,

                note:
                  dati.note,

                convenzionato:
                  dati.convenzionato,

                fasce_orarie:
                  fasceSalvate,
              })
              .eq('id', existing.id);

          if (error) {

            console.error(error);

            alert(
              'Errore durante il salvataggio'
            );

            setProcessingId(null);

            return;
          }

        } else {

          const { error } =
            await supabase
              .from('attivita_stazione')
              .insert({

                stazione_id:
                  dati.stazione_id,

                nome:
                  dati.nome,

                categoria:
                  dati.categoria,

                indirizzo:
                  dati.indirizzo,

                maps_query:
                  dati.maps_query,

                distanza_piedi:
                  dati.distanza_piedi,

                ubicazione:
                  dati.ubicazione,

                note:
                  dati.note,

                convenzionato:
                  dati.convenzionato,

                fasce_orarie:
                  fasceSalvate,

                is_active:
                  true,

                deleted_at:
                  null,
              });

          if (error) {

            console.error(error);

            alert(
              'Errore durante il salvataggio'
            );

            setProcessingId(null);

            return;
          }
        }
      }
    }

    // =========================
    // AGGIORNA STATO CONTRIBUTO
    // =========================

    const { error: statoError } =
      await supabase
        .from('contributi')
        .update({ stato })
        .eq('id', contributo.id);

    if (statoError) {

      console.error(statoError);

      alert(
        'Errore durante il salvataggio'
      );

      setProcessingId(null);

      return;
    }

    setProcessingId(null);

    if (stato === 'approved') {

      alert('Contributo approvato');

    } else {

      alert('Contributo rifiutato');
    }

    await load();
  }

  // =========================
  // UI
  // =========================

  return (

    <>

      <div className="flex flex-col gap-4">

        {/* TITLE */}
        <div>

          <h1 className="text-2xl font-bold text-gray-900">

            Moderazione Contributi

          </h1>

          <p className="text-sm text-gray-500 mt-1">

            Gestisci contributi inviati dagli utenti

          </p>

        </div>

        {/* LOADING */}
        {loading && (

          <div className="text-sm text-gray-500">

            Caricamento...

          </div>
        )}

        {/* EMPTY */}
        {!loading &&
          contributi.length === 0 && (

          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-gray-500 text-center">

            Nessun contributo presente

          </div>
        )}

        {/* LIST */}
        <div className="flex flex-col gap-4">

          {contributi.map(
            (c) => (

              <div
                key={c.id}
                className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col gap-4"
              >

                {/* TOP */}
                <div className="flex items-start justify-between gap-3">

                  <div>

                    <div className="flex items-center gap-2">

                      <FileJson className="w-5 h-5 text-trenord-green" />

                      <h2 className="font-bold text-gray-900 capitalize">

                        {c.tipo}

                      </h2>

                    </div>

                    <p className="text-xs text-gray-400 mt-1">

                      ID:
                      {' '}
                      {c.id}

                    </p>

                  </div>

                  {/* STATUS */}
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      c.stato === 'approved'
                        ? 'bg-emerald-100 text-emerald-700'
                        : c.stato === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >

                    {c.stato}

                  </div>

                </div>

                {/* DATI CONTRIBUTO */}
                <div
                  className="
                    bg-gray-50
                    rounded-xl
                    border
                    border-gray-100
                    p-4
                    flex
                    flex-col
                    gap-3
                  "
                >

                  {Object.entries(
                    c.dati || {}
                  ).map(
                    ([key, value]) => (

                      <div
                        key={key}
                        className="
                          flex
                          justify-between
                          gap-4
                          text-sm
                        "
                      >

                        <span
                          className="
                            font-medium
                            text-gray-500
                          "
                        >
                          {key}
                        </span>

                        <span
                          className="
                            text-gray-900
                            text-right
                            break-all
                          "
                        >
                          {renderValore(
                            key,
                            value
                          )}
                        </span>

                      </div>

                    )
                  )}

                </div>

                {/* DATE */}
                <div className="flex items-center gap-2 text-xs text-gray-400">

                  <Clock3 className="w-4 h-4" />

                  {new Date(
                    c.created_at
                  ).toLocaleString(
                    'it-IT'
                  )}

                </div>

                {/* ACTIONS */}
                {c.stato === 'pending' && (

                  <div className="flex gap-2">

                    <button
                      onClick={() =>
                        setEditingContributo(c)
                      }
                      disabled={
                        processingId === c.id
                      }
                      className="
                        flex
                        items-center
                        gap-2
                        px-4
                        py-2
                        rounded-xl
                        bg-blue-600
                        text-white
                        text-sm
                        font-medium
                        disabled:opacity-50
                      "
                    >

                      Modifica

                    </button>

                    {/* APPROVE */}
                    <button
                      onClick={() =>
                        updateStatus(
                          c,
                          'approved'
                        )
                      }
                      disabled={
                        processingId === c.id
                      }
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                    >

                      <Check className="w-4 h-4" />

                      {processingId === c.id
                        ? '...'
                        : 'Approva'}

                    </button>

                    {/* REJECT */}
                    <button
                      onClick={() =>
                        updateStatus(
                          c,
                          'rejected'
                        )
                      }
                      disabled={
                        processingId === c.id
                      }
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                    >

                      <X className="w-4 h-4" />

                      {processingId === c.id
                        ? '...'
                        : 'Rifiuta'}

                    </button>

                  </div>
                )}

              </div>
            )
          )}

        </div>

      </div>

      {/* MODAL MODIFICA */}
      {editingContributo && (

        <div
          className="
            fixed
            inset-0
            bg-black/40
            z-50
            flex
            items-center
            justify-center
            p-4
          "
          onClick={(e) => {
            if (
              e.target === e.currentTarget
            ) {
              setEditingContributo(null);
            }
          }}
        >

          <div
            className="
              bg-white
              rounded-3xl
              w-full
              max-w-2xl
              p-6
              pb-24
              flex
              flex-col
              gap-4
              max-h-[90vh]
              overflow-y-auto
            "
          >

            <div className="flex items-center justify-between">

              <h2 className="text-xl font-bold">

                Modifica contributo

              </h2>

              <button
                onClick={() =>
                  setEditingContributo(
                    null
                  )
                }
              >

                <X className="w-5 h-5" />

              </button>

            </div>

            {/* ========================= */}
            {/* MODAL SALETTA             */}
            {/* ========================= */}

            {editingContributo.tipo === 'saletta' && (

              <div className="flex flex-col gap-4">

                {/* STAZIONE sola lettura */}
                <div>

                  <label className="text-xs font-semibold text-gray-400 uppercase">

                    Stazione

                  </label>

                  <input
                    value={
                      editingContributo.dati?.stazione || ''
                    }
                    disabled
                    className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full bg-gray-100 text-gray-500"
                  />

                </div>

                {/* TIPO */}
                <div>

                  <label className="text-xs font-semibold text-gray-400 uppercase">

                    Tipo

                  </label>

                  <select
                    value={
                      editingContributo.dati?.tipo || ''
                    }
                    onChange={(e) =>
                      setEditingContributo({
                        ...editingContributo,
                        dati: {
                          ...editingContributo.dati,
                          tipo: e.target.value,
                        },
                      })
                    }
                    className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full"
                  >

                    {tipiSaletta.map(
                      (t) => (

                        <option
                          key={t}
                          value={t}
                        >

                          {t}

                        </option>
                      )
                    )}

                  </select>

                </div>

                {/* CODICE ACCESSO */}
                <div>

                  <label className="text-xs font-semibold text-gray-400 uppercase">

                    Codice accesso

                  </label>

                  <input
                    value={
                      editingContributo.dati?.codice_accesso || ''
                    }
                    onChange={(e) =>
                      setEditingContributo({
                        ...editingContributo,
                        dati: {
                          ...editingContributo.dati,
                          codice_accesso:
                            e.target.value,
                        },
                      })
                    }
                    placeholder="Es. 14579B"
                    className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full"
                  />

                </div>

                {/* UBICAZIONE */}
                <div>

                  <label className="text-xs font-semibold text-gray-400 uppercase">

                    Ubicazione

                  </label>

                  <input
                    value={
                      editingContributo.dati?.ubicazione || ''
                    }
                    onChange={(e) =>
                      setEditingContributo({
                        ...editingContributo,
                        dati: {
                          ...editingContributo.dati,
                          ubicazione:
                            e.target.value,
                        },
                      })
                    }
                    placeholder="Es. Binario 1 lato Milano"
                    className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full"
                  />

                </div>

                {/* STATO */}
                <div>

                  <label className="text-xs font-semibold text-gray-400 uppercase">

                    Stato

                  </label>

                  <select
                    value={
                      editingContributo.dati?.stato || ''
                    }
                    onChange={(e) =>
                      setEditingContributo({
                        ...editingContributo,
                        dati: {
                          ...editingContributo.dati,
                          stato: e.target.value,
                        },
                      })
                    }
                    className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full"
                  >

                    {statiSaletta.map(
                      (s) => (

                        <option
                          key={s}
                          value={s}
                        >

                          {s}

                        </option>
                      )
                    )}

                  </select>

                </div>

                {/* DOTAZIONI */}
                <div className="flex flex-col gap-3">

                  <label className="text-xs font-semibold text-gray-400 uppercase">

                    Servizi

                  </label>

                  {/* MICROONDE */}
                  <button
                    type="button"
                    onClick={() =>
                      setEditingContributo({
                        ...editingContributo,
                        dati: {
                          ...editingContributo.dati,
                          microonde: !(
                            editingContributo.dati?.microonde ??
                            editingContributo.dati?.servizi?.microonde ??
                            false
                          ),
                        },
                      })
                    }
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
                      (
                        editingContributo.dati?.microonde ??
                        editingContributo.dati?.servizi?.microonde ??
                        false
                      )
                        ? 'bg-trenord-green text-white border-trenord-green'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >

                    <div className="flex items-center gap-3">

                      <Microwave className="w-5 h-5" />

                      Microonde

                    </div>

                    <span>

                      {(
                        editingContributo.dati?.microonde ??
                        editingContributo.dati?.servizi?.microonde ??
                        false
                      )
                        ? 'SI'
                        : 'NO'}

                    </span>

                  </button>

                  {/* DISTRIBUTORI */}
                  <button
                    type="button"
                    onClick={() =>
                      setEditingContributo({
                        ...editingContributo,
                        dati: {
                          ...editingContributo.dati,
                          distributori: !(
                            editingContributo.dati?.distributori ??
                            editingContributo.dati?.servizi?.distributori ??
                            false
                          ),
                        },
                      })
                    }
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
                      (
                        editingContributo.dati?.distributori ??
                        editingContributo.dati?.servizi?.distributori ??
                        false
                      )
                        ? 'bg-trenord-green text-white border-trenord-green'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >

                    <div className="flex items-center gap-3">

                      <Coffee className="w-5 h-5" />

                      Distributori

                    </div>

                    <span>

                      {(
                        editingContributo.dati?.distributori ??
                        editingContributo.dati?.servizi?.distributori ??
                        false
                      )
                        ? 'SI'
                        : 'NO'}

                    </span>

                  </button>

                  {/* ACQUA */}
                  <button
                    type="button"
                    onClick={() =>
                      setEditingContributo({
                        ...editingContributo,
                        dati: {
                          ...editingContributo.dati,
                          acqua: !(
                            editingContributo.dati?.acqua ??
                            editingContributo.dati?.servizi?.acqua ??
                            false
                          ),
                        },
                      })
                    }
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
                      (
                        editingContributo.dati?.acqua ??
                        editingContributo.dati?.servizi?.acqua ??
                        false
                      )
                        ? 'bg-trenord-green text-white border-trenord-green'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >

                    <div className="flex items-center gap-3">

                      <Droplets className="w-5 h-5" />

                      Acqua

                    </div>

                    <span>

                      {(
                        editingContributo.dati?.acqua ??
                        editingContributo.dati?.servizi?.acqua ??
                        false
                      )
                        ? 'SI'
                        : 'NO'}

                    </span>

                  </button>

                  {/* CLIMATIZZATA */}
                  <button
                    type="button"
                    onClick={() =>
                      setEditingContributo({
                        ...editingContributo,
                        dati: {
                          ...editingContributo.dati,
                          climatizzata: !(
                            editingContributo.dati?.climatizzata ??
                            editingContributo.dati?.servizi?.climatizzata ??
                            false
                          ),
                        },
                      })
                    }
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
                      (
                        editingContributo.dati?.climatizzata ??
                        editingContributo.dati?.servizi?.climatizzata ??
                        false
                      )
                        ? 'bg-trenord-green text-white border-trenord-green'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >

                    <div className="flex items-center gap-3">

                      <Snowflake className="w-5 h-5" />

                      Climatizzata

                    </div>

                    <span>

                      {(
                        editingContributo.dati?.climatizzata ??
                        editingContributo.dati?.servizi?.climatizzata ??
                        false
                      )
                        ? 'SI'
                        : 'NO'}

                    </span>

                  </button>

                </div>

                {/* NOTE */}
                <div>

                  <label className="text-xs font-semibold text-gray-400 uppercase">

                    Note

                  </label>

                  <textarea
                    value={
                      editingContributo.dati?.note || ''
                    }
                    onChange={(e) =>
                      setEditingContributo({
                        ...editingContributo,
                        dati: {
                          ...editingContributo.dati,
                          note: e.target.value,
                        },
                      })
                    }
                    placeholder="Inserisci eventuali informazioni aggiuntive..."
                    className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full min-h-[120px]"
                  />

                </div>

              </div>
            )}

            {/* ========================= */}
            {/* MODAL ATTIVITA            */}
            {/* ========================= */}

            {editingContributo.tipo === 'attivita' && (

              <div className="grid gap-3">

                {/* STAZIONE (sola lettura) */}
                <div className="flex flex-col gap-1">

                  <label className="text-xs text-gray-500">

                    Stazione

                  </label>

                  <input
                    value={
                      stazioni.find(
                        (s) =>
                          s.id ===
                          editingContributo.dati?.stazione_id
                      )?.nome || ''
                    }
                    disabled
                    className="border rounded-xl px-3 py-2 bg-gray-100"
                  />

                </div>

                {/* NOME */}
                <div className="flex flex-col gap-1">

                  <label className="text-xs text-gray-500">

                    nome

                  </label>

                  <input
                    value={
                      editingContributo.dati?.nome || ''
                    }
                    onChange={(e) =>
                      setEditingContributo({
                        ...editingContributo,
                        dati: {
                          ...editingContributo.dati,
                          nome: e.target.value,
                        },
                      })
                    }
                    className="border rounded-xl px-3 py-2"
                  />

                </div>

                {/* INDIRIZZO */}
                <div className="flex flex-col gap-1">

                  <label className="text-xs text-gray-500">

                    indirizzo

                  </label>

                  <input
                    value={
                      editingContributo.dati?.indirizzo || ''
                    }
                    onChange={(e) =>
                      setEditingContributo({
                        ...editingContributo,
                        dati: {
                          ...editingContributo.dati,
                          indirizzo: e.target.value,
                        },
                      })
                    }
                    className="border rounded-xl px-3 py-2"
                  />

                </div>

                {/* UBICAZIONE */}
                <div className="flex flex-col gap-1">

                  <label className="text-xs text-gray-500">

                    ubicazione

                  </label>

                  <input
                    value={
                      editingContributo.dati?.ubicazione || ''
                    }
                    onChange={(e) =>
                      setEditingContributo({
                        ...editingContributo,
                        dati: {
                          ...editingContributo.dati,
                          ubicazione: e.target.value,
                        },
                      })
                    }
                    className="border rounded-xl px-3 py-2"
                  />

                </div>

                {/* NOTE */}
                <div className="flex flex-col gap-1">

                  <label className="text-xs text-gray-500">

                    note

                  </label>

                  <input
                    value={
                      editingContributo.dati?.note || ''
                    }
                    onChange={(e) =>
                      setEditingContributo({
                        ...editingContributo,
                        dati: {
                          ...editingContributo.dati,
                          note: e.target.value,
                        },
                      })
                    }
                    className="border rounded-xl px-3 py-2"
                  />

                </div>

              </div>
            )}

            {editingContributo.tipo === 'attivita' && (

              <>

            {/* FASCE ORARIE */}
            <div className="flex flex-col gap-4">

              <div className="flex items-center justify-between">

                <h3 className="font-semibold">

                  Fasce orarie

                </h3>

                <button
                  type="button"
                  onClick={addFasciaAdmin}
                  className="
                    text-sm
                    text-trenord-green
                  "
                >

                  + Aggiungi fascia

                </button>

              </div>

              {(editingContributo
                ?.dati
                ?.fasce_orarie || []
              ).map(
                (
                  fascia: any,
                  index: number
                ) => {

                  const giorniAttuali =
                    Array.isArray(
                      fascia.giorni
                    )
                      ? fascia.giorni
                      : [];

                  return (

                    <div
                      key={index}
                      className="
                        border
                        rounded-2xl
                        p-4
                        flex
                        flex-col
                        gap-4
                      "
                    >

                      <div className="flex items-center justify-between">

                        <div className="font-medium">

                          Fascia {index + 1}

                        </div>

                        {(editingContributo
                          ?.dati
                          ?.fasce_orarie
                          ?.length || 0) > 1 && (

                          <button
                            type="button"
                            onClick={() =>
                              removeFasciaAdmin(
                                index
                              )
                            }
                            className="
                              text-red-600
                              text-sm
                            "
                          >

                            Elimina

                          </button>

                        )}

                      </div>

                      <div className="grid grid-cols-4 gap-2">

                        {giorniSettimana.map(
                          (giorno) => {

                            const active =
                              giorniAttuali?.includes(
                                giorno
                              ) || false;

                            return (

                              <button
                                key={giorno}
                                type="button"
                                onClick={() =>
                                  toggleGiornoAdmin(
                                    index,
                                    giorno
                                  )
                                }
                                className={`rounded-xl border py-2 text-sm ${
                                  active
                                    ? 'bg-trenord-green text-white'
                                    : 'bg-white'
                                }`}
                              >

                                {giorno}

                              </button>

                            );
                          }
                        )}

                      </div>

                      <div className="grid grid-cols-2 gap-3">

                        <input
                          type="time"
                          value={
                            fascia.apertura || ''
                          }
                          onChange={(e) =>
                            updateFasciaAdmin(
                              index,
                              'apertura',
                              e.target.value
                            )
                          }
                          className="
                            border
                            rounded-xl
                            px-3
                            py-2
                          "
                        />

                        <input
                          type="time"
                          value={
                            fascia.chiusura || ''
                          }
                          onChange={(e) =>
                            updateFasciaAdmin(
                              index,
                              'chiusura',
                              e.target.value
                            )
                          }
                          className="
                            border
                            rounded-xl
                            px-3
                            py-2
                          "
                        />

                      </div>

                    </div>

                  );
                }
              )}

            </div>

            {/* CONVENZIONATO */}
            <div className="flex items-center gap-3">

              <input
                type="checkbox"
                checked={
                  Boolean(
                    editingContributo
                      ?.dati
                      ?.convenzionato
                  )
                }
                onChange={(e) =>
                  setEditingContributo({

                    ...editingContributo,

                    dati: {

                      ...editingContributo.dati,

                      convenzionato:
                        e.target.checked,
                    },
                  })
                }
              />

              <span className="font-medium">

                Convenzionato Trenord

              </span>

            </div>

            {/* CATEGORIA */}
            <div className="flex flex-col gap-1">

              <label className="text-xs text-gray-500">

                Categoria

              </label>

              <select
                value={
                  editingContributo?.dati?.categoria || ''
                }
                onChange={(e) =>
                  setEditingContributo({
                    ...editingContributo,
                    dati: {
                      ...editingContributo.dati,
                      categoria: e.target.value,
                    },
                  })
                }
                className="
                  border
                  rounded-xl
                  px-3
                  py-2
                "
              >

                <option value="Bar">
                  Bar
                </option>

                <option value="Fast Food">
                  Fast Food
                </option>

                <option value="Market">
                  Market
                </option>

                <option value="Ristorante">
                  Ristorante
                </option>

                <option value="Farmacia">
                  Farmacia
                </option>

                <option value="Tabacchi">
                  Tabacchi
                </option>

                <option value="Hotel">
                  Hotel
                </option>

                <option value="Altro">
                  Altro
                </option>

              </select>

            </div>

            {/* DISTANZA A PIEDI */}
            <div className="flex flex-col gap-1">

              <label className="text-xs text-gray-500">

                Distanza a piedi

              </label>

              <select
                value={
                  editingContributo?.dati?.distanza_piedi || ''
                }
                onChange={(e) =>
                  setEditingContributo({
                    ...editingContributo,
                    dati: {
                      ...editingContributo.dati,
                      distanza_piedi:
                        e.target.value,
                    },
                  })
                }
                className="
                  border
                  rounded-xl
                  px-3
                  py-2
                "
              >

                <option value="In stazione">
                  In stazione
                </option>

                <option value="Entro 2 minuti">
                  Entro 2 minuti
                </option>

                <option value="Entro 5 minuti">
                  Entro 5 minuti
                </option>

                <option value="Entro 10 minuti">
                  Entro 10 minuti
                </option>

                <option value="Oltre 10 minuti">
                  Oltre 10 minuti
                </option>

              </select>

            </div>

            {/* MAPS QUERY */}
            <div className="flex flex-col gap-1">

              <label className="text-xs text-gray-500">

                Maps Query

              </label>

              <input
                value={
                  editingContributo.dati?.maps_query || ''
                }
                onChange={(e) =>
                  setEditingContributo({
                    ...editingContributo,
                    dati: {
                      ...editingContributo.dati,
                      maps_query: e.target.value,
                    },
                  })
                }
                className="
                  border
                  rounded-xl
                  px-3
                  py-2
                "
              />

            </div>

              </>
            )}

            <button
              onClick={
                saveContributoModificato
              }
              className="
                bg-blue-600
                text-white
                rounded-xl
                py-3
                font-medium
              "
            >

              Salva modifiche

            </button>

          </div>

        </div>

      )}

    </>
  );
}