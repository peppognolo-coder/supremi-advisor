export type StatoSaletta =
  | 'aperta'
  | 'chiusa'
  | 'manutenzione';

// =========================
// STAZIONI
// =========================

export interface Stazione {

  id: string;

  nome: string;

  codice: string;

  regione: string;

  provincia: string;

  attiva: boolean;

  lat: number | null;

  lng: number | null;

  maps_query: string | null;

  note: string;

  created_at: string;

  updated_at: string;
}

// =========================
// SERVIZI SALETTA
// =========================

export interface SalettaServizio {

  id: string;

  saletta_id: string;

  servizio: string;

  created_at: string;
}

// =========================
// SALETTE
// =========================

export interface Saletta {

  id: string;

  stazione_id: string;

  nome: string;

  stato: StatoSaletta;

  accessibile: boolean;

  climatizzata: boolean;

  codice_accesso: string | null;

  ubicazione: string | null;

  note: string;

  // servizi legacy
  microonde?: boolean;

  distributori?: boolean;

  fontana_acqua?: boolean;

  servizi?: SalettaServizio[];

  created_at: string;

  updated_at: string;
}

// =========================
// VALUTAZIONI ATTIVITÀ
// =========================

export interface AttivitaValutazione {

  id: string;

  attivita_id: string;

  voto: number;

  device_id?: string;

  created_at: string;
}

// =========================
// ATTIVITÀ STAZIONE
// =========================

export interface AttivitaStazione {

  id: string;

  stazione_id: string;

  nome: string;

  categoria: string;

  distanza: string | null;

  ubicazione: string | null;

  indirizzo?: string | null;

  maps_query: string | null;

  aperto_h24?: boolean;

  convenzionato: boolean;

  note: string | null;

  giorni_apertura?: string[];

  orario_apertura?: string | null;

  orario_chiusura?: string | null;

  valutazioni?: AttivitaValutazione[];

  created_at: string;
}

// =========================
// PROPOSTE ATTIVITÀ
// =========================

export interface AttivitaStazioneSegnalazione {

  id: string;

  stazione_id: string;

  nome: string;

  categoria: string;

  indirizzo: string | null;

  maps_query: string | null;

  ubicazione: string | null;

  note: string | null;

  convenzionato: boolean;

  giorni_apertura: string[];

  orario_apertura: string | null;

  orario_chiusura: string | null;

  stato: string;

  autore: string | null;

  created_at: string;
}

// =========================
// LOCALI LEGACY
// =========================

export interface Locale {

  id: string;

  stazione_id: string;

  nome: string;

  categoria: string;

  distanza: string;

  orario: string;

  indirizzo: string;

  maps_query: string;

  rating: number;

  numero_voti: number;

  convenzionato: boolean;

  attivo: boolean;

  note: string;

  created_at: string;

  updated_at: string;
}

// =========================
// SEGNALAZIONI SALETTE
// =========================

export interface SalettaSegnalazione {

  id: string;

  saletta_id: string;

  tipo: string;

  valore: string | null;

  nota: string | null;

  autore: string | null;

  stato: string;

  created_at: string;
}

// =========================
// STAZIONE + RELAZIONI
// =========================

export interface StazioneWithSalette
  extends Stazione {

  salette: Saletta[];

  attivita_stazione:
    AttivitaStazione[];

  locali?: Locale[];
}

// =========================
// DATABASE
// =========================

export type Database = {

  public: {

    Tables: {

      // =========================
      // STAZIONI
      // =========================

      stazioni: {

        Row: Stazione;

        Insert: Omit<
          Stazione,
          'id' |
          'created_at' |
          'updated_at'
        >;

        Update: Partial<
          Omit<
            Stazione,
            'id' |
            'created_at' |
            'updated_at'
          >
        >;
      };

      // =========================
      // SALETTE
      // =========================

      salette: {

        Row: Saletta;

        Insert: Omit<
          Saletta,
          'id' |
          'created_at' |
          'updated_at'
        >;

        Update: Partial<
          Omit<
            Saletta,
            'id' |
            'created_at' |
            'updated_at'
          >
        >;
      };

      // =========================
      // LOCALI LEGACY
      // =========================

      locali: {

        Row: Locale;

        Insert: Omit<
          Locale,
          'id' |
          'created_at' |
          'updated_at'
        >;

        Update: Partial<
          Omit<
            Locale,
            'id' |
            'created_at' |
            'updated_at'
          >
        >;
      };

      // =========================
      // ATTIVITÀ STAZIONE
      // =========================

      attivita_stazione: {

        Row: AttivitaStazione;

        Insert: Omit<
          AttivitaStazione,
          'id' |
          'created_at'
        >;

        Update: Partial<
          Omit<
            AttivitaStazione,
            'id' |
            'created_at'
          >
        >;
      };

      // =========================
      // PROPOSTE ATTIVITÀ
      // =========================

      attivita_stazione_segnalazioni: {

        Row: AttivitaStazioneSegnalazione;

        Insert: Omit<
          AttivitaStazioneSegnalazione,
          'id' |
          'created_at'
        >;

        Update: Partial<
          Omit<
            AttivitaStazioneSegnalazione,
            'id' |
            'created_at'
          >
        >;
      };

      // =========================
      // VALUTAZIONI ATTIVITÀ
      // =========================

      attivita_valutazioni: {

        Row: AttivitaValutazione;

        Insert: Omit<
          AttivitaValutazione,
          'id' |
          'created_at'
        >;

        Update: Partial<
          Omit<
            AttivitaValutazione,
            'id' |
            'created_at'
          >
        >;
      };

      // =========================
      // SEGNALAZIONI SALETTE
      // =========================

      saletta_segnalazioni: {

        Row: SalettaSegnalazione;

        Insert: Omit<
          SalettaSegnalazione,
          'id' |
          'created_at'
        >;

        Update: Partial<
          Omit<
            SalettaSegnalazione,
            'id' |
            'created_at'
          >
        >;
      };

      // =========================
      // SERVIZI SALETTA
      // =========================

      saletta_servizi: {

        Row: SalettaServizio;

        Insert: Omit<
          SalettaServizio,
          'id' |
          'created_at'
        >;

        Update: Partial<
          Omit<
            SalettaServizio,
            'id' |
            'created_at'
          >
        >;
      };
    };
  };
};