import type { SalettaProblema } from './adminApi';
import { getSezione } from './localitaSezioni';

const STATO_LABEL: Record<string, string> = {
  aperta: 'Aperto',
  in_carico: 'In carico',
  risolta: 'Risolto',
  archiviata: 'Archiviato',
};

function formatData(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Genera un file Excel (.xlsx) con l'elenco dei problemi salette passati
 * e avvia il download nel browser. Usa la libreria "xlsx" (SheetJS) solo
 * in SCRITTURA — non legge mai file esterni/non fidati, quindi le CVE note
 * della libreria (che riguardano quasi solo il parsing di xlsx malevoli)
 * non si applicano a questo utilizzo.
 *
 * Import dinamico: la libreria (e il codice per generare l'xlsx) vengono
 * scaricati solo quando l'admin preme davvero "Esporta", non nel bundle
 * principale dell'app.
 */
export async function exportProblemiSalette(
  problemi: SalettaProblema[],
  etichettaFiltro: string
): Promise<void> {
  const XLSX = await import('xlsx');

  const righe = problemi.map((p) => ({
    'Stazione': p.salette?.stazione ?? '—',
    'Sezione': getSezione(p.sezione ?? p.salette?.tipo).label,
    'Tipo problema': p.tipo_problema,
    'Stato': STATO_LABEL[p.stato] ?? p.stato,
    'N. segnalazioni': p.segnalazioni_count,
    'Prima segnalazione': formatData(p.created_at),
    'Ultimo aggiornamento': formatData(p.updated_at),
    'Note': p.note ?? '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(righe);

  // Larghezza colonne leggibile, non il default troppo stretto
  worksheet['!cols'] = [
    { wch: 24 }, // Stazione
    { wch: 20 }, // Sezione
    { wch: 26 }, // Tipo problema
    { wch: 12 }, // Stato
    { wch: 14 }, // N. segnalazioni
    { wch: 18 }, // Prima segnalazione
    { wch: 18 }, // Ultimo aggiornamento
    { wch: 40 }, // Note
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Problemi salette');

  const oggi = new Date().toISOString().slice(0, 10);
  const nomeFile = `problemi-salette_${etichettaFiltro}_${oggi}.xlsx`;

  XLSX.writeFile(workbook, nomeFile);
}
