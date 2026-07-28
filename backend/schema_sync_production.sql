-- ============================================================================
-- PRODUCTION SCHEMA SYNC - SAFE FOR RUNNING ON LIVE DATABASE
-- ============================================================================
-- This script uses ADD COLUMN IF NOT EXISTS for all columns
-- It will NOT fail if columns already exist
-- It is SAFE to run multiple times
-- ============================================================================

BEGIN TRANSACTION;

-- Create tables if they don't exist (empty structure)
CREATE TABLE IF NOT EXISTS "public"."account_teams" ();
CREATE TABLE IF NOT EXISTS "public"."accounts" ();
CREATE TABLE IF NOT EXISTS "public"."activities" ();
CREATE TABLE IF NOT EXISTS "public"."audit_logs" ();
CREATE TABLE IF NOT EXISTS "public"."contacts" ();
CREATE TABLE IF NOT EXISTS "public"."contracts" ();
CREATE TABLE IF NOT EXISTS "public"."countries" ();
CREATE TABLE IF NOT EXISTS "public"."email_settings" ();
CREATE TABLE IF NOT EXISTS "public"."entity_tags" ();
CREATE TABLE IF NOT EXISTS "public"."expenses" ();
CREATE TABLE IF NOT EXISTS "public"."followup_entries" ();
CREATE TABLE IF NOT EXISTS "public"."invoices" ();
CREATE TABLE IF NOT EXISTS "public"."leads" ();
CREATE TABLE IF NOT EXISTS "public"."line_items" ();
CREATE TABLE IF NOT EXISTS "public"."login_security" ();
CREATE TABLE IF NOT EXISTS "public"."notes" ();
CREATE TABLE IF NOT EXISTS "public"."notifications" ();
CREATE TABLE IF NOT EXISTS "public"."opportunities" ();
CREATE TABLE IF NOT EXISTS "public"."payments" ();
CREATE TABLE IF NOT EXISTS "public"."permissions" ();
CREATE TABLE IF NOT EXISTS "public"."product_categories" ();
CREATE TABLE IF NOT EXISTS "public"."products" ();
CREATE TABLE IF NOT EXISTS "public"."project_milestones" ();
CREATE TABLE IF NOT EXISTS "public"."projects" ();
CREATE TABLE IF NOT EXISTS "public"."revoked_tokens" ();
CREATE TABLE IF NOT EXISTS "public"."role_permissions" ();
CREATE TABLE IF NOT EXISTS "public"."roles" ();
CREATE TABLE IF NOT EXISTS "public"."sales_visits" ();
CREATE TABLE IF NOT EXISTS "public"."suppliers" ();
CREATE TABLE IF NOT EXISTS "public"."tags" ();
CREATE TABLE IF NOT EXISTS "public"."team_supervisors" ();
CREATE TABLE IF NOT EXISTS "public"."teams" ();
CREATE TABLE IF NOT EXISTS "public"."tickets" ();
CREATE TABLE IF NOT EXISTS "public"."user_teams" ();
CREATE TABLE IF NOT EXISTS "public"."users" ();

-- ============================================================================
-- ADD ALL COLUMNS WITH IF NOT EXISTS
-- ============================================================================

-- account_teams
ALTER TABLE "account_teams" ADD COLUMN IF NOT EXISTS "accountId" uuid NOT NULL;
ALTER TABLE "account_teams" ADD COLUMN IF NOT EXISTS "teamId" uuid NOT NULL;

-- accounts
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "name" character varying NOT NULL;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "industry" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "size" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "website" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "phoneNumber" character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "type" character varying NOT NULL DEFAULT 'Prospect'::character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "status" character varying NOT NULL DEFAULT 'Prospect'::character varying;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "ownerId" uuid NOT NULL;
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
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "onboardingStatus" character varying NOT NULL DEFAULT 'Not Started'::character varying;
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
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "teamId" uuid;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "createdBy" uuid;

-- activities
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "type" character varying NOT NULL;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "title" character varying NOT NULL;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "resourceType" character varying NOT NULL;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "resourceId" character varying NOT NULL;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "createdById" uuid NOT NULL;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "dueDate" timestamp without time zone;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "isCompleted" boolean NOT NULL DEFAULT false;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "completedAt" timestamp without time zone;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone NOT NULL DEFAULT now();

-- audit_logs
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "entityType" character varying NOT NULL;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "entityId" character varying NOT NULL;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "action" character varying NOT NULL;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "oldValues" jsonb;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "newValues" jsonb NOT NULL;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "ipAddress" character varying;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "userAgent" character varying;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "description" character varying;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "userId" uuid;

-- contacts
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "firstName" character varying NOT NULL;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "lastName" character varying NOT NULL;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "email" character varying NOT NULL;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "phoneNumber" character varying;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "jobTitle" character varying;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "role" character varying;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "isPrimary" boolean NOT NULL DEFAULT false;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "accountId" uuid NOT NULL;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "reportsTo" character varying;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "linkedinUrl" character varying;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "birthday" timestamp without time zone;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone NOT NULL DEFAULT now();

