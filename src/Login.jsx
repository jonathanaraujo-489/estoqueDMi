import { useState } from "react";
// Importação Padrão do supabase
import supabase from "./supabaseClient"; 

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro(""); // Limpa erros antigos

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    
    if (error) {
      setErro(error.message);
    } else if (data.user) {
      onLogin(data.user); // Sucesso: muda para o Formulário
    } else {
      setErro("Credenciais inválidas ou erro desconhecido.");
    }
  };

  return (
    // Usa a classe principal para o visual sofisticado
    <div className="login-container"> 
      <h2>Login</h2>
      
      <form onSubmit={handleLogin} className="login-form"> 
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="login-input" 
        />
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="login-input" 
        />
        
        <button type="submit" className="login-button">Entrar</button>
        
        {erro && <p className="erro">{erro}</p>}
      </form>
    </div>
  );
}