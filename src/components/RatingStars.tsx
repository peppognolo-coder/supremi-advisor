import {
  Star,
} from 'lucide-react';

interface Props {

  value: number;

  onChange?: (
    value: number
  ) => void;

  size?: number;

  readonly?: boolean;
}

export default function RatingStars({

  value,

  onChange,

  size = 18,

  readonly = false,
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
              type="button"
              disabled={
                readonly
              }
              onClick={() =>
                onChange?.(
                  star
                )
              }
              className={`transition-transform ${
                readonly
                  ? ''
                  : 'hover:scale-110'
              }`}
            >

              <Star
                size={size}
                className={`${
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