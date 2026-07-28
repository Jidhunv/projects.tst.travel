--
-- PostgreSQL database dump
--

\restrict 7RwBT3wT80TjyCmUIP6fGgcIDRrpWfIFIotj5HEihR1RFAhDEwzbQ2GGFLXv7OM

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
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

-- COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

-- COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: audit_logs_action_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE IF NOT EXISTS public.audit_logs_action_enum AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE'
);


-- ALTER TYPE public.audit_logs_action_enum OWNER TO postgres;

--
-- Name: notifications_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE IF NOT EXISTS public.notifications_type_enum AS ENUM (
    'ContractExpiry',
    'InvoiceDue',
    'UATApproval',
    'PaymentReminder',
    'ProjectMilestone',
    'TicketUpdate'
);


-- ALTER TYPE public.notifications_type_enum OWNER TO postgres;

--
-- Name: tickets_moduletype_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE IF NOT EXISTS public.tickets_moduletype_enum AS ENUM (
    'Bug',
    'Feature Request',
    'Enhancement Suggestion'
);


-- ALTER TYPE public.tickets_moduletype_enum OWNER TO postgres;

--
-- Name: tickets_priority_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE IF NOT EXISTS public.tickets_priority_enum AS ENUM (
    'Critical',
    'High',
    'Medium',
    'Low'
);


-- ALTER TYPE public.tickets_priority_enum OWNER TO postgres;

--
-- Name: tickets_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE IF NOT EXISTS public.tickets_status_enum AS ENUM (
    'Open',
    'In Progress',
    'Pending Customer',
    'Resolved',
    'Closed'
);


-- ALTER TYPE public.tickets_status_enum OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: crm_user
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updatedAt = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


-- ALTER FUNCTION public.update_updated_at_column() OWNER TO crm_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.account_teams (
    "accountId" uuid NOT NULL,
    "teamId" uuid NOT NULL
);


-- ALTER TABLE public.account_teams OWNER TO postgres;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.accounts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    industry character varying,
    size character varying,
    website character varying,
    "phoneNumber" character varying,
    type character varying DEFAULT 'Prospect'::character varying NOT NULL,
    status character varying DEFAULT 'Prospect'::character varying NOT NULL,
    "ownerId" uuid NOT NULL,
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
    tags character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "onboardingStatus" character varying DEFAULT 'Not Started'::character varying NOT NULL,
    "onboardingDate" timestamp without time zone,
    "onboardingCompletedDate" timestamp without time zone,
    "onboardingNotes" character varying,
    "contractSignedDate" timestamp without time zone,
    "goLiveDate" timestamp without time zone,
    "accountManager" character varying,
    "billingContact" character varying,
    "technicalContact" character varying,
    "contactPerson" character varying,
    city character varying,
    region character varying,
    country character varying,
    "assigneeIds" text,
    email character varying,
    remark character varying,
    "alternatePhoneNumber" character varying,
    "teamId" uuid,
    "createdBy" uuid
);


-- ALTER TABLE public.accounts OWNER TO postgres;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.activities OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: contacts; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.contacts OWNER TO postgres;

--
-- Name: contracts; Type: TABLE; Schema: public; Owner: postgres
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
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


-- ALTER TABLE public.contracts OWNER TO postgres;

--
-- Name: countries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.countries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(2) NOT NULL,
    name character varying NOT NULL,
    region character varying
);


-- ALTER TABLE public.countries OWNER TO postgres;

--
-- Name: email_settings; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.email_settings OWNER TO postgres;

--
-- Name: entity_tags; Type: TABLE; Schema: public; Owner: crm_user
--

CREATE TABLE IF NOT EXISTS public.entity_tags (
    entitytype character varying(50) NOT NULL,
    entityid uuid NOT NULL,
    tagid uuid NOT NULL
);


-- ALTER TABLE public.entity_tags OWNER TO crm_user;

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
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
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


-- ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: followup_entries; Type: TABLE; Schema: public; Owner: crm_user
--

CREATE TABLE IF NOT EXISTS public.followup_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "visitId" uuid NOT NULL,
    notes text,
    "followupDate" timestamp without time zone,
    completed boolean DEFAULT false,
    "createdById" uuid,
    "createdAt" timestamp without time zone DEFAULT now()
);


