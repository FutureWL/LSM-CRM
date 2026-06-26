// 全局环境配置 - 编译期注入，构建时由 Vite 替换
// 运行时不要修改这里的值

export interface AppEnv {
  /** 当前构建模式 */
  mode: 'development' | 'production' | string
  /** 存储 key 前缀：dev 和 prod 隔离，避免同一浏览器数据串了 */
  storagePrefix: string
  /** 是否启用 faker 种子数据：dev 默认开，prod 默认关(空数据) */
  seedEnabled: boolean
  /** 后端 API base URL：当前 demo 未接入，留空走模拟 */
  apiBaseUrl: string
  /** 应用版本号（来自 package.json，构建时注入） */
  appVersion: string
  /** 构建时间 ISO 字符串 */
  buildTime: string
  /** Git 提交 SHA（CI/部署脚本注入） */
  gitSha: string
}

export const APP_ENV: AppEnv = {
  mode: import.meta.env.MODE,
  storagePrefix: import.meta.env.VITE_STORAGE_PREFIX ?? 'lsm-crm',
  seedEnabled: import.meta.env.VITE_SEED_ENABLED === 'true',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  appVersion: import.meta.env.VITE_APP_VERSION ?? '0.0.0-dev',
  buildTime: import.meta.env.VITE_BUILD_TIME ?? new Date(0).toISOString(),
  gitSha: import.meta.env.VITE_GIT_SHA ?? 'unknown',
}

export const IS_DEV = APP_ENV.mode === 'development'
export const IS_PROD = APP_ENV.mode === 'production'
