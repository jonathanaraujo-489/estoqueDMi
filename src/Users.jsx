import { useEffect, useState } from 'react';
import supabase from './supabaseClient';

export default function Users() {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [cNome, setCNome] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cSenha, setCSenha] = useState('');
  const [cAcesso, setCAcesso] = useState('user');
  const [cFoto, setCFoto] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createMsg, setCreateMsg] = useState('');
  const [createErr, setCreateErr] = useState('');

  const [editUser, setEditUser] = useState(null);
  const [eNome, setENome] = useState('');
  const [eAcesso, setEAcesso] = useState('user');
  const [eFoto, setEFoto] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editErr, setEditErr] = useState('');

  const [deletingId, setDeletingId] = useState(null);
  const [deleteErr, setDeleteErr] = useState('');

  const load = async () => {
    setErro('');
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, image, acesso, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) { setErro(error.message); setUsuarios([]); }
      else { setUsuarios(Array.isArray(data) ? data : []); }
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  };

  const handleDelete = async (u) => {
    if (!u?.id) return;
    setDeleteErr('');
    const ok = window.confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.');
    if (!ok) return;
    setDeletingId(u.id);
    try {
      // Tenta remover imagens do bucket 'image/users/<id>/*'
      try {
        const folder = `users/${u.id}`;
        const { data: files } = await supabase.storage.from('image').list(folder, { limit: 100 });
        if (Array.isArray(files) && files.length > 0) {
          const paths = files.map(f => `${folder}/${f.name}`);
          await supabase.storage.from('image').remove(paths);
        }
      } catch (_) { /* ignora erros de storage */ }

      // Exclui linha da tabela users
      const { error: delErr } = await supabase.from('users').delete().eq('id', u.id);
      if (delErr) { setDeleteErr(delErr.message); return; }
      await load();
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setCreateErr('');
    setCreateMsg('');
    const nome = (cNome || '').trim();
    const emailTrim = (cEmail || '').trim();
    const senhaStr = String(cSenha || '');
    if (!nome) { setCreateErr('Informe o nome completo.'); return; }
    if (!/.+@.+\..+/.test(emailTrim)) { setCreateErr('Informe um e-mail válido.'); return; }
    if (senhaStr.length < 8) { setCreateErr('A senha deve ter pelo menos 8 caracteres.'); return; }
    const acesso = (cAcesso || '').toLowerCase();
    if (!['admin','user'].includes(acesso)) { setCreateErr('Selecione um acesso válido.'); return; }

    setCreateLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailTrim,
        password: senhaStr,
        options: { emailRedirectTo: window.location.origin, data: { name: nome, acesso } },
      });
      if (error) { setCreateErr(error.message); return; }
      if (data?.user) {
        let publicUrl = null;
        if (cFoto) {
          try {
            const path = `users/${data.user.id}/${Date.now()}-${cFoto.name}`;
            const { error: upErr } = await supabase.storage.from('image').upload(path, cFoto, { cacheControl: '3600', upsert: false });
            if (!upErr) { const { data: pub } = supabase.storage.from('image').getPublicUrl(path); publicUrl = pub?.publicUrl || null; }
          } catch (_) {}
        }
        const { error: upsertErr } = await supabase.from('users').upsert({
          id: data.user.id,
          name: nome,
          image: publicUrl,
          acesso,
          created_at: new Date().toISOString(),
        }, { onConflict: 'id' });
        if (upsertErr) setCreateMsg('Conta criada, mas houve um problema ao salvar o acesso na tabela.');
        else setCreateMsg('Conta e acesso criados com sucesso.');
        setShowCreate(false);
        setCNome(''); setCEmail(''); setCSenha(''); setCAcesso('user'); setCFoto(null);
        await load();
      }
    } finally { setCreateLoading(false); }
  };

  const openEdit = (u) => { setEditUser(u); setENome(u.name || ''); setEAcesso(u.acesso || 'user'); setEFoto(null); setEditErr(''); };
  const handleEdit = async () => {
    if (!editUser) return;
    setEditErr(''); setEditLoading(true);
    const nome = (eNome || '').trim();
    const acesso = (eAcesso || '').toLowerCase();
    let imageUrl = editUser.image || null;
    try {
      if (eFoto) {
        const path = `users/${editUser.id}/${Date.now()}-${eFoto.name}`;
        const { error: upErr } = await supabase.storage.from('image').upload(path, eFoto, { cacheControl: '3600', upsert: false });
        if (!upErr) { const { data: pub } = supabase.storage.from('image').getPublicUrl(path); imageUrl = pub?.publicUrl || imageUrl; }
      }
      const { error: updErr } = await supabase.from('users').update({ name: nome, acesso, image: imageUrl }).eq('id', editUser.id);
      if (updErr) { setEditErr(updErr.message); return; }
      setEditUser(null); await load();
    } finally { setEditLoading(false); }
  };

  return (
    <div style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px', width: 'min(1200px, calc(100% - 96px))', margin: '10vh 48px 0', boxShadow: '0 10px 24px rgba(0,0,0,0.25)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Usuários cadastrados</h3>
        <button type="button" className="submit-button" style={{ marginTop: 0 }} onClick={() => { setShowCreate(true); setCreateErr(''); setCreateMsg(''); }}>Cadastrar usuário</button>
      </div>
      {erro && <p className="mensagem mensagem-erro" style={{ marginBottom: '8px' }}>{erro}</p>}
      {carregando ? (
        <p>Carregando...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #444' }}>
                <th style={{ padding: '8px' }}>Foto</th>
                <th style={{ padding: '8px' }}>Nome</th>
                <th style={{ padding: '8px' }}>Acesso</th>
                <th style={{ padding: '8px' }}>Criado em</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '8px' }}>
                    {u.image ? <img src={u.image} alt={u.name || u.id} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} /> : '-'}
                  </td>
                  <td style={{ padding: '8px' }}>{u.name || '-'}</td>
                  <td style={{ padding: '8px' }}>{u.acesso}</td>
                  <td style={{ padding: '8px' }}>{u.created_at ? new Date(u.created_at).toLocaleString('pt-BR') : '-'}</td>
                  <td style={{ padding: '8px', textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button type="button" className="logout-button" onClick={() => openEdit(u)}>
                      Editar
                    </button>
                    <button type="button" className="logout-button" onClick={() => handleDelete(u)} disabled={deletingId === u.id}>
                      {deletingId === u.id ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr><td colSpan="5" style={{ padding: '8px', textAlign: 'center' }}>Nenhum usuário encontrado.</td></tr>
              )}

      {deleteErr && <p className="mensagem mensagem-erro" style={{ marginTop: 8 }}>{deleteErr}</p>}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="modal-content" style={{ background: '#1f1f1f', color: '#fff', padding: 24, borderRadius: 8, width: 'min(460px, 92%)' }}>
            <h3 style={{ marginTop: 0 }}>Cadastrar usuário</h3>
            <div className="form-row" style={{ gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: 220 }}>
                <label htmlFor="cNome">Nome completo</label>
                <input id="cNome" type="text" className="form-input" value={cNome} onChange={(e) => setCNome(e.target.value)} placeholder="Ex.: Maria Silva" />
              </div>
            </div>
            <div className="form-row" style={{ gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: 220 }}>
                <label htmlFor="cEmail">E-mail</label>
                <input id="cEmail" type="email" className="form-input" value={cEmail} onChange={(e) => setCEmail(e.target.value)} placeholder="usuario@empresa.com" />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: 220 }}>
                <label htmlFor="cSenha">Senha</label>
                <input id="cSenha" type="password" className="form-input" value={cSenha} onChange={(e) => setCSenha(e.target.value)} placeholder="mínimo 8 caracteres" />
              </div>
              <div className="form-group" style={{ flex: 0.5, minWidth: 160 }}>
                <label htmlFor="cAcesso">Acesso</label>
                <select id="cAcesso" className="form-input form-select" value={cAcesso} onChange={(e) => setCAcesso(e.target.value)}>
                  <option value="user">Usuário</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: 220 }}>
                <label htmlFor="cFoto">Foto (arquivo local)</label>
                <input id="cFoto" type="file" accept="image/*" className="form-input" onChange={(e) => setCFoto(e.target.files?.[0] || null)} />
              </div>
            </div>
            {createErr && <p className="mensagem mensagem-erro">{createErr}</p>}
            {createMsg && <p className="mensagem mensagem-sucesso">{createMsg}</p>}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
              <button type="button" className="button-outline-red" style={{ marginTop: 0 }} onClick={() => setShowCreate(false)}>Cancelar</button>
              <button type="button" className="submit-button" style={{ marginTop: 0 }} onClick={handleCreate} disabled={createLoading}>{createLoading ? 'Criando...' : 'Criar'}</button>
            </div>
          </div>
        </div>
      )}

      {editUser && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="modal-content" style={{ background: '#1f1f1f', color: '#fff', padding: 24, borderRadius: 8, width: 'min(460px, 92%)' }}>
            <h3 style={{ marginTop: 0 }}>Editar usuário</h3>
            <div className="form-row" style={{ gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="eNome">Nome completo</label>
                <input id="eNome" type="text" className="form-input" value={eNome} onChange={(e) => setENome(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 0.6 }}>
                <label htmlFor="eAcesso">Acesso</label>
                <select id="eAcesso" className="form-input form-select" value={eAcesso} onChange={(e) => setEAcesso(e.target.value)}>
                  <option value="user">Usuário</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="form-row" style={{ gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: 220 }}>
                <label htmlFor="eFoto">Foto (arquivo local)</label>
                <input id="eFoto" type="file" accept="image/*" className="form-input" onChange={(e) => setEFoto(e.target.files?.[0] || null)} />
              </div>
            </div>
            {editErr && <p className="mensagem mensagem-erro">{editErr}</p>}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
              <button type="button" className="button-outline-red" style={{ marginTop: 0 }} onClick={() => setEditUser(null)} disabled={editLoading}>Cancelar</button>
              <button type="button" className="submit-button" style={{ marginTop: 0 }} onClick={handleEdit} disabled={editLoading}>{editLoading ? 'Salvando...' : 'Salvar alterações'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