-- ALTER TABLE public.followup_entries OWNER TO crm_user;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
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
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


-- ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: leads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.leads (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "firstName" character varying NOT NULL,
    "lastName" character varying NOT NULL,
    email character varying NOT NULL,
    "phoneNumber" character varying,
    company character varying,
    "jobTitle" character varying,
    source character varying,
    status character varying DEFAULT 'Open'::character varying NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    "ownerId" uuid NOT NULL,
    "accountId" uuid NOT NULL,
    tags character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    value numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    "expectedCloseDate" timestamp without time zone,
    "productId" character varying,
    "productName" character varying,
    "lostReason" character varying,
    remark text,
    "productIds" text,
    "productNames" text,
    "businessVolume" numeric(15,2),
    "supplierList" text,
    region character varying,
    country character varying,
    "assigneeIds" text
);


-- ALTER TABLE public.leads OWNER TO postgres;

--
-- Name: line_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.line_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "productName" character varying NOT NULL,
    quantity integer NOT NULL,
    "unitPrice" numeric(15,2) NOT NULL,
    discount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    "discountPercent" numeric(15,2),
    description character varying,
    "opportunityId" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "productId" character varying
);


-- ALTER TABLE public.line_items OWNER TO postgres;

--
-- Name: login_security; Type: TABLE; Schema: public; Owner: crm_user
--

CREATE TABLE IF NOT EXISTS public.login_security (
    "userId" character varying NOT NULL,
    "failedAttempts" integer DEFAULT 0 NOT NULL,
    "lockoutUntil" timestamp without time zone,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


-- ALTER TABLE public.login_security OWNER TO crm_user;

--
-- Name: notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.notes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    content text NOT NULL,
    "resourceType" character varying NOT NULL,
    "resourceId" character varying NOT NULL,
    "createdById" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


-- ALTER TABLE public.notes OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
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
    "recipientId" uuid
);


-- ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: opportunities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.opportunities (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    amount numeric(15,2) NOT NULL,
    stage character varying DEFAULT 'Prospecting'::character varying NOT NULL,
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
    "businessVolume" numeric(15,2),
    "supplierList" text,
    region character varying,
    country character varying,
    company character varying,
    "contactPerson" character varying,
    "contactEmail" character varying,
    "contactPhone" character varying,
    "jobTitle" character varying,
    source character varying,
    remark text,
    "convertedFromLeadId" character varying,
    "assigneeIds" text
);


-- ALTER TABLE public.opportunities OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    module character varying NOT NULL,
    action character varying NOT NULL,
    description character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    scope character varying DEFAULT 'all'::character varying
);


-- ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: product_categories; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.product_categories OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
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
    "categoryId" uuid
);


-- ALTER TABLE public.products OWNER TO postgres;

--
-- Name: project_milestones; Type: TABLE; Schema: public; Owner: postgres
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
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


-- ALTER TABLE public.project_milestones OWNER TO postgres;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
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
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


-- ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: revoked_tokens; Type: TABLE; Schema: public; Owner: crm_user
--

CREATE TABLE IF NOT EXISTS public.revoked_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "tokenHash" character varying NOT NULL,
    "userId" character varying,
    "expiresAt" timestamp without time zone NOT NULL,
    "revokedAt" timestamp without time zone DEFAULT now() NOT NULL
);


-- ALTER TABLE public.revoked_tokens OWNER TO crm_user;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.role_permissions (
    "roleId" uuid NOT NULL,
    "permissionId" uuid NOT NULL
);


-- ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    description character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


-- ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: sales_visits; Type: TABLE; Schema: public; Owner: postgres
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
    "followupCompleted" boolean DEFAULT false NOT NULL,
    "followupNotes" text
);


-- ALTER TABLE public.sales_visits OWNER TO postgres;

--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: postgres
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
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


-- ALTER TABLE public.suppliers OWNER TO postgres;

--
-- Name: tags; Type: TABLE; Schema: public; Owner: crm_user
--

