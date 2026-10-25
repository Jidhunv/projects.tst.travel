-- ============================================================================
-- CRM database schema (create if not exists)
-- Generated from the renamed schema by scripts/make-idempotent-schema.js.
-- Tables: prospects (Prospects page), leads (Leads page, formerly accounts),
-- prospect_status_history (formerly lead_status_history).
--
-- Safe to run on an empty database to build the schema, and safe to run again:
-- existing tables, indexes, constraints, types and functions are left alone.
-- It creates structure only. It never drops, truncates or changes existing data.
-- Existing tables are NOT altered to match this file; use the migration scripts
-- for that. Run with psql -v ON_ERROR_STOP=1.
-- Left out on purpose: schema_verification_log (verification artefacts).
-- ============================================================================
--
-- PostgreSQL database dump
--

\restrict J4dW4BpfuYmjceOcxl4JeTZjaJ1Og5b2iq06EmXPDFqzIqYYja9L9oyvAWZejq6

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';

--
-- Name: audit_logs_action_enum; Type: TYPE; Schema: public; Owner: -
--

DO $$
BEGIN
  CREATE TYPE public.audit_logs_action_enum AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

--
-- Name: notifications_type_enum; Type: TYPE; Schema: public; Owner: -
--

DO $$
BEGIN
  CREATE TYPE public.notifications_type_enum AS ENUM (
    'ContractExpiry',
    'InvoiceDue',
    'UATApproval',
    'PaymentReminder',
    'ProjectMilestone',
    'TicketUpdate',
    'SecurityAlert'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

--
-- Name: tickets_priority_enum; Type: TYPE; Schema: public; Owner: -
--

DO $$
BEGIN
  CREATE TYPE public.tickets_priority_enum AS ENUM (
    'Critical',
    'High',
    'Medium',
    'Low'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

--
-- Name: tickets_status_enum; Type: TYPE; Schema: public; Owner: -
--

DO $$
BEGIN
  CREATE TYPE public.tickets_status_enum AS ENUM (
    'Open',
    'In Progress',
    'Pending Customer',
    'Resolved',
    'Closed'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

--
-- Name: add_column_if_not_exists(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
  BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
  END;
  $$;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_stakeholders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.account_stakeholders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "accountId" uuid NOT NULL,
    role character varying(50) NOT NULL,
    name character varying(255),
    "designationId" uuid,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    email character varying(255),
    phone character varying(50)
);

--
-- Name: account_teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.account_teams (
    "accountId" uuid NOT NULL,
    "teamId" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Name: activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.activities (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type character varying NOT NULL,
    title character varying NOT NULL,
    description text,
    "resourceType" character varying NOT NULL,
    "resourceId" character varying NOT NULL,
    "createdById" uuid NOT NULL,
    "dueDate" timestamp without time zone,
    "isCompleted" boolean DEFAULT false NOT NULL,
    "completedAt" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "entityType" character varying NOT NULL,
    "entityId" character varying NOT NULL,
    action public.audit_logs_action_enum NOT NULL,
    "oldValues" jsonb,
    "newValues" jsonb NOT NULL,
    "ipAddress" character varying,
    "userAgent" character varying,
    description character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "userId" uuid
);

--
-- Name: company_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.company_types (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Name: contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.contacts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "firstName" character varying NOT NULL,
    "lastName" character varying NOT NULL,
    email character varying NOT NULL,
    "phoneNumber" character varying,
    "jobTitle" character varying,
    role character varying,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "accountId" uuid NOT NULL,
    "reportsTo" character varying,
    "linkedinUrl" character varying,
    birthday timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

--
-- Name: contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.contracts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "contractNumber" character varying NOT NULL,
    title character varying NOT NULL,
    type character varying NOT NULL,
    value numeric(15,2) NOT NULL,
    "startDate" timestamp without time zone NOT NULL,
    "endDate" timestamp without time zone NOT NULL,
    "renewalDate" timestamp without time zone,
    "paymentTerms" character varying,
    "slaTerms" text,
    status character varying DEFAULT 'Draft'::character varying NOT NULL,
    "approvedBy" character varying,
    "approvedDate" timestamp without time zone,
    "documentPath" character varying,
    remarks text,
    "accountId" uuid NOT NULL,
    "opportunityId" uuid,
    "createdById" uuid,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    terms text,
    "createdBy" uuid
);

--
-- Name: countries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.countries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(2) NOT NULL,
    name character varying(255) NOT NULL,
    region character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Name: designations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.designations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Name: email_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.email_settings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "smtpHost" character varying(255) NOT NULL,
    "smtpPort" integer NOT NULL,
    "smtpUser" character varying(255) NOT NULL,
    "smtpPassword" character varying(255) NOT NULL,
    "fromEmail" character varying(255) NOT NULL,
    "fromName" character varying(255) NOT NULL,
    "isConfigured" boolean DEFAULT false NOT NULL,
    "enableNotifications" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedById" uuid
);

--
-- Name: entity_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.entity_tags (
    entitytype character varying(50) NOT NULL,
    entityid uuid NOT NULL,
    tagid uuid NOT NULL
);

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    location character varying NOT NULL,
    days integer DEFAULT 1 NOT NULL,
    "accountIds" text,
    "companyNames" text,
    "travelCost" numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    reason text,
    status character varying DEFAULT 'Pending'::character varying NOT NULL,
    "approvedById" uuid,
    "approvedAt" timestamp without time zone,
    "approvalNotes" text,
    "ownerId" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    description character varying(255),
    amount numeric(15,2),
    category character varying(100),
    "expenseDate" timestamp without time zone,
    "accountId" uuid,
    "createdBy" uuid
);

--
-- Name: followup_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.followup_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "visitId" uuid,
    notes text,
    "followupDate" timestamp without time zone,
    completed boolean DEFAULT false,
    "createdById" uuid,
    "createdAt" timestamp without time zone DEFAULT now()
);

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "invoiceNumber" character varying NOT NULL,
    "contractId" uuid NOT NULL,
    "projectId" uuid,
    "accountId" uuid NOT NULL,
    amount numeric(15,2) NOT NULL,
    tax numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    "totalAmount" numeric(15,2) NOT NULL,
    "invoiceDate" timestamp without time zone NOT NULL,
    "dueDate" timestamp without time zone NOT NULL,
    status character varying DEFAULT 'Draft'::character varying NOT NULL,
    "billingCycle" character varying DEFAULT 'Monthly'::character varying NOT NULL,
    description text,
    notes text,
    "documentPath" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "issueDate" timestamp without time zone NOT NULL,
    "paidAmount" numeric(15,2) DEFAULT 0,
    "paidDate" timestamp without time zone,
    remarks text,
    "createdBy" uuid
);

