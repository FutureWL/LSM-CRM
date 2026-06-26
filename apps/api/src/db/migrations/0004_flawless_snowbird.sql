-- 0004: 多租户地基
-- 目标：
--   1. 新增 tenants + tenant_memberships 表
--   2. users 加 last_active_tenant_id
--   3. customers/visits/customer_transfers/sessions 加 tenant_id
--   4. 为已有数据回填一个 default 租户
--   5. 把 customer/visit/transfer 的 tenant_id 改为 NOT NULL
--
-- 重要：本迁移在已有数据上跑，遵循 "加列允许 NULL → 回填 → 改 NOT NULL" 三步式

-- ========== 1. 新建 tenants + tenant_memberships ==========
CREATE TABLE IF NOT EXISTS "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"plan" text DEFAULT 'team' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug"),
	CONSTRAINT "tenants_slug_charset" CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$'),
	CONSTRAINT "tenants_slug_length" CHECK (length(slug) BETWEEN 2 AND 32)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenant_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_memberships_tenant_user_uq" UNIQUE("tenant_id","user_id")
);
--> statement-breakpoint

-- ========== 2. 创建 default 租户（slug = 'default'） ==========
-- 已有数据全部归属此租户
INSERT INTO "tenants" ("id", "name", "slug", "status", "plan", "note")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '默认租户（迁移期）',
  'default',
  'active',
  'team',
  'v0.3 → v0.4 多租户迁移时自动创建，所有旧数据归属此租户。生产环境应重命名为真实公司。'
)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint

-- ========== 3. users 加 last_active_tenant_id（允许 NULL） ==========
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_active_tenant_id" uuid;
--> statement-breakpoint

-- ========== 4. 业务表加 tenant_id（先允许 NULL，回填后再 NOT NULL） ==========
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
--> statement-breakpoint
ALTER TABLE "customer_transfers" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
--> statement-breakpoint

-- ========== 5. 回填：所有已有行打 default 租户 ==========
UPDATE "customers" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "visits" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "customer_transfers" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "sessions" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "users" SET "last_active_tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "last_active_tenant_id" IS NULL;
--> statement-breakpoint

-- ========== 6. 把 customers/visits/customer_transfers 的 tenant_id 改为 NOT NULL ==========
ALTER TABLE "customers" ALTER COLUMN "tenant_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "visits" ALTER COLUMN "tenant_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "customer_transfers" ALTER COLUMN "tenant_id" SET NOT NULL;
--> statement-breakpoint

-- ========== 7. 索引 ==========
DROP INDEX IF EXISTS "customers_owner_stage_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_tenant_id_idx" ON "customers" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_tenant_owner_idx" ON "customers" USING btree ("tenant_id","owner_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_tenant_stage_idx" ON "customers" USING btree ("tenant_id","stage");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visits_tenant_id_idx" ON "visits" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visits_tenant_salesman_idx" ON "visits" USING btree ("tenant_id","salesman_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visits_tenant_visited_idx" ON "visits" USING btree ("tenant_id","visited_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_transfers_tenant_id_idx" ON "customer_transfers" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_tenant_id_idx" ON "sessions" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenant_memberships_user_id_idx" ON "tenant_memberships" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenant_memberships_tenant_id_idx" ON "tenant_memberships" USING btree ("tenant_id");
--> statement-breakpoint

-- ========== 8. 外键 ==========
DO $$ BEGIN
 ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_last_active_tenant_id_tenants_id_fk" FOREIGN KEY ("last_active_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visits" ADD CONSTRAINT "visits_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customer_transfers" ADD CONSTRAINT "customer_transfers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- ========== 9. 把 demo 用户加入 default 租户（memberships） ==========
-- 已有 demo 7 用户都加入 default 租户
INSERT INTO "tenant_memberships" ("tenant_id", "user_id", "role", "status")
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  u.id,
  u.role,
  'active'
FROM "users" u
ON CONFLICT ("tenant_id","user_id") DO NOTHING;