CREATE TABLE IF NOT EXISTS public.tags (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    color character varying(7),
    description text,
    createdat timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


-- ALTER TABLE public.tags OWNER TO crm_user;

--
-- Name: team_supervisors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.team_supervisors (
    "userId" uuid NOT NULL,
    "teamId" uuid NOT NULL
);


-- ALTER TABLE public.team_supervisors OWNER TO postgres;

--
-- Name: teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.teams (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    description character varying,
    "parentTeamId" uuid,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


-- ALTER TABLE public.teams OWNER TO postgres;

--
-- Name: tickets; Type: TABLE; Schema: public; Owner: postgres
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
    "moduleType" public.tickets_moduletype_enum,
    "attachmentPaths" text
);


-- ALTER TABLE public.tickets OWNER TO postgres;

--
-- Name: user_teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.user_teams (
    "userId" uuid NOT NULL,
    "teamId" uuid NOT NULL
);


-- ALTER TABLE public.user_teams OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying NOT NULL,
    password character varying NOT NULL,
    "firstName" character varying NOT NULL,
    "lastName" character varying NOT NULL,
    "phoneNumber" character varying,
    "isActive" boolean DEFAULT true NOT NULL,
    "roleId" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "resetToken" character varying,
    "resetTokenExpiry" timestamp without time zone,
    "hasChangedPasswordOnFirstLogin" boolean DEFAULT false NOT NULL,
    "passwordChangedAt" timestamp without time zone,
    "emailNotificationsEnabled" boolean DEFAULT true NOT NULL,
    "emailNotificationPreferences" text DEFAULT '{}'::text NOT NULL,
    "teamId" uuid
);


-- ALTER TABLE public.users OWNER TO postgres;

--
-- Name: products PK_0806c755e0aca124e67c0cf6d7d; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.products
    ADD CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY (id);


--
-- Name: project_milestones PK_0c561300a12c6ba3ad793dff4b8; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT "PK_0c561300a12c6ba3ad793dff4b8" PRIMARY KEY (id);


--
-- Name: payments PK_197ab7af18c93fbb0c9b28b4a59; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY (id);


--
-- Name: audit_logs PK_1bb179d048bbc581caa3b013439; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY (id);


--
-- Name: contracts PK_2c7b8f3a7b1acdd49497d83d0fb; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT "PK_2c7b8f3a7b1acdd49497d83d0fb" PRIMARY KEY (id);


--
-- Name: tickets PK_343bc942ae261cf7a1377f48fd0; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "PK_343bc942ae261cf7a1377f48fd0" PRIMARY KEY (id);


--
-- Name: opportunities PK_4bd9cd12ddc0ff48a5a97ddebce; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT "PK_4bd9cd12ddc0ff48a5a97ddebce" PRIMARY KEY (id);


--
-- Name: accounts PK_5a7a02c20412299d198e097a8fe; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY (id);


--
-- Name: projects PK_6271df0a7aed1d6c0691ce6ac50; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.projects
    ADD CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY (id);


--
-- Name: invoices PK_668cef7c22a427fd822cc1be3ce; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY (id);


--
-- Name: notifications PK_6a72c3c0f683f6462415e653c3a; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY (id);


--
-- Name: line_items PK_6d227c876e374542dc9bb44dfb4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.line_items
    ADD CONSTRAINT "PK_6d227c876e374542dc9bb44dfb4" PRIMARY KEY (id);


--
-- Name: sales_visits PK_74af0ac5b6b4d85beb204871f1f; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.sales_visits
    ADD CONSTRAINT "PK_74af0ac5b6b4d85beb204871f1f" PRIMARY KEY (id);


--
-- Name: activities PK_7f4004429f731ffb9c88eb486a8; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.activities
    ADD CONSTRAINT "PK_7f4004429f731ffb9c88eb486a8" PRIMARY KEY (id);


--
-- Name: permissions PK_920331560282b8bd21bb02290df; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY (id);


--
-- Name: expenses PK_94c3ceb17e3140abc9282c20610; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "PK_94c3ceb17e3140abc9282c20610" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: notes PK_af6206538ea96c4e77e9f400c3d; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.notes
    ADD CONSTRAINT "PK_af6206538ea96c4e77e9f400c3d" PRIMARY KEY (id);


