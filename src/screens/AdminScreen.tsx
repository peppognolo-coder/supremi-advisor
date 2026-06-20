import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Building2,
  MapPin,
  MessageSquareWarning,
  ShieldCheck,
  Check,
  Plus,
  ArrowLeft,
  FileJson,
  Store,
  AlertCircle,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileText,
  Trash2,
  Copy,
  X,
  Pencil,
} from 'lucide-react';

import { supabase } from '../lib/supabase';

import AdminSaletteScreen from './AdminSaletteScreen';

import AdminContributiScreen from './AdminContributiScreen';

import AdminAttivitaScreen from './AdminAttivitaScreen';

// =========================
// TIPI
// =========================

interface AttivitaQualita {

  id: string;

  stazione_id: string;

  nome: string;

  categoria: string;

  convenzionato: boolean;

  is_active: boolean;

  maps_query: string | null;

  indirizzo: string | null;

  fasce_orarie: any[] | null;

  note: string | null;

  distanza_piedi: string | null;
}

interface StazioneNome {

  id: string;

  nome: string;
}

type TipoControllo =
  | 'maps_query'
  | 'indirizzo'
  | 'orari'
  | 'note'
  | 'eliminate'
  | 'duplicati';

interface ModalQualita {

  tipo: TipoControllo;

  titolo: string;

  lista: AttivitaQualita[];
}

// =========================
// COMPONENTE
// =========================

interface Props {
  adminPin: string;
}

