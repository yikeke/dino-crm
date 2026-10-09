import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // GitHub Pages 用 /dino-crm/；Vercel 部署在站点根路径。
  base: process.env.VERCEL ? '/' : '/dino-crm/',
  plugins: [react()],
  server: { port: 5180 },
})
