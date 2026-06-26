// 默认租户常量
// 迁移时由 0004_flawless_snowbird.sql 创建
// 所有"已有数据"和"无 tenant_id 的旧 seed"都归属此租户
export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001' as const
export const DEFAULT_TENANT_SLUG = 'default' as const
