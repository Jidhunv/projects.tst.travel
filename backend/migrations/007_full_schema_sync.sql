-- 007: Full idempotent schema sync.
-- Ensures every table and column the entity models expect exists. Additive
-- only: CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS, never drops.
-- Generated from the reference schema. Safe to run repeatedly and on any DB.
-- Run against the database the BACKEND uses (check backend/.env DB_* values):
--   psql -U <DB_USERNAME> -h <DB_HOST> -p <DB_PORT> -d <DB_NAME> -f 007_full_schema_sync.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============ accounts ============
CREATE TABLE IF NOT EXISTS "accounts" ();
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() NOT NULL;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "name" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "industry" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "size" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "website" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "phoneNumber" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "type" character varying DEFAULT 'Prospect'::character varying NOT NULL;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "status" character varying DEFAULT 'Prospect'::character varying NOT NULL;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "ownerId" uuid;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "billingStreet" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "billingCity" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "billingState" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "billingZip" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "billingCountry" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "shippingStreet" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "shippingCity" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "shippingState" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "shippingZip" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "shippingCountry" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "tags" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "onboardingStatus" character varying DEFAULT 'Not Started'::character varying NOT NULL;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "onboardingDate" timestamp without time zone;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "onboardingCompletedDate" timestamp without time zone;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "onboardingNotes" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "contractSignedDate" timestamp without time zone;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "goLiveDate" timestamp without time zone;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "accountManager" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "billingContact" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "technicalContact" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "contactPerson" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "city" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "region" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "country" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "assigneeIds" text;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "email" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "remark" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "alternatePhoneNumber" character varying;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"accounts"'::regclass AND contype='p') THEN
    ALTER TABLE "accounts" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ activities ============
CREATE TABLE IF NOT EXISTS "activities" ();
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() NOT NULL;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "type" character varying;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "title" character varying;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "resourceType" character varying;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "resourceId" character varying;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "createdById" uuid;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "dueDate" timestamp without time zone;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "isCompleted" boolean DEFAULT false NOT NULL;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "completedAt" timestamp without time zone;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone DEFAULT now() NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"activities"'::regclass AND contype='p') THEN
    ALTER TABLE "activities" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ audit_logs ============
CREATE TABLE IF NOT EXISTS "audit_logs" ();
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() NOT NULL;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "entityType" character varying;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "entityId" character varying;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "action" audit_logs_action_enum;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "oldValues" jsonb;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "newValues" jsonb;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "ipAddress" character varying;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "userAgent" character varying;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "description" character varying;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "userId" uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"audit_logs"'::regclass AND contype='p') THEN
    ALTER TABLE "audit_logs" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ contacts ============
CREATE TABLE IF NOT EXISTS "contacts" ();
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() NOT NULL;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "firstName" character varying;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "lastName" character varying;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "email" character varying;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "phoneNumber" character varying;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "jobTitle" character varying;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "role" character varying;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "isPrimary" boolean DEFAULT false NOT NULL;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "accountId" uuid;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "reportsTo" character varying;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "linkedinUrl" character varying;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "birthday" timestamp without time zone;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone DEFAULT now() NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"contacts"'::regclass AND contype='p') THEN
    ALTER TABLE "contacts" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ contracts ============
CREATE TABLE IF NOT EXISTS "contracts" ();
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() NOT NULL;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "contractNumber" character varying;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "title" character varying;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "type" character varying;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "value" numeric(15,2);
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "startDate" timestamp without time zone;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "endDate" timestamp without time zone;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "renewalDate" timestamp without time zone;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "paymentTerms" character varying;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "slaTerms" text;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "status" character varying DEFAULT 'Draft'::character varying NOT NULL;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "approvedBy" character varying;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "approvedDate" timestamp without time zone;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "documentPath" character varying;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "remarks" text;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "accountId" uuid;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "opportunityId" uuid;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "createdById" uuid;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone DEFAULT now() NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"contracts"'::regclass AND contype='p') THEN
    ALTER TABLE "contracts" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ countries ============
CREATE TABLE IF NOT EXISTS "countries" ();
ALTER TABLE "countries" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() NOT NULL;
ALTER TABLE "countries" ADD COLUMN IF NOT EXISTS "code" character varying(2);
ALTER TABLE "countries" ADD COLUMN IF NOT EXISTS "name" character varying;
ALTER TABLE "countries" ADD COLUMN IF NOT EXISTS "region" character varying;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"countries"'::regclass AND contype='p') THEN
    ALTER TABLE "countries" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ email_settings ============
