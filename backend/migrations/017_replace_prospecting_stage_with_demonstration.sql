-- ============================================================================
-- Replace opportunity stage "Prospecting" with "Qualification" as the
-- earliest stage, and add "Demonstration" as a new stage between
-- Qualification and Proposal.
-- ============================================================================
-- New pipeline: Qualification -> Demonstration -> Proposal -> Negotiation
--               -> Closed-Won / Closed-Lost
-- ============================================================================

-- Any existing opportunity still sitting at "Prospecting" moves to
-- "Qualification" (the new earliest open stage) and its probability is
-- adjusted to match, so open pipeline totals stay consistent.
UPDATE opportunities
SET stage = 'Qualification',
    probability = 10
WHERE stage = 'Prospecting';

-- New default for future rows created without an explicit stage.
ALTER TABLE opportunities ALTER COLUMN stage SET DEFAULT 'Qualification';

SELECT '✅ Opportunities: Prospecting -> Qualification migrated, Demonstration stage available, default stage updated' as status;
