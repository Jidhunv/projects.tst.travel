import { normaliseLeadQualification, leadQualificationProgress, LEAD_QUALIFICATION_QUESTIONS } from '../../src/utils/prospectQualification';

const mandatoryKeys = LEAD_QUALIFICATION_QUESTIONS.filter((q) => q.mandatory).map((q) => q.key);
const optionalKeys = LEAD_QUALIFICATION_QUESTIONS.filter((q) => !q.mandatory).map((q) => q.key);
const fill = (keys: readonly string[]) => Object.fromEntries(keys.map((k) => [k, `answer for ${k}`]));

describe('leadQualificationProgress', () => {
  it('has nine mandatory questions and three optional ones', () => {
    expect(mandatoryKeys).toHaveLength(9);
    expect(optionalKeys).toHaveLength(3);
  });

  it('is complete once every mandatory question is answered, even without the optional ones', () => {
    expect(leadQualificationProgress(fill(mandatoryKeys))).toEqual({ answered: 9, total: 9, complete: true, missing: [] });
  });

  it('is not complete while a mandatory question is open', () => {
    const a = fill(mandatoryKeys) as Record<string, string>;
    delete a.lq6;
    const p = leadQualificationProgress(a);
    expect(p.complete).toBe(false);
    expect(p.missing).toEqual(['lq6']);
  });

  it('treats a blank mandatory answer as missing', () => {
    expect(leadQualificationProgress({ ...fill(mandatoryKeys), lq4: '   ' }).missing).toEqual(['lq4']);
  });

  it('treats no answers as nine missing', () => {
    expect(leadQualificationProgress(null).answered).toBe(0);
  });
});

describe('normaliseLeadQualification', () => {
  it('trims answers and drops unknown keys', () => {
    expect(normaliseLeadQualification({ lq1: '  Verified  ', other: 'x' })).toEqual({ lq1: 'Verified' });
  });

  it('rejects an answer longer than 2000 characters', () => {
    expect(() => normaliseLeadQualification({ lq1: 'a'.repeat(2001) })).toThrow(/too long/);
  });

  it('allows saving part of the questionnaire', () => {
    expect(leadQualificationProgress(normaliseLeadQualification({ lq1: 'x' })).answered).toBe(1);
  });
});