CREATE TABLE IF NOT EXISTS "email_settings" ();
ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() NOT NULL;
ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "smtpHost" character varying(255);
ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "smtpPort" integer;
ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "smtpUser" character varying(255);
ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "smtpPassword" character varying(255);
ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "fromEmail" character varying(255);
ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "fromName" character varying(255);
ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "isConfigured" boolean DEFAULT false NOT NULL;
ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "enableNotifications" boolean DEFAULT true NOT NULL;
ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "updatedById" uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"email_settings"'::regclass AND contype='p') THEN
    ALTER TABLE "email_settings" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ entity_tags ============
CREATE TABLE IF NOT EXISTS "entity_tags" ();
ALTER TABLE "entity_tags" ADD COLUMN IF NOT EXISTS "entitytype" character varying(50);
ALTER TABLE "entity_tags" ADD COLUMN IF NOT EXISTS "entityid" uuid;
ALTER TABLE "entity_tags" ADD COLUMN IF NOT EXISTS "tagid" uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"entity_tags"'::regclass AND contype='p') THEN
    ALTER TABLE "entity_tags" ADD PRIMARY KEY ("tagid", "entityid", "entitytype");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ expenses ============
CREATE TABLE IF NOT EXISTS "expenses" ();
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() NOT NULL;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "location" character varying;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "days" integer DEFAULT 1 NOT NULL;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "accountIds" text;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "companyNames" text;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "travelCost" numeric(15,2) DEFAULT '0'::numeric NOT NULL;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "reason" text;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "status" character varying DEFAULT 'Pending'::character varying NOT NULL;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "approvedById" uuid;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "approvedAt" timestamp without time zone;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "approvalNotes" text;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "ownerId" uuid;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone DEFAULT now() NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"expenses"'::regclass AND contype='p') THEN
    ALTER TABLE "expenses" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ followup_entries ============
CREATE TABLE IF NOT EXISTS "followup_entries" ();
ALTER TABLE "followup_entries" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "followup_entries" ADD COLUMN IF NOT EXISTS "visitId" uuid;
ALTER TABLE "followup_entries" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "followup_entries" ADD COLUMN IF NOT EXISTS "followupDate" timestamp without time zone;
ALTER TABLE "followup_entries" ADD COLUMN IF NOT EXISTS "completed" boolean DEFAULT false;
ALTER TABLE "followup_entries" ADD COLUMN IF NOT EXISTS "createdById" uuid;
ALTER TABLE "followup_entries" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone DEFAULT now();
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"followup_entries"'::regclass AND contype='p') THEN
    ALTER TABLE "followup_entries" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ invoices ============
CREATE TABLE IF NOT EXISTS "invoices" ();
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() NOT NULL;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "invoiceNumber" character varying;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "contractId" uuid;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "projectId" uuid;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "accountId" uuid;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "amount" numeric(15,2);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "tax" numeric(15,2) DEFAULT '0'::numeric NOT NULL;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "totalAmount" numeric(15,2);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "invoiceDate" timestamp without time zone;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "dueDate" timestamp without time zone;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "status" character varying DEFAULT 'Draft'::character varying NOT NULL;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "billingCycle" character varying DEFAULT 'Monthly'::character varying NOT NULL;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "documentPath" character varying;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone DEFAULT now() NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"invoices"'::regclass AND contype='p') THEN
    ALTER TABLE "invoices" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ leads ============
CREATE TABLE IF NOT EXISTS "leads" ();
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() NOT NULL;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "firstName" character varying;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lastName" character varying;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "email" character varying;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "phoneNumber" character varying;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "company" character varying;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "jobTitle" character varying;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "source" character varying;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "status" character varying DEFAULT 'Open'::character varying NOT NULL;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "score" integer DEFAULT 0 NOT NULL;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "ownerId" uuid;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "accountId" uuid;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "tags" character varying;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "value" numeric(15,2) DEFAULT '0'::numeric NOT NULL;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "expectedCloseDate" timestamp without time zone;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "productId" character varying;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "productName" character varying;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lostReason" character varying;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "remark" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "productIds" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "productNames" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "businessVolume" numeric(15,2);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "supplierList" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "region" character varying;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "country" character varying;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "assigneeIds" text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"leads"'::regclass AND contype='p') THEN
    ALTER TABLE "leads" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ line_items ============
