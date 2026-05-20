import { useState, useEffect } from 'react';

import {
  ArrowLeft,
  Plus,
  Trash2,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../../lib/supabase';

interface Props {

  onBack: () => void;

  stazionePredefinitaId?: string;
}

interface FasciaOraria {

  giorni: string[];

  apertura: string;

  chiusura: string;
}

const categorie = [
  'Bar',
  'Ristorante',
  'Pizzeria',
  'Market',
  'Hotel',
  'Tabacchi',
  'Fast Food',
  'Farmacia',
  'Altro',
];

const giorniSettimana = [
  'Lun',
  'Mar',
  'Mer',
  'Gio',
  'Ven',
  'Sab',
  'Dom',
];

export default function ContributoAttivitaForm({
  onBack,
  stazionePredefinitaId,
}: Props) {

  const [stazioni, setStazioni] =
    useState<any[]>([]);

  const [stazioneId, setStazioneId] =
    useState(
      stazionePredefinitaId || ''
    );

  const [nome, setNome] =
    useState('');

  const [categoria, setCategoria] =
    useState(categorie[0]);

  const [indirizzo, setIndirizzo] =
    useState('');

  const [mapsQuery, setMapsQuery] =
    useState('');

  const [ubicazione, setUbicazione] =
    useState('');

  const [
    convenzionato,
    setConvenzionato,
  ] = useState(false);

  const [note, setNote] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [
    fasceOrarie,
    setFasceOrarie,
  ] = useState<
    FasciaOraria[]
  >([
    {
      giorni: [],
      apertura: '',
      chiusura: '',
    },
  ]);

  // =========================
  // DEBUG UUID
  // =========================

  useEffect(() => {

    console.log(
      'STAZIONE PREDEFINITA ID',
      stazionePredefinitaId
    );

    console.log(
      'STAZIONE ID STATE',
      stazioneId
    );

  }, [
    stazionePredefinitaId,
    stazioneId,
  ]);

  // =========================
  // LOAD STAZIONI
  // =========================

  useEffect(() => {

    async function loadStazioni() {

      const {
        data,
        error,
      } = await supabase

        .from('stazioni')

        .select('*')

        .order('nome', {
          ascending: true,
        });

      if (error) {

        console.error(error);

        toast.error(
          'Errore caricamento stazioni'
        );

        return;
      }

      setStazioni(
        data ?? []
      );
    }

    loadStazioni();

  }, []);

  // =========================
  // FASCE
  // =========================

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
        (_, i) =>
          i !== index
      )
    );
  }

  function updateFascia(
    index: number,
    field: string,
    value: any
  ) {

    const updated = [
      ...fasceOrarie,
    ];

    updated[index] = {

      ...updated[index],

      [field]: value,
    };

    setFasceOrarie(
      updated
    );
  }

  function toggleGiorno(
    fasciaIndex: number,
    giorno: string
  ) {

    const fascia =
      fasceOrarie[
        fasciaIndex
      ];

    const exists =
      fascia.giorni.includes(
        giorno
      );

    const nuoviGiorni =
      exists
        ? fascia.giorni.filter(
            (g) =>
              g !== giorno
          )
        : [
            ...fascia.giorni,
            giorno,
          ];

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

    if (!stazioneId) {

      toast.error(
        'Seleziona una stazione'
      );

      return;
    }

    if (!nome.trim()) {

      toast.error(
        'Inserisci il nome attività'
      );

      return;
    }

    setLoading(true);

    try {

      const payload = {

        stazione_id:
          stazioneId,

        nome:
          nome.trim(),

        categoria,

        indirizzo:
          indirizzo.trim(),

        maps_query:
          mapsQuery.trim(),

        ubicazione:
          ubicazione.trim(),

        convenzionato,

        note:
          note.trim(),

        fasce_orarie:
          fasceOrarie,
      };

      alert(
        JSON.stringify(
          payload,
          null,
          2
        )
      );

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
          'Errore invio contributo'
        );

        setLoading(false);

        return;
      }

      toast.success(
        'Contributo inviato'
      );

      setLoading(false);

      onBack();

    } catch (err) {

      console.error(err);

      toast.error(
        'Errore imprevisto'
      );

      setLoading(false);
    }
  }

  return (
    <div className="p-4">
      {/* RESTO IDENTICO */}
    </div>
  );
}