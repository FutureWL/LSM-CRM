// 统一 localStorage key 生成
// 用 dev/prod 不同前缀，避免同一浏览器混用

import { APP_ENV } from './env'

const PREFIX = APP_ENV.storagePrefix

export const storageKey = {
  auth: `${PREFIX}-auth`,
  users: `${PREFIX}-users`,
  customers: `${PREFIX}-customers`,
  visits: `${PREFIX}-visits`,
  /** 给一次性清理用的前缀匹配 */
  prefix: PREFIX,
}
