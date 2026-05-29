import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/my-app/',  // ← ชื่อนี้ต้องตรงกับชื่อ repo บน GitHub
})