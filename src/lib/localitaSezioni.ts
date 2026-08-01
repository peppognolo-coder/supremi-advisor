import {
  Users,
  Bath,
  DoorOpen,
  MoreHorizontal,
  Shirt,
  BookOpen,
  Banknote,
  type LucideIcon,
} from 'lucide-react';

// =============================================================================
// CONFIGURAZIONE SEZIONI DELLA LOCALITÀ OPERATIVA
//
// Fonte di verità unica — usata da ContributoSalettaForm.tsx (utente),
// AdminSaletteScreen.tsx (admin, inserimento/modifica diretta) e
// AdminContributiScreen.tsx (admin, revisione contributi). Prima erano
// tre copie quasi identiche mantenute a mano separatamente — vedi
// conversazione: è esattamente il tipo di disallineamento che ha causato
// il bug delle salette "Cancelletto" con campi da sala equipaggi.
//
//   id          → valore salvato nel database, colonna salette.tipo
//                 (stabile, non cambia mai una volta in produzione)
//   label       → testo mostrato all'utente
//   icon        → icona Lucide nella selezione sezione
//   ordine      → ordine di visualizzazione
//   attiva      → false = nascosta senza toccare la logica
//   stati       → opzioni della select Stato per questa sezione ([] = campo assente)
//   campi       → campi da mostrare, nell'ordine in cui appaiono nel form
//
// Convenzione id: minuscolo, italiano, nessuno spazio.
// =============================================================================

export interface SezioneLocalita {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  ordine: number;
  attiva: boolean;
  stati: string[];
  campi: string[];
}

export const SEZIONI_LOCALITA: SezioneLocalita[] = [
  {
    id: 'equipaggi',
    label: 'Saletta equipaggi',
    description: 'Saletta riservata al personale di bordo',
    icon: Users,
    ordine: 1,
    attiva: true,
    stati: ['Aperta', 'Chiusa', 'In pulizia', 'Guasto'],
    campi: ['codice', 'ubicazione', 'stato', 'servizi', 'note'],
  },
  {
    id: 'bagni',
    label: 'Bagni',
    description: 'Servizi igienici riservati al personale',
    icon: Bath,
    ordine: 2,
    attiva: true,
    stati: ['Aperti', 'Chiusi', 'In pulizia'],
    campi: ['ubicazione', 'stato', 'modalita_accesso', 'note'],
  },
  {
    id: 'cancelletto',
    label: 'Cancelletto',
    description: 'Accesso riservato al personale ferroviario',
    icon: DoorOpen,
    ordine: 3,
    attiva: true,
    stati: [],
    campi: ['codice', 'ubicazione', 'tipologia_accesso', 'note'],
  },
  {
    id: 'trenitalia',
    label: 'Locali Trenitalia',
    description: 'Spazi e servizi Trenitalia',
    icon: MoreHorizontal,
    ordine: 4,
    attiva: true,
    stati: ['Aperto', 'Chiuso', 'Guasto'],
    campi: ['codice', 'ubicazione', 'stato', 'note'],
  },
  {
    id: 'spogliatoi',
    label: 'Spogliatoi',
    description: 'Spogliatoi riservati al personale',
    icon: Shirt,
    ordine: 5,
    attiva: true,
    stati: ['Aperti', 'Chiusi', 'In pulizia'],
    campi: ['ubicazione', 'stato', 'docce', 'armadietti', 'note'],
  },
  {
    id: 'segreteria',
    label: 'Segreteria',
    description: 'Ufficio di segreteria della stazione',
    icon: BookOpen,
    ordine: 6,
    attiva: true,
    stati: ['Aperta', 'Chiusa'],
    campi: ['ubicazione', 'stato', 'fasce_orarie', 'note'],
  },
  {
    id: 'versamenti',
    label: 'Ufficio versamenti',
    description: 'Ufficio per i versamenti del personale',
    icon: Banknote,
    ordine: 7,
    attiva: true,
    stati: ['Aperto', 'Chiuso'],
    campi: ['ubicazione', 'stato', 'fasce_orarie', 'note'],
  },
];

export type SezioneId = typeof SEZIONI_LOCALITA[number]['id'];

export const MODALITA_ACCESSO  = ['Libero', 'Chiave', 'Codice', 'Badge'];
export const TIPOLOGIA_ACCESSO = ['Badge', 'Tastierino', 'Citofono', 'Apertura manuale'];

export const GIORNI_SETTIMANA = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export function getSezione(id: string | null | undefined): SezioneLocalita {
  return SEZIONI_LOCALITA.find((s) => s.id === id) ?? SEZIONI_LOCALITA[0];
}
