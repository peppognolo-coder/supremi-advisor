import { useEffect, useState } from 'react';

import {
  Check,
  X,
  Clock3,
  FileJson,
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

  const giorniSettimana = [
  'Lun',
  'Mar',
  'Mer',
  'Gio',
  'Ven',
  'Sab',
  'Dom',
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

    ...nuoveFasce[
      fasciaIndex
    ],

    [field]: value,
  };

  setEditingContributo({

    ...editingContributo,

    dati: {

      ...editingContributo.dati,

      fasce_orarie:
        nuoveFasce,
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
      ?.fasce_orarie?.[
        fasciaIndex
      ];

  if (!fascia) return;

  const giorni =
    fascia.giorni.includes(
      giorno
    )
      ? fascia.giorni.filter(
          (
            g: string
          ) =>
            g !== giorno
        )
      : [
          ...fascia.giorni,
          giorno,
        ];

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

      fasce_orarie:
        nuoveFasce,
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
      ) =>
        index !== fasciaIndex
    );

  setEditingContributo({

    ...editingContributo,

    dati: {

      ...editingContributo.dati,

      fasce_orarie:
        nuoveFasce,
    },
  });
}
  
  async function saveContributoModificato() {

  if (!editingContributo) {

    return;
  }

  const { error } =
    await supabase

      .from('contributi')

      .update({

        dati:
          editingContributo.dati,
      })

      .eq(
        'id',
        editingContributo.id
      );

  if (error) {

    console.error(error);

    alert(
      'Errore salvataggio'
    );

    return;
  }

  await load();

  setEditingContributo(
    null
  );

  alert(
    'Modifiche salvate'
  );
}
  
  // =========================
  // UPDATE STATUS
  // =========================

  async function updateStatus(
    contributo: Contributo,
    stato: string
  ) {

    // =========================
    // APPROVAZIONE
    // =========================

    if (stato === 'approved') {

      // =========================
      // SALETTA
      // =========================

      if (
        contributo.tipo ===
        'saletta'
      ) {

        const dati =
          contributo.dati;

        const groupId =
          normalizeGroupId(
            dati.stazione
          );

        // CERCA SALETTA
        const {
          data: existing,
        } = await supabase
          .from('salette')
          .select('*')
          .eq(
            'saletta_group_id',
            groupId
          )
          .eq(
            'tipo',
            dati.tipo
          )
          .maybeSingle();

        // =========================
        // UPDATE
        // =========================

        if (existing) {

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
            .eq(
              'id',
              existing.id
            );

        } else {

          // =========================
          // INSERT
          // =========================

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
        }
      }

      // =========================
      // ATTIVITA
      // =========================

     if (
  contributo.tipo ===
  'attivita'
) {

  const dati =
    contributo.dati;

  const {
    data: existing,
  } = await supabase
    .from('attivita_stazione')
    .select('id')
    .eq(
      'stazione_id',
      dati.stazione_id
    )
    .eq(
      'nome',
      dati.nome
    )
    .maybeSingle();

  if (existing) {

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
          dati.fasce_orarie,
      })
      .eq(
        'id',
        existing.id
      );

  } else {

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
          dati.fasce_orarie,
      });

  }
}

    // =========================
    // UPDATE STATUS
    // =========================

    await supabase
      .from('contributi')
      .update({
        stato,
      })
      .eq(
        'id',
        contributo.id
      );

    load();
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
                    c.stato ===
                    'approved'
                      ? 'bg-emerald-100 text-emerald-700'
                      : c.stato ===
                        'rejected'
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
          {String(value)}
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
              {c.stato ===
                'pending' && (

                <div className="flex gap-2">

                  <button
  onClick={() =>
    setEditingContributo(c)
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
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:opacity-90"
                  >

                    <Check className="w-4 h-4" />

                    Approva

                  </button>

                  {/* REJECT */}
                  <button
                    onClick={() =>
                      updateStatus(
                        c,
                        'rejected'
                      )
                    }
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:opacity-90"
                  >

                    <X className="w-4 h-4" />

                    Rifiuta

                  </button>

                </div>
              )}

            </div>
          )
        )}

            </div>

    </div>

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

          <div className="grid gap-3">

           {Object.entries(
  editingContributo.dati || {}
).map(
  ([key, value]) => {

    if (
      key === 'stazione_id'
    ) {

      const stazione =
        stazioni.find(
          (s) =>
            s.id === value
        );

      return (

        <div
          key={key}
          className="
            flex
            flex-col
            gap-1
          "
        >

          <label className="text-xs text-gray-500">

            Stazione

          </label>

          <input
            value={
              stazione?.nome || ''
            }
            disabled
            className="
              border
              rounded-xl
              px-3
              py-2
              bg-gray-100
            "
          />

        </div>

      );
    }

if (
  key === 'fasce_orarie'
) {

  return null;
}

if (
  key === 'convenzionato'
) {

  return null;
}

if (
  key === 'categoria'
) {

  return null;
}

if (
  key === 'distanza_piedi'
) {

  return null;
}

return (

      <div
        key={key}
        className="
          flex
          flex-col
          gap-1
        "
      >

        <label className="text-xs text-gray-500">

          {key}

        </label>

        <input
          value={String(value ?? '')}
          onChange={(e) =>

            setEditingContributo({
              ...editingContributo,

              dati: {
                ...editingContributo.dati,

                [key]:
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
        />

      </div>

    );

  }
)}

          </div>

          <div className="flex flex-col gap-1">

            <div className="flex flex-col gap-4">

  <div className="flex items-center justify-between">

    <h3 className="font-semibold">

      Fasce orarie

    </h3>

    <button
      type="button"
      onClick={
        addFasciaAdmin
      }
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
    ) => (

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
                fascia.giorni.includes(
                  giorno
                );

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
              fascia.apertura
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
              fascia.chiusura
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

    )
  )}

</div>

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

            <div className="flex flex-col gap-1">

  <label className="text-xs text-gray-500">

    Categoria

  </label>

  <select
    value={
      editingContributo
        ?.dati
        ?.categoria || ''
    }
    onChange={(e) =>

      setEditingContributo({

        ...editingContributo,

        dati: {

          ...editingContributo.dati,

          categoria:
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

            <div className="flex flex-col gap-1">

  <label className="text-xs text-gray-500">

    Distanza a piedi

  </label>

  <select
    value={
      editingContributo
        ?.dati
        ?.distanza_piedi || ''
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
            
  <label className="text-xs text-gray-500">

    Maps Query

  </label>

  <input
    value={
      editingContributo.dati
        ?.maps_query || ''
    }
    onChange={(e) =>

      setEditingContributo({

        ...editingContributo,

        dati: {

          ...editingContributo.dati,

          maps_query:
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
  />

</div>
          
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