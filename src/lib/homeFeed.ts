export interface FeedLink {
  tipo: 'stazione' | 'salette';
  stazioneId?: string;
  stazioneNome?: string;
}

export type FeedCategoria =
  | 'nuova_attivita' | 'nuova_stazione' | 'nuovo_elemento'
  | 'modifica_attivita' | 'aggiornamento_saletta'
  | 'problema_aperto' | 'problema_risolto';

export interface FeedItem {
  id: string;
  tipo: 'info' | 'avviso' | 'risolto';
  categoria: FeedCategoria;
  titolo: string;
  descrizione: string;
  stazione?: string;
  tempo: string;
  timestamp: string;
  link: FeedLink | null;
}

export async function getHomeFeed(): Promise<FeedItem[]> {
  try {
    const res = await fetch('/.netlify/functions/get-home-feed');
    const data = await res.json();
    if (!res.ok) {
      console.error('[getHomeFeed]', data?.error);
      return [];
    }
    return Array.isArray(data.items) ? data.items : [];
  } catch (err) {
    console.error('[getHomeFeed] Errore di rete:', err);
    return [];
  }
}