--
-- Name: kpi_audit_trail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.kpi_audit_trail (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "entityType" character varying(32) NOT NULL,
    "entityId" uuid NOT NULL,
    "subjectUserId" uuid NOT NULL,
    "actorId" uuid,
    action character varying(16) NOT NULL,
    before jsonb,
    after jsonb,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Name: kpi_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.kpi_definitions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    type character varying(16) DEFAULT 'number'::character varying NOT NULL,
    unit character varying(32),
    "userId" uuid NOT NULL,
    frequency character varying(16) DEFAULT 'weekly'::character varying NOT NULL,
    "targetValue" numeric(15,2),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdById" uuid,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "masterId" uuid,
    "startDate" date DEFAULT CURRENT_DATE NOT NULL,
    weightage numeric(5,2)
);

--
-- Name: kpi_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.kpi_entries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "kpiId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "entryDate" date NOT NULL,
    "numberValue" numeric(15,2),
    "textValue" text,
    "accountId" uuid,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Name: kpi_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.kpi_master (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    type character varying(16) DEFAULT 'number'::character varying NOT NULL,
    unit character varying(32),
    "defaultFrequency" character varying(16) DEFAULT 'daily'::character varying NOT NULL,
    "defaultTarget" numeric(15,2),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "answerOptions" jsonb
);

--
-- Name: kpi_projections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.kpi_projections (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" uuid NOT NULL,
    month date NOT NULL,
    metric character varying(32) NOT NULL,
    amount numeric(15,2) NOT NULL,
    note text,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.leads (
    id uuid DEFAULT public.uuid_generate_v4() CONSTRAINT accounts_id_not_null NOT NULL,
    name character varying CONSTRAINT accounts_name_not_null NOT NULL,
    industry character varying,
    size character varying,
    website character varying,
    "phoneNumber" character varying,
    type character varying DEFAULT 'Prospect'::character varying CONSTRAINT accounts_type_not_null NOT NULL,
    status character varying DEFAULT 'Prospect'::character varying CONSTRAINT accounts_status_not_null NOT NULL,
    "ownerId" uuid CONSTRAINT "accounts_ownerId_not_null" NOT NULL,
    "billingStreet" character varying,
    "billingCity" character varying,
    "billingState" character varying,
    "billingZip" character varying,
    "billingCountry" character varying,
    "shippingStreet" character varying,
    "shippingCity" character varying,
    "shippingState" character varying,
    "shippingZip" character varying,
    "shippingCountry" character varying,
    "onboardingStatus" character varying DEFAULT 'Not Started'::character varying CONSTRAINT "accounts_onboardingStatus_not_null" NOT NULL,
    "onboardingDate" timestamp without time zone,
    "onboardingCompletedDate" timestamp without time zone,
    "onboardingNotes" character varying,
    "contractSignedDate" timestamp without time zone,
    "goLiveDate" timestamp without time zone,
    "accountManager" character varying,
    "billingContact" character varying,
    "technicalContact" character varying,
    tags character varying,
    "createdAt" timestamp without time zone DEFAULT now() CONSTRAINT "accounts_createdAt_not_null" NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() CONSTRAINT "accounts_updatedAt_not_null" NOT NULL,
    "contactPerson" character varying,
    city character varying,
    region character varying,
    country character varying,
    "assigneeIds" text,
    "alternatePhoneNumber" character varying,
    email character varying,
    remark character varying,
    "teamId" uuid,
    "createdBy" uuid,
    tier character varying(100),
    "companyTypeId" uuid,
    "isB2B" boolean,
    "isRetail" boolean,
    "primaryBusiness" character varying(255),
    "employeeCount" integer,
    "branchLocations" text[],
    "prospectingAnswers" jsonb,
    "prospectedAt" timestamp with time zone,
    "prospectingUpdatedAt" timestamp with time zone,
    "leadQualification" jsonb
);

--
-- Name: line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.line_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "productId" character varying,
    "productName" character varying NOT NULL,
    quantity integer NOT NULL,
    "unitPrice" numeric(15,2) NOT NULL,
    discount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    "discountPercent" numeric(15,2),
    description character varying,
    "opportunityId" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    tax numeric(15,2) DEFAULT 0
);

--
-- Name: login_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.login_activity (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" uuid,
    "emailTried" character varying(255),
    event character varying(30) NOT NULL,
    success boolean NOT NULL,
    reason character varying(255),
    "ipAddress" character varying(64),
    "userAgent" character varying(500),
    country character varying(100),
    region character varying(100),
    city character varying(100),
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    latitude numeric(9,6),
    longitude numeric(9,6)
);

--
-- Name: login_security; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.login_security (
    "userId" character varying NOT NULL,
    "failedAttempts" integer DEFAULT 0 NOT NULL,
    "lockoutUntil" timestamp without time zone,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "lockedUntil" timestamp without time zone
);

--
-- Name: notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.notes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    content text NOT NULL,
    "resourceType" character varying NOT NULL,
    "resourceId" character varying NOT NULL,
    "createdById" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "entityType" character varying NOT NULL,
    "entityId" uuid NOT NULL
);

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type public.notifications_type_enum NOT NULL,
    title character varying NOT NULL,
    message text NOT NULL,
    "relatedEntityType" character varying,
    "relatedEntityId" character varying,
    "relatedEntityName" character varying,
    "isRead" boolean DEFAULT false NOT NULL,
    "readAt" timestamp without time zone,
    "actionUrl" character varying,
    "actionLabel" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "recipientId" uuid,
    "userId" uuid NOT NULL
);

--
-- Name: opportunities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.opportunities (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    amount numeric(15,2) NOT NULL,
    stage character varying DEFAULT 'Qualification'::character varying NOT NULL,
    status character varying DEFAULT 'Open'::character varying NOT NULL,
    description character varying,
    "forecastedCloseDate" timestamp without time zone NOT NULL,
    probability integer DEFAULT 0 NOT NULL,
    "accountId" uuid NOT NULL,
    "primaryContactId" uuid,
    "ownerId" uuid NOT NULL,
    tags character varying,
    "closedAt" timestamp without time zone,
    "closedReason" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    remark text,
    "businessVolume" numeric(15,2),
    "supplierList" text,
    "contactPerson" character varying,
    "contactEmail" character varying,
    "contactPhone" character varying,
    "jobTitle" character varying,
    "convertedFromLeadId" character varying,
    region character varying,
    country character varying,
    company character varying,
    source character varying,
    "assigneeIds" text,
    "expectedCloseMonth" character varying(7),
    city character varying(255),
    tier character varying(100)
);

--
-- Name: opportunity_answer_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.opportunity_answer_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "opportunityId" uuid NOT NULL,
    "questionKey" character varying(32) NOT NULL,
    "oldValue" text,
    "newValue" text,
    "oldStatus" character varying(16),
    "newStatus" character varying(16),
    note text,
    "actorId" uuid,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Name: opportunity_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.opportunity_answers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "opportunityId" uuid NOT NULL,
    "questionKey" character varying(32) NOT NULL,
    value text,
    status character varying(16) DEFAULT 'answered'::character varying NOT NULL,
    "updatedById" uuid,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Name: opportunity_stage_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.opportunity_stage_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "opportunityId" uuid NOT NULL,
    "fromStage" character varying(40),
    "toStage" character varying(40) NOT NULL,
    "actorId" uuid,
    note text,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "invoiceId" uuid NOT NULL,
    amount numeric(15,2) NOT NULL,
    "paymentDate" timestamp without time zone NOT NULL,
    "paymentMethod" character varying NOT NULL,
    "transactionReference" character varying,
    remarks text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    module character varying NOT NULL,
    action character varying NOT NULL,
    scope character varying DEFAULT 'all'::character varying,
    description character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

