import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    // 单元测试为主, 不需要 jsdom (纯函数测试)
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
