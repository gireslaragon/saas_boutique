ALTER TABLE "stock_snapshots" DROP CONSTRAINT "uq_stock_variant";--> statement-breakpoint
ALTER TABLE "stock_snapshots" DROP CONSTRAINT "stock_snapshots_variant_id_product_variants_id_fk";
--> statement-breakpoint
ALTER TABLE "stock_movements" DROP CONSTRAINT "stock_movements_variant_id_product_variants_id_fk";
--> statement-breakpoint
ALTER TABLE "stock_movements" DROP CONSTRAINT "stock_movements_sale_id_sales_id_fk";
--> statement-breakpoint
ALTER TABLE "stock_movements" DROP CONSTRAINT "stock_movements_adjustment_id_sale_adjustments_id_fk";
--> statement-breakpoint
ALTER TABLE "stock_snapshots" ALTER COLUMN "last_movement_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "movement_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."stock_movement_type";--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('sale', 'return', 'cancel', 'restock', 'loss', 'adjustment', 'exchange_out', 'exchange_in');--> statement-breakpoint
ALTER TABLE "stock_snapshots" ALTER COLUMN "last_movement_type" SET DATA TYPE "public"."stock_movement_type" USING "last_movement_type"::"public"."stock_movement_type";--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "movement_type" SET DATA TYPE "public"."stock_movement_type" USING "movement_type"::"public"."stock_movement_type";--> statement-breakpoint
ALTER TABLE "stock_snapshots" ALTER COLUMN "last_movement_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "stock_snapshots" ALTER COLUMN "last_movement_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "stock_snapshots" ALTER COLUMN "updated_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "stock_snapshots" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "created_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "stock_snapshots" ADD COLUMN "product_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_snapshots" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "product_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_snapshots" ADD CONSTRAINT "stock_snapshots_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_snapshots" DROP COLUMN "variant_id";--> statement-breakpoint
ALTER TABLE "stock_movements" DROP COLUMN "variant_id";--> statement-breakpoint
ALTER TABLE "stock_movements" DROP COLUMN "notes";