--
-- Name: product_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.product_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    description character varying,
    code character varying,
    "isActive" boolean DEFAULT true NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    sku character varying,
    description text,
    "unitPrice" numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    "billingType" character varying DEFAULT 'one-time'::character varying NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "categoryId" uuid,
    price numeric(10,2)
);

--
-- Name: project_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.project_milestones (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "projectId" uuid NOT NULL,
    "milestoneType" character varying NOT NULL,
    "milestoneName" character varying NOT NULL,
    "completedDate" timestamp without time zone NOT NULL,
    "completedTime" character varying,
    "responsibleUserId" uuid,
    remarks text,
    "approvalStatus" character varying DEFAULT 'Pending'::character varying NOT NULL,
    "approvedBy" character varying,
    "approvedDate" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    name character varying NOT NULL,
    "targetDate" timestamp without time zone
);

--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.projects (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "projectName" character varying NOT NULL,
    status character varying DEFAULT 'Planning'::character varying NOT NULL,
    description text,
    "startDate" timestamp without time zone NOT NULL,
    "endDate" timestamp without time zone NOT NULL,
    "goLiveDate" timestamp without time zone,
    budget numeric(15,2),
    revenue numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    "progressPercent" integer DEFAULT 0 NOT NULL,
    "accountId" uuid NOT NULL,
    "contractId" uuid,
    "projectManagerId" uuid,
    "isLoaded" boolean DEFAULT false NOT NULL,
    "loadedDate" timestamp without time zone,
    "loadedBy" character varying,
    "demoConducted" boolean DEFAULT false NOT NULL,
    "demoDate" timestamp without time zone,
    "conductedBy" character varying,
    "clientDemoApproval" boolean DEFAULT false NOT NULL,
    "uatStatus" character varying DEFAULT 'Pending'::character varying NOT NULL,
    "uatStartDate" timestamp without time zone,
    "uatCompletedDate" timestamp without time zone,
    "uatSignoffBy" character varying,
    "uatRemarks" text,
    "prodDeploymentStatus" character varying DEFAULT 'Not Started'::character varying NOT NULL,
    "prodDeploymentDate" timestamp without time zone,
    "prodDeploymentBy" character varying,
    "goLiveApproval" boolean DEFAULT false NOT NULL,
    "projectClosureSigned" boolean DEFAULT false NOT NULL,
    "projectClosureSignDate" timestamp without time zone,
    "projectClosureSignedBy" character varying,
    "closureRemarks" text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    name character varying NOT NULL,
    "projectManager" uuid,
    "createdBy" uuid
);

--
-- Name: prospect_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.prospect_options (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    category character varying(30) NOT NULL,
    name character varying(255) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Name: prospect_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.prospect_status_history (
    id uuid DEFAULT public.uuid_generate_v4() CONSTRAINT lead_status_history_id_not_null NOT NULL,
    "prospectId" uuid CONSTRAINT "lead_status_history_leadId_not_null" NOT NULL,
    "fromStatus" character varying(20),
    "toStatus" character varying(20) CONSTRAINT "lead_status_history_toStatus_not_null" NOT NULL,
    "actorId" uuid,
    note text,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Name: prospects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.prospects (
    id uuid DEFAULT public.uuid_generate_v4() CONSTRAINT leads_id_not_null NOT NULL,
    "firstName" character varying CONSTRAINT "leads_firstName_not_null" NOT NULL,
    "lastName" character varying CONSTRAINT "leads_lastName_not_null" NOT NULL,
    email character varying CONSTRAINT leads_email_not_null NOT NULL,
    "phoneNumber" character varying,
    company character varying,
    "jobTitle" character varying,
    source character varying,
    status character varying DEFAULT 'Open'::character varying CONSTRAINT leads_status_not_null NOT NULL,
    score integer DEFAULT 0 CONSTRAINT leads_score_not_null NOT NULL,
    value numeric(15,2) DEFAULT '0'::numeric CONSTRAINT leads_value_not_null NOT NULL,
    "expectedCloseDate" timestamp without time zone,
    "productId" character varying,
    "productName" character varying,
    "productIds" text,
    "productNames" text,
    "lostReason" character varying,
    remark text,
    "ownerId" uuid CONSTRAINT "leads_ownerId_not_null" NOT NULL,
    "accountId" uuid,
    tags character varying,
    "createdAt" timestamp without time zone DEFAULT now() CONSTRAINT "leads_createdAt_not_null" NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() CONSTRAINT "leads_updatedAt_not_null" NOT NULL,
    "businessVolume" numeric(15,2),
    "supplierList" text,
    region character varying,
    country character varying,
    "assigneeIds" text,
    tier character varying(100)
);

--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.questions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "questionKey" character varying(32) NOT NULL,
    stage character varying(40) NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    text text NOT NULL,
    type character varying(20) DEFAULT 'text'::character varying NOT NULL,
    mandatory boolean DEFAULT true NOT NULL,
    options jsonb,
    help text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Name: revoked_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.revoked_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "tokenHash" character varying NOT NULL,
    "userId" character varying,
    "expiresAt" timestamp without time zone NOT NULL,
    "revokedAt" timestamp without time zone DEFAULT now() NOT NULL,
    token text
);

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.role_permissions (
    "roleId" uuid NOT NULL,
    "permissionId" uuid NOT NULL,
    module character varying(100),
    action character varying(50),
    scope character varying(20) DEFAULT 'all'::character varying,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    description character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    departments text
);

--
-- Name: sales_targets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.sales_targets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    metric character varying(32) DEFAULT 'won_value'::character varying NOT NULL,
    "ownerId" uuid,
    "startDate" date NOT NULL,
    "endDate" date NOT NULL,
    "targetValue" numeric(15,2) NOT NULL,
    "createdById" uuid,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Name: sales_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.sales_visits (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "accountId" uuid,
    "companyName" character varying,
    "visitType" character varying DEFAULT 'Visit'::character varying NOT NULL,
    discussion text,
    "visitDate" timestamp without time zone,
    "createdById" uuid,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "followupDate" timestamp without time zone,
    "followupCompleted" boolean DEFAULT false,
    "followupNotes" text,
    followupdate timestamp without time zone,
    followupcompleted boolean DEFAULT false,
    followupnotes text,
    notes text,
    outcome character varying(100),
    "nextFollowUp" timestamp without time zone,
    "createdBy" uuid
);

--
-- Name: schema_verification_log; Type: TABLE; Schema: public; Owner: -
--

--
-- Name: schema_verification_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

--
-- Name: schema_verification_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

--
-- Name: security_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.security_alerts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "ruleCode" character varying(40) NOT NULL,
    severity character varying(10) NOT NULL,
    subject character varying(255) NOT NULL,
    summary character varying(500) NOT NULL,
    details jsonb,
    "userId" uuid,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" timestamp without time zone,
    "acknowledgedById" uuid
);

