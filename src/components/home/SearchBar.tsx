import React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  /** Placeholder — di default "Cerca stazioni, salette, attività…" */
  placeholder?: string;
  onFocus?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Cerca stazioni, salette, attività…',
  onFocus,
}) => {
  return (
    <div className="px-4">
      <button
        onClick={onFocus}
        className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm active:border-trenord-green/40 transition-colors text-left"
      >
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="text-sm text-gray-400 select-none">{placeholder}</span>
      </button>
    </div>
  );
};