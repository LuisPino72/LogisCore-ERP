import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Cliente de Supabase configurado con variables de entorno
// Este cliente se usará para Auth y consultas a tablas públicas
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