--
-- Name: countries PK_b2d7006793e8697ab3ae2deff18; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.countries
    ADD CONSTRAINT "PK_b2d7006793e8697ab3ae2deff18" PRIMARY KEY (id);


--
-- Name: suppliers PK_b70ac51766a9e3144f778cfe81e; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT "PK_b70ac51766a9e3144f778cfe81e" PRIMARY KEY (id);


--
-- Name: contacts PK_b99cd40cfd66a99f1571f4f72e6; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT "PK_b99cd40cfd66a99f1571f4f72e6" PRIMARY KEY (id);


--
-- Name: roles PK_c1433d71a4838793a49dcad46ab; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.roles
    ADD CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY (id);


--
-- Name: leads PK_cd102ed7a9a4ca7d4d8bfeba406; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.leads
    ADD CONSTRAINT "PK_cd102ed7a9a4ca7d4d8bfeba406" PRIMARY KEY (id);


--
-- Name: email_settings PK_d363efbb6aa1c747440c0ec24f4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.email_settings
    ADD CONSTRAINT "PK_d363efbb6aa1c747440c0ec24f4" PRIMARY KEY (id);


--
-- Name: role_permissions PK_d430a02aad006d8a70f3acd7d03; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "PK_d430a02aad006d8a70f3acd7d03" PRIMARY KEY ("roleId", "permissionId");


--
-- Name: accounts UQ_2db43cdbf7bb862e577b5f540c8; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "UQ_2db43cdbf7bb862e577b5f540c8" UNIQUE (name);


--
-- Name: contracts UQ_375897948211b379ad8726c5e63; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT "UQ_375897948211b379ad8726c5e63" UNIQUE ("contractNumber");


--
-- Name: suppliers UQ_5b5720d9645cee7396595a16c93; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT "UQ_5b5720d9645cee7396595a16c93" UNIQUE (name);


--
-- Name: roles UQ_648e3f5447f725579d7d4ffdfb7; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.roles
    ADD CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE (name);


--
-- Name: contacts UQ_752866c5247ddd34fd05559537d; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT "UQ_752866c5247ddd34fd05559537d" UNIQUE (email);


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: leads UQ_b3eea7add0e16594dba102716c5; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.leads
    ADD CONSTRAINT "UQ_b3eea7add0e16594dba102716c5" UNIQUE (email);


--
-- Name: countries UQ_b47cbb5311bad9c9ae17b8c1eda; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.countries
    ADD CONSTRAINT "UQ_b47cbb5311bad9c9ae17b8c1eda" UNIQUE (code);


--
-- Name: invoices UQ_bf8e0f9dd4558ef209ec111782d; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "UQ_bf8e0f9dd4558ef209ec111782d" UNIQUE ("invoiceNumber");


--
-- Name: products UQ_c44ac33a05b144dd0d9ddcf9327; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.products
    ADD CONSTRAINT "UQ_c44ac33a05b144dd0d9ddcf9327" UNIQUE (sku);


--
-- Name: tickets UQ_e99bd0f51b92896fdaf99ebb715; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "UQ_e99bd0f51b92896fdaf99ebb715" UNIQUE ("ticketNumber");


--
-- Name: accounts UQ_ee66de6cdc53993296d1ceb8aa0; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "UQ_ee66de6cdc53993296d1ceb8aa0" UNIQUE (email);


--
-- Name: countries UQ_fa1376321185575cf2226b1491d; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.countries
    ADD CONSTRAINT "UQ_fa1376321185575cf2226b1491d" UNIQUE (name);


--
-- Name: account_teams account_teams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.account_teams
    ADD CONSTRAINT account_teams_pkey PRIMARY KEY ("accountId", "teamId");


--
-- Name: entity_tags entity_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: crm_user
--

-- ALTER TABLE ONLY public.entity_tags
    ADD CONSTRAINT entity_tags_pkey PRIMARY KEY (entitytype, entityid, tagid);


--
-- Name: followup_entries followup_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: crm_user
--

-- ALTER TABLE ONLY public.followup_entries
    ADD CONSTRAINT followup_entries_pkey PRIMARY KEY (id);


