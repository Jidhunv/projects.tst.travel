-- Task follow-up conversation: each entry is a note plus the next follow-up date. Idempotent.
-- Also included in FULL_SCHEMA_2026-10_create_if_not_exists.sql.
CREATE TABLE IF NOT EXISTS public.task_followups (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "taskId" uuid NOT NULL,
    note text NOT NULL,
    "nextFollowupDate" date,
    "createdById" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "PK_task_followups_id" PRIMARY KEY (id),
    CONSTRAINT "FK_task_followups_task" FOREIGN KEY ("taskId") REFERENCES public.tasks(id) ON DELETE CASCADE,
    CONSTRAINT "FK_task_followups_user" FOREIGN KEY ("createdById") REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS idx_task_followups_task ON public.task_followups ("taskId");
