import { useState } from 'react';
import { useScrollLock } from '../lib/useScrollLock';

import {
  X,
  Store,
  Clock3,
  Plus,
  Trash2,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../lib/supabase';

import { useSwipeDown } from '../lib/useSwipeDown';

interface Props {

  stazioneId: string;

  onClose: () => void;
}

interface FasciaOraria {

  giorni: string[];

  apertura: string;

  chiusura: string;
}

const GIORNI = [

  'Lun',
  'Mar',
  'Mer',
  'Gio',
  'Ven',
  'Sab',
  'Dom',
];

export default function AddAttivitaModal({

  stazioneId,

  onClose,

}: Props) {
  const { panelRef, dragStyle, handleDragStart } = useSwipeDown({ onClose: onClose });
  useScrollLock();


  const [loading, setLoading] =
    useState(false);

  const [nome, setNome] =
    useState('');

  const [categoria, setCategoria] =
    useState('Bar');

  const [indirizzo, setIndirizzo] =
    useState('');

  const [ubicazione, setUbicazione] =
    useState('');

  const [
    distanzaPiedi,
    setDistanzaPiedi,
  ] = useState('');

  const [note, setNote] =
    useState('');

  const [
    convenzionato,
    setConvenzionato,
  ] = useState(false);

  // =========================
  // FASCE ORARIE
  // =========================

  const [
    fasceOrarie,
    setFasceOrarie,
  ] = useState<FasciaOraria[]>([
    {
      giorni: [],
      apertura: '',
      chiusura: '',
    },
  ]);

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
        (_, i) => i !== index
      )
    );
  }

  function updateFascia(
    index: number,
    field: string,
    value: any
  ) {

    const updated = [...fasceOrarie];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    setFasceOrarie(updated);
  }

  function toggleGiorno(
    fasciaIndex: number,
    giorno: string
  ) {

    const fascia =
      fasceOrarie[fasciaIndex];

    const nuoviGiorni =
      fascia.giorni.includes(giorno)
        ? fascia.giorni.filter(
            (g) => g !== giorno
          )
        : [...fascia.giorni, giorno];

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

    if (!nome.trim()) {

      toast.error(
        'Inserisci nome attività'
      );

      return;
    }

    try {

      setLoading(true);

      const payload = {

        stazione_id: stazioneId,

        nome,

        categoria,

        indirizzo,

        distanza_piedi: distanzaPiedi,

        ubicazione,

        note,

        convenzionato,

        fasce_orarie: fasceOrarie,
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
          'Errore invio proposta'
        );

        return;
      }

      toast.success(
        'Proposta inviata'
      );

      onClose();

    } catch (err) {

      console.error(err);

      toast.error(
        'Errore imprevisto'
      );

    } finally {

      setLoading(false);
    }
  }

  return (

    <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center p-4 overflow-y-auto">

      <div ref={panelRef} style={dragStyle} onTouchStart={handleDragStart} className="bg-white rounded-3xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto pb-32 flex flex-col gap-4 animate-in slide-in-from-bottom duration-200 my-auto">
          {/* DRAG INDICATOR */}
          <div className="flex justify-center pt-1 pb-1 cursor-grab active:cursor-grabbing flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

        {/* HEADER */}
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-2">

            <Store className="w-5 h-5 text-trenord-green" />

            <h2 className="text-lg font-semibold">

              Aggiungi attività

            </h2>

          </div>

          <button onClick={onClose}>

            <X className="w-5 h-5 text-gray-400" />

          </button>

        </div>

        {/* NOME */}
        <input
          type="text"
          value={nome}
          onChange={(e) =>
            setNome(e.target.value)
          }
          className="border rounded-2xl px-3 py-3 text-sm"
          placeholder="Nome attività"
        />

        {/* CATEGORIA */}
        <select
          value={categoria}
          onChange={(e) =>
            setCategoria(e.target.value)
          }
          className="border rounded-2xl px-3 py-3 text-sm"
        >

          <option>Bar</option>
          <option>Ristorante</option>
          <option>Fast Food</option>
          <option>Market</option>
          <option>Farmacia</option>
          <option>Tabacchi</option>

        </select>

        {/* INDIRIZZO */}
        <input
          type="text"
          value={indirizzo}
          onChange={(e) =>
            setIndirizzo(e.target.value)
          }
          className="border rounded-2xl px-3 py-3 text-sm"
          placeholder="Indirizzo"
        />

        {/* DISTANZA A PIEDI */}
        <select
          value={distanzaPiedi}
          onChange={(e) =>
            setDistanzaPiedi(e.target.value)
          }
          className="border rounded-2xl px-3 py-3 text-sm"
        >

          <option value="">

            Distanza dalla stazione

          </option>

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

        {/* UBICAZIONE */}
        <input
          type="text"
          value={ubicazione}
          onChange={(e) =>
            setUbicazione(e.target.value)
          }
          className="border rounded-2xl px-3 py-3 text-sm"
          placeholder="Ubicazione"
        />

        {/* CONVENZIONATO */}
        <button
          type="button"
          onClick={() =>
            setConvenzionato(!convenzionato)
          }
          className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${
            convenzionato
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-white border-gray-200'
          }`}
        >

          <span className="text-sm font-medium">

            Convenzionato Trenord

          </span>

          <div
            className={`w-5 h-5 rounded-full border-2 ${
              convenzionato
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-gray-300'
            }`}
          />

        </button>

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

              Aggiungi

            </button>

          </div>

          {fasceOrarie.map(
            (fascia, index) => (

              <div
                key={index}
                className="border border-gray-200 rounded-2xl p-4 flex flex-col gap-4"
              >

                <div className="flex items-center justify-between">

                  <h4 className="font-medium text-gray-800">

                    Fascia {index + 1}

                  </h4>

                  {fasceOrarie.length > 1 && (

                    <button
                      type="button"
                      onClick={() =>
                        removeFascia(index)
                      }
                    >

                      <Trash2 className="w-4 h-4 text-red-500" />

                    </button>
                  )}

                </div>

                <div className="flex flex-wrap gap-2">

                  {GIORNI.map((giorno) => {

                    const active =
                      fascia.giorni.includes(giorno);

                    return (

                      <button
                        key={giorno}
                        type="button"
                        onClick={() =>
                          toggleGiorno(index, giorno)
                        }
                        className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          active
                            ? 'bg-trenord-green text-white'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >

                        {giorno}

                      </button>
                    );
                  })}

                </div>

                <div className="grid grid-cols-2 gap-3">

                  <div>

                    <label className="text-xs text-gray-400">

                      Apertura

                    </label>

                    <input
                      type="time"
                      value={fascia.apertura}
                      onChange={(e) =>
                        updateFascia(
                          index,
                          'apertura',
                          e.target.value
                        )
                      }
                      className="border rounded-2xl px-3 py-3 text-sm w-full"
                    />

                  </div>

                  <div>

                    <label className="text-xs text-gray-400">

                      Chiusura

                    </label>

                    <input
                      type="time"
                      value={fascia.chiusura}
                      onChange={(e) =>
                        updateFascia(
                          index,
                          'chiusura',
                          e.target.value
                        )
                      }
                      className="border rounded-2xl px-3 py-3 text-sm w-full"
                    />

                  </div>

                </div>

              </div>
            )
          )}

        </div>

        {/* NOTE */}
        <textarea
          value={note}
          onChange={(e) =>
            setNote(e.target.value)
          }
          className="border rounded-2xl px-3 py-3 text-sm min-h-[100px]"
          placeholder="Note"
        />

        {/* BUTTON */}
        <button
          onClick={submit}
          disabled={loading}
          className="bg-trenord-green text-white rounded-2xl py-4 font-semibold text-sm sticky bottom-0"
        >

          {loading
            ? 'Invio proposta...'
            : 'Invia proposta'}

        </button>

      </div>

    </div>
  );
}
