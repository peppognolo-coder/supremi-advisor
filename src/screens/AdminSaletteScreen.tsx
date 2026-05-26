import { useEffect, useState } from 'react';

import {
  Save,
  Trash2,
  Plus,
  Search,
  X,
  Microwave,
  Coffee,
  Droplets,
  Snowflake,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../lib/supabase';

import { formatTitle } from '../lib/format';

interface Saletta {

  id: string;

  stazione: string;

  tipo: string;

  codice_accesso: string;

  ubicazione: string;

  note: string;

  microonde: boolean;

  distributori: boolean;

  acqua: boolean;

  climatizzata: boolean;
}

// =========================
// SERVICE TOGGLE
// =========================

function ServiceToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {

  return (

    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
        active
          ? 'bg-trenord-green text-white border-trenord-green'
          : 'bg-white border-gray-200 text-gray-700'
      }`}
    >

      <div className="flex items-center gap-3">

        {icon}

        {label}

      </div>

      <span className="text-sm font-medium">

        {active ? 'SI' : 'NO'}

      </span>

    </button>
  );
}

export default function AdminSaletteScreen() {

  const [loading, setLoading] =
    useState(true);

  const [salette, setSalette] =
    useState<Saletta[]>([]);

  const [search, setSearch] =
    useState('');

  // =========================
  // LOAD
  // =========================

  async function load() {

    setLoading(true);

    const { data } =
      await supabase
        .from('salette')
        .select('*')
        .order('stazione', {
          ascending: true,
        });

    setSalette(data ?? []);

    setLoading(false);
  }

  useEffect(() => {

    load();

  }, []);

  // =========================
  // SEARCH FILTER
  // =========================

  const filtered = salette.filter((s) => {

    const q = search.trim().toLowerCase();

    return (
      !q ||
      s.stazione?.toLowerCase().includes(q) ||
      s.tipo?.toLowerCase().includes(q)
    );
  });

  // =========================
  // UPDATE FIELD
  // =========================

  function updateField(
    id: string,
    field: keyof Saletta,
    value: any
  ) {

    setSalette((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, [field]: value }
          : s
      )
    );
  }

  // =========================
  // SAVE
  // =========================

  async function saveSaletta(
    saletta: Saletta
  ) {

    const { error } =
      await supabase
        .from('salette')
        .update({
          stazione: saletta.stazione,
          tipo: saletta.tipo,
          codice_accesso: saletta.codice_accesso,
          ubicazione: saletta.ubicazione,
          note: saletta.note,
          microonde: saletta.microonde,
          distributori: saletta.distributori,
          acqua: saletta.acqua,
          climatizzata: saletta.climatizzata,
        })
        .eq('id', saletta.id);

    if (error) {

      console.error(error);

      toast.error('Errore salvataggio');

      return;
    }

    toast.success('Saletta aggiornata');
  }

  // =========================
  // DELETE
  // =========================

  async function deleteSaletta(
    id: string
  ) {

    const confirmDelete =
      window.confirm('Eliminare saletta?');

    if (!confirmDelete) return;

    await supabase
      .from('salette')
      .delete()
      .eq('id', id);

    load();
  }

  // =========================
  // ADD
  // =========================

  async function addSaletta() {

    const stazione =
      window.prompt('Nome stazione');

    if (!stazione) return;

    const tipo =
      window.prompt('Tipo saletta') ||
      'Equipaggi';

    await supabase
      .from('salette')
      .insert({
        stazione,
        nome: stazione,
        tipo,
        stato: 'aperta',
      });

    load();
  }

  // =========================
  // UI
  // =========================

  return (

    <div className="flex flex-col gap-4">

      {/* TOP */}
      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-2xl font-bold text-gray-900">

            Gestione Salette

          </h1>

          <p className="text-sm text-gray-500 mt-1">

            Modifica dati e codici accesso

          </p>

        </div>

        {/* ADD */}
        <button
          onClick={addSaletta}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-trenord-green text-white text-sm font-medium hover:opacity-90"
        >

          <Plus className="w-4 h-4" />

          Aggiungi

        </button>

      </div>

      {/* SEARCH */}
      <div className="relative">

        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

        <input
          type="text"
          placeholder="Cerca stazione o tipo..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-9 py-2.5 text-sm"
        />

        {search.length > 0 && (

          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >

            <X className="w-4 h-4 text-gray-400" />

          </button>
        )}

      </div>

      {/* LOADING */}
      {loading && (

        <div className="text-sm text-gray-500">

          Caricamento...

        </div>
      )}

      {/* EMPTY */}
      {!loading && filtered.length === 0 && (

        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">

          Nessuna saletta trovata per "{search}"

        </div>
      )}

      {/* LIST */}
      <div className="flex flex-col gap-4">

        {filtered.map((s) => (

          <div
            key={s.id}
            className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col gap-4"
          >

            {/* STAZIONE */}
            <div>

              <label className="text-xs font-semibold text-gray-400 uppercase">

                Stazione

              </label>

              <input
                value={s.stazione}
                onChange={(e) =>
                  updateField(s.id, 'stazione', e.target.value)
                }
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />

            </div>

            {/* TIPO */}
            <div>

              <label className="text-xs font-semibold text-gray-400 uppercase">

                Tipo

              </label>

              <input
                value={formatTitle(s.tipo)}
                onChange={(e) =>
                  updateField(s.id, 'tipo', e.target.value)
                }
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />

            </div>

            {/* CODICE */}
            <div>

              <label className="text-xs font-semibold text-gray-400 uppercase">

                Codice accesso

              </label>

              <input
                value={s.codice_accesso ?? ''}
                onChange={(e) =>
                  updateField(s.id, 'codice_accesso', e.target.value)
                }
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />

            </div>

            {/* UBICAZIONE */}
            <div>

              <label className="text-xs font-semibold text-gray-400 uppercase">

                Ubicazione

              </label>

              <input
                value={s.ubicazione ?? ''}
                onChange={(e) =>
                  updateField(s.id, 'ubicazione', e.target.value)
                }
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />

            </div>

            {/* NOTE */}
            <div>

              <label className="text-xs font-semibold text-gray-400 uppercase">

                Note

              </label>

              <textarea
                value={s.note ?? ''}
                onChange={(e) =>
                  updateField(s.id, 'note', e.target.value)
                }
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[80px]"
              />

            </div>

            {/* DOTAZIONI */}
            <div className="flex flex-col gap-3">

              <label className="text-xs font-semibold text-gray-400 uppercase">

                Servizi

              </label>

              <ServiceToggle
                active={s.microonde ?? false}
                onClick={() =>
                  updateField(s.id, 'microonde', !s.microonde)
                }
                icon={<Microwave className="w-5 h-5" />}
                label="Microonde"
              />

              <ServiceToggle
                active={s.distributori ?? false}
                onClick={() =>
                  updateField(s.id, 'distributori', !s.distributori)
                }
                icon={<Coffee className="w-5 h-5" />}
                label="Distributori"
              />

              <ServiceToggle
                active={s.acqua ?? false}
                onClick={() =>
                  updateField(s.id, 'acqua', !s.acqua)
                }
                icon={<Droplets className="w-5 h-5" />}
                label="Acqua"
              />

              <ServiceToggle
                active={s.climatizzata ?? false}
                onClick={() =>
                  updateField(s.id, 'climatizzata', !s.climatizzata)
                }
                icon={<Snowflake className="w-5 h-5" />}
                label="Climatizzata"
              />

            </div>

            {/* ACTIONS */}
            <div className="flex gap-2">

              <button
                onClick={() => saveSaletta(s)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-trenord-green text-white text-sm font-medium hover:opacity-90"
              >

                <Save className="w-4 h-4" />

                Salva

              </button>

              <button
                onClick={() => deleteSaletta(s.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:opacity-90"
              >

                <Trash2 className="w-4 h-4" />

                Elimina

              </button>

            </div>

          </div>
        ))}

      </div>

    </div>
  );
}