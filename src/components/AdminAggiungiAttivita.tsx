import { useEffect, useState } from 'react';

import {
  Plus,
} from 'lucide-react';

import { supabase } from '../lib/supabase';

interface Stazione {
  id: string;
  nome: string;
}

const categorie = [
  'bar',
  'fast_food',
  'ristorante',
  'supermercato',
  'farmacia',
  'tabacchi',
  'hotel',
  'altro',
];

export default function AdminAggiungiAttivita() {

  const [stazioni, setStazioni] =
    useState<Stazione[]>([]);

  const [stazioneId, setStazioneId] =
    useState('');

  const [nome, setNome] =
    useState('');

  const [categoria, setCategoria] =
    useState('bar');

  const [ubicazione, setUbicazione] =
    useState('');

  const [mapsQuery, setMapsQuery] =
    useState('');

  const [note, setNote] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {

    async function load() {

      const { data } =
        await supabase
          .from('stazioni')
          .select('id,nome')
          .order(
            'nome',
            {
              ascending: true,
            }
          );

      setStazioni(data ?? []);
    }

    load();

  }, []);

  async function submit() {

    if (
      !stazioneId ||
      !nome
    ) {
      alert(
        'Compila i campi obbligatori'
      );
      return;
    }

    setLoading(true);

    const { error } =
      await supabase
        .from('attivita_stazione')
        .insert({

          stazione_id:
            stazioneId,

          nome,

          categoria,

          ubicazione,

          maps_query:
            mapsQuery,

          note,
        });

    if (error) {

      console.error(error);

      alert(
        'Errore inserimento'
      );

    } else {

      alert(
        'Attività aggiunta'
      );

      setNome('');
      setUbicazione('');
      setMapsQuery('');
      setNote('');
    }

    setLoading(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-4">

      {/* TITLE */}
      <div className="flex items-center gap-2">

        <div className="w-9 h-9 rounded-xl bg-trenord-green/10 flex items-center justify-center">

          <Plus className="w-5 h-5 text-trenord-green" />

        </div>

        <div>

          <h2 className="font-semibold text-gray-900">

            Aggiungi attività

          </h2>

          <p className="text-xs text-gray-400">

            Inserimento manuale admin

          </p>

        </div>

      </div>

      {/* STAZIONE */}
      <div className="flex flex-col gap-1">

        <label className="text-sm font-medium text-gray-700">

          Stazione

        </label>

        <select
          value={stazioneId}
          onChange={(e) =>
            setStazioneId(
              e.target.value
            )
          }
          className="border border-gray-200 rounded-2xl px-4 py-3 text-base"
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
      <div className="flex flex-col gap-1">

        <label className="text-sm font-medium text-gray-700">

          Nome attività

        </label>

        <input
          type="text"
          value={nome}
          onChange={(e) =>
            setNome(
              e.target.value
            )
          }
          placeholder="McDonald's"
          className="border border-gray-200 rounded-2xl px-4 py-3 text-base"
        />

      </div>

      {/* CATEGORIA */}
      <div className="flex flex-col gap-1">

        <label className="text-sm font-medium text-gray-700">

          Categoria

        </label>

        <select
          value={categoria}
          onChange={(e) =>
            setCategoria(
              e.target.value
            )
          }
          className="border border-gray-200 rounded-2xl px-4 py-3 text-base"
        >

          {categorie.map(
            (categoria) => (

              <option
                key={categoria}
                value={categoria}
              >

                {categoria}

              </option>
            )
          )}

        </select>

      </div>

      {/* UBICAZIONE */}
      <div className="flex flex-col gap-1">

        <label className="text-sm font-medium text-gray-700">

          Ubicazione

        </label>

        <input
          type="text"
          value={ubicazione}
          onChange={(e) =>
            setUbicazione(
              e.target.value
            )
          }
          placeholder="Piazzale esterno lato binario 1"
          className="border border-gray-200 rounded-2xl px-4 py-3 text-base"
        />

      </div>

      {/* MAPS */}
      <div className="flex flex-col gap-1">

        <label className="text-sm font-medium text-gray-700">

          Google Maps query

        </label>

        <input
          type="text"
          value={mapsQuery}
          onChange={(e) =>
            setMapsQuery(
              e.target.value
            )
          }
          placeholder="McDonald's Milano Centrale"
          className="border border-gray-200 rounded-2xl px-4 py-3 text-base"
        />

      </div>

      {/* NOTE */}
      <div className="flex flex-col gap-1">

        <label className="text-sm font-medium text-gray-700">

          Note

        </label>

        <textarea
          value={note}
          onChange={(e) =>
            setNote(
              e.target.value
            )
          }
          placeholder="Info aggiuntive"
          className="border border-gray-200 rounded-2xl px-4 py-3 text-base min-h-[100px]"
        />

      </div>

      {/* BUTTON */}
      <button
        onClick={submit}
        disabled={loading}
        className="bg-trenord-green text-white rounded-2xl py-3 font-semibold text-sm hover:opacity-90 transition-opacity"
      >

        {loading
          ? 'Inserimento...'
          : 'Aggiungi attività'}

      </button>

    </div>
  );
}
