# Database tables (crm_db, generated 2026-10-11)

## account_stakeholders
- id uuid
- accountId uuid
- role character varying
- name character varying
- designationId uuid
- createdAt timestamp without time zone
- updatedAt timestamp without time zone

## account_teams
- accountId uuid
- teamId uuid
- createdAt timestamp without time zone

## accounts
- id uuid
- name character varying
- industry character varying
- size character varying
- website character varying
- phoneNumber character varying
- type character varying
- status character varying
- ownerId uuid
- billingStreet character varying
- billingCity character varying
- billingState character varying
- billingZip character varying
- billingCountry character varying
- shippingStreet character varying
- shippingCity character varying
- shippingState character varying
- shippingZip character varying
- shippingCountry character varying
- tags character varying
- createdAt timestamp without time zone
- updatedAt timestamp without time zone
- onboardingStatus character varying
- onboardingDate timestamp without time zone
- onboardingCompletedDate timestamp without time zone
- onboardingNotes character varying
- contractSignedDate timestamp without time zone
- goLiveDate timestamp without time zone
- accountManager character varying
- billingContact character varying
- technicalContact character varying
- contactPerson character varying
- city character varying
- region character varying
- country character varying
- assigneeIds text
- email character varying
- remark character varying
- alternatePhoneNumber character varying
- teamId uuid
- createdBy uuid
- tier character varying

## activities
- id uuid
- type character varying
- title character varying
- description text
- resourceType character varying
- resourceId character varying
- createdById uuid
- dueDate timestamp without time zone
- isCompleted boolean
- completedAt timestamp without time zone
- createdAt timestamp without time zone
- updatedAt timestamp without time zone

## audit_logs
- id uuid
- entityType character varying
- entityId character varying
- action USER-DEFINED
- oldValues jsonb
- newValues jsonb
- ipAddress character varying
- userAgent character varying
- description character varying
- createdAt timestamp without time zone
- userId uuid

## contacts
- id uuid
- firstName character varying
- lastName character varying
- email character varying
- phoneNumber character varying
- jobTitle character varying
- role character varying
- isPrimary boolean
- accountId uuid
- reportsTo character varying
- linkedinUrl character varying
- birthday timestamp without time zone
- createdAt timestamp without time zone
- updatedAt timestamp without time zone

## contracts
- id uuid
- contractNumber character varying
- title character varying
- type character varying
- value numeric
- startDate timestamp without time zone
- endDate timestamp without time zone
- renewalDate timestamp without time zone
- paymentTerms character varying
- slaTerms text
- status character varying
- approvedBy character varying
- approvedDate timestamp without time zone
- documentPath character varying
- remarks text
- accountId uuid
- opportunityId uuid
- createdById uuid
- createdAt timestamp without time zone
- updatedAt timestamp without time zone
- terms text
- createdBy uuid

## countries
- id uuid
- code character varying
- name character varying
- region character varying
- createdAt timestamp without time zone
- updatedAt timestamp without time zone

## designations
- id uuid
- name character varying
- isActive boolean
- createdAt timestamp without time zone
- updatedAt timestamp without time zone

## email_settings
- id uuid
- smtpHost character varying
- smtpPort integer
- smtpUser character varying
- smtpPassword character varying
- fromEmail character varying
- fromName character varying
- isConfigured boolean
- enableNotifications boolean
- createdAt timestamp without time zone
- updatedAt timestamp without time zone
- updatedById uuid

## entity_tags
- entitytype character varying
- entityid uuid
- tagid uuid

## expenses
- id uuid
- location character varying
- days integer
- accountIds text
- companyNames text
- travelCost numeric
- reason text
- status character varying
- approvedById uuid
- approvedAt timestamp without time zone
- approvalNotes text
- ownerId uuid
- createdAt timestamp without time zone
- updatedAt timestamp without time zone
- description character varying
- amount numeric
- category character varying
- expenseDate timestamp without time zone
- accountId uuid
- createdBy uuid

## followup_entries
- id uuid
- visitId uuid
- notes text
- followupDate timestamp without time zone
- completed boolean
- createdById uuid
- createdAt timestamp without time zone

## invoices
- id uuid
- invoiceNumber character varying
- contractId uuid
- projectId uuid
- accountId uuid
- amount numeric
- tax numeric
- totalAmount numeric
- invoiceDate timestamp without time zone
- dueDate timestamp without time zone
- status character varying
- billingCycle character varying
- description text
- notes text
- documentPath character varying
- createdAt timestamp without time zone
- updatedAt timestamp without time zone
- issueDate timestamp without time zone
- createdBy uuid

