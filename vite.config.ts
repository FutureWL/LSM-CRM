import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

const shouldOpen = process.env.VITE_OPEN ? process.env.VITE_OPEN === 'true' : true

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: shouldOpen,
    // Vite 5 默认开启 DNS Rebinding 防护，仅允许 localhost。
    // 通过反向代理用域名访问时（Docker / Nginx），需要把域名加入白名单。
    allowedHosts: [
      'lsm-crm.huntercat.cn',
      'localhost',
      '127.0.0.1',
      'host.docker.internal',
    ],
  },
})
