import React, { useState } from 'react';
import supabase from './supabaseClient';
// O objeto 'usuario' vem do App.jsx após o login
export default function Formulario({ usuario, onSair }) {
    const [sku, setSku] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [ultimoLancamento, setUltimoLancamento] = useState(null);
    const [showCadastro, setShowCadastro] = useState(false);
    const [novoEmail, setNovoEmail] = useState('');
    const [novaSenha, setNovaSenha] = useState('');
    const [erroCadastro, setErroCadastro] = useState('');
    const [msgCadastro, setMsgCadastro] = useState('');
    const [carregandoCadastro, setCarregandoCadastro] = useState(false);

    // O responsável será o e-mail ou ID do usuário logado
    const responsavel = usuario.email || usuario.id; 
    const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const isAdmin = ADMIN_EMAILS.includes(String(usuario?.email || '').toLowerCase());

    // CORREÇÃO AQUI: Usamos o atalho definido no vite.config.js para contornar o CORS
    const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK;
    const N8N_SKU_LOOKUP_URL = import.meta.env.VITE_N8N_SKU_LOOKUP || N8N_WEBHOOK_URL;
    // NOTA: A URL completa está configurada no proxy do vite.config.js

    const handleEnviarAjuste = async () => {
        setErroAjuste("");
        const desejado = Number(estoqueDesejado);
        if (!skuInfo || !skuInfo.sku) { setErroAjuste('Busque um SKU válido antes.'); return; }
        if (Number.isNaN(desejado)) { setErroAjuste('Informe um número válido para o estoque.'); return; }
        setEnviandoAjuste(true);
        try {
            const resp = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    action: 'ajuste_estoque_desejado',
                    intent: 'post',
                    sku: skuInfo.sku,
                    estoque_desejado: desejado,
                    responsavel,
                    timestamp: new Date().toISOString(),
                    produto: skuInfo,
                }),
            });
            if (!resp.ok) {
                if (resp.status === 401) { setErroAjuste('Estoque não cadastrado. Tente novamente em 1 minuto.'); return; }
                let detalhe = '';
                try {
                    const ct = resp.headers.get('content-type') || '';
                    if (ct.includes('application/json')) {
                        const body = await resp.json();
                        detalhe = body?.message || body?.error || body?.msg || JSON.stringify(body);
                    } else {
                        detalhe = await resp.text();
                    }
                } catch {}
                setErroAjuste(detalhe || `Falha no ajuste. Código: ${resp.status}`);
                return;
            }
            setShowAjusteModal(false);
            setShowModal(true);
            setUltimoLancamento({
                sku: skuInfo.sku,
                tipo: 'ajuste',
                deposito: '-',
                responsavel,
                quantidade: '-',
                precoBRL: '-',
                observacao: '-',
                datahora: new Date().toLocaleString('pt-BR'),
                estoqueAtual: desejado,
            });
        } catch (e) {
            setErroAjuste(e.message);
        } finally {
            setEnviandoAjuste(false);
        }
    };

    // Removido: fluxo antigo de ajuste de estoque por balanço (não utilizado neste layout)

    const [buscandoSku, setBuscandoSku] = useState(false);
    const [skuInfo, setSkuInfo] = useState(null);
    const [erroSku, setErroSku] = useState("");
    const [showAjusteModal, setShowAjusteModal] = useState(false);
    const [estoqueDesejado, setEstoqueDesejado] = useState("");
    const [enviandoAjuste, setEnviandoAjuste] = useState(false);
    const [erroAjuste, setErroAjuste] = useState("");

    const handleBuscarSku = async () => {
        setErroSku("");
        setSkuInfo(null);
        const codigo = (sku || "").trim();
        if (!codigo) { setErroSku("Informe um SKU para buscar."); return; }
        if (!N8N_SKU_LOOKUP_URL) { setErroSku("Webhook não configurado."); return; }
        setBuscandoSku(true);
        try {
            const url = `${N8N_SKU_LOOKUP_URL}`;
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ action: 'lookup_sku', intent: 'get', sku: codigo }),
            });
            if (!resp.ok) {
                if (resp.status === 404) { setErroSku('Produto não encontrado.'); return; }
                if (resp.status === 401) { setErroSku('Estoque não cadastrado. Tente novamente em 1 minuto.'); return; }
                let detalhe = '';
                try {
                    const ct = resp.headers.get('content-type') || '';
                    if (ct.includes('application/json')) {
                        const body = await resp.json();
                        detalhe = body?.message || body?.error || body?.msg || JSON.stringify(body);
                    } else {
                        detalhe = await resp.text();
                    }
                } catch {}
                setErroSku(detalhe || `Falha na busca. Código: ${resp.status}`);
                return;
            }
            const data = await resp.json();
            let item = Array.isArray(data) ? (data[0] || null) : data;
            if (item && typeof item === 'object' && item.produto) {
                item = item.produto;
            }
            if (!item || (typeof item === 'object' && Object.keys(item).length === 0)) {
                setErroSku('Produto não encontrado.');
                return;
            }
            setSkuInfo(item);
        } catch (e) {
            setErroSku(e.message);
        } finally {
            setBuscandoSku(false);
        }
    };

    const handleAdminSignup = async () => {
        setErroCadastro('');
        setMsgCadastro('');
        const emailTrim = (novoEmail || '').trim();
        const senhaStr = String(novaSenha || '');
        const emailOk = /.+@.+\..+/.test(emailTrim);
        const senhaOk = senhaStr.length >= 8;
        if (!emailOk) { setErroCadastro('Informe um e-mail válido.'); return; }
        if (!senhaOk) { setErroCadastro('A senha deve ter pelo menos 8 caracteres.'); return; }
        setCarregandoCadastro(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email: emailTrim,
                password: senhaStr,
                options: { emailRedirectTo: window.location.origin },
            });
            if (error) { setErroCadastro(error.message); return; }
            if (data.user) {
                setMsgCadastro('Usuário criado. Confirme o e-mail para ativar a conta.');
                setNovoEmail('');
                setNovaSenha('');
            }
        } finally {
            setCarregandoCadastro(false);
        }
    };

    return (
        <div className="formulario-container">
            <h2>Consulta de Produto</h2>
            <p className="responsavel-info">Responsável: <span>{responsavel}</span></p>
            {isAdmin && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                    {!showCadastro ? (
                        <a
                            href="#"
                            style={{ color: '#8a5cf6', textDecoration: 'underline' }}
                            onClick={(e) => { e.preventDefault(); setShowCadastro(true); }}
                        >
                            Cadastrar usuário
                        </a>
                    ) : (
                        <div style={{ background: '#2a2a2a', padding: '12px', borderRadius: '6px', width: 'min(460px, 100%)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <strong>Novo usuário</strong>
                                <button type="button" className="logout-button" onClick={() => { setShowCadastro(false); setErroCadastro(''); setMsgCadastro(''); }}>Fechar</button>
                            </div>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                <input
                                    type="email"
                                    placeholder="Email do novo usuário"
                                    value={novoEmail}
                                    onChange={(e) => setNovoEmail(e.target.value)}
                                    className="form-input"
                                />
                                <input
                                    type="password"
                                    placeholder="Senha inicial"
                                    value={novaSenha}
                                    onChange={(e) => setNovaSenha(e.target.value)}
                                    className="form-input"
                                />
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                    <button type="button" className="submit-button" disabled={carregandoCadastro} onClick={handleAdminSignup}>
                                        {carregandoCadastro ? 'Cadastrando...' : 'Cadastrar'}
                                    </button>
                                </div>
                                {erroCadastro && <p className="mensagem mensagem-erro" style={{ margin: 0 }}>{erroCadastro}</p>}
                                {msgCadastro && <p className="mensagem mensagem-sucesso" style={{ margin: 0 }}>{msgCadastro}</p>}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <form className="ajuste-form" onSubmit={(e) => e.preventDefault()}>
                {/* Passo 1: Consulta */}
                <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                        <label htmlFor="sku">Código do Produto (SKU)</label>
                        <input
                            type="text"
                            id="sku"
                            value={sku}
                            onChange={(e) => setSku(e.target.value)}
                            className="form-input"
                            placeholder="Ex: P00123"
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                            <button type="button" className="submit-button" onClick={handleBuscarSku} disabled={buscandoSku}>
                                {buscandoSku ? 'Buscando...' : 'Buscar SKU'}
                            </button>
                            {erroSku && <span className="mensagem mensagem-erro">{String(erroSku)}</span>}
                        </div>
                    </div>
                </div>

                {/* Detalhes */}
                {skuInfo && (
                    <div style={{ marginTop: '12px', background: '#2a2a2a', padding: '12px', borderRadius: '6px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                            <div><strong>Nome:</strong> {skuInfo.nome ?? '-'}</div>
                            <div><strong>SKU:</strong> {skuInfo.sku ?? '-'}</div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <strong>Saldo em estoque:</strong> {skuInfo['saldo estoque'] ?? skuInfo['estoque atual'] ?? skuInfo.estoque_atual ?? '-' }
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button type="button" className="submit-button" onClick={() => { setShowAjusteModal(true); setEstoqueDesejado(''); setErroAjuste(''); }}>Alterar estoque</button>
                        </div>
                    </div>
                )}

                {/* Modal de sucesso compartilhado */}
                {showModal && (
                    <div
                        className="modal-overlay"
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                        }}
                    >
                        <div
                            className="modal-content"
                            style={{ background: '#1f1f1f', color: '#fff', padding: '24px', borderRadius: '8px', width: 'min(420px, 92%)' }}
                        >
                            <h3 style={{ marginTop: 0, marginBottom: '8px' }}>Operação realizada com sucesso!</h3>
                            {ultimoLancamento && (
                                <div style={{ background: '#2a2a2a', borderRadius: '6px', padding: '12px', marginBottom: '12px', fontSize: '0.95rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                                        <div><strong>SKU:</strong> {ultimoLancamento.sku}</div>
                                        <div><strong>Estoque atual:</strong> {ultimoLancamento.estoqueAtual ?? '-'}</div>
                                        <div style={{ gridColumn: '1 / -1' }}><strong>Responsável:</strong> {ultimoLancamento.responsavel}</div>
                                        <div style={{ gridColumn: '1 / -1' }}><strong>Data/Hora:</strong> {ultimoLancamento.datahora}</div>
                                    </div>
                                </div>
                            )}
                            <p style={{ marginTop: 0, marginBottom: '16px', opacity: 0.9 }}>
                                Deseja consultar outro SKU ou sair?
                            </p>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                <button
                                    type="button"
                                    className="submit-button"
                                    onClick={() => { setShowModal(false); setSku(''); setSkuInfo(null); }}
                                    style={{ height: '44px', padding: '0 16px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: '44px', fontSize: '14px', fontWeight: 600, boxSizing: 'border-box', borderWidth: '1px', borderStyle: 'solid', borderColor: 'transparent', marginTop: 0 }}
                                >
                                    Consultar outro SKU
                                </button>
                                <button
                                    type="button"
                                    className="logout-button"
                                    onClick={() => { setShowModal(false); onSair && onSair(); }}
                                    style={{ height: '44px', padding: '0 16px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: '44px', fontSize: '14px', fontWeight: 600, boxSizing: 'border-box', outline: 'none', boxShadow: 'none', borderWidth: '1px', verticalAlign: 'middle' }}
                                >
                                    Sair
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </form>

            {/* Modal de ajuste de estoque */}
            {showAjusteModal && (
                <div
                    className="modal-overlay"
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                >
                    <div className="modal-content" style={{ background: '#1f1f1f', color: '#fff', padding: '24px', borderRadius: '8px', width: 'min(460px, 92%)' }}>
                        <h3 style={{ marginTop: 0 }}>Alterar estoque</h3>
                        {skuInfo && (
                            <div style={{ background: '#2a2a2a', borderRadius: '6px', padding: '12px', marginBottom: '12px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                                    <div><strong>Nome:</strong> {skuInfo.nome ?? '-'}</div>
                                    <div><strong>SKU:</strong> {skuInfo.sku ?? '-'}</div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <strong>Saldo atual:</strong> {skuInfo['saldo estoque'] ?? skuInfo['estoque atual'] ?? skuInfo.estoque_atual ?? '-' }
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="form-group">
                            <label htmlFor="estoqueDesejado">Estoque necessário</label>
                            <input
                                id="estoqueDesejado"
                                type="number"
                                className="form-input"
                                placeholder="Ex: 25"
                                value={estoqueDesejado}
                                onChange={(e) => setEstoqueDesejado(e.target.value)}
                            />
                        </div>
                        {erroAjuste && <p className="mensagem mensagem-erro">{String(erroAjuste)}</p>}
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center', marginTop: '12px' }}>
                            <button type="button" className="logout-button" onClick={() => setShowAjusteModal(false)}
                                style={{ height: '44px', padding: '0 16px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: '44px', fontSize: '14px', fontWeight: 600, boxSizing: 'border-box', outline: 'none', boxShadow: 'none', borderWidth: '1px', verticalAlign: 'middle' }}
                            >Cancelar</button>
                            <button type="button" className="submit-button" disabled={enviandoAjuste} onClick={handleEnviarAjuste}
                                style={{ height: '44px', padding: '0 16px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: '44px', fontSize: '14px', fontWeight: 600, boxSizing: 'border-box', borderWidth: '1px', borderStyle: 'solid', borderColor: 'transparent', marginTop: 0 }}
                            >
                                {enviandoAjuste ? 'Enviando...' : 'Enviar ajuste'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}