-- 0003: 用户表加 must_change_password + password_changed_at
-- 目的：
--   1. 演示账号 / 管理员重置密码后强制用户首登改密
--   2. 为未来密码过期策略（v0.5+）记录最后改密时间
-- 注：is_active 已在 0002 中添加；此处由 drizzle-kit 重复检测出，已手动剔除

ALTER TABLE "users" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_changed_at" timestamp with time zone;