export default function AdminScreen({ adminPin }: Props) {

  const [loading, setLoading] =
    useState(true);

  // =========================
  // SCREEN STATE
  // =========================

  const [
    showSaletteManager,
    setShowSaletteManager,
  ] = useState(false);

  const [
    showContributiManager,
    setShowContributiManager,
  ] = useState(false);

  const [
    showAttivitaManager,
    setShowAttivitaManager,
  ] = useState(false);

  // id da aprire direttamente nel modal modifica
  const [
    editAttivitaId,
    setEditAttivitaId,
  ] = useState<string | undefined>(
    undefined
  );

  // =========================
  // STATS
  // =========================

  const [stats, setStats] =
    useState({
      salette: 0,
      stazioni: 0,
      pending: 0,
      attivita: 0,
    });

  // =========================
  // DATI QUALITÀ
  // =========================

  const [attivitaAll, setAttivitaAll] =
    useState<AttivitaQualita[]>([]);

  const [stazioniMap, setStazioniMap] =
    useState<Record<string, string>>({});

  // =========================
  // VERIFICHE STATS
  // =========================

  interface VerificheStats {
    totaleConferme: number;
    totaleProblemi: number;
    ultimi7giorni: number;
    saletteNonVerificate: number;
    breakdownProblemi: Record<string, number>;
  }

  const [verificheStats, setVerificheStats] =
    useState<VerificheStats | null>(null);

  interface VerificheAttivitaStats {
    totaleConferme: number;
    totaleProblemi: number;
    attivitaNonVerificate: number;
    breakdownProblemi: Record<string, number>;
  }

  const [verificheAttivitaStats, setVerificheAttivitaStats] =
    useState<VerificheAttivitaStats | null>(null);

  // Modal segnalazioni attività
  const [modalSegnalazioniSalette, setModalSegnalazioniSalette] =
    useState<{
      filtroTipo: string | null;
      lista: any[];
    } | null>(null);

  async function apriSegnalazioniSalette(
    filtroTipo: string | null = null
  ) {

    const { data } =
      await supabase
        .from('saletta_verifiche')
        .select('*, salette(id, tipo, stazione)')
        .eq('is_correct', false)
        .order('created_at', { ascending: false });

    const lista = (data ?? []).filter(
      (v: any) =>
        !filtroTipo || v.tipo_problema === filtroTipo
    );

    setModalSegnalazioniSalette({ filtroTipo, lista });
  }

  async function gestisciSegnalazioneSaletta(id: string) {

    await supabase
      .from('saletta_verifiche')
      .delete()
      .eq('id', id);

    setModalSegnalazioniSalette((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        lista: prev.lista.filter((v) => v.id !== id),
      };
    });

    await load();
  }

  const [modalSegnalazioniAttivita, setModalSegnalazioniAttivita] =
    useState<{
      filtroTipo: string | null;
      lista: any[];
    } | null>(null);

  async function apriSegnalazioniAttivita(
    filtroTipo: string | null = null
  ) {

    const { data } =
      await supabase
        .from('attivita_verifiche')
        .select('*, attivita_stazione(id, nome, stazione_id, stazioni(nome))')
        .eq('is_correct', false)
        .order('created_at', { ascending: false });

    const lista = (data ?? []).filter(
      (v: any) =>
        !filtroTipo || v.tipo_problema === filtroTipo
    );

    setModalSegnalazioniAttivita({ filtroTipo, lista });
  }

  async function gestisciSegnalazioneAttivita(id: string) {

    await supabase
      .from('attivita_verifiche')
      .delete()
      .eq('id', id);

    setModalSegnalazioniAttivita((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        lista: prev.lista.filter((v) => v.id !== id),
      };
    });

    await load();
  }

  // modal qualità aperto
  const [modalQualita, setModalQualita] =
    useState<ModalQualita | null>(null);

  // duplicati ignorati (persistiti in localStorage)
  const [duplicatiIgnorati, setDuplicatiIgnorati] =
    useState<Set<string>>(() => {

      try {

        const stored = localStorage.getItem(
          'supremi_duplicati_ignorati'
        );

        return stored
          ? new Set(JSON.parse(stored))
          : new Set();

      } catch {

        return new Set();
      }
    });

  function ignoraDuplicato(id: string) {

    setDuplicatiIgnorati((prev) => {

      const next = new Set(prev);

      next.add(id);

      try {

        localStorage.setItem(
          'supremi_duplicati_ignorati',
          JSON.stringify(Array.from(next))
        );

      } catch {

        // ignore
      }

      return next;
    });

    // Aggiorna la lista nel modal senza chiuderlo
    setModalQualita((prev) => {

      if (!prev || prev.tipo !== 'duplicati') {
        return prev;
      }

      return {
        ...prev,
        lista: prev.lista.filter(
          (a) => a.id !== id
        ),
      };
    });
  }

  // =========================
  // LOAD
  // =========================

  async function load() {

    setLoading(true);

    // SALETTE
    const {
      count: saletteCount,
    } = await supabase
      .from('salette')
      .select('*', {
        count: 'exact',
        head: true,
      });

    // STAZIONI (per nomi)
    const {
      data: stazioniData,
    } = await supabase
      .from('salette')
      .select('stazione');

    const uniqueStations =
      new Set(
        (stazioniData ?? []).map(
          (s) => s.stazione
        )
      );

    // PENDING CONTRIBUTI
    const {
      count: pendingCount,
    } = await supabase
      .from('contributi')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('stato', 'pending');

    // ATTIVITA ATTIVE (counter)
    const {
      count: attivitaCount,
    } = await supabase
      .from('attivita_stazione')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('is_active', true);

    // TUTTE LE ATTIVITA (qualità dati)
    const {
      data: attivitaData,
    } = await supabase
      .from('attivita_stazione')
      .select(
        'id,stazione_id,nome,categoria,convenzionato,is_active,maps_query,indirizzo,fasce_orarie,note,distanza_piedi'
      )
      .order('nome', {
        ascending: true,
      });

    // STAZIONI (per nomi nel modal)
    const {
      data: stazioniNomiData,
    } = await supabase
      .from('stazioni')
      .select('id,nome');

    // mappa id → nome stazione
    const map: Record<string, string> =
      {};

    for (const s of stazioniNomiData ??
      []) {
      map[s.id] = s.nome;
    }

    setStats({
      salette: saletteCount ?? 0,
      stazioni: uniqueStations.size,
      pending: pendingCount ?? 0,
      attivita: attivitaCount ?? 0,
    });

    setAttivitaAll(attivitaData ?? []);

    setStazioniMap(map);

    // =========================
    // VERIFICHE STATS
    // =========================

    const { data: verificheData } =
      await supabase
        .from('saletta_verifiche')
        .select('is_correct, tipo_problema, saletta_id, created_at');

    if (verificheData) {

      const ora = Date.now();
      const setteGiorni =
        7 * 24 * 60 * 60 * 1000;
      const trentaGiorni =
        30 * 24 * 60 * 60 * 1000;

      const totaleConferme =
        verificheData.filter(
          (v) => v.is_correct
        ).length;

      const totaleProblemi =
        verificheData.filter(
          (v) => !v.is_correct
        ).length;

      const ultimi7giorni =
        verificheData.filter(
          (v) =>
            ora - new Date(v.created_at).getTime() <
            setteGiorni
        ).length;

      // Salette senza verifiche recenti (> 30 giorni o mai verificate)
      const saletteVerificateRecente =
        new Set(
          verificheData
            .filter(
              (v) =>
                v.is_correct &&
                ora - new Date(v.created_at).getTime() <
                trentaGiorni
            )
            .map((v) => v.saletta_id)
        );

      const saletteNonVerificate =
        (saletteCount ?? 0) -
        saletteVerificateRecente.size;

      // Breakdown problemi
      const breakdownProblemi: Record<string, number> = {};

      verificheData
        .filter((v) => !v.is_correct && v.tipo_problema)
        .forEach((v) => {
          const key = v.tipo_problema!;
          breakdownProblemi[key] =
            (breakdownProblemi[key] ?? 0) + 1;
        });

      setVerificheStats({
        totaleConferme,
        totaleProblemi,
        ultimi7giorni,
        saletteNonVerificate:
          Math.max(0, saletteNonVerificate),
        breakdownProblemi,
      });
    }

    // =========================
    // VERIFICHE ATTIVITÀ
    // =========================

    const { data: verificheAttivitaData } =
      await supabase
        .from('attivita_verifiche')
        .select('is_correct, tipo_problema, attivita_id, created_at');

    if (verificheAttivitaData) {

      const ora = Date.now();
      const trentaGiorni =
        30 * 24 * 60 * 60 * 1000;

      const attiviteVerificateRecente =
        new Set(
          verificheAttivitaData
            .filter(
              (v) =>
                v.is_correct &&
                ora - new Date(v.created_at).getTime() <
                trentaGiorni
            )
            .map((v) => v.attivita_id)
        );

      const totaleAttive =
        (attivitaData ?? []).filter(
          (a) => a.is_active
        ).length;

      setVerificheAttivitaStats({
        totaleConferme: verificheAttivitaData.filter(
          (v) => v.is_correct
        ).length,
        totaleProblemi: verificheAttivitaData.filter(
          (v) => !v.is_correct
        ).length,
        attivitaNonVerificate: Math.max(
          0,
          totaleAttive - attiviteVerificateRecente.size
        ),
        breakdownProblemi: verificheAttivitaData
          .filter((v) => !v.is_correct && v.tipo_problema)
          .reduce((acc: Record<string, number>, v) => {
            acc[v.tipo_problema!] =
              (acc[v.tipo_problema!] ?? 0) + 1;
            return acc;
          }, {}),
      });
    }

    setLoading(false);
  }

  useEffect(() => {

    load();

  }, []);

  // =========================
  // CALCOLI QUALITÀ (memo)
  // =========================

  const qualita = useMemo(() => {

    // 1. Senza maps_query
    const senzaMaps =
      attivitaAll.filter(
        (a) =>
          a.is_active &&
          (!a.maps_query ||
            a.maps_query.trim() === '')
      );

    // 2. Senza indirizzo
    const senzaIndirizzo =
      attivitaAll.filter(
        (a) =>
          a.is_active &&
          (!a.indirizzo ||
            a.indirizzo.trim() === '')
      );

    // 3. Senza orari
    const senzaOrari =
      attivitaAll.filter(
        (a) =>
          a.is_active &&
          (!a.fasce_orarie ||
            !Array.isArray(
              a.fasce_orarie
            ) ||
            a.fasce_orarie.length === 0)
      );

    // 4. Senza note
    const senzaNote =
      attivitaAll.filter(
        (a) =>
          a.is_active &&
          (!a.note ||
            a.note.trim() === '')
      );

    // 5. Eliminate
    const eliminate =
      attivitaAll.filter(
        (a) => a.is_active === false
      );

    // 6. Possibili duplicati
    // Stessa stazione + stesso indirizzo o stessa maps_query
    const duplicatiMap: Record<
      string,
      AttivitaQualita[]
    > = {};

    for (const a of attivitaAll) {

      if (!a.is_active) continue;

      if (
        a.indirizzo &&
        a.indirizzo.trim() !== ''
      ) {

        const chiaveIndirizzo = `${
          a.stazione_id
        }__indirizzo__${a.indirizzo
          .toLowerCase()
          .trim()}`;

        if (!duplicatiMap[chiaveIndirizzo]) {
          duplicatiMap[chiaveIndirizzo] = [];
        }

        duplicatiMap[chiaveIndirizzo].push(a);
      }

      if (
        a.maps_query &&
        a.maps_query.trim() !== ''
      ) {

        const chiaveMaps = `${
          a.stazione_id
        }__maps__${a.maps_query
          .toLowerCase()
          .trim()}`;

        if (!duplicatiMap[chiaveMaps]) {
          duplicatiMap[chiaveMaps] = [];
        }

        duplicatiMap[chiaveMaps].push(a);
      }
    }

    // Tieni solo i gruppi con più di 1 elemento, deduplica per id
    const duplicatiIds = new Set<string>();

    const duplicati: AttivitaQualita[] = [];

    for (const gruppo of Object.values(
      duplicatiMap
    )) {

      if (gruppo.length > 1) {

        for (const a of gruppo) {

          if (
            !duplicatiIds.has(a.id) &&
            !duplicatiIgnorati.has(a.id)
          ) {

            duplicatiIds.add(a.id);

            duplicati.push(a);
          }
        }
      }
    }

    return {
      senzaMaps,
      senzaIndirizzo,
      senzaOrari,
      senzaNote,
      eliminate,
      duplicati,
    };

  }, [attivitaAll, duplicatiIgnorati]);

  // =========================
  // STATO DATABASE (memo)
  // =========================

  const statoDb = useMemo(() => {

    const attive = attivitaAll.filter(
      (a) => a.is_active
    );

    const totale = attive.length;

    const convenzionate = attive.filter(
      (a) => a.convenzionato
    ).length;

    const conOrari = attive.filter(
      (a) =>
        Array.isArray(a.fasce_orarie) &&
        a.fasce_orarie.length > 0
    ).length;

    const conMaps = attive.filter(
      (a) =>
        a.maps_query &&
        a.maps_query.trim() !== ''
    ).length;

    const conIndirizzo = attive.filter(
      (a) =>
        a.indirizzo &&
        a.indirizzo.trim() !== ''
    ).length;

    const complete = attive.filter(
      (a) =>
        a.nome?.trim() &&
        a.categoria?.trim() &&
        a.indirizzo?.trim() &&
        a.maps_query?.trim() &&
        a.distanza_piedi?.trim() &&
        Array.isArray(a.fasce_orarie) &&
        a.fasce_orarie.length > 0
    ).length;

    const percentualeCompleta =
      totale > 0
        ? Math.round(
            (complete / totale) * 100
          )
        : 0;

    return {
      totale,
      convenzionate,
      conOrari,
      conMaps,
      conIndirizzo,
      complete,
      percentualeCompleta,
    };

  }, [attivitaAll]);

  // =========================
  // HELPERS QUALITÀ
  // =========================

  function apriModalQualita(
    tipo: TipoControllo,
    titolo: string,
    lista: AttivitaQualita[]
  ) {

    setModalQualita({
      tipo,
      titolo,
      lista,
    });
  }

  function getNomeStazione(
    stazioneId: string
  ): string {

    return (
      stazioniMap[stazioneId] ??
      stazioneId
    );
  }

  function apriModificaDaQualita(
    attivitaId: string
  ) {

    setModalQualita(null);

    setEditAttivitaId(attivitaId);

    setShowAttivitaManager(true);
  }

  // =========================
  // NAVIGAZIONE MANAGER
  // =========================

  if (showAttivitaManager) {

    return (

      <div className="flex flex-col gap-4">

        {/* BACK */}
        <button
          onClick={() => {
            setShowAttivitaManager(
              false
            );
            setEditAttivitaId(undefined);
          }}
          className="self-start flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
        >

          <ArrowLeft className="w-4 h-4" />

          Torna dashboard

        </button>

        <AdminAttivitaScreen
          initialEditId={editAttivitaId}
        />

      </div>
    );
  }

  if (showContributiManager) {

    return (

      <div className="flex flex-col gap-4">

        {/* BACK */}
        <button
          onClick={() =>
            setShowContributiManager(
              false
            )
          }
          className="self-start flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
        >

          <ArrowLeft className="w-4 h-4" />

          Torna dashboard

        </button>

        <AdminContributiScreen adminPin={adminPin} />

      </div>
    );
  }

  if (showSaletteManager) {

    return (

      <div className="flex flex-col gap-4">

        {/* BACK */}
        <button
          onClick={() =>
            setShowSaletteManager(false)
          }
          className="self-start flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
        >

          <ArrowLeft className="w-4 h-4" />

          Torna dashboard

        </button>

        <AdminSaletteScreen adminPin={adminPin} />

      </div>
    );
  }

  // =========================
  // UI
  // =========================

  return (

    <>

      <div className="flex flex-col gap-5">

        {/* TITLE */}
        <div>

          <div className="flex items-center gap-2">

            <ShieldCheck className="w-6 h-6 text-trenord-green" />

            <h1 className="text-2xl font-bold text-gray-900">

              Dashboard Admin

            </h1>

          </div>

          <p className="text-sm text-gray-500 mt-1">

            Gestione salette e moderazione sistema

          </p>

        </div>

        {/* LOADING */}
        {loading && (

          <div className="text-sm text-gray-500">

            Caricamento...

          </div>
        )}

        {/* STATS */}
        {!loading && (

          <div className="grid grid-cols-2 gap-3">

            {/* SALETTE */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">

              <div className="flex items-center justify-between">

                <Building2 className="w-5 h-5 text-trenord-green" />

                <span className="text-2xl font-bold text-gray-900">

                  {stats.salette}

                </span>

              </div>

              <p className="text-xs text-gray-500 mt-3 uppercase tracking-wide">

                Salette

              </p>

            </div>

            {/* STAZIONI */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">

              <div className="flex items-center justify-between">

                <MapPin className="w-5 h-5 text-blue-500" />

                <span className="text-2xl font-bold text-gray-900">

                  {stats.stazioni}

                </span>

              </div>

              <p className="text-xs text-gray-500 mt-3 uppercase tracking-wide">

                Stazioni

              </p>

            </div>

            {/* ATTIVITA */}
            <button
              onClick={() =>
                setShowAttivitaManager(
                  true
                )
              }
              className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:border-trenord-green/40 transition-colors text-left"
            >

              <div className="flex items-center justify-between">

                <Store className="w-5 h-5 text-trenord-green" />

                <span className="text-2xl font-bold text-gray-900">

                  {stats.attivita}

                </span>

              </div>

              <p className="text-xs text-gray-500 mt-3 uppercase tracking-wide">

                Attività attive

              </p>

            </button>

            {/* PENDING */}
            <button
              onClick={() =>
                setShowContributiManager(
                  true
                )
              }
              className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:border-amber-300 transition-colors text-left"
            >

              <div className="flex items-center justify-between">

                <MessageSquareWarning className="w-5 h-5 text-amber-500" />

                <span className="text-2xl font-bold text-gray-900">

                  {stats.pending}

                </span>

              </div>

              <p className="text-xs text-gray-500 mt-3 uppercase tracking-wide">

                Pending

              </p>

            </button>

          </div>
        )}

        {/* QUICK ACTIONS */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col gap-3">

          <h2 className="font-semibold text-gray-900">

            Azioni rapide

          </h2>

          {/* SALETTE */}
          <button
            onClick={() =>
              setShowSaletteManager(true)
            }
            className="flex items-center gap-3 p-3 rounded-xl bg-trenord-green text-white hover:opacity-90 transition-opacity"
          >

            <Plus className="w-5 h-5" />

            <span className="font-medium">

              Gestione salette

            </span>

          </button>

          {/* ATTIVITA */}
          <button
            onClick={() =>
              setShowAttivitaManager(true)
            }
            className="flex items-center gap-3 p-3 rounded-xl bg-purple-600 text-white hover:opacity-90 transition-opacity"
          >

            <Store className="w-5 h-5" />

            <span className="font-medium">

              Gestione attività

            </span>

          </button>

          {/* CONTRIBUTI */}
          <button
            onClick={() =>
              setShowContributiManager(true)
            }
            className="flex items-center gap-3 p-3 rounded-xl bg-blue-600 text-white hover:opacity-90 transition-opacity"
          >

            <FileJson className="w-5 h-5" />

            <span className="font-medium">

              Modera contributi

            </span>

          </button>

        </div>

        {/* ========================= */}
        {/* QUALITÀ DATI              */}
        {/* ========================= */}

        {!loading && (

          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col gap-4">

            <div>

              <h2 className="font-semibold text-gray-900">

                Qualità dati

              </h2>

              <p className="text-xs text-gray-400 mt-0.5">

                Attività con dati mancanti o potenzialmente errati

              </p>

            </div>

            <div className="grid grid-cols-2 gap-3">

              {/* 1. SENZA MAPS QUERY — ROSSO */}
              <button
                type="button"
                onClick={() =>
                  apriModalQualita(
                    'maps_query',
                    'Senza Maps Query',
                    qualita.senzaMaps
                  )
                }
                className={`
                  rounded-2xl
                  border
                  p-4
                  text-left
                  shadow-sm
                  transition-colors
                  ${
                    qualita.senzaMaps
                      .length === 0
                      ? 'bg-emerald-50 border-emerald-100 hover:border-emerald-300'
                      : 'bg-white border-red-100 hover:border-red-300'
                  }
                `}
              >

                <div className="flex items-center justify-between">

                  <MapPin
                    className={`w-5 h-5 ${
                      qualita.senzaMaps
                        .length === 0
                        ? 'text-emerald-500'
                        : 'text-red-500'
                    }`}
                  />

                  <span
                    className={`text-2xl font-bold ${
                      qualita.senzaMaps
                        .length === 0
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    }`}
                  >

                    {
                      qualita.senzaMaps
                        .length
                    }

                  </span>

                </div>

                <p className="text-xs text-gray-500 mt-3 uppercase tracking-wide">

                  Senza Maps Query

                </p>

              </button>

              {/* 2. SENZA INDIRIZZO — ROSSO */}
              <button
                type="button"
                onClick={() =>
                  apriModalQualita(
                    'indirizzo',
                    'Senza indirizzo',
                    qualita.senzaIndirizzo
                  )
                }
                className={`
                  rounded-2xl
                  border
                  p-4
                  text-left
                  shadow-sm
                  transition-colors
                  ${
                    qualita.senzaIndirizzo
                      .length === 0
                      ? 'bg-emerald-50 border-emerald-100 hover:border-emerald-300'
                      : 'bg-white border-red-100 hover:border-red-300'
                  }
                `}
              >

                <div className="flex items-center justify-between">

                  <AlertCircle
                    className={`w-5 h-5 ${
                      qualita.senzaIndirizzo
                        .length === 0
                        ? 'text-emerald-500'
                        : 'text-red-500'
                    }`}
                  />

                  <span
                    className={`text-2xl font-bold ${
                      qualita.senzaIndirizzo
                        .length === 0
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    }`}
                  >

                    {
                      qualita
                        .senzaIndirizzo
                        .length
                    }

                  </span>

                </div>

                <p className="text-xs text-gray-500 mt-3 uppercase tracking-wide">

                  Senza indirizzo

                </p>

              </button>

              {/* 3. SENZA ORARI — ROSSO */}
              <button
                type="button"
                onClick={() =>
                  apriModalQualita(
                    'orari',
                    'Senza orari',
                    qualita.senzaOrari
                  )
                }
                className={`
                  rounded-2xl
                  border
                  p-4
                  text-left
                  shadow-sm
                  transition-colors
                  ${
                    qualita.senzaOrari
                      .length === 0
                      ? 'bg-emerald-50 border-emerald-100 hover:border-emerald-300'
                      : 'bg-white border-red-100 hover:border-red-300'
                  }
                `}
              >

                <div className="flex items-center justify-between">

                  <Clock
                    className={`w-5 h-5 ${
                      qualita.senzaOrari
                        .length === 0
                        ? 'text-emerald-500'
                        : 'text-red-500'
                    }`}
                  />

                  <span
                    className={`text-2xl font-bold ${
                      qualita.senzaOrari
                        .length === 0
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    }`}
                  >

                    {
                      qualita.senzaOrari
                        .length
                    }

                  </span>

                </div>

                <p className="text-xs text-gray-500 mt-3 uppercase tracking-wide">

                  Senza orari

                </p>

              </button>

              {/* 4. SENZA NOTE — GRIGIO */}
              <button
                type="button"
                onClick={() =>
                  apriModalQualita(
                    'note',
                    'Senza note',
                    qualita.senzaNote
                  )
                }
                className="
                  rounded-2xl
                  border
                  border-gray-100
                  bg-white
                  p-4
                  text-left
                  shadow-sm
                  transition-colors
                  hover:border-gray-300
                "
              >

                <div className="flex items-center justify-between">

                  <FileText className="w-5 h-5 text-gray-400" />

                  <span className="text-2xl font-bold text-gray-500">

                    {
                      qualita.senzaNote
                        .length
                    }

                  </span>

                </div>

                <p className="text-xs text-gray-500 mt-3 uppercase tracking-wide">

                  Senza note

                </p>

              </button>

              {/* 5. ELIMINATE — GRIGIO */}
              <button
                type="button"
                onClick={() =>
                  apriModalQualita(
                    'eliminate',
                    'Attività eliminate',
                    qualita.eliminate
                  )
                }
                className="
                  rounded-2xl
                  border
                  border-gray-100
                  bg-white
                  p-4
                  text-left
                  shadow-sm
                  transition-colors
                  hover:border-gray-300
                "
              >

                <div className="flex items-center justify-between">

                  <Trash2 className="w-5 h-5 text-gray-400" />

                  <span className="text-2xl font-bold text-gray-500">

                    {
                      qualita.eliminate
                        .length
                    }

                  </span>

                </div>

                <p className="text-xs text-gray-500 mt-3 uppercase tracking-wide">

                  Eliminate

                </p>

              </button>

              {/* 6. DUPLICATI — GIALLO */}
              <button
                type="button"
                onClick={() =>
                  apriModalQualita(
                    'duplicati',
                    'Possibili duplicati',
                    qualita.duplicati
                  )
                }
                className={`
                  rounded-2xl
                  border
                  p-4
                  text-left
                  shadow-sm
                  transition-colors
                  ${
                    qualita.duplicati
                      .length === 0
                      ? 'bg-emerald-50 border-emerald-100 hover:border-emerald-300'
                      : 'bg-white border-amber-100 hover:border-amber-300'
                  }
                `}
              >

                <div className="flex items-center justify-between">

                  <Copy
                    className={`w-5 h-5 ${
                      qualita.duplicati
                        .length === 0
                        ? 'text-emerald-500'
                        : 'text-amber-500'
                    }`}
                  />

                  <span
                    className={`text-2xl font-bold ${
                      qualita.duplicati
                        .length === 0
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                    }`}
                  >

                    {
                      qualita.duplicati
                        .length
                    }

                  </span>

                </div>

                <p className="text-xs text-gray-500 mt-3 uppercase tracking-wide">

                  Possibili duplicati

                </p>

                <p className="text-xs text-gray-400 mt-0.5">

                  Stesso indirizzo o maps_query

                </p>

              </button>

            </div>

          </div>
        )}

        {/* ========================= */}
        {/* STATO DATABASE            */}
        {/* ========================= */}

        {!loading && (

          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col gap-4">

            <div>

              <h2 className="font-semibold text-gray-900">

                Stato database

              </h2>

              <p className="text-xs text-gray-400 mt-0.5">

                Copertura e completezza delle attività attive

              </p>

            </div>

            <div className="grid grid-cols-2 gap-3">

              {/* ATTIVITÀ ATTIVE */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 flex flex-col gap-3">

                <div className="flex items-center justify-between">

                  <Store className="w-5 h-5 text-gray-400" />

                  <span className="text-2xl font-bold text-gray-700">

                    {statoDb.totale}

                  </span>

                </div>

                <p className="text-xs text-gray-500 uppercase tracking-wide">

                  Attività attive

                </p>

              </div>

              {/* CONVENZIONATE */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 flex flex-col gap-3">

                <div className="flex items-center justify-between">

                  <ShieldCheck className="w-5 h-5 text-gray-400" />

                  <span className="text-2xl font-bold text-gray-700">

                    {statoDb.convenzionate}

                  </span>

                </div>

                <p className="text-xs text-gray-500 uppercase tracking-wide">

                  Convenzionate

                </p>

              </div>

              {/* CON ORARI */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 flex flex-col gap-3">

                <div className="flex items-center justify-between">

                  <Clock className="w-5 h-5 text-gray-400" />

                  <span className="text-2xl font-bold text-gray-700">

                    {statoDb.conOrari}

                  </span>

                </div>

                <p className="text-xs text-gray-500 uppercase tracking-wide">

                  Con orari

                </p>

              </div>

              {/* CON MAPS QUERY */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 flex flex-col gap-3">

                <div className="flex items-center justify-between">

                  <MapPin className="w-5 h-5 text-gray-400" />

                  <span className="text-2xl font-bold text-gray-700">

                    {statoDb.conMaps}

                  </span>

                </div>

                <p className="text-xs text-gray-500 uppercase tracking-wide">

                  Con Maps Query

                </p>

              </div>

              {/* CON INDIRIZZO */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 flex flex-col gap-3">

                <div className="flex items-center justify-between">

                  <Building2 className="w-5 h-5 text-gray-400" />

                  <span className="text-2xl font-bold text-gray-700">

                    {statoDb.conIndirizzo}

                  </span>

                </div>

                <p className="text-xs text-gray-500 uppercase tracking-wide">

                  Con indirizzo

                </p>

              </div>

              {/* ATTIVITÀ COMPLETE */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 flex flex-col gap-3">

                <div className="flex items-center justify-between">

                  <AlertCircle className="w-5 h-5 text-emerald-500" />

                  <span className="text-2xl font-bold text-emerald-700">

                    {statoDb.complete}

                  </span>

                </div>

                <p className="text-xs text-gray-500 uppercase tracking-wide">

                  Complete

                </p>

                <p className="text-xs text-emerald-600 font-medium">

                  {statoDb.complete} / {statoDb.totale}
                  {' '}
                  ({statoDb.percentualeCompleta}%)

                </p>

              </div>

            </div>

          </div>
        )}

        {/* ========================= */}
        {/* VERIFICHE SALETTE         */}
        {/* ========================= */}

        {!loading && verificheStats && (

          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col gap-4">

            <div>

              <h2 className="font-semibold text-gray-900">

                Verifiche salette

              </h2>

              <p className="text-xs text-gray-400 mt-0.5">

                Feedback della community sulla correttezza dei dati

              </p>

            </div>

            {/* CARD METRICHE */}
            <div className="grid grid-cols-2 gap-3">

              {/* CONFERME */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 flex flex-col gap-3">

                <div className="flex items-center justify-between">

                  <CheckCircle className="w-5 h-5 text-emerald-500" />

                  <span className="text-2xl font-bold text-emerald-700">

                    {verificheStats.totaleConferme}

                  </span>

                </div>

                <p className="text-xs text-gray-500 uppercase tracking-wide">

                  Conferme totali

                </p>

              </div>

              {/* PROBLEMI */}
              <button
                type="button"
                onClick={() => apriSegnalazioniSalette(null)}
                className={`rounded-2xl border p-4 flex flex-col gap-3 text-left w-full ${
                verificheStats.totaleProblemi > 0
                  ? 'border-amber-100 bg-amber-50 hover:border-amber-300'
                  : 'border-gray-100 bg-gray-50'
              }`}>

                <div className="flex items-center justify-between">

                  <AlertTriangle className={`w-5 h-5 ${
                    verificheStats.totaleProblemi > 0
                      ? 'text-amber-500'
                      : 'text-gray-400'
                  }`} />

                  <span className={`text-2xl font-bold ${
                    verificheStats.totaleProblemi > 0
                      ? 'text-amber-700'
                      : 'text-gray-500'
                  }`}>

                    {verificheStats.totaleProblemi}

                  </span>

                </div>

                <p className="text-xs text-gray-500 uppercase tracking-wide">

                  Problemi segnalati

                </p>

              </button>

              {/* ULTIMI 7 GIORNI */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 flex flex-col gap-3">

                <div className="flex items-center justify-between">

                  <Clock className="w-5 h-5 text-gray-400" />

                  <span className="text-2xl font-bold text-gray-700">

                    {verificheStats.ultimi7giorni}

                  </span>

                </div>

                <p className="text-xs text-gray-500 uppercase tracking-wide">

                  Ultimi 7 giorni

                </p>

              </div>

              {/* NON VERIFICATE */}
              <div className={`rounded-2xl border p-4 flex flex-col gap-3 ${
                verificheStats.saletteNonVerificate > 0
                  ? 'border-amber-100 bg-amber-50'
                  : 'border-emerald-100 bg-emerald-50'
              }`}>

                <div className="flex items-center justify-between">

                  <AlertCircle className={`w-5 h-5 ${
                    verificheStats.saletteNonVerificate > 0
                      ? 'text-amber-500'
                      : 'text-emerald-500'
                  }`} />

                  <span className={`text-2xl font-bold ${
                    verificheStats.saletteNonVerificate > 0
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                  }`}>

                    {verificheStats.saletteNonVerificate}

                  </span>

                </div>

                <p className="text-xs text-gray-500 uppercase tracking-wide">

                  Non verificate (30+ gg)

                </p>

              </div>

            </div>

            {/* BREAKDOWN PROBLEMI */}
            {Object.keys(verificheStats.breakdownProblemi).length > 0 && (

              <div className="flex flex-col gap-2">

                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">

                  Tipo problemi segnalati

                </p>

                {Object.entries(
                  verificheStats.breakdownProblemi
                )
                  .sort(([, a], [, b]) => b - a)
                  .map(([tipo, count]) => (

                  <button
                    key={tipo}
                    type="button"
                    onClick={() => apriSegnalazioniSalette(tipo)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-300 w-full text-left transition-colors"
                  >

                    <span className="text-sm text-gray-600">

                      {tipo
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (c) =>
                          c.toUpperCase()
                        )}

                    </span>

                    <span className="text-sm font-semibold text-gray-900">

                      {count}

                    </span>

                  </button>
                ))}

              </div>
            )}

          </div>
        )}

        {/* ========================= */}
        {/* VERIFICHE ATTIVITÀ        */}
        {/* ========================= */}

        {!loading && verificheAttivitaStats && (

          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col gap-4">

            <div>

              <h2 className="font-semibold text-gray-900">

                Verifiche attività

              </h2>

              <p className="text-xs text-gray-400 mt-0.5">

                Feedback della community sulle attività nelle stazioni

              </p>

            </div>

            <div className="grid grid-cols-2 gap-3">

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 flex flex-col gap-3">

                <div className="flex items-center justify-between">

                  <CheckCircle className="w-5 h-5 text-emerald-500" />

                  <span className="text-2xl font-bold text-emerald-700">

                    {verificheAttivitaStats.totaleConferme}

                  </span>

                </div>

                <p className="text-xs text-gray-500 uppercase tracking-wide">

                  Conferme totali

                </p>

              </div>

              <button
                type="button"
                onClick={() => apriSegnalazioniAttivita(null)}
                className={`rounded-2xl border p-4 flex flex-col gap-3 text-left w-full ${
                verificheAttivitaStats.totaleProblemi > 0
                  ? 'border-amber-100 bg-amber-50 hover:border-amber-300'
                  : 'border-gray-100 bg-gray-50'
              }`}>

                <div className="flex items-center justify-between">

                  <AlertTriangle className={`w-5 h-5 ${
                    verificheAttivitaStats.totaleProblemi > 0
                      ? 'text-amber-500'
                      : 'text-gray-400'
                  }`} />

                  <span className={`text-2xl font-bold ${
                    verificheAttivitaStats.totaleProblemi > 0
                      ? 'text-amber-700'
                      : 'text-gray-500'
                  }`}>

                    {verificheAttivitaStats.totaleProblemi}

                  </span>

                </div>

                <p className="text-xs text-gray-500 uppercase tracking-wide">

                  Problemi segnalati

                </p>

              </button>

              <div className={`rounded-2xl border p-4 flex flex-col gap-3 col-span-2 ${
                verificheAttivitaStats.attivitaNonVerificate > 0
                  ? 'border-amber-100 bg-amber-50'
                  : 'border-emerald-100 bg-emerald-50'
              }`}>

                <div className="flex items-center justify-between">

                  <AlertCircle className={`w-5 h-5 ${
                    verificheAttivitaStats.attivitaNonVerificate > 0
                      ? 'text-amber-500'
                      : 'text-emerald-500'
                  }`} />

                  <span className={`text-2xl font-bold ${
                    verificheAttivitaStats.attivitaNonVerificate > 0
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                  }`}>

                    {verificheAttivitaStats.attivitaNonVerificate}

                  </span>

                </div>

                <p className="text-xs text-gray-500 uppercase tracking-wide">

                  Attività non verificate (30+ gg)

                </p>

              </div>

            </div>

            {Object.keys(verificheAttivitaStats.breakdownProblemi).length > 0 && (

              <div className="flex flex-col gap-2">

                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">

                  Tipo problemi segnalati

                </p>

                {Object.entries(
                  verificheAttivitaStats.breakdownProblemi
                )
                  .sort(([, a], [, b]) => b - a)
                  .map(([tipo, count]) => (

                  <button
                    key={tipo}
                    type="button"
                    onClick={() => apriSegnalazioniAttivita(tipo)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-300 w-full text-left transition-colors"
                  >

                    <span className="text-sm text-gray-600">

                      {tipo
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (c) =>
                          c.toUpperCase()
                        )}

                    </span>

                    <span className="text-sm font-semibold text-gray-900">

                      {count}

                    </span>

                  </button>
                ))}

              </div>
            )}

          </div>
        )}

      {/* MODAL SEGNALAZIONI SALETTE */}
      {modalSegnalazioniSalette && (

        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setModalSegnalazioniSalette(null)}
        >

          <div
            className="bg-white rounded-3xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-5 flex flex-col gap-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >

            {/* HEADER */}
            <div className="flex items-center justify-between">

              <div>

                <h2 className="text-lg font-bold text-gray-900">

                  Segnalazioni salette

                </h2>

                <p className="text-xs text-gray-400 mt-0.5">

                  {modalSegnalazioniSalette.filtroTipo
                    ? modalSegnalazioniSalette.filtroTipo
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (c) => c.toUpperCase())
                    : 'Tutti i problemi'}

                </p>

              </div>

              <button
                onClick={() => setModalSegnalazioniSalette(null)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
              >

                <X className="w-4 h-4 text-gray-400" />

              </button>

            </div>

            {/* LISTA */}
            {modalSegnalazioniSalette.lista.length === 0 ? (

              <div className="text-center text-sm text-gray-400 py-8">

                Nessuna segnalazione

              </div>

            ) : (

              <div className="flex flex-col gap-3">

                {modalSegnalazioniSalette.lista.map((v: any) => (

                  <div
                    key={v.id}
                    className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex flex-col gap-3"
                  >

                    {/* SALETTA */}
                    <div>

                      <p className="font-semibold text-gray-900">

                        {v.salette?.tipo || 'Saletta sconosciuta'}

                      </p>

                      <p className="text-xs text-gray-500 mt-0.5">

                        {v.salette?.stazione || ''}

                      </p>

                    </div>

                    {/* PROBLEMA */}
                    <div className="flex items-center gap-2">

                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />

                      <span className="text-sm font-medium text-amber-800">

                        {v.tipo_problema
                          ?.replace(/_/g, ' ')
                          ?.replace(/\b\w/g, (c: string) => c.toUpperCase())}

                      </span>

                    </div>

                    {/* NOTE */}
                    {v.nota && (

                      <p className="text-xs text-gray-600 bg-white rounded-xl px-3 py-2 border border-amber-100">

                        {v.nota}

                      </p>
                    )}

                    {/* DATA */}
                    <p className="text-xs text-gray-400">

                      {new Date(v.created_at).toLocaleString('it-IT')}

                    </p>

                    {/* AZIONI */}
                    <div className="flex gap-2">

                      <button
                        type="button"
                        onClick={() => {
                          setModalSegnalazioniSalette(null);
                          setShowSaletteManager(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:opacity-90"
                      >

                        <Pencil className="w-3.5 h-3.5" />

                        Gestisci salette

                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          gestisciSegnalazioneSaletta(v.id)
                        }
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:opacity-90"
                      >

                        <Check className="w-3.5 h-3.5" />

                        Gestita

                      </button>

                    </div>

                  </div>
                ))}

              </div>
            )}

          </div>

        </div>
      )}

      {/* MODAL SEGNALAZIONI ATTIVITA */}
      {modalSegnalazioniAttivita && (

        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setModalSegnalazioniAttivita(null)}
        >

          <div
            className="bg-white rounded-3xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-5 flex flex-col gap-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >

            {/* HEADER */}
            <div className="flex items-center justify-between">

              <div>

                <h2 className="text-lg font-bold text-gray-900">

                  Segnalazioni attività

                </h2>

                <p className="text-xs text-gray-400 mt-0.5">

                  {modalSegnalazioniAttivita.filtroTipo
                    ? modalSegnalazioniAttivita.filtroTipo
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (c) => c.toUpperCase())
                    : 'Tutti i problemi'}

                </p>

              </div>

              <button
                onClick={() => setModalSegnalazioniAttivita(null)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
              >

                <X className="w-4 h-4 text-gray-400" />

              </button>

            </div>

            {/* LISTA */}
            {modalSegnalazioniAttivita.lista.length === 0 ? (

              <div className="text-center text-sm text-gray-400 py-8">

                Nessuna segnalazione

              </div>

            ) : (

              <div className="flex flex-col gap-3">

                {modalSegnalazioniAttivita.lista.map((v: any) => (

                  <div
                    key={v.id}
                    className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex flex-col gap-3"
                  >

                    {/* ATTIVITA */}
                    <div>

                      <p className="font-semibold text-gray-900">

                        {v.attivita_stazione?.nome || 'Attività sconosciuta'}

                      </p>

                      <p className="text-xs text-gray-500 mt-0.5">

                        {v.attivita_stazione?.stazioni?.nome || ''}

                      </p>

                    </div>

                    {/* PROBLEMA */}
                    <div className="flex items-center gap-2">

                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />

                      <span className="text-sm font-medium text-amber-800">

                        {v.tipo_problema
                          ?.replace(/_/g, ' ')
                          ?.replace(/\b\w/g, (c: string) => c.toUpperCase())}

                      </span>

                    </div>

                    {/* NOTE */}
                    {v.nota && (

                      <p className="text-xs text-gray-600 bg-white rounded-xl px-3 py-2 border border-amber-100">

                        {v.nota}

                      </p>
                    )}

                    {/* DATA */}
                    <p className="text-xs text-gray-400">

                      {new Date(v.created_at).toLocaleString('it-IT')}

                    </p>

                    {/* AZIONI */}
                    <div className="flex gap-2">

                      <button
                        type="button"
                        onClick={() => {
                          setModalSegnalazioniAttivita(null);
                          apriModificaDaQualita(v.attivita_stazione?.id);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:opacity-90"
                      >

                        <Pencil className="w-3.5 h-3.5" />

                        Modifica attività

                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          gestisciSegnalazioneAttivita(v.id)
                        }
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:opacity-90"
                      >

                        <Check className="w-3.5 h-3.5" />

                        Gestita

                      </button>

                    </div>

                  </div>
                ))}

              </div>
            )}

          </div>

        </div>
      )}

      {/* INFO / SISTEMA */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">

          <h2 className="font-semibold text-gray-900 mb-3">

            Sistema

          </h2>

          <div className="flex flex-col gap-2 text-sm text-gray-600">

            <div className="flex items-center justify-between">

              <span>

                Modalità admin

              </span>

              <span className="text-emerald-600 font-semibold">

                Attiva

              </span>

            </div>

            <div className="flex items-center justify-between">

              <span>

                Database

              </span>

              <span className="text-emerald-600 font-semibold">

                Online

              </span>

            </div>

          </div>

        </div>

      </div>

      {/* ========================= */}
      {/* MODAL QUALITÀ DATI        */}
      {/* ========================= */}

      {modalQualita && (

        <div
          className="
            fixed
            inset-0
            bg-black/40
            z-50
            flex
            items-center
            justify-center
            p-4
          "
          onClick={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              setModalQualita(null);
            }
          }}
        >

          <div
            className="
              bg-white
              rounded-3xl
              w-full
              max-w-2xl
              flex
              flex-col
              max-h-[85vh]
              overflow-hidden
            "
          >

            {/* HEADER MODAL */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">

              <div>

                <h2 className="text-xl font-bold text-gray-900">

                  {modalQualita.titolo}

                </h2>

                <p className="text-sm text-gray-400 mt-0.5">

                  {
                    modalQualita.lista
                      .length
                  }{' '}

                  {modalQualita.lista
                    .length === 1
                    ? 'attività'
                    : 'attività'}

                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setModalQualita(null)
                }
                className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >

                <X className="w-5 h-5 text-gray-500" />

              </button>

            </div>

            {/* LISTA */}
            <div className="overflow-y-auto flex-1 px-6 py-4 flex flex-col gap-3">

              {modalQualita.lista
                .length === 0 && (

                <div className="text-center py-8 text-gray-400 text-sm">

                  Nessuna attività in questa categoria.

                </div>
              )}

              {modalQualita.lista.map(
                (a) => (

                  <div
                    key={a.id}
                    className="bg-gray-50 rounded-2xl p-4 flex items-start justify-between gap-3"
                  >

                    <div className="flex-1 min-w-0">

                      {/* NOME + BADGE */}
                      <div className="flex items-center gap-2 flex-wrap">

                        <span className="font-semibold text-gray-900">

                          {a.nome}

                        </span>

                        {/* BADGE STATO */}
                        <span
                          className={`
                            px-2
                            py-0.5
                            rounded-full
                            text-xs
                            font-semibold
                            ${
                              a.is_active
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-600'
                            }
                          `}
                        >

                          {a.is_active
                            ? 'Attiva'
                            : 'Eliminata'}

                        </span>

                        {/* BADGE CONVENZIONATO */}
                        {a.convenzionato && (

                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-trenord-green/10 text-trenord-green">

                            Convenzionato

                          </span>
                        )}

                      </div>

                      {/* STAZIONE */}
                      <p className="text-sm text-gray-500 mt-0.5">

                        {getNomeStazione(
                          a.stazione_id
                        )}

                      </p>

                      {/* CATEGORIA */}
                      <p className="text-xs text-gray-400 mt-0.5">

                        {a.categoria}

                      </p>

                    </div>

                    {/* PULSANTI AZIONE */}
                    <div className="flex-shrink-0 flex flex-col gap-2">

                      {/* SEGNA COME OK (solo duplicati) */}
                      {modalQualita.tipo === 'duplicati' && (

                        <button
                          type="button"
                          onClick={() =>
                            ignoraDuplicato(a.id)
                          }
                          className="
                            flex
                            items-center
                            gap-1.5
                            px-3
                            py-2
                            rounded-xl
                            bg-emerald-600
                            text-white
                            text-sm
                            font-medium
                            hover:opacity-90
                            transition-opacity
                          "
                        >

                          <Check className="w-3.5 h-3.5" />

                          OK

                        </button>
                      )}

                      {/* MODIFICA */}
                      <button
                        type="button"
                        onClick={() =>
                          apriModificaDaQualita(
                            a.id
                          )
                        }
                        className="
                          flex
                          items-center
                          gap-1.5
                          px-3
                          py-2
                          rounded-xl
                          bg-blue-600
                          text-white
                          text-sm
                          font-medium
                          hover:opacity-90
                          transition-opacity
                        "
                      >

                        <Pencil className="w-3.5 h-3.5" />

                        Modifica

                      </button>

                    </div>

                  </div>
                )
              )}

            </div>

          </div>

        </div>
      )}

    </>
  );
}