CREATE TABLE IF NOT EXISTS "line_items" ();
ALTER TABLE "line_items" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() NOT NULL;
ALTER TABLE "line_items" ADD COLUMN IF NOT EXISTS "productName" character varying;
ALTER TABLE "line_items" ADD COLUMN IF NOT EXISTS "quantity" integer;
ALTER TABLE "line_items" ADD COLUMN IF NOT EXISTS "unitPrice" numeric(15,2);
ALTER TABLE "line_items" ADD COLUMN IF NOT EXISTS "discount" numeric(15,2) DEFAULT '0'::numeric NOT NULL;
ALTER TABLE "line_items" ADD COLUMN IF NOT EXISTS "discountPercent" numeric(15,2);
ALTER TABLE "line_items" ADD COLUMN IF NOT EXISTS "description" character varying;
ALTER TABLE "line_items" ADD COLUMN IF NOT EXISTS "opportunityId" uuid;
ALTER TABLE "line_items" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "line_items" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "line_items" ADD COLUMN IF NOT EXISTS "productId" character varying;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"line_items"'::regclass AND contype='p') THEN
    ALTER TABLE "line_items" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ login_security ============
CREATE TABLE IF NOT EXISTS "login_security" ();
ALTER TABLE "login_security" ADD COLUMN IF NOT EXISTS "userId" character varying;
ALTER TABLE "login_security" ADD COLUMN IF NOT EXISTS "failedAttempts" integer DEFAULT 0 NOT NULL;
ALTER TABLE "login_security" ADD COLUMN IF NOT EXISTS "lockoutUntil" timestamp without time zone;
ALTER TABLE "login_security" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone DEFAULT now() NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"login_security"'::regclass AND contype='p') THEN
    ALTER TABLE "login_security" ADD PRIMARY KEY ("userId");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ notes ============
CREATE TABLE IF NOT EXISTS "notes" ();
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() NOT NULL;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "content" text;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "resourceType" character varying;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "resourceId" character varying;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "createdById" uuid;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone DEFAULT now() NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"notes"'::regclass AND contype='p') THEN
    ALTER TABLE "notes" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ notifications ============
CREATE TABLE IF NOT EXISTS "notifications" ();
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() NOT NULL;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "type" notifications_type_enum;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "title" character varying;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "message" text;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "relatedEntityType" character varying;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "relatedEntityId" character varying;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "relatedEntityName" character varying;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "isRead" boolean DEFAULT false NOT NULL;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "readAt" timestamp without time zone;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "actionUrl" character varying;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "actionLabel" character varying;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "recipientId" uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"notifications"'::regclass AND contype='p') THEN
    ALTER TABLE "notifications" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ opportunities ============
CREATE TABLE IF NOT EXISTS "opportunities" ();
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() NOT NULL;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "name" character varying;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "amount" numeric(15,2);
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "stage" character varying DEFAULT 'Prospecting'::character varying NOT NULL;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "status" character varying DEFAULT 'Open'::character varying NOT NULL;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "description" character varying;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "forecastedCloseDate" timestamp without time zone;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "probability" integer DEFAULT 0 NOT NULL;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "accountId" uuid;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "primaryContactId" uuid;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "ownerId" uuid;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "tags" character varying;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "closedAt" timestamp without time zone;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "closedReason" character varying;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "businessVolume" numeric(15,2);
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "supplierList" text;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "region" character varying;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "country" character varying;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "company" character varying;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "contactPerson" character varying;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "contactEmail" character varying;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "contactPhone" character varying;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "jobTitle" character varying;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "source" character varying;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "remark" text;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "convertedFromLeadId" character varying;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "assigneeIds" text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"opportunities"'::regclass AND contype='p') THEN
    ALTER TABLE "opportunities" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ payments ============
CREATE TABLE IF NOT EXISTS "payments" ();
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() NOT NULL;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "invoiceId" uuid;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "amount" numeric(15,2);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "paymentDate" timestamp without time zone;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "paymentMethod" character varying;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "transactionReference" character varying;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "remarks" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone DEFAULT now() NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"payments"'::regclass AND contype='p') THEN
    ALTER TABLE "payments" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ permissions ============