## kpi_audit_trail
- id uuid
- entityType character varying
- entityId uuid
- subjectUserId uuid
- actorId uuid
- action character varying
- before jsonb
- after jsonb
- createdAt timestamp without time zone

## kpi_definitions
- id uuid
- name character varying
- description text
- type character varying
- unit character varying
- userId uuid
- frequency character varying
- targetValue numeric
- isActive boolean
- createdById uuid
- createdAt timestamp without time zone
- updatedAt timestamp without time zone
- masterId uuid
- startDate date

## kpi_entries
- id uuid
- kpiId uuid
- userId uuid
- entryDate date
- numberValue numeric
- textValue text
- accountId uuid
- createdAt timestamp without time zone

## kpi_master
- id uuid
- name character varying
- description text
- type character varying
- unit character varying
- defaultFrequency character varying
- defaultTarget numeric
- isActive boolean
- createdAt timestamp without time zone
- updatedAt timestamp without time zone
- answerOptions jsonb

## kpi_projections
- id uuid
- userId uuid
- month date
- metric character varying
- amount numeric
- note text
- createdAt timestamp without time zone
- updatedAt timestamp without time zone

## leads
- id uuid
- firstName character varying
- lastName character varying
- email character varying
- phoneNumber character varying
- company character varying
- jobTitle character varying
- source character varying
- status character varying
- score integer
- ownerId uuid
- accountId uuid
- tags character varying
- createdAt timestamp without time zone
- updatedAt timestamp without time zone
- value numeric
- expectedCloseDate timestamp without time zone
- productId character varying
- productName character varying
- lostReason character varying
- remark text
- productIds text
- productNames text
- businessVolume numeric
- supplierList text
- region character varying
- country character varying
- assigneeIds text
- tier character varying

## line_items
- id uuid
- productName character varying
- quantity integer
- unitPrice numeric
- discount numeric
- discountPercent numeric
- description character varying
- opportunityId uuid
- createdAt timestamp without time zone
- updatedAt timestamp without time zone
- productId character varying

## login_security
- userId character varying
- failedAttempts integer
- lockoutUntil timestamp without time zone
- updatedAt timestamp without time zone

## notes
- id uuid
- content text
- resourceType character varying
- resourceId character varying
- createdById uuid
- createdAt timestamp without time zone
- updatedAt timestamp without time zone

## notifications
- id uuid
- type USER-DEFINED
- title character varying
- message text
- relatedEntityType character varying
- relatedEntityId character varying
- relatedEntityName character varying
- isRead boolean
- readAt timestamp without time zone
- actionUrl character varying
- actionLabel character varying
- createdAt timestamp without time zone
- updatedAt timestamp without time zone
- recipientId uuid

## opportunities
- id uuid
- name character varying
- amount numeric
- stage character varying
- status character varying
- description character varying
- forecastedCloseDate timestamp without time zone
- probability integer
- accountId uuid
- primaryContactId uuid
- ownerId uuid
- tags character varying
- closedAt timestamp without time zone
- closedReason character varying
- createdAt timestamp without time zone
- updatedAt timestamp without time zone
- businessVolume numeric
- supplierList text
- region character varying
- country character varying
- company character varying
- contactPerson character varying
- contactEmail character varying
- contactPhone character varying
- jobTitle character varying
- source character varying
- remark text
- convertedFromLeadId character varying
- assigneeIds text
- expectedCloseMonth character varying
- city character varying
- tier character varying

## payments
- id uuid
- invoiceId uuid
- amount numeric
- paymentDate timestamp without time zone
- paymentMethod character varying
- transactionReference character varying
- remarks text
- createdAt timestamp without time zone

## permissions
- id uuid
- module character varying
- action character varying
- description character varying
- createdAt timestamp without time zone
- updatedAt timestamp without time zone
- scope character varying

## product_categories
- id uuid
- name character varying
- description character varying
- code character varying
- isActive boolean
- displayOrder integer
- createdAt timestamp without time zone
- updatedAt timestamp without time zone

## products
- id uuid
- name character varying
- sku character varying
- description text
- unitPrice numeric
- billingType character varying
- isActive boolean
- createdAt timestamp without time zone
- updatedAt timestamp without time zone
- categoryId uuid
- price numeric

## project_milestones
- id uuid
- projectId uuid
- milestoneType character varying
- milestoneName character varying
- completedDate timestamp without time zone
- completedTime character varying
- responsibleUserId uuid
- remarks text
- approvalStatus character varying
- approvedBy character varying
- approvedDate timestamp without time zone
- createdAt timestamp without time zone

