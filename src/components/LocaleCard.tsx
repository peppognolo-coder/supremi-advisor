import {
  useEffect,
  useState,
} from 'react';

import {
  MapPin,
  Navigation,
  Percent,
  Phone,
  Globe,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../lib/supabase';

import RatingStars from './RatingStars';

import { getDeviceId } from '../lib/device';

interface Props {

  locale: any;
}

interface Valutazione {

  id: string;

  voto: number;

  device_id: string;
}

export default function LocaleCard({
  locale,
}: Props) {

  const [
    valutazioni,
    setValutazioni,
  ] = useState<
    Valutazione[]
  >([]);

  const [
    myVote,
    setMyVote,
  ] = useState(0);

  const [
    average,
    setAverage,
  ] = useState(0);

  const [loading, setLoading] =
    useState(false);

  const deviceId =
    getDeviceId();

  // =========================
  // LOAD RATINGS
  // =========================

  async function loadRatings() {

    const {
      data,
      error,
    } = await supabase

      .from(
        'attivita_valutazioni'
      )

      .select('*')

      .eq(
        'attivita_id',
        locale.id
      );

    if (error) {

      console.error(error);

      return;
    }

    const ratings =
      (data ??
        []) as Valutazione[];

    setValutazioni(
      ratings
    );

    // =====================
    // USER VOTE
    // =====================

    const mine =
      ratings.find(
        (r) =>
          r.device_id ===
          deviceId
      );

    setMyVote(
      mine?.voto ?? 0
    );

    // =====================
    // AVERAGE
    // =====================

    if (
      ratings.length === 0
    ) {

      setAverage(0);

      return;
    }

    const avg =

      ratings.reduce(
        (sum, r) =>
          sum + r.voto,
        0
      ) / ratings.length;

    setAverage(avg);
  }

  // =========================
  // REALTIME
  // =========================

  useEffect(() => {

    loadRatings();

    const channel =
      supabase

        .channel(
          `ratings-${locale.id}`
        )

        .on(
          'postgres_changes',

          {
            event: '*',
            schema: 'public',
            table:
              'attivita_valutazioni',
          },

          () => {

            loadRatings();
          }
        )

        .subscribe();

    return () => {

      supabase.removeChannel(
        channel
      );
    };

  }, [locale.id]);

  // =========================
  // RATE
  // =========================

  async function submitVote(
    voto: number
  ) {

    setLoading(true);

    try {

      const {
        error,
      } = await supabase

        .from(
          'attivita_valutazioni'
        )

        .upsert(

          {

            attivita_id:
              locale.id,

            device_id:
              deviceId,

            voto,
          },

          {
            onConflict:
              'attivita_id,device_id',
          }
        );

      if (error) {

        console.error(error);

        toast.error(
          'Errore invio voto'
        );

        setLoading(false);

        return;
      }

      setMyVote(voto);

      toast.success(
        'Valutazione salvata'
      );

      loadRatings();

    } catch (err) {

      console.error(err);

      toast.error(
        'Errore valutazione'
      );

    } finally {

      setLoading(false);
    }
  }

  return (

    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-4 shadow-sm">

      {/* TOP */}
      <div className="flex items-start justify-between gap-3">

        <div className="flex-1 min-w-0">

          {/* NAME */}
          <div className="flex items-center gap-2 flex-wrap">

            <h3 className="font-semibold text-gray-900">

              {locale.nome}

            </h3>

            {locale.convenzionato && (

              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-trenord-green/10 text-trenord-green text-[10px] font-bold uppercase tracking-wide">

                <Percent className="w-3 h-3" />

                Convenzionato

              </div>
            )}

          </div>

          {/* CATEGORY */}
          <p className="text-sm text-gray-400 mt-1">

            {locale.categoria}

          </p>

        </div>

      </div>

      {/* ADDRESS */}
      {locale.indirizzo && (

        <div className="flex items-start gap-2 text-sm text-gray-600">

          <MapPin className="w-4 h-4 mt-0.5 text-gray-400" />

          <span>

            {locale.indirizzo}

          </span>

        </div>
      )}

      {/* ORARI */}
      {locale.fasce_orarie &&
        locale.fasce_orarie
          .length > 0 && (

        <div className="flex flex-col gap-2">

          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">

            Orari

          </h4>

          {locale.fasce_orarie.map(
            (
              fascia: any,
              index: number
            ) => (

              <div
                key={index}
                className="bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-700"
              >

                <div className="font-medium">

                  {fascia.giorni.join(
                    ', '
                  )}

                </div>

                <div className="text-gray-500">

                  {fascia.apertura} →{' '}
                  {fascia.chiusura}

                </div>

              </div>
            )
          )}

        </div>
      )}

      {/* CONTACT */}
      <div className="flex items-center gap-3 flex-wrap">

        {locale.telefono && (

          <a
            href={`tel:${locale.telefono}`}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 text-sm text-gray-700"
          >

            <Phone className="w-4 h-4" />

            Chiama

          </a>
        )}

        {locale.sito && (

          <a
            href={locale.sito}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 text-sm text-gray-700"
          >

            <Globe className="w-4 h-4" />

            Sito

          </a>
        )}

        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            locale.maps_query ||
            locale.nome
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-trenord-green text-white text-sm"
        >

          <Navigation className="w-4 h-4" />

          Apri Maps

        </a>

      </div>

      {/* NOTES */}
      {locale.note && (

        <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">

          {locale.note}

        </div>
      )}

      {/* RATINGS */}
      <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">

        {/* AVG */}
        <div className="flex items-center justify-between gap-3 flex-wrap">

          <div className="flex items-center gap-3">

            <RatingStars
              value={Math.round(
                average
              )}
              readonly
            />

            <div className="text-sm text-gray-600">

              {average > 0
                ? average.toFixed(
                    1
                  )
                : 'Nessun voto'}

              {' · '}

              {
                valutazioni.length
              } voti

            </div>

          </div>

        </div>

        {/* USER RATE */}
        <div className="flex flex-col gap-2">

          <div className="text-xs uppercase tracking-wide text-gray-400 font-semibold">

            La tua valutazione

          </div>

          <RatingStars
            value={myVote}
            onChange={
              submitVote
            }
          />

          {loading && (

            <div className="text-xs text-gray-400">

              Salvataggio...

            </div>
          )}

        </div>

      </div>

    </div>
  );
}