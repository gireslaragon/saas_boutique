CREATE TYPE "public"."cash_session_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('SALE_CREATED', 'SALE_CANCELLED', 'ITEM_RETURNED', 'ITEM_ADDED', 'ITEM_REPLACED', 'SALE_ADJUSTMENT_CREATED', 'STOCK_DECREASED', 'STOCK_INCREASED', 'STOCK_ADJUSTED', 'STOCK_LOSS_DECLARED', 'CASH_SESSION_OPENED', 'CASH_SESSION_CLOSED', 'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DEACTIVATED', 'USER_CREATED', 'USER_DEACTIVATED', 'USER_REACTIVATED', 'TENANT_SETTINGS_UPDATED');--> statement-breakpoint
CREATE TYPE "public"."group_invoice_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."impersonation_access" AS ENUM('read_only', 'full');--> statement-breakpoint
CREATE TYPE "public"."platform_admin_access_level" AS ENUM('super', 'support', 'finance');--> statement-breakpoint
CREATE TYPE "public"."platform_event_type" AS ENUM('TENANT_CREATED', 'TENANT_ACTIVATED', 'TENANT_SUSPENDED', 'TENANT_DELETED', 'SUBSCRIPTION_CHANGED', 'SUBSCRIPTION_CANCELLED', 'ADMIN_LOGIN', 'ADMIN_IMPERSONATED_TENANT', 'PLATFORM_ADMIN_CREATED', 'PLATFORM_ADMIN_DEACTIVATED', 'USER_PASSWORD_RESET_FORCED', 'PLAN_LIMIT_OVERRIDE');--> statement-breakpoint
CREATE TYPE "public"."notification_target" AS ENUM('all', 'plan_free', 'plan_starter', 'plan_pro', 'plan_enterprise', 'specific');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('info', 'warning', 'maintenance', 'feature', 'billing');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('free', 'starter', 'pro', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'trial', 'suspended', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'cashier');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."variant_type" AS ENUM('unit', 'pack', 'case');--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('completed', 'cancelled', 'adjusted');--> statement-breakpoint
CREATE TYPE "public"."adjustment_type" AS ENUM('partial_return', 'full_return', 'exchange', 'price_correction');--> statement-breakpoint
CREATE TYPE "public"."adjustment_item_direction" AS ENUM('returned', 'added');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('sale', 'return', 'restock', 'loss', 'adjustment', 'exchange_out', 'exchange_in', 'cancel');--> statement-breakpoint
CREATE TYPE "public"."loss_type" AS ENUM('breakage', 'theft', 'expiry', 'error', 'other');--> statement-breakpoint
CREATE TABLE "cash_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"cashier_id" uuid NOT NULL,
	"status" "cash_session_status" DEFAULT 'open' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"opening_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"closed_at" timestamp with time zone,
	"actual_amount" numeric(12, 2),
	"notes" text,
	"total_sales_amount" numeric(12, 2) DEFAULT '0',
	"total_refunds_amount" numeric(12, 2) DEFAULT '0',
	"expected_amount" numeric(12, 2),
	"difference" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(7) DEFAULT '#2E75B6',
	"icon" varchar(50),
	"sort_order" integer DEFAULT 0,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_categories_name_tenant" UNIQUE("tenant_id","name")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"event_type" "event_type" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"triggered_by" uuid,
	"sale_id" uuid,
	"variant_id" uuid,
	"user_id" uuid,
	"adjustment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_date" date DEFAULT now() NOT NULL,
	"status" "group_invoice_status" DEFAULT 'open' NOT NULL,
	"total_transactions" integer DEFAULT 0,
	"total_amount" numeric(12, 2) DEFAULT '0',
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_group_invoice_day" UNIQUE("tenant_id","invoice_date")
);
--> statement-breakpoint
CREATE TABLE "impersonation_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"ticket_ref" varchar(100),
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"access_level" "impersonation_access" DEFAULT 'read_only' NOT NULL,
	"ip_address" varchar(45)
);
--> statement-breakpoint
CREATE TABLE "platform_admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"access_level" "platform_admin_access_level" DEFAULT 'super' NOT NULL,
	"refresh_token_hash" text,
	"refresh_token_expires_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "platform_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" "platform_event_type" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"admin_id" uuid NOT NULL,
	"tenant_id" uuid,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"notification_type" "notification_type" DEFAULT 'info' NOT NULL,
	"target" "notification_target" DEFAULT 'all' NOT NULL,
	"target_tenant_id" uuid,
	"scheduled_at" timestamp with time zone DEFAULT now(),
	"expires_at" timestamp with time zone,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"logo_url" text,
	"slogan" varchar(255),
	"phone" varchar(30),
	"address" text,
	"city" varchar(100),
	"country" varchar(100) DEFAULT 'Cameroun',
	"currency" varchar(10) DEFAULT 'FCFA',
	"currency_symbol" varchar(5) DEFAULT 'F',
	"invoice_prefix" varchar(20) DEFAULT 'FAC',
	"invoice_counter" integer DEFAULT 0 NOT NULL,
	"group_invoice_threshold" integer DEFAULT 500,
	"session_timeout_minutes" integer DEFAULT 30,
	"is_active" boolean DEFAULT true NOT NULL,
	"suspended_at" timestamp with time zone,
	"suspended_reason" text,
	"suspended_by" uuid,
	"onboarding_completed" boolean DEFAULT false,
	"created_by_admin" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tenant_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plan" "subscription_plan" DEFAULT 'free' NOT NULL,
	"status" "subscription_status" DEFAULT 'trial' NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"current_period_start" timestamp with time zone DEFAULT now(),
	"current_period_end" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"max_products" integer DEFAULT 50,
	"max_users" integer DEFAULT 2,
	"max_categories" integer DEFAULT 5,
	"monthly_price" numeric(10, 2) DEFAULT '0',
	"currency" varchar(10) DEFAULT 'FCFA',
	"last_payment_at" timestamp with time zone,
	"next_payment_at" timestamp with time zone,
	"updated_by_admin" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_tenant_subscription" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'cashier' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"refresh_token_hash" text,
	"refresh_token_expires_at" timestamp with time zone,
	"hired_at" timestamp with time zone DEFAULT now(),
	"deactivated_at" timestamp with time zone,
	"deactivation_reason" text,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_users_email_tenant" UNIQUE("tenant_id","email")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"category_id" uuid,
	"name" varchar(200) NOT NULL,
	"description" text,
	"image_url" text,
	"barcode" varchar(100),
	"cost_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_type" "variant_type" DEFAULT 'unit' NOT NULL,
	"label" varchar(100) NOT NULL,
	"selling_price" numeric(12, 2) NOT NULL,
	"units_per_variant" integer DEFAULT 1 NOT NULL,
	"alert_threshold_units" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"qty_units" integer DEFAULT 0 NOT NULL,
	"last_movement_at" timestamp with time zone DEFAULT now(),
	"last_movement_type" varchar(50),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_stock_variant" UNIQUE("variant_id")
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"cashier_id" uuid NOT NULL,
	"cash_session_id" uuid,
	"status" "sale_status" DEFAULT 'completed' NOT NULL,
	"invoice_number" varchar(50),
	"group_invoice_id" uuid,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"amount_received" numeric(12, 2) DEFAULT '0' NOT NULL,
	"change_given" numeric(12, 2) DEFAULT '0' NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" uuid,
	"cancellation_reason" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sale_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"product_name" varchar(200) NOT NULL,
	"variant_label" varchar(100) NOT NULL,
	"product_image_url" text,
	"qty" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"total_line" numeric(12, 2) NOT NULL,
	"cost_price_at_sale" numeric(12, 2) DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qty_positive" CHECK ("sale_items"."qty" > 0)
);
--> statement-breakpoint
CREATE TABLE "sale_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sale_id" uuid NOT NULL,
	"adjustment_type" "adjustment_type" NOT NULL,
	"reason" text NOT NULL,
	"price_difference" numeric(12, 2) DEFAULT '0',
	"refund_confirmed" boolean DEFAULT false,
	"extra_payment_confirmed" boolean DEFAULT false,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_adjustment_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"adjustment_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"direction" "adjustment_item_direction" NOT NULL,
	"qty" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"total_line" numeric(12, 2) NOT NULL,
	"product_name" varchar(200) NOT NULL,
	"variant_label" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "adj_item_qty_positive" CHECK ("sale_adjustment_items"."qty" > 0)
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"movement_type" "stock_movement_type" NOT NULL,
	"qty_units_delta" integer NOT NULL,
	"qty_units_before" integer NOT NULL,
	"qty_units_after" integer NOT NULL,
	"sale_id" uuid,
	"adjustment_id" uuid,
	"reason" text,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restockings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"qty_units_added" integer NOT NULL,
	"cost_price_per_unit" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"supplier" varchar(200),
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restock_qty_positive" CHECK ("restockings"."qty_units_added" > 0)
);
--> statement-breakpoint
CREATE TABLE "stock_losses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"loss_type" "loss_type" NOT NULL,
	"qty_units_lost" integer NOT NULL,
	"estimated_value" numeric(12, 2) DEFAULT '0',
	"reason" text NOT NULL,
	"declared_by" uuid NOT NULL,
	"declared_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loss_qty_positive" CHECK ("stock_losses"."qty_units_lost" > 0)
);
--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_cashier_id_users_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invoices" ADD CONSTRAINT "group_invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_admin_id_platform_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."platform_admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_events" ADD CONSTRAINT "platform_events_admin_id_platform_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."platform_admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_events" ADD CONSTRAINT "platform_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_notifications" ADD CONSTRAINT "platform_notifications_target_tenant_id_tenants_id_fk" FOREIGN KEY ("target_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_notifications" ADD CONSTRAINT "platform_notifications_created_by_platform_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."platform_admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_suspended_by_platform_admins_id_fk" FOREIGN KEY ("suspended_by") REFERENCES "public"."platform_admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_created_by_admin_platform_admins_id_fk" FOREIGN KEY ("created_by_admin") REFERENCES "public"."platform_admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_updated_by_admin_platform_admins_id_fk" FOREIGN KEY ("updated_by_admin") REFERENCES "public"."platform_admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_snapshots" ADD CONSTRAINT "stock_snapshots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_snapshots" ADD CONSTRAINT "stock_snapshots_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_cashier_id_users_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_cash_session_id_cash_sessions_id_fk" FOREIGN KEY ("cash_session_id") REFERENCES "public"."cash_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_group_invoice_id_group_invoices_id_fk" FOREIGN KEY ("group_invoice_id") REFERENCES "public"."group_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_adjustments" ADD CONSTRAINT "sale_adjustments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_adjustments" ADD CONSTRAINT "sale_adjustments_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_adjustments" ADD CONSTRAINT "sale_adjustments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_adjustment_items" ADD CONSTRAINT "sale_adjustment_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_adjustment_items" ADD CONSTRAINT "sale_adjustment_items_adjustment_id_sale_adjustments_id_fk" FOREIGN KEY ("adjustment_id") REFERENCES "public"."sale_adjustments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_adjustment_items" ADD CONSTRAINT "sale_adjustment_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_adjustment_id_sale_adjustments_id_fk" FOREIGN KEY ("adjustment_id") REFERENCES "public"."sale_adjustments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restockings" ADD CONSTRAINT "restockings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restockings" ADD CONSTRAINT "restockings_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restockings" ADD CONSTRAINT "restockings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_losses" ADD CONSTRAINT "stock_losses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_losses" ADD CONSTRAINT "stock_losses_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_losses" ADD CONSTRAINT "stock_losses_declared_by_users_id_fk" FOREIGN KEY ("declared_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;