## projects
- id uuid
- projectName character varying
- status character varying
- description text
- startDate timestamp without time zone
- endDate timestamp without time zone
- goLiveDate timestamp without time zone
- budget numeric
- revenue numeric
- progressPercent integer
- accountId uuid
- contractId uuid
- projectManagerId uuid
- isLoaded boolean
- loadedDate timestamp without time zone
- loadedBy character varying
- demoConducted boolean
- demoDate timestamp without time zone
- conductedBy character varying
- clientDemoApproval boolean
- uatStatus character varying
- uatStartDate timestamp without time zone
- uatCompletedDate timestamp without time zone
- uatSignoffBy character varying
- uatRemarks text
- prodDeploymentStatus character varying
- prodDeploymentDate timestamp without time zone
- prodDeploymentBy character varying
- goLiveApproval boolean
- projectClosureSigned boolean
- projectClosureSignDate timestamp without time zone
- projectClosureSignedBy character varying
- closureRemarks text
- createdAt timestamp without time zone
- updatedAt timestamp without time zone
- name character varying
- projectManager uuid
- createdBy uuid

## revoked_tokens
- id uuid
- tokenHash character varying
- userId character varying
- expiresAt timestamp without time zone
- revokedAt timestamp without time zone

## role_permissions
- roleId uuid
- permissionId uuid
- module character varying
- action character varying
- scope character varying
- createdAt timestamp without time zone

## roles
- id uuid
- name character varying
- description character varying
- createdAt timestamp without time zone
- updatedAt timestamp without time zone

## sales_targets
- id uuid
- name character varying
- metric character varying
- ownerId uuid
- startDate date
- endDate date
- targetValue numeric
- createdById uuid
- createdAt timestamp without time zone
- updatedAt timestamp without time zone

## sales_visits
- id uuid
- accountId uuid
- companyName character varying
- visitType character varying
- discussion text
- visitDate timestamp without time zone
- createdById uuid
- createdAt timestamp without time zone
- updatedAt timestamp without time zone
- followupDate timestamp without time zone
- followupCompleted boolean
- followupNotes text
- notes text
- outcome character varying
- nextFollowUp timestamp without time zone
- createdBy uuid

## schema_verification_log
- id integer
- check_name character varying
- status character varying
- message text
- checked_at timestamp without time zone

## suppliers
- id uuid
- name character varying
- contactPerson character varying
- email character varying
- phoneNumber character varying
- category character varying
- region character varying
- country character varying
- notes text
- createdById character varying
- createdAt timestamp without time zone
- updatedAt timestamp without time zone
- address text
- city character varying
- remark text

## tags
- id uuid
- name character varying
- color character varying
- description text
- createdat timestamp without time zone

## team_supervisors
- userId uuid
- teamId uuid
- supervisorId uuid
- createdAt timestamp without time zone

## teams
- id uuid
- name character varying
- description character varying
- parentTeamId uuid
- createdAt timestamp without time zone
- updatedAt timestamp without time zone

## tickets
- id uuid
- ticketNumber character varying
- title character varying
- description text
- priority USER-DEFINED
- status USER-DEFINED
- category character varying
- source character varying
- slaResponseHours integer
- slaResolutionHours integer
- responseDeadline timestamp without time zone
- resolutionDeadline timestamp without time zone
- respondedAt timestamp without time zone
- resolvedAt timestamp without time zone
- resolutionNotes character varying
- createdAt timestamp without time zone
- updatedAt timestamp without time zone
- accountId uuid
- contactId uuid
- reporterId uuid
- assigneeId uuid
- assigneeIds text
- productId character varying
- moduleType USER-DEFINED
- attachmentPaths text
- assignedTo uuid
- createdBy uuid
- dueDate timestamp without time zone

## user_teams
- userId uuid
- teamId uuid
- role character varying
- createdAt timestamp without time zone

## users
- id uuid
- email character varying
- password character varying
- firstName character varying
- lastName character varying
- phoneNumber character varying
- isActive boolean
- roleId uuid
- createdAt timestamp without time zone
- updatedAt timestamp without time zone
- resetToken character varying
- resetTokenExpiry timestamp without time zone
- hasChangedPasswordOnFirstLogin boolean
- passwordChangedAt timestamp without time zone
- emailNotificationsEnabled boolean
- emailNotificationPreferences text
- teamId uuid
