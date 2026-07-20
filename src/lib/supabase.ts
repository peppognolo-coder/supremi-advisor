import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  'https://ehththwozirrgkokzspa.supabase.co';

const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVodGh0aHdvemlycmdrb2t6c3BhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NzAyMjYsImV4cCI6MjA5NDM0NjIyNn0.GDnE-2fNcd1sqELE8xmssCsP-WtOvteSZWKb-_qL-bk';

export const supabase =
  createClient(
    supabaseUrl,
    supabaseAnonKey
  );
