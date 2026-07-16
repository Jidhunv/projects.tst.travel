-- Migration: Product category master
-- Date: 2026-07-16
-- Purpose: The Product model was changed from a free-text `category` string to
--          a `categoryId` FK onto a new product_categories master table, but the
--          schema change was never applied. The app queries products.categoryId
--          and product_categories, so GET /api/products was failing with a 500.
--          This creates the master table and migrates existing data onto it.
-- Note: idempotent — safe to re-run.

-- 1. The category master.
CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  description varchar NULL,
  code varchar NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "displayOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_categories_name ON product_categories(name);
-- Partial index: several categories may legitimately have no code, and NULLs
-- must not collide with each other under a unique constraint.
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_categories_code
  ON product_categories(code) WHERE code IS NOT NULL;

-- 2. Preserve the categories already in use. Existing rows hold free text, so
--    promote each distinct non-empty value to a master row.
INSERT INTO product_categories (name)
SELECT DISTINCT btrim(p.category)
FROM products p
WHERE p.category IS NOT NULL
  AND btrim(p.category) <> ''
ON CONFLICT (name) DO NOTHING;

-- 3. The FK column on products.
ALTER TABLE products ADD COLUMN IF NOT EXISTS "categoryId" uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_products_category' AND table_name = 'products'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT fk_products_category
      FOREIGN KEY ("categoryId") REFERENCES product_categories(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products("categoryId");

-- 4. Point each product at its category. Guarded so re-running is harmless and
--    so it is skipped once the old column has been dropped.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'category'
  ) THEN
    UPDATE products p
    SET "categoryId" = c.id
    FROM product_categories c
    WHERE btrim(p.category) = c.name
      AND p."categoryId" IS NULL;
  END IF;
END $$;

-- 5. Drop the superseded free-text column. Products with a blank category keep
--    a NULL categoryId, which the model allows.
ALTER TABLE products DROP COLUMN IF EXISTS category;
