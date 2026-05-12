import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import webExtension from 'vite-plugin-web-extension'
import { fileURLToPath, URL } from 'url'

export default defineConfig({
  plugins: [
    react({ jsxImportSource: '@emotion/react' }),
    webExtension(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