--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.suppliers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    "contactPerson" character varying,
    email character varying,
    "phoneNumber" character varying,
    category character varying,
    region character varying,
    country character varying,
    notes text,
    "createdById" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    phone character varying,
    address text,
    city character varying(100),
    remark text
);

--
-- Name: tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.tags (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    color character varying(7),
    description text,
    createdat timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);

--
-- Name: team_supervisors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.team_supervisors (
    "userId" uuid NOT NULL,
    "teamId" uuid NOT NULL,
    "supervisorId" uuid,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.teams (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    description character varying,
    "parentTeamId" uuid,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

--
-- Name: ticket_issue_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.ticket_issue_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "issueId" uuid NOT NULL,
    "fromStage" character varying(40),
    "toStage" character varying(40) NOT NULL,
    note text,
    "customerContact" character varying(255),
    "actorId" uuid,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Name: ticket_issues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.ticket_issues (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "ticketId" uuid NOT NULL,
    "issueNumber" integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    priority character varying(16) DEFAULT 'Medium'::character varying NOT NULL,
    stage character varying(40) DEFAULT 'Logged'::character varying NOT NULL,
    "assigneeId" uuid,
    "createdById" uuid,
    "closedAt" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Name: tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.tickets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "ticketNumber" character varying NOT NULL,
    title character varying NOT NULL,
    description text NOT NULL,
    priority public.tickets_priority_enum DEFAULT 'Medium'::public.tickets_priority_enum NOT NULL,
    status public.tickets_status_enum DEFAULT 'Open'::public.tickets_status_enum NOT NULL,
    category character varying,
    source character varying,
    "slaResponseHours" integer,
    "slaResolutionHours" integer,
    "responseDeadline" timestamp without time zone,
    "resolutionDeadline" timestamp without time zone,
    "respondedAt" timestamp without time zone,
    "resolvedAt" timestamp without time zone,
    "resolutionNotes" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "accountId" uuid,
    "contactId" uuid,
    "reporterId" uuid,
    "assigneeId" uuid,
    "assigneeIds" text,
    "productId" character varying,
    "attachmentPaths" text,
    "moduleType" character varying,
    "assignedToId" uuid,
    "assignedTo" uuid,
    "createdBy" uuid,
    "dueDate" timestamp without time zone
);

--
-- Name: user_teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.user_teams (
    "userId" uuid NOT NULL,
    "teamId" uuid NOT NULL,
    role character varying(50),
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying NOT NULL,
    password character varying NOT NULL,
    "firstName" character varying NOT NULL,
    "lastName" character varying NOT NULL,
    "phoneNumber" character varying,
    "isActive" boolean DEFAULT true NOT NULL,
    "resetToken" character varying,
    "resetTokenExpiry" timestamp without time zone,
    "hasChangedPasswordOnFirstLogin" boolean DEFAULT false NOT NULL,
    "passwordChangedAt" timestamp without time zone,
    "emailNotificationsEnabled" boolean DEFAULT true NOT NULL,
    "emailNotificationPreferences" text DEFAULT '{}'::text NOT NULL,
    "roleId" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "teamId" uuid,
    departments text
);

--
-- Name: schema_verification_log id; Type: DEFAULT; Schema: public; Owner: -
--

--
-- Name: products PK_0806c755e0aca124e67c0cf6d7d; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.products
    ADD CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: project_milestones PK_0c561300a12c6ba3ad793dff4b8; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT "PK_0c561300a12c6ba3ad793dff4b8" PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: payments PK_197ab7af18c93fbb0c9b28b4a59; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: audit_logs PK_1bb179d048bbc581caa3b013439; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: contracts PK_2c7b8f3a7b1acdd49497d83d0fb; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT "PK_2c7b8f3a7b1acdd49497d83d0fb" PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: tickets PK_343bc942ae261cf7a1377f48fd0; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "PK_343bc942ae261cf7a1377f48fd0" PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: opportunities PK_4bd9cd12ddc0ff48a5a97ddebce; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT "PK_4bd9cd12ddc0ff48a5a97ddebce" PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: leads PK_5a7a02c20412299d198e097a8fe; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.leads
    ADD CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: projects PK_6271df0a7aed1d6c0691ce6ac50; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.projects
    ADD CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: invoices PK_668cef7c22a427fd822cc1be3ce; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: notifications PK_6a72c3c0f683f6462415e653c3a; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: line_items PK_6d227c876e374542dc9bb44dfb4; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.line_items
    ADD CONSTRAINT "PK_6d227c876e374542dc9bb44dfb4" PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: sales_visits PK_74af0ac5b6b4d85beb204871f1f; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.sales_visits
    ADD CONSTRAINT "PK_74af0ac5b6b4d85beb204871f1f" PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: activities PK_7f4004429f731ffb9c88eb486a8; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.activities
    ADD CONSTRAINT "PK_7f4004429f731ffb9c88eb486a8" PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: permissions PK_920331560282b8bd21bb02290df; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: expenses PK_94c3ceb17e3140abc9282c20610; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "PK_94c3ceb17e3140abc9282c20610" PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: notes PK_af6206538ea96c4e77e9f400c3d; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.notes
    ADD CONSTRAINT "PK_af6206538ea96c4e77e9f400c3d" PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: suppliers PK_b70ac51766a9e3144f778cfe81e; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT "PK_b70ac51766a9e3144f778cfe81e" PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: contacts PK_b99cd40cfd66a99f1571f4f72e6; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT "PK_b99cd40cfd66a99f1571f4f72e6" PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: roles PK_c1433d71a4838793a49dcad46ab; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.roles
    ADD CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: prospects PK_cd102ed7a9a4ca7d4d8bfeba406; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT "PK_cd102ed7a9a4ca7d4d8bfeba406" PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: email_settings PK_d363efbb6aa1c747440c0ec24f4; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.email_settings
    ADD CONSTRAINT "PK_d363efbb6aa1c747440c0ec24f4" PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: role_permissions PK_d430a02aad006d8a70f3acd7d03; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "PK_d430a02aad006d8a70f3acd7d03" PRIMARY KEY ("roleId", "permissionId");
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: leads UQ_2db43cdbf7bb862e577b5f540c8; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.leads
    ADD CONSTRAINT "UQ_2db43cdbf7bb862e577b5f540c8" UNIQUE (name);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: contracts UQ_375897948211b379ad8726c5e63; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT "UQ_375897948211b379ad8726c5e63" UNIQUE ("contractNumber");
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: suppliers UQ_5b5720d9645cee7396595a16c93; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT "UQ_5b5720d9645cee7396595a16c93" UNIQUE (name);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: roles UQ_648e3f5447f725579d7d4ffdfb7; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.roles
    ADD CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE (name);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: contacts UQ_752866c5247ddd34fd05559537d; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT "UQ_752866c5247ddd34fd05559537d" UNIQUE (email);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: prospects UQ_b3eea7add0e16594dba102716c5; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT "UQ_b3eea7add0e16594dba102716c5" UNIQUE (email);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: invoices UQ_bf8e0f9dd4558ef209ec111782d; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "UQ_bf8e0f9dd4558ef209ec111782d" UNIQUE ("invoiceNumber");
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: products UQ_c44ac33a05b144dd0d9ddcf9327; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.products
    ADD CONSTRAINT "UQ_c44ac33a05b144dd0d9ddcf9327" UNIQUE (sku);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: tickets UQ_e99bd0f51b92896fdaf99ebb715; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "UQ_e99bd0f51b92896fdaf99ebb715" UNIQUE ("ticketNumber");
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: account_stakeholders account_stakeholders_accountId_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.account_stakeholders
    ADD CONSTRAINT "account_stakeholders_accountId_role_key" UNIQUE ("accountId", role);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: account_stakeholders account_stakeholders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.account_stakeholders
    ADD CONSTRAINT account_stakeholders_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: company_types company_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.company_types
    ADD CONSTRAINT company_types_name_key UNIQUE (name);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: company_types company_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.company_types
    ADD CONSTRAINT company_types_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: countries countries_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_code_key UNIQUE (code);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: countries countries_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_name_key UNIQUE (name);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: countries countries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: designations designations_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.designations
    ADD CONSTRAINT designations_name_key UNIQUE (name);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: designations designations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.designations
    ADD CONSTRAINT designations_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: entity_tags entity_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.entity_tags
    ADD CONSTRAINT entity_tags_pkey PRIMARY KEY (entitytype, entityid, tagid);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: followup_entries followup_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.followup_entries
    ADD CONSTRAINT followup_entries_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: kpi_audit_trail kpi_audit_trail_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.kpi_audit_trail
    ADD CONSTRAINT kpi_audit_trail_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: kpi_definitions kpi_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.kpi_definitions
    ADD CONSTRAINT kpi_definitions_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: kpi_entries kpi_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.kpi_entries
    ADD CONSTRAINT kpi_entries_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: kpi_master kpi_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.kpi_master
    ADD CONSTRAINT kpi_master_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: kpi_projections kpi_projections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.kpi_projections
    ADD CONSTRAINT kpi_projections_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: kpi_projections kpi_projections_userId_month_metric_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.kpi_projections
    ADD CONSTRAINT "kpi_projections_userId_month_metric_key" UNIQUE ("userId", month, metric);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: prospect_status_history lead_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.prospect_status_history
    ADD CONSTRAINT lead_status_history_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: login_activity login_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.login_activity
    ADD CONSTRAINT login_activity_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: login_security login_security_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.login_security
    ADD CONSTRAINT login_security_pkey PRIMARY KEY ("userId");
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: opportunity_answer_history opportunity_answer_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.opportunity_answer_history
    ADD CONSTRAINT opportunity_answer_history_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: opportunity_answers opportunity_answers_opportunityId_questionKey_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.opportunity_answers
    ADD CONSTRAINT "opportunity_answers_opportunityId_questionKey_key" UNIQUE ("opportunityId", "questionKey");
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: opportunity_answers opportunity_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.opportunity_answers
    ADD CONSTRAINT opportunity_answers_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: opportunity_stage_history opportunity_stage_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.opportunity_stage_history
    ADD CONSTRAINT opportunity_stage_history_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: product_categories product_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: prospect_options prospect_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.prospect_options
    ADD CONSTRAINT prospect_options_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: questions questions_questionKey_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.questions
    ADD CONSTRAINT "questions_questionKey_key" UNIQUE ("questionKey");
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: revoked_tokens revoked_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.revoked_tokens
    ADD CONSTRAINT revoked_tokens_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: sales_targets sales_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.sales_targets
    ADD CONSTRAINT sales_targets_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: schema_verification_log schema_verification_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

--
-- Name: security_alerts security_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.security_alerts
    ADD CONSTRAINT security_alerts_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: tags tags_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_name_key UNIQUE (name);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: ticket_issue_history ticket_issue_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.ticket_issue_history
    ADD CONSTRAINT ticket_issue_history_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: ticket_issues ticket_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.ticket_issues
    ADD CONSTRAINT ticket_issues_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: ticket_issues ticket_issues_ticketId_issueNumber_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.ticket_issues
    ADD CONSTRAINT "ticket_issues_ticketId_issueNumber_key" UNIQUE ("ticketId", "issueNumber");
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: prospect_options uq_prospect_option; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.prospect_options
    ADD CONSTRAINT uq_prospect_option UNIQUE (category, name);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: IDX_06792d0c62ce6b0203c03643cd; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "IDX_06792d0c62ce6b0203c03643cd" ON public.role_permissions USING btree ("permissionId");

--
-- Name: IDX_13c69424c440a0e765053feb4b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "IDX_13c69424c440a0e765053feb4b" ON public.audit_logs USING btree ("entityType", "entityId");

--
-- Name: IDX_831a5a06f879fb0bebf8965871; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "IDX_831a5a06f879fb0bebf8965871" ON public.notifications USING btree ("createdAt");

--
-- Name: IDX_8ba28344602d583583b9ea1a50; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "IDX_8ba28344602d583583b9ea1a50" ON public.notifications USING btree ("isRead");

--
-- Name: IDX_b4599f8b8f548d35850afa2d12; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "IDX_b4599f8b8f548d35850afa2d12" ON public.role_permissions USING btree ("roleId");

--
-- Name: IDX_c69efb19bf127c97e6740ad530; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "IDX_c69efb19bf127c97e6740ad530" ON public.audit_logs USING btree ("createdAt");

--
-- Name: idx_account_stakeholders_accountid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_account_stakeholders_accountid ON public.account_stakeholders USING btree ("accountId");

--
-- Name: idx_account_stakeholders_designationid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_account_stakeholders_designationid ON public.account_stakeholders USING btree ("designationId");

--
-- Name: idx_account_teams_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_account_teams_account ON public.account_teams USING btree ("accountId");

--
-- Name: idx_account_teams_accountid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_account_teams_accountid ON public.account_teams USING btree ("accountId");

--
-- Name: idx_account_teams_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_account_teams_team ON public.account_teams USING btree ("teamId");

--
-- Name: idx_account_teams_teamid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_account_teams_teamid ON public.account_teams USING btree ("teamId");

--
-- Name: idx_accounts_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_accounts_country ON public.leads USING btree (country);

--
-- Name: idx_accounts_createdat_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_accounts_createdat_desc ON public.leads USING btree ("createdAt" DESC);

--
-- Name: idx_accounts_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_accounts_name ON public.leads USING btree (name);

--
-- Name: idx_accounts_ownerid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_accounts_ownerid ON public.leads USING btree ("ownerId");

--
-- Name: idx_accounts_ownerid_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_accounts_ownerid_status ON public.leads USING btree ("ownerId", status);

--
-- Name: idx_accounts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_accounts_status ON public.leads USING btree (status);

--
-- Name: idx_accounts_teamid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_accounts_teamid ON public.leads USING btree ("teamId");

--
-- Name: idx_accounts_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_accounts_tier ON public.leads USING btree (tier);

--
-- Name: idx_accounts_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_accounts_type ON public.leads USING btree (type);

--
-- Name: idx_company_types_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_company_types_name ON public.company_types USING btree (name);

--
-- Name: idx_contacts_accountid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_contacts_accountid ON public.contacts USING btree ("accountId");

--
-- Name: idx_contacts_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts USING btree (email);

--
-- Name: idx_contracts_accountid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_contracts_accountid ON public.contracts USING btree ("accountId");

--
-- Name: idx_contracts_contractnumber; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_contracts_contractnumber ON public.contracts USING btree ("contractNumber");

--
-- Name: idx_contracts_createdat_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_contracts_createdat_desc ON public.contracts USING btree ("createdAt" DESC);

--
-- Name: idx_contracts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts USING btree (status);

--
-- Name: idx_countries_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_countries_code ON public.countries USING btree (code);

--
-- Name: idx_countries_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_countries_name ON public.countries USING btree (name);

--
-- Name: idx_designations_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_designations_name ON public.designations USING btree (name);

--
-- Name: idx_expenses_accountid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_expenses_accountid ON public.expenses USING btree ("accountId");

--
-- Name: idx_expenses_expensedate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_expenses_expensedate ON public.expenses USING btree ("expenseDate");

--
-- Name: idx_followup_entries_visit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_followup_entries_visit ON public.followup_entries USING btree ("visitId");

--
-- Name: idx_invoices_accountid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_invoices_accountid ON public.invoices USING btree ("accountId");

--
-- Name: idx_invoices_createdat_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_invoices_createdat_desc ON public.invoices USING btree ("createdAt" DESC);

--
-- Name: idx_invoices_invoicenumber; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_invoices_invoicenumber ON public.invoices USING btree ("invoiceNumber");

--
-- Name: idx_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices USING btree (status);

--
-- Name: idx_kpi_audit_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_kpi_audit_entity ON public.kpi_audit_trail USING btree ("entityType", "entityId");

--
-- Name: idx_kpi_audit_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_kpi_audit_subject ON public.kpi_audit_trail USING btree ("subjectUserId", "createdAt" DESC);

--
-- Name: idx_kpi_definitions_master; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_kpi_definitions_master ON public.kpi_definitions USING btree ("masterId");

--
-- Name: idx_kpi_definitions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_kpi_definitions_user ON public.kpi_definitions USING btree ("userId");

--
-- Name: idx_kpi_entries_kpi_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_kpi_entries_kpi_date ON public.kpi_entries USING btree ("kpiId", "entryDate");

--
-- Name: idx_kpi_entries_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_kpi_entries_user_date ON public.kpi_entries USING btree ("userId", "entryDate");

--
-- Name: idx_kpi_projections_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_kpi_projections_month ON public.kpi_projections USING btree (month);

--
-- Name: idx_lead_status_history_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead ON public.prospect_status_history USING btree ("prospectId", "createdAt");

--
-- Name: idx_leads_accountid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_leads_accountid ON public.prospects USING btree ("accountId");

--
-- Name: idx_leads_createdat_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_leads_createdat_desc ON public.prospects USING btree ("createdAt" DESC);

--
-- Name: idx_leads_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_leads_email ON public.prospects USING btree (email);

--
-- Name: idx_leads_ownerid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_leads_ownerid ON public.prospects USING btree ("ownerId");

--
-- Name: idx_leads_ownerid_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_leads_ownerid_status ON public.prospects USING btree ("ownerId", status);

--
-- Name: idx_leads_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_leads_source ON public.prospects USING btree (source);

--
-- Name: idx_leads_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_leads_status ON public.prospects USING btree (status);

--
-- Name: idx_leads_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_leads_tier ON public.prospects USING btree (tier);

--
-- Name: idx_line_items_opportunityid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_line_items_opportunityid ON public.line_items USING btree ("opportunityId");

--
-- Name: idx_login_activity_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_login_activity_created ON public.login_activity USING btree ("createdAt");

--
-- Name: idx_login_activity_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_login_activity_user ON public.login_activity USING btree ("userId", "createdAt");

--
-- Name: idx_opportunities_accountid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_opportunities_accountid ON public.opportunities USING btree ("accountId");

--
-- Name: idx_opportunities_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_opportunities_city ON public.opportunities USING btree (city);

--
-- Name: idx_opportunities_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_opportunities_country ON public.opportunities USING btree (country);

--
-- Name: idx_opportunities_createdat_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_opportunities_createdat_desc ON public.opportunities USING btree ("createdAt" DESC);

--
-- Name: idx_opportunities_expected_close_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_opportunities_expected_close_month ON public.opportunities USING btree ("expectedCloseMonth");

--
-- Name: idx_opportunities_forecastedclosedate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_opportunities_forecastedclosedate ON public.opportunities USING btree ("forecastedCloseDate");

--
-- Name: idx_opportunities_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_opportunities_name ON public.opportunities USING btree (name);

--
-- Name: idx_opportunities_ownerid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_opportunities_ownerid ON public.opportunities USING btree ("ownerId");

--
-- Name: idx_opportunities_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON public.opportunities USING btree (stage);

--
-- Name: idx_opportunities_stage_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_opportunities_stage_status ON public.opportunities USING btree (stage, status);

--
-- Name: idx_opportunities_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_opportunities_status ON public.opportunities USING btree (status);

--
-- Name: idx_opportunities_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_opportunities_tier ON public.opportunities USING btree (tier);

--
-- Name: idx_opportunity_answer_history_opp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_opportunity_answer_history_opp ON public.opportunity_answer_history USING btree ("opportunityId", "questionKey", "createdAt");

--
-- Name: idx_opportunity_answers_opp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_opportunity_answers_opp ON public.opportunity_answers USING btree ("opportunityId");

--
-- Name: idx_opportunity_stage_history_opp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_opportunity_stage_history_opp ON public.opportunity_stage_history USING btree ("opportunityId", "createdAt");

--
-- Name: idx_product_categories_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_categories_code ON public.product_categories USING btree (code) WHERE (code IS NOT NULL);

--
-- Name: idx_product_categories_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_categories_name ON public.product_categories USING btree (name);

--
-- Name: idx_products_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products USING btree ("categoryId");

--
-- Name: idx_products_categoryid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_products_categoryid ON public.products USING btree ("categoryId");

--
-- Name: idx_products_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_products_name ON public.products USING btree (name);

--
-- Name: idx_projects_accountid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_projects_accountid ON public.projects USING btree ("accountId");

--
-- Name: idx_projects_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects USING btree (status);

--
-- Name: idx_questions_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_questions_stage ON public.questions USING btree (stage, "position");

--
-- Name: idx_revoked_tokens_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON public.revoked_tokens USING btree ("expiresAt");

--
-- Name: idx_revoked_tokens_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS idx_revoked_tokens_hash ON public.revoked_tokens USING btree ("tokenHash");

--
-- Name: idx_role_permissions_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_role_permissions_module ON public.role_permissions USING btree (module);

--
-- Name: idx_role_permissions_roleid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_role_permissions_roleid ON public.role_permissions USING btree ("roleId");

--
-- Name: idx_roles_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles USING btree (name);

--
-- Name: idx_sales_targets_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sales_targets_owner ON public.sales_targets USING btree ("ownerId");

--
-- Name: idx_sales_targets_range; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sales_targets_range ON public.sales_targets USING btree ("startDate", "endDate");

--
-- Name: idx_sales_visits_accountid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sales_visits_accountid ON public.sales_visits USING btree ("accountId");

--
-- Name: idx_sales_visits_followup_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sales_visits_followup_completed ON public.sales_visits USING btree ("followupCompleted");

--
-- Name: idx_sales_visits_followup_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sales_visits_followup_date ON public.sales_visits USING btree ("followupDate");

--
-- Name: idx_sales_visits_visitdate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sales_visits_visitdate ON public.sales_visits USING btree ("visitDate");

--
-- Name: idx_security_alerts_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_security_alerts_created ON public.security_alerts USING btree ("createdAt");

--
-- Name: idx_security_alerts_rule; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_security_alerts_rule ON public.security_alerts USING btree ("ruleCode", subject, "createdAt");

--
-- Name: idx_suppliers_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers USING btree (name);

--
-- Name: idx_team_supervisors_supervisorid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_team_supervisors_supervisorid ON public.team_supervisors USING btree ("supervisorId");

--
-- Name: idx_team_supervisors_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_team_supervisors_team ON public.team_supervisors USING btree ("teamId");

--
-- Name: idx_team_supervisors_teamid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_team_supervisors_teamid ON public.team_supervisors USING btree ("teamId");

--
-- Name: idx_team_supervisors_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_team_supervisors_user ON public.team_supervisors USING btree ("userId");

--
-- Name: idx_teams_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_teams_name ON public.teams USING btree (name);

--
-- Name: idx_teams_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_teams_parent ON public.teams USING btree ("parentTeamId");

--
-- Name: idx_teams_parentteamid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_teams_parentteamid ON public.teams USING btree ("parentTeamId");

--
-- Name: idx_ticket_issue_history_issue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_ticket_issue_history_issue ON public.ticket_issue_history USING btree ("issueId", "createdAt");

--
-- Name: idx_ticket_issues_assignee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_ticket_issues_assignee ON public.ticket_issues USING btree ("assigneeId");

--
-- Name: idx_ticket_issues_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_ticket_issues_stage ON public.ticket_issues USING btree (stage);

--
-- Name: idx_ticket_issues_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_ticket_issues_ticket ON public.ticket_issues USING btree ("ticketId");

--
-- Name: idx_tickets_accountid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_tickets_accountid ON public.tickets USING btree ("accountId");

--
-- Name: idx_tickets_assignedto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_tickets_assignedto ON public.tickets USING btree ("assignedTo");

--
-- Name: idx_tickets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets USING btree (status);

--
-- Name: idx_user_teams_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_user_teams_team ON public.user_teams USING btree ("teamId");

--
-- Name: idx_user_teams_teamid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_user_teams_teamid ON public.user_teams USING btree ("teamId");

--
-- Name: idx_user_teams_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_user_teams_user ON public.user_teams USING btree ("userId");

--
-- Name: idx_user_teams_userid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_user_teams_userid ON public.user_teams USING btree ("userId");

--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users USING btree (email);

--
-- Name: idx_users_roleid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_users_roleid ON public.users USING btree ("roleId");

--
-- Name: uq_kpi_master_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS uq_kpi_master_name ON public.kpi_master USING btree (lower((name)::text));

--
-- Name: leads update_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE OR REPLACE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Name: activities update_activities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE OR REPLACE TRIGGER update_activities_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Name: contacts update_contacts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE OR REPLACE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Name: contracts update_contracts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE OR REPLACE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Name: email_settings update_email_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE OR REPLACE TRIGGER update_email_settings_updated_at BEFORE UPDATE ON public.email_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Name: prospects update_leads_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE OR REPLACE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.prospects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Name: line_items update_line_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE OR REPLACE TRIGGER update_line_items_updated_at BEFORE UPDATE ON public.line_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Name: notes update_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE OR REPLACE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Name: opportunities update_opportunities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE OR REPLACE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Name: tickets update_tickets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE OR REPLACE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE OR REPLACE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Name: opportunities FK_0487ff0859e04aecaa9e9a913d0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT "FK_0487ff0859e04aecaa9e9a913d0" FOREIGN KEY ("primaryContactId") REFERENCES public.contacts(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: role_permissions FK_06792d0c62ce6b0203c03643cdd; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "FK_06792d0c62ce6b0203c03643cdd" FOREIGN KEY ("permissionId") REFERENCES public.permissions(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: contracts FK_18cbf0097753ef0065d75ec0cb8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT "FK_18cbf0097753ef0065d75ec0cb8" FOREIGN KEY ("opportunityId") REFERENCES public.opportunities(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: projects FK_1fa4a36bc7ea7727a1ff25be92f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.projects
    ADD CONSTRAINT "FK_1fa4a36bc7ea7727a1ff25be92f" FOREIGN KEY ("projectManagerId") REFERENCES public.users(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: invoices FK_20d900c6b7f2de7faa4d214d64d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "FK_20d900c6b7f2de7faa4d214d64d" FOREIGN KEY ("projectId") REFERENCES public.projects(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: sales_visits FK_2585d1c1190a3c18da32302c59c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.sales_visits
    ADD CONSTRAINT "FK_2585d1c1190a3c18da32302c59c" FOREIGN KEY ("accountId") REFERENCES public.leads(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: leads FK_2cb7f7a1dc3b84c8cde2b930944; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.leads
    ADD CONSTRAINT "FK_2cb7f7a1dc3b84c8cde2b930944" FOREIGN KEY ("ownerId") REFERENCES public.users(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: contracts FK_34aa224c8a6e62621f5c4988522; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT "FK_34aa224c8a6e62621f5c4988522" FOREIGN KEY ("createdById") REFERENCES public.users(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: users FK_368e146b785b574f42ae9e53d5e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.users
    ADD CONSTRAINT "FK_368e146b785b574f42ae9e53d5e" FOREIGN KEY ("roleId") REFERENCES public.roles(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: projects FK_3f20b08797133f636a6af39fc55; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.projects
    ADD CONSTRAINT "FK_3f20b08797133f636a6af39fc55" FOREIGN KEY ("accountId") REFERENCES public.leads(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: invoices FK_42d017ec6c4a79ea33cbe9dbfba; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "FK_42d017ec6c4a79ea33cbe9dbfba" FOREIGN KEY ("contractId") REFERENCES public.contracts(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: payments FK_43d19956aeab008b49e0804c145; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "FK_43d19956aeab008b49e0804c145" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: tickets FK_4f127f7c92139971ec4cbbe0bd5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "FK_4f127f7c92139971ec4cbbe0bd5" FOREIGN KEY ("assigneeId") REFERENCES public.users(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: invoices FK_517b74001b457b209d95e4352e6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "FK_517b74001b457b209d95e4352e6" FOREIGN KEY ("accountId") REFERENCES public.leads(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: expenses FK_52d3a5654f747793e6048e55bb6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "FK_52d3a5654f747793e6048e55bb6" FOREIGN KEY ("approvedById") REFERENCES public.users(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: contacts FK_5363bc1655a7339414523a02fd4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT "FK_5363bc1655a7339414523a02fd4" FOREIGN KEY ("accountId") REFERENCES public.leads(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: line_items FK_53e425e79128eb598687d9cd0e4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.line_items
    ADD CONSTRAINT "FK_53e425e79128eb598687d9cd0e4" FOREIGN KEY ("opportunityId") REFERENCES public.opportunities(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: activities FK_579056df0c92b0f6432e96b2048; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.activities
    ADD CONSTRAINT "FK_579056df0c92b0f6432e96b2048" FOREIGN KEY ("createdById") REFERENCES public.users(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: projects FK_5e0067b69b5325d34bf33503252; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.projects
    ADD CONSTRAINT "FK_5e0067b69b5325d34bf33503252" FOREIGN KEY ("contractId") REFERENCES public.contracts(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: prospects FK_62e3c834894c2c2da4023718aa9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT "FK_62e3c834894c2c2da4023718aa9" FOREIGN KEY ("accountId") REFERENCES public.leads(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: tickets FK_7b38d2bacd0eff4228449136f71; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "FK_7b38d2bacd0eff4228449136f71" FOREIGN KEY ("contactId") REFERENCES public.contacts(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: opportunities FK_95c92b4ade0ed9ba50ba00b312c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT "FK_95c92b4ade0ed9ba50ba00b312c" FOREIGN KEY ("accountId") REFERENCES public.leads(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: project_milestones FK_9fb847267f120c4cdbbb28b408b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT "FK_9fb847267f120c4cdbbb28b408b" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: email_settings FK_a60045d50ed862b9a515d0c0b8e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.email_settings
    ADD CONSTRAINT "FK_a60045d50ed862b9a515d0c0b8e" FOREIGN KEY ("updatedById") REFERENCES public.users(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: tickets FK_ae9b43f5037786810fcfbb4e632; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "FK_ae9b43f5037786810fcfbb4e632" FOREIGN KEY ("accountId") REFERENCES public.leads(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: tickets FK_b1930f86a5e9b5b5be3689fc820; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "FK_b1930f86a5e9b5b5be3689fc820" FOREIGN KEY ("reporterId") REFERENCES public.users(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: role_permissions FK_b4599f8b8f548d35850afa2d12c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "FK_b4599f8b8f548d35850afa2d12c" FOREIGN KEY ("roleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: expenses FK_c1495dd5777eaeea92b8a21843e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "FK_c1495dd5777eaeea92b8a21843e" FOREIGN KEY ("ownerId") REFERENCES public.users(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: opportunities FK_cc51e62c9dfa9d01661bc4a4e9c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT "FK_cc51e62c9dfa9d01661bc4a4e9c" FOREIGN KEY ("ownerId") REFERENCES public.users(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: contracts FK_cea24c405eca7df888febed0dba; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT "FK_cea24c405eca7df888febed0dba" FOREIGN KEY ("accountId") REFERENCES public.leads(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: project_milestones FK_cf110dea57fce0159c273fca17f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT "FK_cf110dea57fce0159c273fca17f" FOREIGN KEY ("responsibleUserId") REFERENCES public.users(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: audit_logs FK_cfa83f61e4d27a87fcae1e025ab; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "FK_cfa83f61e4d27a87fcae1e025ab" FOREIGN KEY ("userId") REFERENCES public.users(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: sales_visits FK_d5b7219ca9ac5ac508ffcfe842b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.sales_visits
    ADD CONSTRAINT "FK_d5b7219ca9ac5ac508ffcfe842b" FOREIGN KEY ("createdById") REFERENCES public.users(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: prospects FK_d673803d4443e1bfe47d11c45be; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT "FK_d673803d4443e1bfe47d11c45be" FOREIGN KEY ("ownerId") REFERENCES public.users(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: notifications FK_db873ba9a123711a4bff527ccd5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_db873ba9a123711a4bff527ccd5" FOREIGN KEY ("recipientId") REFERENCES public.users(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: notes FK_f2a1f6264b833a0b7db37757952; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.notes
    ADD CONSTRAINT "FK_f2a1f6264b833a0b7db37757952" FOREIGN KEY ("createdById") REFERENCES public.users(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: account_stakeholders account_stakeholders_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.account_stakeholders
    ADD CONSTRAINT "account_stakeholders_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.leads(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: account_stakeholders account_stakeholders_designationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.account_stakeholders
    ADD CONSTRAINT "account_stakeholders_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES public.designations(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: leads accounts_companyTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.leads
    ADD CONSTRAINT "accounts_companyTypeId_fkey" FOREIGN KEY ("companyTypeId") REFERENCES public.company_types(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: entity_tags fk_entity_tag_tag; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.entity_tags
    ADD CONSTRAINT fk_entity_tag_tag FOREIGN KEY (tagid) REFERENCES public.tags(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: products fk_products_category; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_products_category FOREIGN KEY ("categoryId") REFERENCES public.product_categories(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: kpi_entries kpi_entries_kpiId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.kpi_entries
    ADD CONSTRAINT "kpi_entries_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES public.kpi_definitions(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: prospect_status_history lead_status_history_leadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.prospect_status_history
    ADD CONSTRAINT "lead_status_history_leadId_fkey" FOREIGN KEY ("prospectId") REFERENCES public.prospects(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: login_activity login_activity_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.login_activity
    ADD CONSTRAINT "login_activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: opportunity_answer_history opportunity_answer_history_opportunityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.opportunity_answer_history
    ADD CONSTRAINT "opportunity_answer_history_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES public.opportunities(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: opportunity_answers opportunity_answers_opportunityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.opportunity_answers
    ADD CONSTRAINT "opportunity_answers_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES public.opportunities(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: opportunity_stage_history opportunity_stage_history_opportunityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.opportunity_stage_history
    ADD CONSTRAINT "opportunity_stage_history_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES public.opportunities(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: security_alerts security_alerts_acknowledgedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.security_alerts
    ADD CONSTRAINT "security_alerts_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: security_alerts security_alerts_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.security_alerts
    ADD CONSTRAINT "security_alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: ticket_issue_history ticket_issue_history_issueId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.ticket_issue_history
    ADD CONSTRAINT "ticket_issue_history_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES public.ticket_issues(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- Name: ticket_issues ticket_issues_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
  ALTER TABLE ONLY public.ticket_issues
    ADD CONSTRAINT "ticket_issues_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.tickets(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;

--
-- PostgreSQL database dump complete
--

\unrestrict J4dW4BpfuYmjceOcxl4JeTZjaJ1Og5b2iq06EmXPDFqzIqYYja9L9oyvAWZejq6


