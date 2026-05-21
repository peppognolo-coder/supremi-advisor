import {
  Store,
  Coffee,
  Utensils,
  ShoppingBag,
  Star,
  MapPin,
  Clock3,
  BadgeCheck,
} from 'lucide-react';

interface Props {
  attivita: any;
  onClick?: () => void;
}

export default function AttivitaCard({
  attivita,
  onClick,
}: Props) {

  const valutazioni =
    attivita.valutazioni || [];

  const media =
    valutazioni.length > 0
      ? valutazioni.reduce(
          (sum: number, v: any) =>
            sum + (v.voto || 0),
          0
        ) / valutazioni.length
      : 0;

  function getIcon() {

    const categoria =
      (
        attivita.categoria || ''
      ).toLowerCase();

    if (
      categoria.includes('bar')
    ) {
      return Coffee;
    }

    if (
      categoria.includes('ristor')
    ) {
      return Utensils;
    }

    if (
      categoria.includes('market')
    ) {
      return ShoppingBag;
    }

    return Store;
  }

  const Icon = getIcon();

  return (

    <button
      onClick={onClick}
      className="
        w-full
        bg-white
        border
        border-gray-200
        rounded-2xl
        p-4
        text-left
        transition
        hover:shadow-md
      "
    >

      <div className="flex gap-3">

        <div
          className="
            w-12
            h-12
            rounded-xl
            bg-trenord-green/10
            flex
            items-center
            justify-center
            shrink-0
          "
        >

          <Icon
            className="
              w-6
              h-6
              text-trenord-green
            "
          />

        </div>

        <div className="flex-1">

          <div className="flex items-start justify-between gap-3">

            <div>

              <h3
                className="
                  font-semibold
                  text-gray-900
                "
              >
                {attivita.nome}
              </h3>

              <p
                className="
                  text-sm
                  text-gray-500
                "
              >
                {attivita.categoria}
              </p>

            </div>

            {attivita.convenzionato && (

              <div
                className="
                  flex
                  items-center
                  gap-1
                  text-xs
                  text-green-700
                  bg-green-50
                  px-2
                  py-1
                  rounded-full
                "
              >

                <BadgeCheck
                  className="w-3 h-3"
                />

                Convenzionato

              </div>
            )}

          </div>

          <div
            className="
              flex
              items-center
              gap-2
              mt-3
            "
          >

            <Star
              className="
                w-4
                h-4
                text-yellow-500
                fill-yellow-500
              "
            />

            <span
              className="
                text-sm
                font-medium
              "
            >
              {media.toFixed(1)}
            </span>

            <span
              className="
                text-xs
                text-gray-400
              "
            >
              ({valutazioni.length})
            </span>

          </div>

          {attivita.posizione && (

            <div
              className="
                flex
                items-center
                gap-2
                mt-2
                text-sm
                text-gray-600
              "
            >

              <MapPin
                className="w-4 h-4"
              />

              {attivita.posizione}

            </div>
          )}

          {attivita.distanza_piedi && (

            <div
              className="
                flex
                items-center
                gap-2
                mt-1
                text-sm
                text-gray-600
              "
            >

              <Clock3
                className="w-4 h-4"
              />

              {attivita.distanza_piedi}

            </div>
          )}

        </div>

      </div>

    </button>
  );
}