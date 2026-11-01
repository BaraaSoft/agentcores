import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { ROUTE_PATHS } from './src/routes/route-paths.ts';
import { networkBanner } from './vite-plugins/network-banner.ts';

const DEV_PORT = 5173;
const BACKEND_URL = 'http://localhost:3088';

export default defineConfig({
  plugins: [react({ jsxImportSource: '@emotion/react' }), networkBanner({ title: 'AHE dashboard', path: ROUTE_PATHS.monitor })],
  server: {
    host: true,
    port: DEV_PORT,
    proxy: { '/api': { target: BACKEND_URL, changeOrigin: true } },
  },
});