CREATE TABLE IF NOT EXISTS "permissions" ();
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() NOT NULL;
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "module" character varying;
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "action" character varying;
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "description" character varying;
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "scope" character varying DEFAULT 'all'::character varying;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"permissions"'::regclass AND contype='p') THEN
    ALTER TABLE "permissions" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ product_categories ============
CREATE TABLE IF NOT EXISTS "product_categories" ();
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "name" character varying;
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "description" character varying;
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "code" character varying;
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "isActive" boolean DEFAULT true NOT NULL;
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "displayOrder" integer DEFAULT 0 NOT NULL;
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone DEFAULT now() NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"product_categories"'::regclass AND contype='p') THEN
    ALTER TABLE "product_categories" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ products ============
CREATE TABLE IF NOT EXISTS "products" ();
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "name" character varying;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sku" character varying;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "unitPrice" numeric(15,2) DEFAULT '0'::numeric NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "billingType" character varying DEFAULT 'one-time'::character varying NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isActive" boolean DEFAULT true NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "categoryId" uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"products"'::regclass AND contype='p') THEN
    ALTER TABLE "products" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ project_milestones ============
CREATE TABLE IF NOT EXISTS "project_milestones" ();
ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() NOT NULL;
ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "projectId" uuid;
ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "milestoneType" character varying;
ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "milestoneName" character varying;
ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "completedDate" timestamp without time zone;
ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "completedTime" character varying;
ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "responsibleUserId" uuid;
ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "remarks" text;
ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "approvalStatus" character varying DEFAULT 'Pending'::character varying NOT NULL;
ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "approvedBy" character varying;
ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "approvedDate" timestamp without time zone;
ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone DEFAULT now() NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"project_milestones"'::regclass AND contype='p') THEN
    ALTER TABLE "project_milestones" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ projects ============
CREATE TABLE IF NOT EXISTS "projects" ();
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() NOT NULL;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "projectName" character varying;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "status" character varying DEFAULT 'Planning'::character varying NOT NULL;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "startDate" timestamp without time zone;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "endDate" timestamp without time zone;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "goLiveDate" timestamp without time zone;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "budget" numeric(15,2);
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "revenue" numeric(15,2) DEFAULT '0'::numeric NOT NULL;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "progressPercent" integer DEFAULT 0 NOT NULL;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "accountId" uuid;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "contractId" uuid;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "projectManagerId" uuid;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "isLoaded" boolean DEFAULT false NOT NULL;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "loadedDate" timestamp without time zone;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "loadedBy" character varying;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "demoConducted" boolean DEFAULT false NOT NULL;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "demoDate" timestamp without time zone;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "conductedBy" character varying;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "clientDemoApproval" boolean DEFAULT false NOT NULL;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "uatStatus" character varying DEFAULT 'Pending'::character varying NOT NULL;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "uatStartDate" timestamp without time zone;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "uatCompletedDate" timestamp without time zone;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "uatSignoffBy" character varying;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "uatRemarks" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "prodDeploymentStatus" character varying DEFAULT 'Not Started'::character varying NOT NULL;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "prodDeploymentDate" timestamp without time zone;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "prodDeploymentBy" character varying;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "goLiveApproval" boolean DEFAULT false NOT NULL;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "projectClosureSigned" boolean DEFAULT false NOT NULL;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "projectClosureSignDate" timestamp without time zone;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "projectClosureSignedBy" character varying;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "closureRemarks" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone DEFAULT now() NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"projects"'::regclass AND contype='p') THEN
    ALTER TABLE "projects" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ revoked_tokens ============
CREATE TABLE IF NOT EXISTS "revoked_tokens" ();
ALTER TABLE "revoked_tokens" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "revoked_tokens" ADD COLUMN IF NOT EXISTS "tokenHash" character varying;
ALTER TABLE "revoked_tokens" ADD COLUMN IF NOT EXISTS "userId" character varying;
ALTER TABLE "revoked_tokens" ADD COLUMN IF NOT EXISTS "expiresAt" timestamp without time zone;
ALTER TABLE "revoked_tokens" ADD COLUMN IF NOT EXISTS "revokedAt" timestamp without time zone DEFAULT now() NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"revoked_tokens"'::regclass AND contype='p') THEN
    ALTER TABLE "revoked_tokens" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ role_permissions ============
