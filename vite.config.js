import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // o il tuo framework (vue, svelte, ecc.)

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true,
      interval: 100 // Controlla le modifiche ogni 100ms
    }
  }
})