import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow connections from network (needed for React Native WebView)
    port: 3000,
    open: true
  },
  build: {
    cssCodeSplit: false, // Ensure all CSS is in one file for better mobile support
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console logs for debugging
      },
    },
    rollupOptions: {
      output: {
        manualChunks: undefined, // Single bundle for better mobile performance
      },
    },
  },
})

