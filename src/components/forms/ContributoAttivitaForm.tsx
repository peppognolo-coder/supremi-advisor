import { useState, useEffect } from 'react';

import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  QrCode,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../../lib/supabase';
import { DISTANZE_ATTIVITA } from '../../lib/adminApi';

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

  const [ubicazione, setUbicazione] =
    useState('');

  const [
    distanzaPiedi,
    setDistanzaPiedi,
  ] = useState('');

  const [
    convenzionato,
    setConvenzionato,
  ] = useState(false);

  const [note, setNote] =
    useState('');

  // QR check-in — facoltativo, mostrato solo per categoria Hotel
  const [qrFile, setQrFile] =
    useState<File | null>(null);

  const [qrPreview, setQrPreview] =
    useState<string | null>(null);

  const [qrScadenza, setQrScadenza] =
    useState('');

  const [loading, setLoading] =
    useState(false);

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
        .eq('attiva', true)
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

      setStazioni(data ?? []);
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
  // QR CHECK-IN (facoltativo, solo Hotel)
  // Stessa validazione di HotelSheet.tsx
  // =========================

  function handleQrFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Formato non supportato. Usa JPG, PNG o WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Immagine troppo grande. Massimo 5MB.');
      return;
    }

    setQrFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setQrPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
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

        distanza_piedi:
          distanzaPiedi,

        ubicazione:
          ubicazione.trim(),

        convenzionato,

        note:
          note.trim(),

        fasce_orarie:
          fasceOrarie,

        // QR check-in facoltativo — solo se l'utente ha caricato un'immagine.
        // Se assente, l'hotel viene creato senza QR (si può caricare dopo).
        ...(qrPreview && qrFile
          ? {
              qr_checkin_new: {
                imageBase64: qrPreview,
                mimeType: qrFile.type,
                scadenza: qrScadenza || null,
              },
            }
          : {}),
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

    <div className="flex flex-col gap-4">

      {/* BACK */}
      <button
        type="button"
        onClick={onBack}
        className="self-start px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm"
      >

        <div className="flex items-center gap-2">

          <ArrowLeft className="w-4 h-4" />

          Indietro

        </div>

      </button>

      {/* TITLE */}
      <div>

        <h1 className="text-2xl font-bold text-gray-900">

          Contributo Attività

        </h1>

      </div>

      {/* FORM */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-4">

        {/* STAZIONE */}
        <select
          value={stazioneId}
          onChange={(e) =>
            setStazioneId(
              e.target.value
            )
          }
          disabled={
            !!stazionePredefinitaId
          }
          className="border border-gray-200 rounded-xl px-3 py-2 text-base"
        >

          <option value="">

            Seleziona stazione

          </option>

          {stazioni.map(
            (stazione) => (

              <option
                key={stazione.id}
                value={stazione.id}
              >

                {stazione.nome}

              </option>
            )
          )}

        </select>

        {/* NOME */}
        <input
          value={nome}
          onChange={(e) =>
            setNome(e.target.value)
          }
          placeholder="Nome attività"
          className="border border-gray-200 rounded-xl px-3 py-2 text-base"
        />

        {/* CATEGORIA */}
        <select
          value={categoria}
          onChange={(e) =>
            setCategoria(e.target.value)
          }
          className="border border-gray-200 rounded-xl px-3 py-2 text-base"
        >

          {categorie.map(
            (cat) => (

              <option key={cat}>

                {cat}

              </option>
            )
          )}

        </select>

        {/* INDIRIZZO */}
        <input
          value={indirizzo}
          onChange={(e) =>
            setIndirizzo(e.target.value)
          }
          placeholder="Indirizzo"
          className="border border-gray-200 rounded-xl px-3 py-2 text-base"
        />

        {/* DISTANZA DALLA STAZIONE */}
        <select
          value={distanzaPiedi}
          onChange={(e) =>
            setDistanzaPiedi(
              e.target.value
            )
          }
          className="border border-gray-200 rounded-xl px-3 py-2 text-base"
        >

          <option value="">

            Distanza dalla stazione

          </option>

          {DISTANZE_ATTIVITA.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}

        </select>

        {/* UBICAZIONE */}
        <input
          value={ubicazione}
          onChange={(e) =>
            setUbicazione(e.target.value)
          }
          placeholder="Ubicazione"
          className="border border-gray-200 rounded-xl px-3 py-2 text-base"
        />

        {/* CONVENZIONATO */}
        <label className="flex items-center gap-3">

          <input
            type="checkbox"
            checked={convenzionato}
            onChange={(e) =>
              setConvenzionato(
                e.target.checked
              )
            }
          />

          <span className="text-sm font-medium">

            Convenzionato Trenord

          </span>

        </label>

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

              Aggiungi fascia

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

                <div className="grid grid-cols-4 gap-2">

                  {giorniSettimana.map(
                    (giorno) => {

                      const active =
                        fascia.giorni.includes(
                          giorno
                        );

                      return (

                        <button
                          key={giorno}
                          type="button"
                          onClick={() =>
                            toggleGiorno(
                              index,
                              giorno
                            )
                          }
                          className={`rounded-xl border py-2 text-sm font-medium transition-colors ${
                            active
                              ? 'bg-trenord-green text-white border-trenord-green'
                              : 'bg-white border-gray-200 text-gray-700'
                          }`}
                        >

                          {giorno}

                        </button>
                      );
                    }
                  )}

                </div>

                <div className="grid grid-cols-2 gap-3">

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
                    className="border border-gray-200 rounded-xl px-3 py-2 text-base"
                  />

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
                    className="border border-gray-200 rounded-xl px-3 py-2 text-base"
                  />

                </div>

              </div>
            )
          )}

        </div>

        {/* QR CHECK-IN — facoltativo, solo Hotel */}
        {categoria === 'Hotel' && (
          <div className="border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-gray-900 text-sm">
                QR check-in (facoltativo)
              </h3>
            </div>
            <p className="text-xs text-gray-400 -mt-2">
              Puoi caricarlo ora oppure aggiungerlo in seguito.
            </p>

            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:border-trenord-green transition-colors">
              {qrPreview ? (
                <img src={qrPreview} alt="Preview QR" className="w-40 rounded-lg" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-300" />
                  <span className="text-sm text-gray-500">Tocca per selezionare l'immagine</span>
                  <span className="text-xs text-gray-400">JPG, PNG, WebP — max 5MB</span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleQrFileChange}
              />
            </label>

            {qrPreview && (
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase">
                  Data di scadenza (opzionale)
                </label>
                <input
                  type="date"
                  value={qrScadenza}
                  onChange={(e) => setQrScadenza(e.target.value)}
                  className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base"
                />
              </div>
            )}
          </div>
        )}

        {/* NOTE */}
        <textarea
          value={note}
          onChange={(e) =>
            setNote(e.target.value)
          }
          placeholder="Note"
          className="border border-gray-200 rounded-xl px-3 py-2 min-h-[120px] text-base"
        />

        {/* SUBMIT */}
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="bg-trenord-green text-white rounded-xl py-3 font-medium"
        >

          {loading
            ? 'Invio...'
            : 'Invia contributo'}

        </button>

      </div>

    </div>
  );
}
