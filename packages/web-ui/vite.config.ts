import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const DEV_PORT = 5173;
const BACKEND_URL = 'http://localhost:3088';

export default defineConfig({
  plugins: [react({ jsxImportSource: '@emotion/react' })],
  server: {
    port: DEV_PORT,
    proxy: { '/api': { target: BACKEND_URL, changeOrigin: true } },
  },
});
