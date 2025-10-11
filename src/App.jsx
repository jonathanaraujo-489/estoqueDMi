import { useState, useEffect } from "react";
import supabase from "./supabaseClient"; // Importação Padrão
import Login from "./Login";
import Formulario from "./Formulario";

export default function App() {
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    // Tenta obter a sessão atual
    supabase.auth.getSession().then(({ data }) => {
      setUsuario(data.session?.user ?? null);
    });
    
    // Configura o listener para mudanças de estado de autenticação
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_, session) => setUsuario(session?.user ?? null)
    );
    
    // Limpeza (unsubscribe) do listener
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUsuario(null);
  };

  return (
    <> 
      {!usuario ? (
        <Login onLogin={setUsuario} />
      ) : (
        <>
          <header className="app-header">
            <h1 className="header-title">Controle de Estoque</h1>
            <button onClick={handleLogout} className="logout-button">
              Sair
            </button>
          </header>
          <Formulario usuario={usuario} />
        </>
      )}

      {/* NOVO CÓDIGO: Imagem adicionada no caminho público com classe para CSS */}
      <img 
        src="/simboloEvolury.png" 
        alt="Símbolo Evolury" 
        className="app-logo-footer"
      />
    </>
  );
}