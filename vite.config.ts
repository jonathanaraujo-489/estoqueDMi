import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), 'VITE_');
    const N8N_FULL_URL = env.VITE_N8N_WEBHOOK || 'https://n8n.dmiatacado.com.br/fallback/webhook-default';

    let WEBHOOK_TARGET = 'https://n8n.dmiatacado.com.br';
    let WEBHOOK_ENDPOINT = '/fallback/webhook-default';

    const urlMatch = N8N_FULL_URL.match(/^(https?:\/\/[^\/]+)(.*)/);
    if (urlMatch && urlMatch.length === 3) {
        WEBHOOK_TARGET = urlMatch[1];
        WEBHOOK_ENDPOINT = urlMatch[2];
    } else {
        console.error("VITE_N8N_WEBHOOK não está no formato esperado. Usando valores de fallback.");
    }

    console.log(`[Vite Proxy] Target: ${WEBHOOK_TARGET}`);
    console.log(`[Vite Proxy] Endpoint Rewriting to: ${WEBHOOK_ENDPOINT}`);

    return {
        plugins: [react()],
        server: {
            host: true,
            allowedHosts: true,
            proxy: {
                '/api-n8n': {
                    target: WEBHOOK_TARGET,
                    changeOrigin: true,
                    secure: true,
                    rewrite: () => WEBHOOK_ENDPOINT
                }
            }
        },
        preview: {
            host: true,
            port: 5173,
            allowedHosts: true
        }
    };
});
