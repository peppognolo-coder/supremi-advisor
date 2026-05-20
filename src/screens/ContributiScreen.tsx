import { useState } from 'react';

import {
  Building2,
  Store,
  Train,
} from 'lucide-react';

import ContributoSalettaForm from '../components/forms/ContributoSalettaForm';

import ContributoAttivitaForm from '../components/forms/ContributoAttivitaForm';

import ContributoStazioneForm from '../components/forms/ContributoStazioneForm';

type TipoContributo =
  | null
  | 'saletta'
  | 'attivita'
  | 'stazione';

export default function ContributiScreen() {

  const [tipo, setTipo] =
    useState<TipoContributo>(null);

  // =========================
  // SALETTA
  // =========================

  if (tipo === 'saletta') {

    return (
      <ContributoSalettaForm
        onBack={() =>
          setTipo(null)
        }
      />
    );
  }

  // =========================
  // ATTIVITA
  // =========================

  if (tipo === 'attivita') {

    return (
      <ContributoAttivitaForm
        onBack={() =>
          setTipo(null)
        }
      />
    );
  }

  // =========================
  // STAZIONE
  // =========================

  if (tipo === 'stazione') {

    return (
      <ContributoStazioneForm
        onBack={() =>
          setTipo(null)
        }
      />
    );
  }

  // =========================
  // SELECT
  // =========================

  return (

    <div className="flex flex-col gap-4">

      {/* TITLE */}
      <div>

        <h1 className="text-2xl font-bold text-gray-900">

          Contributi

        </h1>

        <p className="text-sm text-gray-500 mt-1">

          Invia nuove informazioni per migliorare il database

        </p>

      </div>

      {/* SALETTA */}
      <button
        onClick={() =>
          setTipo('saletta')
        }
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4 hover:border-trenord-green transition-colors"
      >

        <div className="w-12 h-12 rounded-xl bg-trenord-green/10 flex items-center justify-center">

          <Building2 className="w-6 h-6 text-trenord-green" />

        </div>

        <div className="text-left">

          <h2 className="font-semibold text-gray-900">

            Saletta

          </h2>

          <p className="text-sm text-gray-500 mt-1">

            Codici, servizi, ubicazioni, stato

          </p>

        </div>

      </button>

      {/* ATTIVITA */}
      <button
        onClick={() =>
          setTipo('attivita')
        }
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4 hover:border-trenord-green transition-colors"
      >

        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">

          <Store className="w-6 h-6 text-blue-600" />

        </div>

        <div className="text-left">

          <h2 className="font-semibold text-gray-900">

            Attività convenzionata

          </h2>

          <p className="text-sm text-gray-500 mt-1">

            Bar, ristoranti, market, hotel, convenzioni

          </p>

        </div>

      </button>

      {/* STAZIONE */}
      <button
        onClick={() =>
          setTipo('stazione')
        }
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4 hover:border-trenord-green transition-colors"
      >

        <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">

          <Train className="w-6 h-6 text-orange-600" />

        </div>

        <div className="text-left">

          <h2 className="font-semibold text-gray-900">

            Nuova stazione

          </h2>

          <p className="text-sm text-gray-500 mt-1">

            Aggiungi una nuova stazione ferroviaria al database

          </p>

        </div>

      </button>

    </div>
  );
}