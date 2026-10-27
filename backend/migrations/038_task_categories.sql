-- Task Category master, used by the Task Manager dropdown. Idempotent.
-- Also included in FULL_SCHEMA_2026-10_create_if_not_exists.sql.
CREATE TABLE IF NOT EXISTS public.task_categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "PK_task_categories_id" PRIMARY KEY (id),
    CONSTRAINT "UQ_task_categories_name" UNIQUE (name)
);

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS "categoryId" uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_tasks_category') THEN
    ALTER TABLE ONLY public.tasks ADD CONSTRAINT "FK_tasks_category" FOREIGN KEY ("categoryId") REFERENCES public.task_categories(id);
  END IF;
END $$;

INSERT INTO public.task_categories (name) VALUES
  ('Development'), ('General Sales'), ('Strategies'), ('Operations'), ('Sales'), ('Audit'), ('Finance')
ON CONFLICT (name) DO NOTHING;