--
-- Name: login_security login_security_pkey; Type: CONSTRAINT; Schema: public; Owner: crm_user
--

-- ALTER TABLE ONLY public.login_security
    ADD CONSTRAINT login_security_pkey PRIMARY KEY ("userId");


--
-- Name: product_categories product_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_pkey PRIMARY KEY (id);


--
-- Name: revoked_tokens revoked_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: crm_user
--

-- ALTER TABLE ONLY public.revoked_tokens
    ADD CONSTRAINT revoked_tokens_pkey PRIMARY KEY (id);


--
-- Name: tags tags_name_key; Type: CONSTRAINT; Schema: public; Owner: crm_user
--

-- ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_name_key UNIQUE (name);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: crm_user
--

-- ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: team_supervisors team_supervisors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.team_supervisors
    ADD CONSTRAINT team_supervisors_pkey PRIMARY KEY ("userId", "teamId");


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: user_teams user_teams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.user_teams
    ADD CONSTRAINT user_teams_pkey PRIMARY KEY ("userId", "teamId");


--
-- Name: IDX_06792d0c62ce6b0203c03643cd; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX IF NOT EXISTS "IDX_06792d0c62ce6b0203c03643cd" ON public.role_permissions USING btree ("permissionId");


--
-- Name: IDX_13c69424c440a0e765053feb4b; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX IF NOT EXISTS "IDX_13c69424c440a0e765053feb4b" ON public.audit_logs USING btree ("entityType", "entityId");


--
-- Name: IDX_831a5a06f879fb0bebf8965871; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX IF NOT EXISTS "IDX_831a5a06f879fb0bebf8965871" ON public.notifications USING btree ("createdAt");


--
-- Name: IDX_8ba28344602d583583b9ea1a50; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX IF NOT EXISTS "IDX_8ba28344602d583583b9ea1a50" ON public.notifications USING btree ("isRead");


--
-- Name: IDX_b4599f8b8f548d35850afa2d12; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX IF NOT EXISTS "IDX_b4599f8b8f548d35850afa2d12" ON public.role_permissions USING btree ("roleId");


--
-- Name: IDX_c69efb19bf127c97e6740ad530; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX IF NOT EXISTS "IDX_c69efb19bf127c97e6740ad530" ON public.audit_logs USING btree ("createdAt");


--
-- Name: idx_account_teams_account; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX IF NOT EXISTS idx_account_teams_account ON public.account_teams USING btree ("accountId");


--
-- Name: idx_account_teams_team; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX IF NOT EXISTS idx_account_teams_team ON public.account_teams USING btree ("teamId");


--
-- Name: idx_accounts_team; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX IF NOT EXISTS idx_accounts_team ON public.accounts USING btree ("teamId");


--
-- Name: idx_followup_entries_visit; Type: INDEX; Schema: public; Owner: crm_user
--

CREATE INDEX IF NOT EXISTS idx_followup_entries_visit ON public.followup_entries USING btree ("visitId");


--
-- Name: idx_product_categories_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_product_categories_code ON public.product_categories USING btree (code) WHERE (code IS NOT NULL);


--
-- Name: idx_product_categories_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_product_categories_name ON public.product_categories USING btree (name);


--
-- Name: idx_products_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products USING btree ("categoryId");


--
-- Name: idx_revoked_tokens_expires; Type: INDEX; Schema: public; Owner: crm_user
--

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON public.revoked_tokens USING btree ("expiresAt");


--
-- Name: idx_revoked_tokens_hash; Type: INDEX; Schema: public; Owner: crm_user
--

CREATE UNIQUE INDEX idx_revoked_tokens_hash ON public.revoked_tokens USING btree ("tokenHash");


--
-- Name: idx_team_supervisors_team; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX IF NOT EXISTS idx_team_supervisors_team ON public.team_supervisors USING btree ("teamId");


--
-- Name: idx_team_supervisors_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX IF NOT EXISTS idx_team_supervisors_user ON public.team_supervisors USING btree ("userId");


--
-- Name: idx_teams_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX IF NOT EXISTS idx_teams_parent ON public.teams USING btree ("parentTeamId");


