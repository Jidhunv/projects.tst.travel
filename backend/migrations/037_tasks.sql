-- Task Manager: one person (ownerId) assigns a task to another (assigneeId).
-- Idempotent. Also included in FULL_SCHEMA_2026-10_create_if_not_exists.sql.
CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying NOT NULL,
    description text,
    status character varying DEFAULT 'Open' NOT NULL,
    priority character varying DEFAULT 'Medium' NOT NULL,
    "followupDate" date,
    "actionsTaken" text,
    "ownerId" uuid NOT NULL,
    "assigneeId" uuid NOT NULL,
    "completedAt" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "PK_tasks_id" PRIMARY KEY (id)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_tasks_owner') THEN
    ALTER TABLE ONLY public.tasks ADD CONSTRAINT "FK_tasks_owner" FOREIGN KEY ("ownerId") REFERENCES public.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_tasks_assignee') THEN
    ALTER TABLE ONLY public.tasks ADD CONSTRAINT "FK_tasks_assignee" FOREIGN KEY ("assigneeId") REFERENCES public.users(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_owner ON public.tasks ("ownerId");
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks ("assigneeId");
