import React, { useState } from 'react';
// O objeto 'usuario' vem do App.jsx após o login
export default function Formulario({ usuario, onSair }) {
    const [sku, setSku] = useState('');
    const [tipoMovimentacao, setTipoMovimentacao] = useState('balanco'); // Apenas Balanço
    const [deposito, setDeposito] = useState('deposito'); // Select
    const [quantidade, setQuantidade] = useState('');
    const [preco, setPreco] = useState('');
    const [observacao, setObservacao] = useState('');
    const [mensagem, setMensagem] = useState({}); // Usamos um objeto para mensagem e tipo
    const [carregando, setCarregando] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [ultimoLancamento, setUltimoLancamento] = useState(null);

    // O responsável será o e-mail ou ID do usuário logado
    const responsavel = usuario.email || usuario.id; 

    // CORREÇÃO AQUI: Usamos o atalho definido no vite.config.js para contornar o CORS
    const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK;
    // NOTA: A URL completa está configurada no proxy do vite.config.js

    // Formata para BRL (0,00) a partir de qualquer entrada
    const formatarBRL = (valor) => {
        const somenteDigitos = String(valor).replace(/\D/g, '');
        const numero = Number(somenteDigitos || 0) / 100;
        return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handlePrecoChange = (e) => {
        setPreco(formatarBRL(e.target.value));
    };

    const handleAjusteEstoque = async (e) => {
        e.preventDefault();
        setMensagem({});
        setCarregando(true);

        // 1. Validação simples (todos obrigatórios)
        const precoDigits = String(preco).replace(/\D/g, '');
        const precoValido = precoDigits.length > 0 && Number(precoDigits) > 0;
        const quantidadeValida = quantidade !== '' && !Number.isNaN(parseFloat(quantidade));

        if (!sku.trim() || !deposito || !quantidadeValida || !precoValido || !observacao.trim()) {
            setMensagem({ tipo: 'erro', texto: 'Preencha todos os campos obrigatórios.' });
            setCarregando(false);
            return;
        }

        // Validação de SKU é responsabilidade do backend (n8n). O front não consulta o banco.

        // 2. Monta o payload para o n8n
        // Converte o preço mascarado ("1.234,56") para número (1234.56)
        const precoNumber = preco ? (Number(preco.replace(/\D/g, '')) / 100) : 0;
        const agora = new Date();

        const payload = {
            sku,
            tipo_lancamento: 'balanco',
            deposito,
            responsavel,
            quantidade: parseFloat(quantidade), 
            preco_lancamento: precoNumber,
            observacao,
            timestamp: agora.toISOString(),
        };

        // Guarda os detalhes para exibir no modal
        setUltimoLancamento({
            sku,
            tipo: 'balanco',
            deposito,
            responsavel,
            quantidade: parseFloat(quantidade),
            precoBRL: formatarBRL(preco),
            observacao: observacao || '-',
            datahora: agora.toLocaleString('pt-BR'),
        });

        try {
            // 3. Envia para o Webhook do n8n (via Proxy do Vite)
            const response = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            
            // O n8n geralmente retorna status 200/204 (OK)
            if (response.ok) {
                // Limpa o formulário e abre modal de sucesso
                setSku('');
                setQuantidade('');
                setPreco('');
                setObservacao('');
                setMensagem({});
                setShowModal(true);
            } else {
                // 401: erro de autenticação
                if (response.status === 401) {
                    setMensagem({ tipo: 'erro', texto: 'Erro de autenticação. Por favor, contate o suporte.' });
                    return;
                }
                // 404 do webhook significa SKU não encontrado
                if (response.status === 404) {
                    setMensagem({ tipo: 'erro', texto: 'SKU não encontrado na base de produtos.' });
                    return;
                }
                // Tenta extrair mensagem de erro detalhada do n8n
                let detalhe = '';
                try {
                    const contentType = response.headers.get('content-type') || '';
                    if (contentType.includes('application/json')) {
                        const body = await response.json();
                        detalhe = body?.message || body?.error || body?.msg || JSON.stringify(body);
                    } else {
                        detalhe = await response.text();
                    }
                } catch (_) {
                    // ignora falha ao ler corpo
                }
                const texto = detalhe && detalhe.length < 400
                    ? `Erro do n8n: ${detalhe}`
                    : `Erro ao enviar. Código: ${response.status}. Verifique o n8n.`;
                setMensagem({ tipo: 'erro', texto });
            }
        } catch (error) {
            // Este catch só pega a falha de conexão local (ERR_FAILED), mas não o CORS (que o proxy evita)
            setMensagem({ tipo: 'erro', texto: `Falha na conexão: ${error.message}` });
        } finally {
            setCarregando(false);
        }
    };

    return (
        <div className="formulario-container">
            <h2>Ajuste de Estoque</h2>
            <p className="responsavel-info">Responsável: <span>{responsavel}</span></p>

            <form className="ajuste-form" onSubmit={handleAjusteEstoque}>
                
                {/* LINHA 1: SKU e TIPO */}
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="sku">Código do Produto (SKU)</label>
                        <input
                            type="text"
                            id="sku"
                            value={sku}
                            onChange={(e) => setSku(e.target.value)}
                            className="form-input"
                            placeholder="Ex: P00123"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="movimentacao">Tipo de Lançamento</label>
                        <input
                            id="movimentacao"
                            type="text"
                            className="form-input"
                            value="Balanço"
                            readOnly
                        />
                    </div>
                </div>

                {/* LINHA 2: DEPÓSITO e QUANTIDADE */}
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="deposito">Depósito</label>
                        <select
                            id="deposito"
                            value={deposito}
                            onChange={(e) => setDeposito(e.target.value)}
                            className="form-input form-select"
                            required
                        >
                            <option value="xina">China</option>
                            <option value="deposito">Depósito Principal</option>
                            <option value="galpao">Galpão</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="quantidade">Quantidade</label>
                        <input
                            type="number"
                            id="quantidade"
                            value={quantidade}
                            onChange={(e) => setQuantidade(e.target.value)}
                            className="form-input"
                            placeholder="Ex: 10"
                            required
                        />
                    </div>
                </div>

                {/* LINHA 3: PREÇO E OBSERVAÇÃO */}
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="preco">Preço de Lançamento (R$)</label>
                        <input
                            type="text"
                            id="preco"
                            value={preco}
                            onChange={handlePrecoChange}
                            className="form-input"
                            placeholder="0,00"
                            inputMode="numeric"
                            autoComplete="off"
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="observacao">Observação</label>
                        <input
                            type="text"
                            id="observacao"
                            value={observacao}
                            onChange={(e) => setObservacao(e.target.value)}
                            className="form-input"
                            placeholder="Motivo do ajuste ou nota"
                            required
                        />
                    </div>
                </div>

                <button type="submit" className="submit-button" disabled={carregando}>
                    {carregando ? 'Enviando...' : 'Lançar Estoque'}
                </button>

                {mensagem.texto && (
                    <p className={`mensagem ${mensagem.tipo === 'erro' ? 'mensagem-erro' : 'mensagem-sucesso'}`}>
                        {mensagem.texto}
                    </p>
                )}

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
                            <h3 style={{ marginTop: 0, marginBottom: '8px' }}>Lançamento realizado com sucesso!</h3>
                            {ultimoLancamento && (
                                <div style={{
                                    background: '#2a2a2a', borderRadius: '6px', padding: '12px', marginBottom: '12px', fontSize: '0.95rem'
                                }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                                        <div><strong>SKU:</strong> {ultimoLancamento.sku}</div>
                                        <div><strong>Tipo:</strong> Balanço</div>
                                        <div><strong>Depósito:</strong> {ultimoLancamento.deposito}</div>
                                        <div><strong>Quantidade:</strong> {ultimoLancamento.quantidade}</div>
                                        <div><strong>Preço:</strong> R$ {ultimoLancamento.precoBRL}</div>
                                        <div><strong>Responsável:</strong> {ultimoLancamento.responsavel}</div>
                                        <div style={{ gridColumn: '1 / -1' }}><strong>Observação:</strong> {ultimoLancamento.observacao}</div>
                                        <div style={{ gridColumn: '1 / -1' }}><strong>Data/Hora:</strong> {ultimoLancamento.datahora}</div>
                                    </div>
                                </div>
                            )}
                            <p style={{ marginTop: 0, marginBottom: '16px', opacity: 0.9 }}>
                                Deseja fazer outro lançamento ou sair?
                            </p>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    className="submit-button"
                                    onClick={() => setShowModal(false)}
                                >
                                    Novo lançamento
                                </button>
                                <button
                                    type="button"
                                    className="logout-button"
                                    onClick={() => { setShowModal(false); onSair && onSair(); }}
                                >
                                    Sair
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
}