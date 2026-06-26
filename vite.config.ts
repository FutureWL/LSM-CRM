import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

const shouldOpen = process.env.VITE_OPEN ? process.env.VITE_OPEN === 'true' : true

export default defineConfig(({ mode }) => {
  // 加载所有 .env.[mode] 文件到 process.env，然后手动合并到 import.meta.env
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    // 把变量显式声明，Vite 才会注入到 import.meta.env
    define: {
      'import.meta.env.VITE_STORAGE_PREFIX': JSON.stringify(env.VITE_STORAGE_PREFIX ?? 'lsm-crm'),
      'import.meta.env.VITE_SEED_ENABLED': JSON.stringify(env.VITE_SEED_ENABLED ?? 'false'),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL ?? ''),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(env.VITE_APP_VERSION ?? '0.0.0'),
      'import.meta.env.VITE_BUILD_TIME': JSON.stringify(new Date().toISOString()),
      'import.meta.env.VITE_GIT_SHA': JSON.stringify(env.VITE_GIT_SHA ?? 'local'),
    },
    server: {
      host: '0.0.0.0',
      // 端口：dev 用环境变量 VITE_PORT 或 33500；strictPort 让端口冲突立刻失败而不是跳转
      port: Number(process.env.VITE_PORT ?? 33500),
      strictPort: true,
      open: shouldOpen,
      // dev 模式不要限制域名，方便任何来源访问（含 Docker host）
      ...(mode === 'development' ? { allowedHosts: true } : {}),
      // ============ API 代理（同源转发，彻底避免 CORS）============
      // 浏览器只跟 Vite 自己的 origin 打交道（无论 Vite 跑在 33500 / 52709 / 任何端口）
      // /api/* 请求被 Vite 在服务端转发到后端 API（33501），浏览器侧无跨域
      // 这要求 VITE_API_BASE_URL 设为相对路径（见下方 setApiBaseUrl 逻辑）
      proxy: {
        '/api': {
          target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:33501',
          changeOrigin: true,
          // 可选：把后端的 Set-Cookie 转发回来（cookie 已经是 sameSite=lax，localhost 同源不需要）
          // secure: false  // dev 模式不走 https
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: Number(process.env.VITE_PORT ?? 33503),
      // preview 模式（如 IDE 用 vite preview 预览构建产物）也加代理
      // 让 preview 端口也能访问后端，避免 CORS
      proxy: {
        '/api': {
          target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:33501',
          changeOrigin: true,
        },
      },
    },
    build: {
      // 生产构建输出更整洁的目录结构
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode === 'production' ? false : 'inline',
      // 把构建信息写一份到 dist/version.json
      // 注：这里只是占位，version.json 在 build 完成后由脚本生成
    },
  }
})
