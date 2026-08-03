import {
  Shield,
  TrainFront,
  Sun,
  Moon,
} from 'lucide-react';

interface Props {
  title: string;
  onAdminAccess: () => void;
  /** Opzionale — se fornito, il logo diventa cliccabile e torna alla Home */
  onLogoClick?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function NavBar({
  title,
  onAdminAccess,
  onLogoClick,
  theme,
  onToggleTheme,
}: Props) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-trenord-green dark:bg-gray-900 text-white shadow-sm">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">

        {/* LOGO + TITLE — cliccabile se onLogoClick è fornito */}
        <button
          onClick={onLogoClick}
          disabled={!onLogoClick}
          className={[
            'flex items-center gap-2 min-w-0',
            onLogoClick
              ? 'active:opacity-70 transition-opacity cursor-pointer'
              : 'cursor-default',
          ].join(' ')}
        >
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <TrainFront className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-wide truncate">
            {title}
          </span>
        </button>

        <div className="flex items-center gap-2 flex-shrink-0">

          {/* TEMA CHIARO/SCURO */}
          <button
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* ADMIN BUTTON */}
          <button
            onClick={onAdminAccess}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
          >
            <Shield className="w-5 h-5" />
          </button>

        </div>

      </div>
    </div>
  );
}