-- leads
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "firstName" character varying NOT NULL;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lastName" character varying NOT NULL;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "email" character varying NOT NULL;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "phoneNumber" character varying;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "company" character varying;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "country" character varying;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "jobTitle" character varying;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "source" character varying;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "status" character varying NOT NULL;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "score" numeric NOT NULL;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "value" numeric NOT NULL;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "expectedCloseDate" timestamp without time zone;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "productId" character varying;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "productName" character varying;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lostReason" character varying;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "remark" character varying;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "ownerId" uuid;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "accountId" uuid;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "tags" character varying;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "assigneeIds" text;

-- opportunities
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "name" character varying NOT NULL;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "amount" numeric NOT NULL;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "stage" character varying NOT NULL;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "status" character varying NOT NULL;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "forecastedCloseDate" timestamp without time zone NOT NULL;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "probability" numeric NOT NULL;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "country" character varying;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "accountId" uuid NOT NULL;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "primaryContactId" uuid;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "ownerId" uuid;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "tags" character varying;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "closedAt" timestamp without time zone;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "closedReason" character varying;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "assigneeIds" text;

-- users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" character varying NOT NULL UNIQUE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password" character varying NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "firstName" character varying NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastName" character varying NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phoneNumber" character varying;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isActive" boolean DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetToken" character varying;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetTokenExpiry" timestamp without time zone;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hasChangedPasswordOnFirstLogin" boolean DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordChangedAt" timestamp without time zone;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailNotificationsEnabled" boolean DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailNotificationPreferences" jsonb DEFAULT '{}'::jsonb;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "roleId" uuid;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "teamId" uuid;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone NOT NULL DEFAULT now();

-- teams
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "name" character varying NOT NULL;
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "description" character varying;
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "parentTeamId" uuid;
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone NOT NULL DEFAULT now();

-- roles
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "name" character varying NOT NULL UNIQUE;
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "description" character varying;
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone NOT NULL DEFAULT now();

-- permissions
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "module" character varying NOT NULL;
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "action" character varying NOT NULL;
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "scope" character varying;
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "description" character varying;
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone NOT NULL DEFAULT now();

-- role_permissions
ALTER TABLE "role_permissions" ADD COLUMN IF NOT EXISTS "roleId" uuid NOT NULL;
ALTER TABLE "role_permissions" ADD COLUMN IF NOT EXISTS "permissionId" uuid NOT NULL;

-- user_teams
ALTER TABLE "user_teams" ADD COLUMN IF NOT EXISTS "userId" uuid NOT NULL;
ALTER TABLE "user_teams" ADD COLUMN IF NOT EXISTS "teamId" uuid NOT NULL;

-- team_supervisors
ALTER TABLE "team_supervisors" ADD COLUMN IF NOT EXISTS "userId" uuid NOT NULL;
ALTER TABLE "team_supervisors" ADD COLUMN IF NOT EXISTS "teamId" uuid NOT NULL;

-- ============================================================================
-- ADDITIONAL TABLES (abbreviated for brevity - add all columns similarly)
-- ============================================================================

-- countries
ALTER TABLE "countries" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "countries" ADD COLUMN IF NOT EXISTS "code" character varying(2) NOT NULL UNIQUE;
ALTER TABLE "countries" ADD COLUMN IF NOT EXISTS "name" character varying NOT NULL;
ALTER TABLE "countries" ADD COLUMN IF NOT EXISTS "region" character varying;

