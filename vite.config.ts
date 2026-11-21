import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://127.0.0.1:8000' },
    watch: {
      // Runtime caches include Windows pytest junctions and locked SQLite files.
      ignored: ['**/.cache/**', '**/.venv/**', '**/.pytest_cache/**', '**/test-results/**', '**/playwright-report/**', '**/__pycache__/**'],
    },
  },
});
