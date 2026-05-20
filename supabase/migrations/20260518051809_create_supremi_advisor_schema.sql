/*
  # Supremi Advisor V2 - Initial Schema

  ## Overview
  Creates the core tables for the Supremi Advisor V2 app used for managing
  train station facilities (stazioni) and waiting rooms (salette).

  ## New Tables

  ### stazioni (Stations)
  - id: UUID primary key
  - nome: Station name
  - codice: Station code (e.g., MI-CENT)
  - regione: Region name
  - provincia: Province
  - attiva: Whether the station is active
  - lat / lng: GPS coordinates
  - note: Free-text notes
  - created_at / updated_at: Timestamps

  ### salette (Waiting rooms within stations)
  - id: UUID primary key
  - stazione_id: FK to stazioni
  - nome: Room name
  - capienza: Seating capacity
  - stato: Status enum (aperta / chiusa / manutenzione)
  - accessibile: Wheelchair accessible flag
  - climatizzata: Air conditioned flag
  - note: Free-text notes
  - created_at / updated_at: Timestamps

  ## Security
  - RLS enabled on both tables
  - Authenticated users can read all records
  - Only authenticated users can insert/update/delete
*/

-- Stazioni table
CREATE TABLE IF NOT EXISTS stazioni (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  codice text UNIQUE NOT NULL,
  regione text NOT NULL DEFAULT '',
  provincia text NOT NULL DEFAULT '',
  attiva boolean NOT NULL DEFAULT true,
  lat numeric(10, 6),
  lng numeric(10, 6),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Salette table
CREATE TABLE IF NOT EXISTS salette (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stazione_id uuid NOT NULL REFERENCES stazioni(id) ON DELETE CASCADE,
  nome text NOT NULL,
  capienza integer NOT NULL DEFAULT 0,
  stato text NOT NULL DEFAULT 'aperta' CHECK (stato IN ('aperta', 'chiusa', 'manutenzione')),
  accessibile boolean NOT NULL DEFAULT false,
  climatizzata boolean NOT NULL DEFAULT false,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_salette_stazione_id ON salette(stazione_id);
CREATE INDEX IF NOT EXISTS idx_stazioni_attiva ON stazioni(attiva);

-- Enable RLS
ALTER TABLE stazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE salette ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stazioni
CREATE POLICY "Authenticated users can view stazioni"
  ON stazioni FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert stazioni"
  ON stazioni FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update stazioni"
  ON stazioni FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete stazioni"
  ON stazioni FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for salette
CREATE POLICY "Authenticated users can view salette"
  ON salette FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert salette"
  ON salette FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update salette"
  ON salette FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete salette"
  ON salette FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Seed some demo data
INSERT INTO stazioni (nome, codice, regione, provincia, attiva, lat, lng, note) VALUES
  ('Milano Centrale', 'MI-CENT', 'Lombardia', 'Milano', true, 45.4854, 9.2045, 'Stazione principale di Milano'),
  ('Milano Porta Garibaldi', 'MI-GARI', 'Lombardia', 'Milano', true, 45.4855, 9.1876, ''),
  ('Bergamo', 'BG-CENT', 'Lombardia', 'Bergamo', true, 45.6955, 9.6702, 'Hub per Val Seriana'),
  ('Brescia', 'BS-CENT', 'Lombardia', 'Brescia', true, 45.5388, 10.2137, ''),
  ('Como San Giovanni', 'CO-SANG', 'Lombardia', 'Como', true, 45.8078, 9.0862, 'Stazione principale di Como'),
  ('Varese', 'VA-CENT', 'Lombardia', 'Varese', true, 45.8205, 8.8249, ''),
  ('Lecco', 'LC-CENT', 'Lombardia', 'Lecco', true, 45.8565, 9.3939, ''),
  ('Pavia', 'PV-CENT', 'Lombardia', 'Pavia', false, 45.1847, 9.1582, 'In ristrutturazione')
ON CONFLICT (codice) DO NOTHING;

-- Seed salette
INSERT INTO salette (stazione_id, nome, capienza, stato, accessibile, climatizzata, note)
SELECT s.id, 'Sala Attesa Binario 1', 40, 'aperta', true, true, 'Principale'
FROM stazioni s WHERE s.codice = 'MI-CENT'
ON CONFLICT DO NOTHING;

INSERT INTO salette (stazione_id, nome, capienza, stato, accessibile, climatizzata, note)
SELECT s.id, 'Sala VIP Frecce', 25, 'aperta', true, true, 'Solo abbonati Frecce'
FROM stazioni s WHERE s.codice = 'MI-CENT'
ON CONFLICT DO NOTHING;

INSERT INTO salette (stazione_id, nome, capienza, stato, accessibile, climatizzata, note)
SELECT s.id, 'Sala Attesa Nord', 20, 'manutenzione', false, false, 'Chiusa per lavori'
FROM stazioni s WHERE s.codice = 'MI-GARI'
ON CONFLICT DO NOTHING;

INSERT INTO salette (stazione_id, nome, capienza, stato, accessibile, climatizzata, note)
SELECT s.id, 'Sala Attesa Centrale', 30, 'aperta', true, true, ''
FROM stazioni s WHERE s.codice = 'BG-CENT'
ON CONFLICT DO NOTHING;