CREATE TABLE IF NOT EXISTS "role_permissions" ();
ALTER TABLE "role_permissions" ADD COLUMN IF NOT EXISTS "roleId" uuid;
ALTER TABLE "role_permissions" ADD COLUMN IF NOT EXISTS "permissionId" uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"role_permissions"'::regclass AND contype='p') THEN
    ALTER TABLE "role_permissions" ADD PRIMARY KEY ("permissionId", "roleId");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ roles ============
CREATE TABLE IF NOT EXISTS "roles" ();
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() NOT NULL;
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "name" character varying;
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "description" character varying;
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone DEFAULT now() NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"roles"'::regclass AND contype='p') THEN
    ALTER TABLE "roles" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ sales_visits ============
CREATE TABLE IF NOT EXISTS "sales_visits" ();
ALTER TABLE "sales_visits" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() NOT NULL;
ALTER TABLE "sales_visits" ADD COLUMN IF NOT EXISTS "accountId" uuid;
ALTER TABLE "sales_visits" ADD COLUMN IF NOT EXISTS "companyName" character varying;
ALTER TABLE "sales_visits" ADD COLUMN IF NOT EXISTS "visitType" character varying DEFAULT 'Visit'::character varying NOT NULL;
ALTER TABLE "sales_visits" ADD COLUMN IF NOT EXISTS "discussion" text;
ALTER TABLE "sales_visits" ADD COLUMN IF NOT EXISTS "visitDate" timestamp without time zone;
ALTER TABLE "sales_visits" ADD COLUMN IF NOT EXISTS "createdById" uuid;
ALTER TABLE "sales_visits" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "sales_visits" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "sales_visits" ADD COLUMN IF NOT EXISTS "followupDate" timestamp without time zone;
ALTER TABLE "sales_visits" ADD COLUMN IF NOT EXISTS "followupCompleted" boolean DEFAULT false NOT NULL;
ALTER TABLE "sales_visits" ADD COLUMN IF NOT EXISTS "followupNotes" text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"sales_visits"'::regclass AND contype='p') THEN
    ALTER TABLE "sales_visits" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ suppliers ============
CREATE TABLE IF NOT EXISTS "suppliers" ();
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() NOT NULL;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "name" character varying;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "contactPerson" character varying;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "email" character varying;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "phoneNumber" character varying;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "category" character varying;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "region" character varying;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "country" character varying;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "createdById" character varying;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone DEFAULT now() NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"suppliers"'::regclass AND contype='p') THEN
    ALTER TABLE "suppliers" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ tags ============
CREATE TABLE IF NOT EXISTS "tags" ();
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() NOT NULL;
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "name" character varying(100);
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "color" character varying(7);
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "createdat" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"tags"'::regclass AND contype='p') THEN
    ALTER TABLE "tags" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ tickets ============
CREATE TABLE IF NOT EXISTS "tickets" ();
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() NOT NULL;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "ticketNumber" character varying;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "title" character varying;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "priority" tickets_priority_enum DEFAULT 'Medium'::tickets_priority_enum NOT NULL;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "status" tickets_status_enum DEFAULT 'Open'::tickets_status_enum NOT NULL;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "category" character varying;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "source" character varying;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "slaResponseHours" integer;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "slaResolutionHours" integer;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "responseDeadline" timestamp without time zone;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "resolutionDeadline" timestamp without time zone;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "respondedAt" timestamp without time zone;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "resolvedAt" timestamp without time zone;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "resolutionNotes" character varying;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "accountId" uuid;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "contactId" uuid;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "reporterId" uuid;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "assigneeId" uuid;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "assigneeIds" text;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "productId" character varying;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "moduleType" tickets_moduletype_enum;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "attachmentPaths" text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"tickets"'::regclass AND contype='p') THEN
    ALTER TABLE "tickets" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ users ============
CREATE TABLE IF NOT EXISTS "users" ();
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" character varying;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password" character varying;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "firstName" character varying;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastName" character varying;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phoneNumber" character varying;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isActive" boolean DEFAULT true NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "roleId" uuid;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetToken" character varying;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetTokenExpiry" timestamp without time zone;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hasChangedPasswordOnFirstLogin" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordChangedAt" timestamp without time zone;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailNotificationsEnabled" boolean DEFAULT true NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailNotificationPreferences" text DEFAULT '{}'::text NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"users"'::regclass AND contype='p') THEN
    ALTER TABLE "users" ADD PRIMARY KEY ("id");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

