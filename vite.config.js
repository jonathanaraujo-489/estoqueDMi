import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
    // 1. Usa loadEnv para carregar as variáveis de ambiente do .env para o modo atual.
    // O 'mode' geralmente será 'development'.
    const env = loadEnv(mode, process.cwd(), 'VITE_');

    // 2. Tenta ler o URL completo da variável carregada.
    const N8N_FULL_URL = env.VITE_N8N_WEBHOOK || 'https://n8n.dmiatacado.com.br/fallback/webhook-default';

    let WEBHOOK_TARGET = 'https://n8n.dmiatacado.com.br';
    let WEBHOOK_ENDPOINT = '/fallback/webhook-default';

    // 3. Extrai o target (host) e o endpoint (caminho) da URL completa do .env.
    const urlMatch = N8N_FULL_URL.match(/^(https?:\/\/[^\/]+)(.*)/);
    
    if (urlMatch && urlMatch.length === 3) {
        WEBHOOK_TARGET = urlMatch[1]; // Ex: https://n8n.dmiatacado.com.br
        WEBHOOK_ENDPOINT = urlMatch[2]; // Ex: /webhook/18771d3e...
    } else {
        console.error("VITE_N8N_WEBHOOK não está no formato esperado. Usando valores de fallback.");
    }
    
    // Log para confirmar que o Vite leu o endpoint correto antes de construir o proxy
    console.log(`[Vite Proxy] Target: ${WEBHOOK_TARGET}`);
    console.log(`[Vite Proxy] Endpoint Rewriting to: ${WEBHOOK_ENDPOINT}`);

    return {
        plugins: [react()],
        server: {
            host: true, 
            proxy: {
                // Quando seu código chama /api-n8n
                '/api-n8n': {
                    target: WEBHOOK_TARGET, // Target dinâmico (Host)
                    changeOrigin: true, 
                    secure: true, 
                    
                    // A reescrita retorna o endpoint exato lido da variável de ambiente.
                    rewrite: () => WEBHOOK_ENDPOINT
                }
            }
        }
    };
});
