import { useState, useMemo } from 'react';
import { Search, ChevronDown, HelpCircle } from 'lucide-react';

import { faqData } from '../data/faq';

// Segue lo stesso pattern di SaletteScreen/StazioniScreen: NavBar, TitleBar
// e il wrapper max-w-2xl mx-auto px-4 py-4 sono forniti da App.tsx, questo
// componente si occupa solo del proprio contenuto.

export default function FaqScreen() {
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLowerCase();

  const categorieFiltrate = useMemo(() => {
    if (!normalizedQuery) return faqData;
    return faqData
      .map((categoria) => ({
        ...categoria,
        items: categoria.items.filter(
          (item) =>
            item.domanda.toLowerCase().includes(normalizedQuery) ||
            item.risposta.toLowerCase().includes(normalizedQuery)
        ),
      }))
      .filter((categoria) => categoria.items.length > 0);
  }, [normalizedQuery]);

  function toggleItem(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Ricerca */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
        <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca una domanda..."
          className="bg-transparent text-sm flex-1 outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
      </div>

      {/* Categorie */}
      {categorieFiltrate.map((categoria) => (
        <div key={categoria.id}>
          <p className="section-title mb-2 px-1">{categoria.titolo}</p>
          <div className="flex flex-col gap-2">
            {categoria.items.map((item) => {
              const isOpen = openId === item.id;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
                >
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left active:bg-gray-50 dark:active:bg-gray-800/50 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">
                      {item.domanda}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3.5 pt-0.5 border-t border-gray-50 dark:border-gray-800/60">
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed pt-2.5">
                        {item.risposta}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Nessun risultato */}
      {categorieFiltrate.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Nessuna domanda trovata per "{query}"
          </p>
        </div>
      )}
    </div>
  );
}
