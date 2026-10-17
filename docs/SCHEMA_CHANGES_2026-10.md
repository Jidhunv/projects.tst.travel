# Schema changes - October 2026 update

Apply with **`backend/migrations/PRODUCTION_UPDATE_2026-10_full.sql`** (pgAdmin, Query Tool). It is repeatable: every statement is create-if-not-exists, nothing is dropped, and it ends with a check that lists anything still missing (no rows = done). Then restart the backend.

It replaces running migrations 018-023 one by one; those files are kept for history.

## New tables

### `sales_targets` - targets for a date range
| Field | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| name | varchar(255) | e.g. "Q3 revenue" |
| metric | varchar(32) | `won_value` or `opportunity_value` |
| ownerId | uuid, null | person; null = whole team |
| startDate, endDate | date | inclusive range |
| targetValue | numeric(15,2) | |
| createdById | uuid, null | |
| createdAt, updatedAt | timestamp | |

### `kpi_master` - the approved list of KPI questions
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| name | varchar(255) | the question; unique ignoring case |
| description | text, null | guidance shown to staff |
| type | varchar(16) | `number`, `yes_no`, `text`, `choice` |
| unit | varchar(32), null | calls, demos ... |
| answerOptions | jsonb, null | allowed answers for `choice` questions |
| defaultFrequency | varchar(16) | daily / weekly / monthly |
| defaultTarget | numeric, null | pre-filled when assigned |
| isActive | boolean | inactive questions cannot be assigned and are hidden from staff |
| createdAt, updatedAt | timestamp | shown as "Created" / "Last edited" |

### `kpi_definitions` - a master question assigned to one person
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| masterId | uuid, null | the KPI Master question it came from |
| userId | uuid | the staff member |
| name, description, type, unit | | copied from the master and kept in step with it |
| frequency | varchar(16) | per-person |
| targetValue | numeric, null | per period, per-person |
| startDate | date | counts from this day; earlier dates cannot be reported |
| isActive | boolean | |
| createdById | uuid, null | |
| createdAt, updatedAt | timestamp | |

### `kpi_entries` - daily answers
id, kpiId (-> kpi_definitions, cascade), userId, entryDate (date), numberValue (numeric, null), textValue (text, null), accountId (uuid, null - the prospect), createdAt.

### `kpi_projections` - monthly projected figure
id, userId, month (date, first of month), metric (`won_value`/`opportunity_value`), amount, note, createdAt, updatedAt. One row per (userId, month, metric).

### `kpi_audit_trail` - who changed what, with before/after
id, entityType (`kpi_entry`/`projection`), entityId, subjectUserId, actorId, action (`created`/`updated`/`deleted`), before (jsonb), after (jsonb), createdAt. No foreign keys, so history survives deleted entries.

### `ticket_issues` - items inside a ticket
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| ticketId | uuid | -> tickets, cascade |
| issueNumber | integer | 1, 2, 3 ... within the ticket (unique per ticket) |
| title, description | | |
| priority | varchar(16) | Critical / High / Medium / Low |
| stage | varchar(40) | Logged, Under development, Testing, User acceptance, Deployed, On hold, Cancelled |
| assigneeId | uuid, null | must be in the Development department |
| createdById | uuid, null | |
| closedAt | timestamp, null | set when Deployed or Cancelled |
| createdAt, updatedAt | timestamp | |

### `ticket_issue_history` - every stage change
id, issueId (-> ticket_issues, cascade), fromStage, toStage, note, customerContact (the customer who approved deployment), actorId, createdAt.

## Changed tables

| Table | New field | Type | Purpose |
|---|---|---|---|
| roles | departments | text (comma separated) | Sales, Operations, Development, Finance, Support |
| users | departments | text (comma separated) | optional per-person override; empty = use the role's |

`roles.departments` is set to `Sales` for the built-in Sales Rep role. Nothing else is guessed: **tick Development on your developers' roles or users**, otherwise no one can be assigned an issue.

Existing fields that the new screens now use (no change to the table): `tickets.productId` (Product dropdown), `tickets.category` (Bug / Enhancement / Training), `tickets.slaResponseHours` / `slaResolutionHours` (SLA report targets).

## New permission modules
`targets`, `kpis`, `kpi_setup`, `issue_log` - each with read / create / update / delete at `all` and `self` scope (8 rows each). Granted to Admin by the script; grant the rest to other roles in Role Management. Section 8 of the script (optional) also gives the Sales Rep role `kpis` read/create/update at `self` and adds the standard ten daily KPIs for each Sales Rep.

## Local verification
The script was run on a copy of the working database after removing all of the above: it rebuilt every table and column identically to the working database, ran a second time with no changes, and the final check returned no missing items.
