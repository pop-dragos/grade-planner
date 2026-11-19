import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In dezvoltare, cererile la /api/... sunt trimise mai departe la backend.
    // Browserul vede o singura adresa (localhost:5173), deci nu e nevoie de CORS.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
