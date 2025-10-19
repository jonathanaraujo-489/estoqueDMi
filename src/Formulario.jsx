import React, { useState, useEffect } from 'react';
import supabase from './supabaseClient';
import Users from './Users';
// O objeto 'usuario' vem do App.jsx após o login
export default function Formulario({ usuario, onSair }) {
    const [sku, setSku] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [ultimoLancamento, setUltimoLancamento] = useState(null);
    const [adminView, setAdminView] = useState('estoque'); // 'estoque' | 'usuarios'
    const [sidebarOpen, setSidebarOpen] = useState(false);
    useEffect(() => {
        try { if (window?.innerWidth) setSidebarOpen(window.innerWidth > 640); } catch {}
    }, []);

    const handleNav = (view) => {
        setAdminView(view);
    };

    // Responsável exibido (dados da tabela users)
    const [responsavelNome, setResponsavelNome] = useState(usuario.email || usuario.id);
    const [responsavelFoto, setResponsavelFoto] = useState(null);
    const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const [isAdmin, setIsAdmin] = useState(false);
    useEffect(() => {
        let active = true;
        const checkAdmin = async () => {
            try {
                if (!usuario?.id) {
                    setIsAdmin(false);
                    return;
                }
                const { data, error } = await supabase
                    .from('users')
                    .select('acesso, name, image')
                    .eq('id', usuario.id)
                    .single();
                if (!active) return;
                if (!error && data) {
                    if (data?.name) setResponsavelNome(data.name);
                    setResponsavelFoto(data?.image || null);
                }
                if (!error && data?.acesso === 'admin') {
                    setIsAdmin(true);
                } else {
                    const byEnv = ADMIN_EMAILS.includes(String(usuario?.email || '').toLowerCase());
                    setIsAdmin(byEnv);
                }
            } catch (_) {
                const byEnv = ADMIN_EMAILS.includes(String(usuario?.email || '').toLowerCase());
                setIsAdmin(byEnv);
                setResponsavelNome(usuario.email || usuario.id);
                setResponsavelFoto(null);
            }
        };
        checkAdmin();
        return () => { active = false; };
    }, [usuario?.id, usuario?.email]);

    // listagem de usuários foi movida para o componente <Users />

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
                    responsavel: responsavelNome,
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
                responsavel: responsavelNome,
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

    // criação de acesso movida para <AdminNewAccess />

    return (
        <div style={{ ...(isAdmin ? { maxWidth: '100%', width: '100%' } : {}) }}>
            <aside className="sidebar" data-open={sidebarOpen ? '1' : '0'} style={{ position: 'fixed', top: 0, left: 0, width: 220, height: '100vh', background: '#2a2a2a', borderRight: '1px solid #3a3a3a', padding: '16px 10px 16px 10px', zIndex: 5, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                    <img src="/simbolo-dmi.png" alt="Logo DMI" style={{ width: 96, height: 96, objectFit: 'contain', display: 'block', margin: '0 auto 12px auto' }} />
                    <button type="button" className="submit-button" style={{ width: '100%', marginTop: 0 }} onClick={() => handleNav('estoque')}>Controle de estoque</button>
                    {isAdmin && (
                        <button type="button" className="submit-button" style={{ width: '100%', marginTop: 10 }} onClick={() => handleNav('usuarios')}>Usuários</button>
                    )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <img
                        src={responsavelFoto || '/simbolo-dmi.png'}
                        alt="Foto do responsável"
                        style={{ width: 86, height: 86, borderRadius: 6, objectFit: 'cover', display: 'block', margin: '0 auto 4px auto', background: '#333' }}
                        onError={(e) => { e.currentTarget.src = '/simbolo-dmi.png'; }}
                    />
                    <button type="button" className="logout-button" style={{ width: '100%' }} onClick={() => { onSair && onSair(); }}>Sair</button>
                    <img src="/simboloEvolury.png" alt="Logo" style={{ width: 44, height: 44, objectFit: 'contain', alignSelf: 'center', opacity: 0.85 }} />
                </div>
            </aside>
            {/* Backdrop removido: recolhe apenas pelo botão ☰ */}
            <div className="content-wrap">
            <button type="button" className="sidebar-toggle" onClick={() => setSidebarOpen(v => !v)} aria-label="Alternar menu">
                ☰
            </button>
            {isAdmin && adminView === 'usuarios' && (
                <Users />
            )}
            {(!isAdmin || adminView === 'estoque') && (
            <div style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px', width: 'min(1200px, calc(100% - 96px))', margin: '10vh 48px 0', boxShadow: '0 10px 24px rgba(0,0,0,0.25)' }}>
            <h3 style={{ marginTop: 0, textAlign: 'left' }}>Consulta de Produto</h3>
            <p className="responsavel-info" style={{ textAlign: 'left', margin: 0, marginBottom: 8 }}>Responsável: <span>{responsavelNome}</span></p>
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
            </div>
            )}
            </div>

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