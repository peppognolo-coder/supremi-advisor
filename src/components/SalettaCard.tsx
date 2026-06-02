import { useState } from 'react';

import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Microwave,
  Coffee,
  Droplets,
  Snowflake,
  MessageSquarePlus,
} from 'lucide-react';

import type {
  Saletta,
} from '../lib/database.types';

import { formatTitle } from '../lib/format';

import SegnalazioneModal from './SegnalazioneModal';

import SalettaVerifica from './SalettaVerifica';

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

                {/* DOTAZIONI */}
                <div className="grid grid-cols-2 gap-2">

                  {/* MICROONDE */}
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      saletta.microonde
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-gray-50 text-gray-400 border border-gray-100'
                    }`}
                  >

                    <Microwave
                      className={`w-4 h-4 flex-shrink-0 ${
                        saletta.microonde
                          ? 'text-emerald-600'
                          : 'text-gray-300'
                      }`}
                    />

                    <span>

                      Microonde

                    </span>

                  </div>

                  {/* DISTRIBUTORI */}
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      saletta.distributori
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-gray-50 text-gray-400 border border-gray-100'
                    }`}
                  >

                    <Coffee
                      className={`w-4 h-4 flex-shrink-0 ${
                        saletta.distributori
                          ? 'text-emerald-600'
                          : 'text-gray-300'
                      }`}
                    />

                    <span>

                      Distributori

                    </span>

                  </div>

                  {/* ACQUA */}
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      saletta.acqua
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-gray-50 text-gray-400 border border-gray-100'
                    }`}
                  >

                    <Droplets
                      className={`w-4 h-4 flex-shrink-0 ${
                        saletta.acqua
                          ? 'text-emerald-600'
                          : 'text-gray-300'
                      }`}
                    />

                    <span>

                      Acqua

                    </span>

                  </div>

                  {/* CLIMATIZZATA */}
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      saletta.climatizzata
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-gray-50 text-gray-400 border border-gray-100'
                    }`}
                  >

                    <Snowflake
                      className={`w-4 h-4 flex-shrink-0 ${
                        saletta.climatizzata
                          ? 'text-emerald-600'
                          : 'text-gray-300'
                      }`}
                    />

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

                {/* VERIFICA RAPIDA */}
                <SalettaVerifica
                  salettaId={saletta.id}
                />

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