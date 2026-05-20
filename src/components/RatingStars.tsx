import {
  Star,
} from 'lucide-react';

interface Props {

  value: number;

  onRate?: (
    voto: number
  ) => void;

  small?: boolean;
}

export default function RatingStars({
  value,
  onRate,
  small,
}: Props) {

  return (

    <div className="flex items-center gap-1">

      {[1, 2, 3, 4, 5].map(
        (star) => {

          const active =
            star <= value;

          return (

            <button
              key={star}
              disabled={!onRate}
              onClick={() =>
                onRate?.(star)
              }
              className={`transition-transform ${
                onRate
                  ? 'hover:scale-110'
                  : ''
              }`}
            >

              <Star
                className={`${
                  small
                    ? 'w-3.5 h-3.5'
                    : 'w-5 h-5'
                } ${
                  active
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />

            </button>
          );
        }
      )}

    </div>
  );
}