--
-- Name: idx_user_teams_team; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX IF NOT EXISTS idx_user_teams_team ON public.user_teams USING btree ("teamId");


--
-- Name: idx_user_teams_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX IF NOT EXISTS idx_user_teams_user ON public.user_teams USING btree ("userId");


--
-- Name: idx_users_team; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX IF NOT EXISTS idx_users_team ON public.users USING btree ("teamId");


--
-- Name: opportunities FK_0487ff0859e04aecaa9e9a913d0; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT "FK_0487ff0859e04aecaa9e9a913d0" FOREIGN KEY ("primaryContactId") REFERENCES public.contacts(id);


--
-- Name: role_permissions FK_06792d0c62ce6b0203c03643cdd; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "FK_06792d0c62ce6b0203c03643cdd" FOREIGN KEY ("permissionId") REFERENCES public.permissions(id);


--
-- Name: contracts FK_18cbf0097753ef0065d75ec0cb8; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT "FK_18cbf0097753ef0065d75ec0cb8" FOREIGN KEY ("opportunityId") REFERENCES public.opportunities(id);


--
-- Name: projects FK_1fa4a36bc7ea7727a1ff25be92f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.projects
    ADD CONSTRAINT "FK_1fa4a36bc7ea7727a1ff25be92f" FOREIGN KEY ("projectManagerId") REFERENCES public.users(id);


--
-- Name: invoices FK_20d900c6b7f2de7faa4d214d64d; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "FK_20d900c6b7f2de7faa4d214d64d" FOREIGN KEY ("projectId") REFERENCES public.projects(id);


--
-- Name: sales_visits FK_2585d1c1190a3c18da32302c59c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.sales_visits
    ADD CONSTRAINT "FK_2585d1c1190a3c18da32302c59c" FOREIGN KEY ("accountId") REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: accounts FK_2cb7f7a1dc3b84c8cde2b930944; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "FK_2cb7f7a1dc3b84c8cde2b930944" FOREIGN KEY ("ownerId") REFERENCES public.users(id);


--
-- Name: contracts FK_34aa224c8a6e62621f5c4988522; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT "FK_34aa224c8a6e62621f5c4988522" FOREIGN KEY ("createdById") REFERENCES public.users(id);


--
-- Name: users FK_368e146b785b574f42ae9e53d5e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.users
    ADD CONSTRAINT "FK_368e146b785b574f42ae9e53d5e" FOREIGN KEY ("roleId") REFERENCES public.roles(id);


--
-- Name: projects FK_3f20b08797133f636a6af39fc55; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.projects
    ADD CONSTRAINT "FK_3f20b08797133f636a6af39fc55" FOREIGN KEY ("accountId") REFERENCES public.accounts(id);


--
-- Name: invoices FK_42d017ec6c4a79ea33cbe9dbfba; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "FK_42d017ec6c4a79ea33cbe9dbfba" FOREIGN KEY ("contractId") REFERENCES public.contracts(id);


--
-- Name: payments FK_43d19956aeab008b49e0804c145; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "FK_43d19956aeab008b49e0804c145" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: tickets FK_4f127f7c92139971ec4cbbe0bd5; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "FK_4f127f7c92139971ec4cbbe0bd5" FOREIGN KEY ("assigneeId") REFERENCES public.users(id);


--
-- Name: invoices FK_517b74001b457b209d95e4352e6; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "FK_517b74001b457b209d95e4352e6" FOREIGN KEY ("accountId") REFERENCES public.accounts(id);


--
-- Name: expenses FK_52d3a5654f747793e6048e55bb6; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "FK_52d3a5654f747793e6048e55bb6" FOREIGN KEY ("approvedById") REFERENCES public.users(id);


--
-- Name: contacts FK_5363bc1655a7339414523a02fd4; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT "FK_5363bc1655a7339414523a02fd4" FOREIGN KEY ("accountId") REFERENCES public.accounts(id);


--
-- Name: line_items FK_53e425e79128eb598687d9cd0e4; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.line_items
    ADD CONSTRAINT "FK_53e425e79128eb598687d9cd0e4" FOREIGN KEY ("opportunityId") REFERENCES public.opportunities(id) ON DELETE CASCADE;


