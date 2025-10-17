import React, { useState } from 'react';
// O objeto 'usuario' vem do App.jsx após o login
export default function Formulario({ usuario }) {
    const [sku, setSku] = useState('');
    const [tipoMovimentacao, setTipoMovimentacao] = useState('entrada'); // Select
    const [deposito, setDeposito] = useState('deposito'); // Select
    const [quantidade, setQuantidade] = useState('');
    const [preco, setPreco] = useState('');
    const [observacao, setObservacao] = useState('');
    const [mensagem, setMensagem] = useState({}); // Usamos um objeto para mensagem e tipo
    const [carregando, setCarregando] = useState(false);

    // O responsável será o e-mail ou ID do usuário logado
    const responsavel = usuario.email || usuario.id; 

    // CORREÇÃO AQUI: Usamos o atalho definido no vite.config.js para contornar o CORS
    const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK;
    // NOTA: A URL completa está configurada no proxy do vite.config.js

    const handleAjusteEstoque = async (e) => {
        e.preventDefault();
        setMensagem({});
        setCarregando(true);

        // 1. Validação simples
        if (!sku || !quantidade) {
            setMensagem({ tipo: 'erro', texto: 'Preencha SKU e Quantidade.' });
            setCarregando(false);
            return;
        }

        // 2. Monta o payload para o n8n
        const payload = {
            sku,
            tipo_lancamento: tipoMovimentacao,
            deposito,
            responsavel,
            quantidade: parseFloat(quantidade), 
            preco_lancamento: parseFloat(preco) || 0,
            observacao,
            timestamp: new Date().toISOString(),
        };

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
                setMensagem({ tipo: 'sucesso', texto: 'Ajuste de estoque enviado com sucesso ao n8n!' });
                // Limpa o formulário
                setSku('');
                setQuantidade('');
                setPreco('');
                setObservacao('');
            } else {
                setMensagem({ tipo: 'erro', texto: `Erro ao enviar. Código: ${response.status}. Verifique o n8n.` });
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
                        <select
                            id="movimentacao"
                            value={tipoMovimentacao}
                            onChange={(e) => setTipoMovimentacao(e.target.value)}
                            className="form-input form-select"
                        >
                            <option value="entrada">Entrada (+)</option>
                            <option value="saida">Saída (-)</option>
                        </select>
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
                            placeholder="Ex: 10 ou -5"
                            required
                        />
                    </div>
                </div>

                {/* LINHA 3: PREÇO E OBSERVAÇÃO */}
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="preco">Preço de Lançamento (R$)</label>
                        <input
                            type="number"
                            id="preco"
                            value={preco}
                            onChange={(e) => setPreco(e.target.value)}
                            className="form-input"
                            placeholder="0.00"
                            step="0.01"
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="observacao">Observação (Opcional)</label>
                        <input
                            type="text"
                            id="observacao"
                            value={observacao}
                            onChange={(e) => setObservacao(e.target.value)}
                            className="form-input"
                            placeholder="Motivo do ajuste ou nota"
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
            </form>
        </div>
    );
}