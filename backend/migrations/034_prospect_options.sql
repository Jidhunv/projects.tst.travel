-- ============================================================================
-- Prospect Options master: business types, employee bands and branches
-- ============================================================================
-- Options offered in the Prospecting questionnaire. Admins add, rename or
-- deactivate them in Prospect Options. Deactivated options are kept so older
-- answers still read correctly, but are no longer offered.
-- Safe to run multiple times.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS prospect_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(30) NOT NULL,
    name VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_prospect_option UNIQUE (category, name)
);

INSERT INTO prospect_options (category, name) VALUES
    ('businessType', 'Retail'),
    ('businessType', 'B2B'),
    ('businessType', 'Corporate'),
    ('employeeBand', '1-10'),
    ('employeeBand', '11-50'),
    ('employeeBand', '51-200'),
    ('employeeBand', '201-500'),
    ('employeeBand', '501-1000'),
    ('employeeBand', '1000+')
ON CONFLICT (category, name) DO NOTHING;

SELECT '✅ Prospect options ready' as status;