--
-- Name: activities FK_579056df0c92b0f6432e96b2048; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.activities
    ADD CONSTRAINT "FK_579056df0c92b0f6432e96b2048" FOREIGN KEY ("createdById") REFERENCES public.users(id);


--
-- Name: projects FK_5e0067b69b5325d34bf33503252; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.projects
    ADD CONSTRAINT "FK_5e0067b69b5325d34bf33503252" FOREIGN KEY ("contractId") REFERENCES public.contracts(id);


--
-- Name: leads FK_62e3c834894c2c2da4023718aa9; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.leads
    ADD CONSTRAINT "FK_62e3c834894c2c2da4023718aa9" FOREIGN KEY ("accountId") REFERENCES public.accounts(id);


--
-- Name: tickets FK_7b38d2bacd0eff4228449136f71; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "FK_7b38d2bacd0eff4228449136f71" FOREIGN KEY ("contactId") REFERENCES public.contacts(id);


--
-- Name: opportunities FK_95c92b4ade0ed9ba50ba00b312c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT "FK_95c92b4ade0ed9ba50ba00b312c" FOREIGN KEY ("accountId") REFERENCES public.accounts(id);


--
-- Name: project_milestones FK_9fb847267f120c4cdbbb28b408b; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT "FK_9fb847267f120c4cdbbb28b408b" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: email_settings FK_a60045d50ed862b9a515d0c0b8e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.email_settings
    ADD CONSTRAINT "FK_a60045d50ed862b9a515d0c0b8e" FOREIGN KEY ("updatedById") REFERENCES public.users(id);


--
-- Name: account_teams FK_account_teams_account; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.account_teams
    ADD CONSTRAINT "FK_account_teams_account" FOREIGN KEY ("accountId") REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: account_teams FK_account_teams_team; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.account_teams
    ADD CONSTRAINT "FK_account_teams_team" FOREIGN KEY ("teamId") REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: accounts FK_accounts_team; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "FK_accounts_team" FOREIGN KEY ("teamId") REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: tickets FK_ae9b43f5037786810fcfbb4e632; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "FK_ae9b43f5037786810fcfbb4e632" FOREIGN KEY ("accountId") REFERENCES public.accounts(id);


--
-- Name: tickets FK_b1930f86a5e9b5b5be3689fc820; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "FK_b1930f86a5e9b5b5be3689fc820" FOREIGN KEY ("reporterId") REFERENCES public.users(id);


