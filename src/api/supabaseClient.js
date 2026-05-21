import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xwnedkgpwhbmoxanhmth.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3bmVka2dwd2hibW94YW5obXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDUyMDcsImV4cCI6MjA5NDI4MTIwN30.grC_0lH2WNbA6pDv4z3yKhv_5myqXWcP6rroR1xm5A0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
