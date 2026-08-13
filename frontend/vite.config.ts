import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3300,
    strictPort: true,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        // Замените 'backend' на имя контейнера с FastAPI из docker-compose.yml
        // Если запускаете без Docker локально, используйте 'http://localhost:8000'
        target: 'http://backend:8000', 
        changeOrigin: true,
        ws: true, // Включает проксирование WebSocket (для /api/v1/note/add)
      },
    },
  },
});