--
-- Name: role_permissions FK_b4599f8b8f548d35850afa2d12c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "FK_b4599f8b8f548d35850afa2d12c" FOREIGN KEY ("roleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expenses FK_c1495dd5777eaeea92b8a21843e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "FK_c1495dd5777eaeea92b8a21843e" FOREIGN KEY ("ownerId") REFERENCES public.users(id);


--
-- Name: opportunities FK_cc51e62c9dfa9d01661bc4a4e9c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT "FK_cc51e62c9dfa9d01661bc4a4e9c" FOREIGN KEY ("ownerId") REFERENCES public.users(id);


--
-- Name: contracts FK_cea24c405eca7df888febed0dba; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT "FK_cea24c405eca7df888febed0dba" FOREIGN KEY ("accountId") REFERENCES public.accounts(id);


--
-- Name: project_milestones FK_cf110dea57fce0159c273fca17f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT "FK_cf110dea57fce0159c273fca17f" FOREIGN KEY ("responsibleUserId") REFERENCES public.users(id);


--
-- Name: audit_logs FK_cfa83f61e4d27a87fcae1e025ab; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "FK_cfa83f61e4d27a87fcae1e025ab" FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: sales_visits FK_d5b7219ca9ac5ac508ffcfe842b; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.sales_visits
    ADD CONSTRAINT "FK_d5b7219ca9ac5ac508ffcfe842b" FOREIGN KEY ("createdById") REFERENCES public.users(id);


--
-- Name: leads FK_d673803d4443e1bfe47d11c45be; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.leads
    ADD CONSTRAINT "FK_d673803d4443e1bfe47d11c45be" FOREIGN KEY ("ownerId") REFERENCES public.users(id);


--
-- Name: notifications FK_db873ba9a123711a4bff527ccd5; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_db873ba9a123711a4bff527ccd5" FOREIGN KEY ("recipientId") REFERENCES public.users(id);


--
-- Name: notes FK_f2a1f6264b833a0b7db37757952; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.notes
    ADD CONSTRAINT "FK_f2a1f6264b833a0b7db37757952" FOREIGN KEY ("createdById") REFERENCES public.users(id);


--
-- Name: team_supervisors FK_team_supervisors_team; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.team_supervisors
    ADD CONSTRAINT "FK_team_supervisors_team" FOREIGN KEY ("teamId") REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_supervisors FK_team_supervisors_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.team_supervisors
    ADD CONSTRAINT "FK_team_supervisors_user" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: teams FK_teams_parent; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.teams
    ADD CONSTRAINT "FK_teams_parent" FOREIGN KEY ("parentTeamId") REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: user_teams FK_user_teams_team; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.user_teams
    ADD CONSTRAINT "FK_user_teams_team" FOREIGN KEY ("teamId") REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: user_teams FK_user_teams_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.user_teams
    ADD CONSTRAINT "FK_user_teams_user" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users FK_users_team; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.users
    ADD CONSTRAINT "FK_users_team" FOREIGN KEY ("teamId") REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: accounts fk_accounts_created_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT fk_accounts_created_by FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: entity_tags fk_entity_tag_tag; Type: FK CONSTRAINT; Schema: public; Owner: crm_user
--

-- ALTER TABLE ONLY public.entity_tags
    ADD CONSTRAINT fk_entity_tag_tag FOREIGN KEY (tagid) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: products fk_products_category; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_products_category FOREIGN KEY ("categoryId") REFERENCES public.product_categories(id) ON DELETE SET NULL;


--
-- Name: followup_entries followup_entries_visitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: crm_user
--

-- ALTER TABLE ONLY public.followup_entries
    ADD CONSTRAINT "followup_entries_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES public.sales_visits(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO crm_user;


--
-- Name: TABLE account_teams; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.account_teams TO crm_user;


--
-- Name: TABLE accounts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.accounts TO crm_user;


--
-- Name: TABLE activities; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.activities TO crm_user;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_logs TO crm_user;


--
-- Name: TABLE contacts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.contacts TO crm_user;


--
-- Name: TABLE contracts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.contracts TO crm_user;


--
-- Name: TABLE countries; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.countries TO crm_user;


--
-- Name: TABLE email_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.email_settings TO crm_user;


--
-- Name: TABLE expenses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.expenses TO crm_user;


--
-- Name: TABLE invoices; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.invoices TO crm_user;


--
-- Name: TABLE leads; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.leads TO crm_user;


--
-- Name: TABLE line_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.line_items TO crm_user;


--
-- Name: TABLE notes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notes TO crm_user;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notifications TO crm_user;


--
-- Name: TABLE opportunities; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.opportunities TO crm_user;


--
-- Name: TABLE payments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payments TO crm_user;


--
-- Name: TABLE permissions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.permissions TO crm_user;


--
-- Name: TABLE product_categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.product_categories TO crm_user;


--
-- Name: TABLE products; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.products TO crm_user;


--
-- Name: TABLE project_milestones; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.project_milestones TO crm_user;


--
-- Name: TABLE projects; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.projects TO crm_user;


--
-- Name: TABLE role_permissions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.role_permissions TO crm_user;


--
-- Name: TABLE roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.roles TO crm_user;


--
-- Name: TABLE sales_visits; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sales_visits TO crm_user;


--
-- Name: TABLE suppliers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.suppliers TO crm_user;


--
-- Name: TABLE team_supervisors; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.team_supervisors TO crm_user;


--
-- Name: TABLE teams; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.teams TO crm_user;


--
-- Name: TABLE tickets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tickets TO crm_user;


--
-- Name: TABLE user_teams; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_teams TO crm_user;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO crm_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO crm_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO crm_user;


--
-- PostgreSQL database dump complete
--

\unrestrict 7RwBT3wT80TjyCmUIP6fGgcIDRrpWfIFIotj5HEihR1RFAhDEwzbQ2GGFLXv7OM

