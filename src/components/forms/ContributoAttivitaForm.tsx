import { useState, useEffect } from 'react';

import {
  ArrowLeft,
  Store,
  Clock3,
  Phone,
  Globe,
  Percent,
  MapPin,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../../lib/supabase';

interface Props {

  onBack: () => void;

  stazionePredefinitaId?: string;
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

const giorni = [
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

  // =========================
  // STATE
  // =========================

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

  const [apertura, setApertura] =
    useState('');

  const [chiusura, setChiusura] =
    useState('');

  const [note, setNote] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [giorniAttivi, setGiorniAttivi] =
    useState<string[]>([]);

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

        console.error(error);

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
  // TOGGLE GIORNI
  // =========================

  function toggleGiorno(
    giorno: string
  ) {

    if (
      giorniAttivi.includes(
        giorno
      )
    ) {

      setGiorniAttivi(
        giorniAttivi.filter(
          (g) =>
            g !== giorno
        )
      );

    } else {

      setGiorniAttivi([
        ...giorniAttivi,
        giorno,
      ]);
    }
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

      // =====================
      // STAZIONE INFO
      // =====================

      const stazione =
        stazioni.find(
          (s) =>
            s.id ===
            stazioneId
        );

      // =====================
      // PAYLOAD
      // =====================

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

        apertura,

        chiusura,

        giorni:
          giorniAttivi,

        note:
          note.trim(),
      };

      // =====================
      // INSERT
      // =====================

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

      // =====================
      // SUCCESS
      // =====================

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

        <p className="text-sm text-gray-500 mt-1">

          Invia nuove convenzioni o aggiorna informazioni

        </p>

      </div>

      {/* FORM */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-4">

        {/* STAZIONE */}
        <div>

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Stazione

          </label>

          <select
            value={stazioneId}
            onChange={(e) =>
              setStazioneId(
                e.target.value
              )
            }
            className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full"
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

        </div>

        {/* NOME */}
        <div>

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Nome attività

          </label>

          <div className="relative mt-1">

            <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

            <input
              value={nome}
              onChange={(e) =>
                setNome(
                  e.target.value
                )
              }
              placeholder="Es. Bar Stazione"
              className="w-full border border-gray-200 rounded-xl pl-10 pr-3 py-2"
            />

          </div>

        </div>

        {/* CATEGORIA */}
        <div>

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Categoria

          </label>

          <select
            value={categoria}
            onChange={(e) =>
              setCategoria(
                e.target.value
              )
            }
            className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full"
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

        </div>

        {/* INDIRIZZO */}
        <div>

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Indirizzo

          </label>

          <div className="relative mt-1">

            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

            <input
              value={indirizzo}
              onChange={(e) =>
                setIndirizzo(
                  e.target.value
                )
              }
              placeholder="Es. Piazza Duca d'Aosta 1"
              className="w-full border border-gray-200 rounded-xl pl-10 pr-3 py-2"
            />

          </div>

        </div>

        {/* CONVENZIONE */}
        <div>

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Convenzione

          </label>

          <input
            value={convenzione}
            onChange={(e) =>
              setConvenzione(
                e.target.value
              )
            }
            placeholder="Es. Sconto dipendenti Trenord"
            className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full"
          />

        </div>

        {/* SCONTO */}
        <div>

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Sconto

          </label>

          <div className="relative mt-1">

            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

            <input
              value={sconto}
              onChange={(e) =>
                setSconto(
                  e.target.value
                )
              }
              placeholder="Es. 10%"
              className="w-full border border-gray-200 rounded-xl pl-10 pr-3 py-2"
            />

          </div>

        </div>

        {/* TELEFONO */}
        <div>

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Telefono

          </label>

          <div className="relative mt-1">

            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

            <input
              value={telefono}
              onChange={(e) =>
                setTelefono(
                  e.target.value
                )
              }
              placeholder="Es. 02 1234567"
              className="w-full border border-gray-200 rounded-xl pl-10 pr-3 py-2"
            />

          </div>

        </div>

        {/* SITO */}
        <div>

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Sito web

          </label>

          <div className="relative mt-1">

            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

            <input
              value={sito}
              onChange={(e) =>
                setSito(
                  e.target.value
                )
              }
              placeholder="https://..."
              className="w-full border border-gray-200 rounded-xl pl-10 pr-3 py-2"
            />

          </div>

        </div>

        {/* GIORNI */}
        <div className="flex flex-col gap-3">

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Giorni apertura

          </label>

          <div className="grid grid-cols-4 gap-2">

            {giorni.map(
              (giorno) => {

                const active =
                  giorniAttivi.includes(
                    giorno
                  );

                return (

                  <button
                    key={giorno}
                    type="button"
                    onClick={() =>
                      toggleGiorno(
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

        </div>

        {/* ORARI */}
        <div className="grid grid-cols-2 gap-3">

          <div>

            <label className="text-xs font-semibold text-gray-400 uppercase">

              Apertura

            </label>

            <div className="relative mt-1">

              <Clock3 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

              <input
                type="time"
                value={apertura}
                onChange={(e) =>
                  setApertura(
                    e.target.value
                  )
                }
                className="w-full border border-gray-200 rounded-xl pl-10 pr-3 py-2"
              />

            </div>

          </div>

          <div>

            <label className="text-xs font-semibold text-gray-400 uppercase">

              Chiusura

            </label>

            <div className="relative mt-1">

              <Clock3 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

              <input
                type="time"
                value={chiusura}
                onChange={(e) =>
                  setChiusura(
                    e.target.value
                  )
                }
                className="w-full border border-gray-200 rounded-xl pl-10 pr-3 py-2"
              />

            </div>

          </div>

        </div>

        {/* NOTE */}
        <div>

          <label className="text-xs font-semibold text-gray-400 uppercase">

            Note

          </label>

          <textarea
            value={note}
            onChange={(e) =>
              setNote(
                e.target.value
              )
            }
            placeholder="Inserisci informazioni aggiuntive..."
            className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full min-h-[120px]"
          />

        </div>

        {/* SUBMIT */}
        <button
          onClick={submit}
          disabled={loading}
          className="bg-trenord-green text-white rounded-xl py-3 font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >

          {loading
            ? 'Invio...'
            : 'Invia contributo'}

        </button>

      </div>

    </div>
  );
}