import { useState } from 'react';

import {
  ChevronDown,
  ChevronUp,
  KeyRound,
  MapPin,
  Microwave,
  Coffee,
  Droplets,
  Snowflake,
  Check,
  X,
  MessageSquarePlus,
} from 'lucide-react';

import type {
  Saletta,
} from '../lib/database.types';

import { formatTitle } from '../lib/format';

import SegnalazioneModal from './SegnalazioneModal';

interface Props {
  stazioneName?: string;
  salette?: Saletta[];
}

export default function SalettaCard({
  stazioneName,
  salette = [],
}: Props) {

  const [expanded, setExpanded] =
    useState(false);

  const [showModal, setShowModal] =
    useState(false);

  const [selectedSalettaId, setSelectedSalettaId] =
    useState<string | null>(null);

  return (

    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* HEADER */}
        <button
          onClick={() =>
            setExpanded(!expanded)
          }
          className="w-full text-left p-4 flex items-center justify-between"
        >

          <div>

            <h2 className="text-xl font-bold text-gray-900">

              {formatTitle(stazioneName)}

            </h2>

            <p className="text-sm text-gray-500 mt-1">

              {salette.length} servizi disponibili

            </p>

          </div>

          {expanded ? (

            <ChevronUp className="w-5 h-5 text-gray-400" />

          ) : (

            <ChevronDown className="w-5 h-5 text-gray-400" />

          )}

        </button>

        {/* CONTENUTO */}
        {expanded && (

          <div className="border-t border-gray-100 p-4 flex flex-col gap-4 bg-gray-50">

            {salette.map((saletta) => (

              <div
                key={saletta.id}
                className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-4"
              >

                {/* TIPO */}
                <div className="flex items-center justify-between">

                  <div>

                    <h3 className="font-semibold text-gray-900 text-lg">

                      {formatTitle(saletta.tipo)}

                    </h3>

                    {saletta.ubicazione && (

                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">

                        <MapPin className="w-4 h-4" />

                        <span>

                          {formatTitle(
                            saletta.ubicazione
                          )}

                        </span>

                      </div>
                    )}

                  </div>

                </div>

                {/* CODICE */}
                {saletta.codice_accesso && (

                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">

                    <KeyRound className="w-4 h-4 text-trenord-green flex-shrink-0" />

                    <div className="flex flex-col">

                      <span className="text-[11px] uppercase tracking-wide text-gray-400">

                        Codice accesso

                      </span>

                      <span className="text-sm font-semibold text-gray-800">

                        {saletta.codice_accesso}

                      </span>

                    </div>

                  </div>
                )}

                {/* SERVIZI */}
                <div className="grid grid-cols-2 gap-3">

                  {/* MICROONDE */}
                  <div
                    className={`flex items-center gap-2 text-sm ${
                      saletta.microonde
                        ? 'text-emerald-600'
                        : 'text-gray-400'
                    }`}
                  >

                    <Microwave className="w-4 h-4" />

                    {saletta.microonde ? (

                      <Check className="w-4 h-4" />

                    ) : (

                      <X className="w-4 h-4" />

                    )}

                    <span>

                      Microonde

                    </span>

                  </div>

                  {/* DISTRIBUTORI */}
                  <div
                    className={`flex items-center gap-2 text-sm ${
                      saletta.distributori
                        ? 'text-emerald-600'
                        : 'text-gray-400'
                    }`}
                  >

                    <Coffee className="w-4 h-4" />

                    {saletta.distributori ? (

                      <Check className="w-4 h-4" />

                    ) : (

                      <X className="w-4 h-4" />

                    )}

                    <span>

                      Distributori

                    </span>

                  </div>

                  {/* ACQUA */}
                  <div
                    className={`flex items-center gap-2 text-sm ${
                      saletta.acqua
                        ? 'text-emerald-600'
                        : 'text-gray-400'
                    }`}
                  >

                    <Droplets className="w-4 h-4" />

                    {saletta.acqua ? (

                      <Check className="w-4 h-4" />

                    ) : (

                      <X className="w-4 h-4" />

                    )}

                    <span>

                      Acqua

                    </span>

                  </div>

                  {/* CLIMATIZZATA */}
                  <div
                    className={`flex items-center gap-2 text-sm ${
                      saletta.climatizzata
                        ? 'text-emerald-600'
                        : 'text-gray-400'
                    }`}
                  >

                    <Snowflake className="w-4 h-4" />

                    {saletta.climatizzata ? (

                      <Check className="w-4 h-4" />

                    ) : (

                      <X className="w-4 h-4" />

                    )}

                    <span>

                      Climatizzata

                    </span>

                  </div>

                </div>

                {/* NOTE */}
                {saletta.note && (

                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm text-gray-600">

                    {formatTitle(
                      saletta.note
                    )}

                  </div>
                )}

                {/* BUTTON */}
                <button
                  onClick={() => {

                    setSelectedSalettaId(
                      saletta.id
                    );

                    setShowModal(true);
                  }}
                  className="self-start flex items-center gap-2 px-3 py-2 rounded-xl bg-trenord-green text-white text-xs font-medium hover:opacity-90 transition-opacity"
                >

                  <MessageSquarePlus className="w-4 h-4" />

                  Segnala modifica

                </button>

              </div>
            ))}

          </div>
        )}

      </div>

      {/* MODAL */}
      {showModal &&
        selectedSalettaId && (

        <SegnalazioneModal
          salettaId={
            selectedSalettaId
          }
          onClose={() =>
            setShowModal(false)
          }
        />
      )}

    </>
  );
}