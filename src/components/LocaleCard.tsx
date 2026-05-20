import {
  Clock,
  MapPin,
  Star,
  Ticket
} from 'lucide-react';

import type {
  Locale
} from '../lib/database.types';

interface LocaleCardProps {
  locale: Locale;
}

export default function LocaleCard({
  locale,
}: LocaleCardProps) {

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">

      {/* HEADER */}
      <div className="flex items-start justify-between gap-3">

        <div>

          <h3 className="font-semibold text-gray-900 text-sm">
            {locale.nome}
          </h3>

          <p className="text-xs text-gray-400 mt-0.5">
            {locale.categoria}
          </p>

        </div>

        {locale.convenzionato && (
          <div className="flex items-center gap-1 bg-trenord-green/10 text-trenord-green text-[10px] font-semibold px-2 py-1 rounded-full">

            <Ticket className="w-3 h-3" />

            Convenzionato

          </div>
        )}

      </div>

      {/* RATING */}
      <div className="flex items-center gap-2">

        <div className="flex items-center gap-1 text-amber-500">

          <Star className="w-4 h-4 fill-amber-400" />

          <span className="text-sm font-semibold">
            {locale.rating.toFixed(1)}
          </span>

        </div>

        <span className="text-xs text-gray-400">
          ({locale.numero_voti} voti)
        </span>

      </div>

      {/* INFO */}
      <div className="flex flex-col gap-2 text-sm text-gray-600">

        {locale.orario && (
          <div className="flex items-center gap-2">

            <Clock className="w-4 h-4 text-gray-400" />

            <span>{locale.orario}</span>

          </div>
        )}

        {locale.distanza && (
          <div className="flex items-center gap-2">

            <MapPin className="w-4 h-4 text-gray-400" />

            <span>{locale.distanza}</span>

          </div>
        )}

      </div>

      {/* MAPS */}
      {locale.maps_query && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locale.maps_query)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 bg-trenord-green text-white text-sm font-medium rounded-xl px-4 py-2 text-center hover:bg-trenord-green/90 transition-colors"
        >
          Apri su Google Maps
        </a>
      )}

    </div>
  );
}