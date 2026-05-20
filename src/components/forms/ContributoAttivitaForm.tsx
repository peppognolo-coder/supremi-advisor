import { useState, useEffect } from 'react';

import {
  ArrowLeft,
  Store,
  Phone,
  Globe,
  Percent,
  MapPin,
  Clock3,
  Plus,
  Trash2,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../../lib/supabase';

interface Props {

  onBack: () => void;

  stazionePredefinitaId?: string;
}

interface FasciaOraria {

  giorni: string[];

  apertura: string;

  chiusura: string;
}

const categorie = [
  'Bar',
  'Ristorante',
  'Pizzeria',
  'Market',
  'Hotel',
  'Tabacchi',
  'Fast Food',
  'Farmacia',
  'Altro',
];

const giorniSettimana = [
  'Lun',
  'Mar',
  'Mer',
  'Gio',
  'Ven',
  'Sab',
  'Dom',
];

export default function ContributoAttivitaForm({
  onBack,
  stazionePredefinitaId,
}: Props) {

  const [stazioni, setStazioni] =
    useState<any[]>([]);

  const [stazioneId, setStazioneId] =
    useState(
      stazionePredefinitaId || ''
    );

  const [nome, setNome] =
    useState('');

  const [categoria, setCategoria] =
    useState(categorie[0]);

  const [indirizzo, setIndirizzo] =
    useState('');

  const [convenzione, setConvenzione] =
    useState('');

  const [sconto, setSconto] =
    useState('');

  const [telefono, setTelefono] =
    useState('');

  const [sito, setSito] =
    useState('');

  const [note, setNote] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [
    fasceOrarie,
    setFasceOrarie,
  ] = useState<
    FasciaOraria[]
  >([
    {
      giorni: [],
      apertura: '',
      chiusura: '',
    },
  ]);

  // =========================
  // LOAD STAZIONI
  // =========================

  useEffect(() => {

    async function loadStazioni() {

      const {
        data,
        error,
      } = await supabase

        .from('stazioni')

        .select('*')

        .order('nome', {
          ascending: true,
        });

      if (error) {

        toast.error(
          'Errore caricamento stazioni'
        );

        return;
      }

      setStazioni(
        data ?? []
      );
    }

    loadStazioni();

  }, []);

  // =========================
  // FASCE
  // =========================

  function addFascia() {

    setFasceOrarie([
      ...fasceOrarie,

      {
        giorni: [],
        apertura: '',
        chiusura: '',
      },
    ]);
  }

  function removeFascia(
    index: number
  ) {

    setFasceOrarie(
      fasceOrarie.filter(
        (_, i) =>
          i !== index
      )
    );
  }

  function updateFascia(
    index: number,
    field: string,
    value: any
  ) {

    const updated = [
      ...fasceOrarie,
    ];

    updated[index] = {

      ...updated[index],

      [field]: value,
    };

    setFasceOrarie(
      updated
    );
  }

  function toggleGiorno(
    fasciaIndex: number,
    giorno: string
  ) {

    const fascia =
      fasceOrarie[
        fasciaIndex
      ];

    const exists =
      fascia.giorni.includes(
        giorno
      );

    const nuoviGiorni =
      exists
        ? fascia.giorni.filter(
            (g) =>
              g !== giorno
          )
        : [
            ...fascia.giorni,
            giorno,
          ];

    updateFascia(
      fasciaIndex,
      'giorni',
      nuoviGiorni
    );
  }

  // =========================
  // SUBMIT
  // =========================

  async function submit() {

    if (!stazioneId) {

      toast.error(
        'Seleziona una stazione'
      );

      return;
    }

    if (!nome.trim()) {

      toast.error(
        'Inserisci il nome attività'
      );

      return;
    }

    setLoading(true);

    try {

      const stazione =
        stazioni.find(
          (s) =>
            s.id ===
            stazioneId
        );

      const payload = {

        stazione_id:
          stazioneId,

        stazione_nome:
          stazione?.nome || '',

        nome:
          nome.trim(),

        categoria,

        indirizzo:
          indirizzo.trim(),

        convenzione:
          convenzione.trim(),

        sconto:
          sconto.trim(),

        telefono:
          telefono.trim(),

        sito:
          sito.trim(),

        note:
          note.trim(),

        fasce_orarie:
          fasceOrarie,
      };

      const { error } =
        await supabase

          .from('contributi')

          .insert({

            tipo: 'attivita',

            dati: payload,

            stato: 'pending',
          });

      if (error) {

        console.error(error);

        toast.error(
          'Errore invio contributo'
        );

        setLoading(false);

        return;
      }

      toast.success(
        'Contributo inviato'
      );

      setLoading(false);

      onBack();

    } catch (err) {

      console.error(err);

      toast.error(
        'Errore imprevisto'
      );

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

          Contributo Attività

        </h1>

      </div>

      {/* FORM */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-4">

        {/* STAZIONE */}
        <select
          value={stazioneId}
          onChange={(e) =>
            setStazioneId(
              e.target.value
            )
          }
          className="border border-gray-200 rounded-xl px-3 py-2"
        >

          <option value="">

            Seleziona stazione

          </option>

          {stazioni.map(
            (stazione) => (

              <option
                key={stazione.id}
                value={stazione.id}
              >

                {stazione.nome}

              </option>
            )
          )}

        </select>

        {/* NOME */}
        <input
          value={nome}
          onChange={(e) =>
            setNome(
              e.target.value
            )
          }
          placeholder="Nome attività"
          className="border border-gray-200 rounded-xl px-3 py-2"
        />

        {/* CATEGORIA */}
        <select
          value={categoria}
          onChange={(e) =>
            setCategoria(
              e.target.value
            )
          }
          className="border border-gray-200 rounded-xl px-3 py-2"
        >

          {categorie.map(
            (categoria) => (

              <option
                key={categoria}
              >

                {categoria}

              </option>
            )
          )}

        </select>

        {/* INDIRIZZO */}
        <input
          value={indirizzo}
          onChange={(e) =>
            setIndirizzo(
              e.target.value
            )
          }
          placeholder="Indirizzo"
          className="border border-gray-200 rounded-xl px-3 py-2"
        />

        {/* CONVENZIONE */}
        <input
          value={convenzione}
          onChange={(e) =>
            setConvenzione(
              e.target.value
            )
          }
          placeholder="Convenzione"
          className="border border-gray-200 rounded-xl px-3 py-2"
        />

        {/* SCONTO */}
        <input
          value={sconto}
          onChange={(e) =>
            setSconto(
              e.target.value
            )
          }
          placeholder="Sconto"
          className="border border-gray-200 rounded-xl px-3 py-2"
        />

        {/* TELEFONO */}
        <input
          value={telefono}
          onChange={(e) =>
            setTelefono(
              e.target.value
            )
          }
          placeholder="Telefono"
          className="border border-gray-200 rounded-xl px-3 py-2"
        />

        {/* SITO */}
        <input
          value={sito}
          onChange={(e) =>
            setSito(
              e.target.value
            )
          }
          placeholder="Sito web"
          className="border border-gray-200 rounded-xl px-3 py-2"
        />

        {/* FASCE */}
        <div className="flex flex-col gap-4">

          <div className="flex items-center justify-between">

            <h3 className="font-semibold text-gray-900">

              Fasce orarie

            </h3>

            <button
              type="button"
              onClick={addFascia}
              className="flex items-center gap-2 text-sm text-trenord-green font-medium"
            >

              <Plus className="w-4 h-4" />

              Aggiungi fascia

            </button>

          </div>

          {fasceOrarie.map(
            (
              fascia,
              index
            ) => (

              <div
                key={index}
                className="border border-gray-200 rounded-2xl p-4 flex flex-col gap-4"
              >

                {/* TOP */}
                <div className="flex items-center justify-between">

                  <h4 className="font-medium text-gray-800">

                    Fascia {index + 1}

                  </h4>

                  {fasceOrarie.length >
                    1 && (

                    <button
                      type="button"
                      onClick={() =>
                        removeFascia(
                          index
                        )
                      }
                    >

                      <Trash2 className="w-4 h-4 text-red-500" />

                    </button>
                  )}

                </div>

                {/* GIORNI */}
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
                            toggleGiorno(
                              index,
                              giorno
                            )
                          }
                          className={`rounded-xl border py-2 text-sm font-medium transition-colors ${
                            active
                              ? 'bg-trenord-green text-white border-trenord-green'
                              : 'bg-white border-gray-200 text-gray-700'
                          }`}
                        >

                          {giorno}

                        </button>
                      );
                    }
                  )}

                </div>

                {/* ORARI */}
                <div className="grid grid-cols-2 gap-3">

                  <input
                    type="time"
                    value={
                      fascia.apertura
                    }
                    onChange={(e) =>
                      updateFascia(
                        index,
                        'apertura',
                        e.target.value
                      )
                    }
                    className="border border-gray-200 rounded-xl px-3 py-2"
                  />

                  <input
                    type="time"
                    value={
                      fascia.chiusura
                    }
                    onChange={(e) =>
                      updateFascia(
                        index,
                        'chiusura',
                        e.target.value
                      )
                    }
                    className="border border-gray-200 rounded-xl px-3 py-2"
                  />

                </div>

              </div>
            )
          )}

        </div>

        {/* NOTE */}
        <textarea
          value={note}
          onChange={(e) =>
            setNote(
              e.target.value
            )
          }
          placeholder="Note"
          className="border border-gray-200 rounded-xl px-3 py-2 min-h-[120px]"
        />

        {/* SUBMIT */}
        <button
          onClick={submit}
          disabled={loading}
          className="bg-trenord-green text-white rounded-xl py-3 font-medium"
        >

          {loading
            ? 'Invio...'
            : 'Invia contributo'}

        </button>

      </div>

    </div>
  );
}