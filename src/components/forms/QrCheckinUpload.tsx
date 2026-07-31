import { useState } from 'react';
import { Upload, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';

export interface QrCheckinData {
  imageBase64: string;
  mimeType: string;
  scadenza: string | null;
}

interface Props {
  onChange: (data: QrCheckinData | null) => void;
}

/**
 * Upload facoltativo del QR check-in (immagine + scadenza).
 * Condiviso tra AddAttivitaModal.tsx e ContributoAttivitaForm.tsx — prima
 * era presente solo nel secondo (vedi conversazione). Notifica il genitore
 * tramite onChange: null finché non è stata caricata un'immagine.
 */
export default function QrCheckinUpload({ onChange }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('');
  const [scadenza, setScadenza] = useState('');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
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

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setPreview(base64);
      setMimeType(file.type);
      onChange({ imageBase64: base64, mimeType: file.type, scadenza: scadenza || null });
    };
    reader.readAsDataURL(file);
  }

  function handleScadenzaChange(value: string) {
    setScadenza(value);
    if (preview) onChange({ imageBase64: preview, mimeType, scadenza: value || null });
  }

  return (
    <div className="border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <QrCode className="w-4 h-4 text-gray-500" />
        <h3 className="font-semibold text-gray-900 text-sm">QR check-in (facoltativo)</h3>
      </div>
      <p className="text-xs text-gray-400 -mt-2">
        Puoi caricarlo ora oppure aggiungerlo in seguito.
      </p>

      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:border-trenord-green transition-colors">
        {preview ? (
          <img src={preview} alt="Preview QR" className="w-40 rounded-lg" />
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
          onChange={handleFileChange}
        />
      </label>

      {preview && (
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase">
            Data di scadenza (opzionale)
          </label>
          <input
            type="date"
            value={scadenza}
            onChange={(e) => handleScadenzaChange(e.target.value)}
            className="mt-1 border border-gray-200 rounded-xl px-3 py-2 w-full text-base"
          />
        </div>
      )}
    </div>
  );
}
