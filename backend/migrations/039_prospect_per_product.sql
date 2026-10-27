-- One prospect per product: email is unique per product (email, productId), not on its own.
-- Idempotent. Also included in FULL_SCHEMA_2026-10_create_if_not_exists.sql.
ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS "UQ_b3eea7add0e16594dba102716c5";
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_prospects_email_product" ON public.prospects (email, "productId");
