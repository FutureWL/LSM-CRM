// scripts/dev/clean-demo-users.mjs
// 一次性脚本：清理 v0.3.0 时代的 7 个 demo 账号
//   (周总 / 林总监 / 张伟 / 李娜 / 王强 / 刘洋 / 陈静)
// 把他们持有的 customer/visit 全部转移给魏来，然后删除 user 记录。
//
// 用法: node scripts/dev/clean-demo-users.mjs
//       默认从 apps/api/.env 读取 DATABASE_URL；也可用环境变量覆盖
//
// 设计: psql -1 单事务跑，失败自动回滚

import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ---- 1. 加载 DATABASE_URL ----
function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const envPath = resolve(__dirname, '../../apps/api/.env')
  if (!existsSync(envPath)) {
    throw new Error('DATABASE_URL 未设置，且 apps/api/.env 不存在')
  }
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const m = line.match(/^DATABASE_URL\s*=\s*(.+)$/)
    if (m) return m[1].trim()
  }
  throw new Error('apps/api/.env 里没找到 DATABASE_URL')
}

// ---- 2. 拼 SQL ----
const DEMO_NAMES_SQL = `ARRAY['周总','林总监','张伟','李娜','王强','刘洋','陈静']`
const RECIPIENT = '魏来'

const SQL = `
BEGIN;

-- 1. 验证接收人
DO $$
DECLARE
  rid uuid;
BEGIN
  SELECT id INTO rid FROM users WHERE name = '${RECIPIENT}' LIMIT 1;
  IF rid IS NULL THEN
    RAISE EXCEPTION '找不到接收人 "${RECIPIENT}"，中止';
  END IF;
END $$;

-- 2. 转 customer owner
WITH recipients AS (
  SELECT id FROM users WHERE name = '${RECIPIENT}' LIMIT 1
),
demo AS (
  SELECT id FROM users WHERE name = ANY(${DEMO_NAMES_SQL})
)
UPDATE customers c
SET owner_id = (SELECT id FROM recipients)
WHERE owner_id IN (SELECT id FROM demo);

-- 3. 转 visit salesman
WITH recipients AS (
  SELECT id FROM users WHERE name = '${RECIPIENT}' LIMIT 1
),
demo AS (
  SELECT id FROM users WHERE name = ANY(${DEMO_NAMES_SQL})
)
UPDATE visits v
SET salesman_id = (SELECT id FROM recipients)
WHERE salesman_id IN (SELECT id FROM demo);

-- 4. 删 session (避免 FK RESTRICT 阻塞)
DELETE FROM sessions
WHERE user_id IN (SELECT id FROM users WHERE name = ANY(${DEMO_NAMES_SQL}));

-- 5. 删 user (tenant_memberships ON DELETE CASCADE 也会清掉)
DELETE FROM users WHERE name = ANY(${DEMO_NAMES_SQL});

COMMIT;
`

// ---- 3. 执行 ----
const dbUrl = loadDatabaseUrl()
console.log(`[clean] 连接: ${dbUrl.replace(/:[^:@]+@/, ':***@')}`)

try {
  const out = execFileSync(
    'psql',
    [dbUrl, '-1', '-v', 'ON_ERROR_STOP=1', '-q', '-X', '-c', SQL],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }
  )
  console.log(out)
  console.log('[clean] ✓ 全部完成 (事务已提交)')
} catch (err) {
  console.error('[clean] ✗ 失败 (事务已回滚)')
  process.exit(1)
}
