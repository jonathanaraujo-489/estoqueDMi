import { useState } from "react";
// Importação Padrão do supabase
import supabase from "./supabaseClient"; 

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro(""); // Limpa erros antigos
    setMensagem("");

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

  const handleSignup = async () => {
    setErro("");
    setMensagem("");
    const emailTrim = (email || "").trim();
    const senhaStr = String(senha || "");
    const emailOk = /.+@.+\..+/.test(emailTrim);
    const senhaOk = senhaStr.length >= 8;
    if (!emailOk) {
      setErro("Informe um e-mail válido.");
      return;
    }
    if (!senhaOk) {
      setErro("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: emailTrim,
      password: senhaStr,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      setErro(error.message);
      return;
    }
    if (data.user) {
      setMensagem(
        "Conta criada. Verifique seu e-mail para confirmar o cadastro antes de entrar."
      );
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
        {mensagem && <p className="mensagem-sucesso">{mensagem}</p>}
      </form>
    </div>
  );
}