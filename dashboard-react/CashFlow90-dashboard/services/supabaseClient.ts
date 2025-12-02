import { createClient } from '@supabase/supabase-js';

// Provided credentials
const supabaseUrl = process.env.SUPABASE_URL || 'https://rldrnadkthnhdcojzuou.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsZHJuYWRrdGhuaGRjb2p6dW91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MDAzMDcsImV4cCI6MjA4MDE3NjMwN30.cKc6xJGwtNmxrL10Br4sPHV6c7liq7EoElQKl2hzdZ4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);