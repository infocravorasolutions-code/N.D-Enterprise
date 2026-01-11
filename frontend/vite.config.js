import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow connections from network (needed for React Native WebView)
    port: 3000,
    open: true
  }
})

