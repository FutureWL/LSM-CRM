CREATE TYPE "public"."user_role" AS ENUM('admin', 'sales');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" NOT NULL,
	"avatar_url" text,
	"team_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"company" text NOT NULL,
	"phone" text,
	"email" text,
	"address" text,
	"industry" text,
	"stage" text DEFAULT 'new' NOT NULL,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"owner_id" uuid NOT NULL,
	"team_id" uuid,
	"last_visit_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_stage_check" CHECK (stage IN ('new','contacted','intent','negotiating','won','lost'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"salesman_id" uuid NOT NULL,
	"type" text DEFAULT 'normal' NOT NULL,
	"result" text NOT NULL,
	"content" text NOT NULL,
	"duration_min" integer,
	"next_step" text,
	"stage_before" text,
	"stage_after" text,
	"visited_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "visits_type_check" CHECK (type IN ('normal','collection','warranty','introduction')),
	CONSTRAINT "visits_result_check" CHECK (result IN ('progress','obstacle','done')),
	CONSTRAINT "visits_stage_before_check" CHECK (stage_before IS NULL OR stage_before IN ('new','contacted','intent','negotiating','won','lost')),
	CONSTRAINT "visits_stage_after_check" CHECK (stage_after IS NULL OR stage_after IN ('new','contacted','intent','negotiating','won','lost'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customer_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"reason" text,
	"transferred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customers" ADD CONSTRAINT "customers_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visits" ADD CONSTRAINT "visits_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visits" ADD CONSTRAINT "visits_salesman_id_users_id_fk" FOREIGN KEY ("salesman_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customer_transfers" ADD CONSTRAINT "customer_transfers_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customer_transfers" ADD CONSTRAINT "customer_transfers_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customer_transfers" ADD CONSTRAINT "customer_transfers_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_owner_id_idx" ON "customers" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_stage_idx" ON "customers" USING btree ("stage");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_owner_stage_idx" ON "customers" USING btree ("owner_id","stage");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visits_customer_id_idx" ON "visits" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visits_salesman_id_idx" ON "visits" USING btree ("salesman_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visits_visited_at_idx" ON "visits" USING btree ("visited_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");