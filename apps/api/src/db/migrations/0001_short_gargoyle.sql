ALTER TABLE "customers" DROP CONSTRAINT "customers_owner_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "visits" DROP CONSTRAINT "visits_customer_id_customers_id_fk";
--> statement-breakpoint
ALTER TABLE "visits" DROP CONSTRAINT "visits_salesman_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "customer_transfers" DROP CONSTRAINT "customer_transfers_customer_id_customers_id_fk";
--> statement-breakpoint
ALTER TABLE "customer_transfers" DROP CONSTRAINT "customer_transfers_from_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "customer_transfers" DROP CONSTRAINT "customer_transfers_to_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_user_id_users_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customers" ADD CONSTRAINT "customers_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visits" ADD CONSTRAINT "visits_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visits" ADD CONSTRAINT "visits_salesman_id_users_id_fk" FOREIGN KEY ("salesman_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customer_transfers" ADD CONSTRAINT "customer_transfers_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customer_transfers" ADD CONSTRAINT "customer_transfers_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customer_transfers" ADD CONSTRAINT "customer_transfers_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_id_length" CHECK (length(id) BETWEEN 32 AND 128);--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_id_charset" CHECK (id ~ '^[A-Za-z0-9]+$');