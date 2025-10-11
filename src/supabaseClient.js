import { createClient } from '@supabase/supabase-js'

// Importa as variáveis de ambiente (verifique se os nomes batem com o seu .env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY 

const supabase = createClient(supabaseUrl, supabaseKey) 

// Exportação Padrão: garante que outros arquivos consigam importar facilmente
export default supabase