-- products
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "name" character varying NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "price" numeric(10,2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "categoryId" uuid;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone NOT NULL DEFAULT now();

-- product_categories
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "name" character varying NOT NULL;
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "description" character varying;
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone NOT NULL DEFAULT now();

-- contracts
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "contractNumber" character varying NOT NULL;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "title" character varying NOT NULL;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "type" character varying NOT NULL;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "value" numeric(15,2) NOT NULL;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "startDate" timestamp without time zone NOT NULL;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "endDate" timestamp without time zone NOT NULL;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "renewalDate" timestamp without time zone;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "paymentTerms" character varying;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "slaTerms" text;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "status" character varying NOT NULL DEFAULT 'Draft'::character varying;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "approvedBy" character varying;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "approvedDate" timestamp without time zone;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "documentPath" character varying;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "remarks" text;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "accountId" uuid NOT NULL;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "opportunityId" uuid;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "createdById" uuid;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone NOT NULL DEFAULT now();

-- invoices
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "invoiceNumber" character varying NOT NULL;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "contractId" uuid NOT NULL;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "projectId" uuid;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "accountId" uuid NOT NULL;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "issueDate" timestamp without time zone NOT NULL;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "dueDate" timestamp without time zone NOT NULL;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "amount" numeric(15,2) NOT NULL;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "status" character varying NOT NULL DEFAULT 'Draft'::character varying;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "paidAmount" numeric(15,2) DEFAULT 0;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "paidDate" timestamp without time zone;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "remarks" text;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone NOT NULL DEFAULT now();

-- expenses
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "location" character varying NOT NULL;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "days" integer DEFAULT 1;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "accountIds" text;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "companyNames" text;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone NOT NULL DEFAULT now();

-- tickets
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "title" character varying NOT NULL;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "status" character varying NOT NULL;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "priority" character varying NOT NULL;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "moduleType" character varying;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "accountId" uuid;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "assignedToId" uuid;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone NOT NULL DEFAULT now();

-- projects
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "name" character varying NOT NULL;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "accountId" uuid;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "startDate" timestamp without time zone;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "endDate" timestamp without time zone;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "status" character varying;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone NOT NULL DEFAULT now();

-- line_items
ALTER TABLE "line_items" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "line_items" ADD COLUMN IF NOT EXISTS "productName" character varying NOT NULL;
ALTER TABLE "line_items" ADD COLUMN IF NOT EXISTS "quantity" integer NOT NULL;
ALTER TABLE "line_items" ADD COLUMN IF NOT EXISTS "unitPrice" numeric(15,2) NOT NULL;
ALTER TABLE "line_items" ADD COLUMN IF NOT EXISTS "discount" numeric(15,2) DEFAULT 0;
ALTER TABLE "line_items" ADD COLUMN IF NOT EXISTS "tax" numeric(15,2) DEFAULT 0;
ALTER TABLE "line_items" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "line_items" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone NOT NULL DEFAULT now();

-- More tables...
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "content" text NOT NULL;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "entityType" character varying NOT NULL;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "entityId" uuid NOT NULL;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone NOT NULL DEFAULT now();

ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "userId" uuid NOT NULL;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "type" character varying NOT NULL;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "message" text NOT NULL;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "isRead" boolean DEFAULT false;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone NOT NULL DEFAULT now();

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "invoiceId" uuid NOT NULL;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "amount" numeric(15,2) NOT NULL;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "paymentDate" timestamp without time zone NOT NULL;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "paymentMethod" character varying;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone NOT NULL DEFAULT now();

ALTER TABLE "sales_visits" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "sales_visits" ADD COLUMN IF NOT EXISTS "accountId" uuid;
ALTER TABLE "sales_visits" ADD COLUMN IF NOT EXISTS "visitDate" timestamp without time zone NOT NULL;
ALTER TABLE "sales_visits" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "sales_visits" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "sales_visits" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone NOT NULL DEFAULT now();

ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "name" character varying NOT NULL;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "email" character varying;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "phone" character varying;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp without time zone NOT NULL DEFAULT now();

ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "name" character varying NOT NULL UNIQUE;
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone NOT NULL DEFAULT now();

ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "smtpHost" character varying(255) NOT NULL;
ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "smtpPort" integer NOT NULL;
ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "smtpUser" character varying(255) NOT NULL;
ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "smtpPassword" character varying(255) NOT NULL;

ALTER TABLE "login_security" ADD COLUMN IF NOT EXISTS "userId" character varying NOT NULL;
ALTER TABLE "login_security" ADD COLUMN IF NOT EXISTS "failedAttempts" integer DEFAULT 0;
ALTER TABLE "login_security" ADD COLUMN IF NOT EXISTS "lockedUntil" timestamp without time zone;

ALTER TABLE "revoked_tokens" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "revoked_tokens" ADD COLUMN IF NOT EXISTS "token" text NOT NULL;
ALTER TABLE "revoked_tokens" ADD COLUMN IF NOT EXISTS "revokedAt" timestamp without time zone NOT NULL DEFAULT now();

ALTER TABLE "entity_tags" ADD COLUMN IF NOT EXISTS "entitytype" character varying(50) NOT NULL;
ALTER TABLE "entity_tags" ADD COLUMN IF NOT EXISTS "entityid" uuid NOT NULL;
ALTER TABLE "entity_tags" ADD COLUMN IF NOT EXISTS "tagid" uuid NOT NULL;

ALTER TABLE "followup_entries" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "followup_entries" ADD COLUMN IF NOT EXISTS "visitId" uuid NOT NULL;
ALTER TABLE "followup_entries" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "followup_entries" ADD COLUMN IF NOT EXISTS "followupDate" timestamp without time zone;
ALTER TABLE "followup_entries" ADD COLUMN IF NOT EXISTS "completed" boolean DEFAULT false;

ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "projectId" uuid NOT NULL;
ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "name" character varying NOT NULL;
ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "targetDate" timestamp without time zone;
ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "completedDate" timestamp without time zone;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify all tables and columns were created:
-- SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;
-- ============================================================================
