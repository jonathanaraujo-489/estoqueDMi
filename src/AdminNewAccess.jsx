import { useState } from 'react';
import supabase from './supabaseClient';

export default function AdminNewAccess({ onCreated }) {
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [novoAcesso, setNovoAcesso] = useState('user');
  const [novaFotoFile, setNovaFotoFile] = useState(null);
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setNovoNome('');
    setNovoEmail('');
    setNovaSenha('');
    setNovoAcesso('user');
    setNovaFotoFile(null);
    setErro('');
    setMsg('');
  };

  const handleCreate = async () => {
    setErro('');
    setMsg('');
    const nome = (novoNome || '').trim();
    const emailTrim = (novoEmail || '').trim();
    const senhaStr = String(novaSenha || '');
    if (!nome) { setErro('Informe o nome completo.'); return; }
    if (!/.+@.+\..+/.test(emailTrim)) { setErro('Informe um e-mail válido.'); return; }
    if (senhaStr.length < 8) { setErro('A senha deve ter pelo menos 8 caracteres.'); return; }
    const acesso = (novoAcesso || '').toLowerCase();
    if (!['admin','user'].includes(acesso)) { setErro('Selecione um acesso válido.'); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailTrim,
        password: senhaStr,
        options: {
          emailRedirectTo: window.location.origin,
          data: { name: nome, acesso },
        },
      });
      if (error) { setErro(error.message); return; }
      if (data?.user) {
        // Upload opcional
        let publicUrl = null;
        if (novaFotoFile) {
          try {
            const path = `users/${data.user.id}/${Date.now()}-${novaFotoFile.name}`;
            const { error: upErr } = await supabase.storage.from('avatars').upload(path, novaFotoFile, {
              cacheControl: '3600', upsert: false,
            });
            if (!upErr) {
              const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
              publicUrl = pub?.publicUrl || null;
            }
          } catch (_) {}
        }
        const { error: upsertErr } = await supabase.from('users').upsert({
          id: data.user.id,
          name: nome,
          image: publicUrl,
          acesso,
          created_at: new Date().toISOString(),
        }, { onConflict: 'id' });
        if (upsertErr) {
          setMsg('Conta criada, mas houve um problema ao salvar o acesso. Verifique a tabela users.');
        } else {
          setMsg('Conta e acesso criados com sucesso. Verifique o e-mail do usuário para confirmar.');
          if (onCreated) onCreated();
        }
        reset();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#2a2a2a', padding: '12px', borderRadius: '8px' }}>
      <h3 style={{ margin: '0 0 8px 0' }}>Criar novo acesso</h3>
      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label htmlFor="novoNome">Nome completo</label>
          <input id="novoNome" type="text" className="form-input" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex.: Maria Silva" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label htmlFor="novoEmail">E-mail do novo usuário</label>
          <input id="novoEmail" type="email" className="form-input" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} placeholder="usuario@empresa.com" />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label htmlFor="novaSenha">Senha inicial</label>
          <input id="novaSenha" type="password" className="form-input" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="mínimo 8 caracteres" />
        </div>
        <div className="form-group" style={{ flex: 0.6 }}>
          <label htmlFor="novoAcesso">Acesso</label>
          <select id="novoAcesso" className="form-input" value={novoAcesso} onChange={(e) => setNovoAcesso(e.target.value)}>
            <option value="user">Usuário</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label htmlFor="novaFotoFile">Foto (arquivo local)</label>
          <input id="novaFotoFile" type="file" accept="image/*" className="form-input" onChange={(e) => setNovaFotoFile(e.target.files?.[0] || null)} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
        <button type="button" className="logout-button" onClick={reset}>Limpar</button>
        <button type="button" className="submit-button" onClick={handleCreate} disabled={loading}>
          {loading ? 'Criando...' : 'Criar acesso'}
        </button>
      </div>
      {erro && <p className="mensagem mensagem-erro" style={{ margin: 0 }}>{erro}</p>}
      {msg && <p className="mensagem mensagem-sucesso" style={{ margin: 0 }}>{msg}</p>}
    </div>
  );
}
