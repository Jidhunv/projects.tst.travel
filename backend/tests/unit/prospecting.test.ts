import { effectiveAnswers, normaliseProspecting, prospectingProgress, ProspectAccountFields, ProspectOptionSets } from '../../src/utils/prospecting';

const options: ProspectOptionSets = {
  businessType: ['Retail', 'B2B', 'Corporate'],
  employeeBand: ['1-10', '11-50', '51-200'],
};

// An account whose basic info already holds most of the answers.
const account: ProspectAccountFields = {
  name: 'Acme Travel LLC',
  website: 'https://acme.example',
  country: 'UAE',
  region: 'Dubai',
  city: 'Dubai',
  industry: 'Travel',
  tier: 'T2',
  contactPerson: 'Asha Rao',
  email: 'asha@acme.example',
  phoneNumber: '+971 4 000 0000',
  alternatePhoneNumber: '+971 50 000 0000',
  type: 'Account',
  remark: 'Met at the Dubai travel fair',
  ownerId: 'owner-1',
};

// The answers the user still has to give on the Prospecting tab.
const typed = {
  contact: { designation: 'Operations Head' },
  businessTypes: ['B2B', 'Corporate'],
  employeeBands: ['11-50'],
  branches: ['Riyadh'],
  source: 'Referral',
  verification: { verifiedOn: '2026-10-20', source: 'Company website' },
  duplicates: 'None',
};

describe('effectiveAnswers', () => {
  it('fills the answers from basic account info', () => {
    const a = effectiveAnswers(account, null);
    expect(a.name).toBe('Acme Travel LLC');
    expect(a.website).toBe('https://acme.example');
    expect(a.location).toEqual({ country: 'UAE', region: 'Dubai', city: 'Dubai' });
    expect(a.industry).toBe('Travel');
    expect(a.tier).toBe('T2');
    expect(a.contact).toEqual({ name: 'Asha Rao', designation: '', email: 'asha@acme.example', phone: '+971 4 000 0000' });
  });

  it('lets a typed answer override the basic info', () => {
    const a = effectiveAnswers(account, { name: 'Acme Travel Holdings' });
    expect(a.name).toBe('Acme Travel Holdings');
  });
});

describe('prospectingProgress', () => {
  it('is complete once every mandatory question is answered validly', () => {
    const p = prospectingProgress(account, typed, options);
    expect(p).toMatchObject({ answered: 13, total: 13, complete: true, missing: [] });
  });

  it('asks for the tier when the basic info has none', () => {
    const p = prospectingProgress({ ...account, tier: null }, typed, options);
    expect(p.missing).toEqual(['tier']);
  });

  it('keeps the account from becoming a lead while any Account Info field is blank', () => {
    const p = prospectingProgress({ ...account, remark: '' }, typed, options);
    expect(p.complete).toBe(false);
    expect(p.missing).toEqual(['remark']);
  });

  it('counts a tier typed on the questionnaire as the Account Info tier, as the form shows it', () => {
    const p = prospectingProgress({ ...account, tier: null }, { ...typed, tier: 'T4' }, options);
    expect(p.complete).toBe(true);
  });

  it('is missing the tier only when neither Account Info nor the questionnaire has one', () => {
    expect(prospectingProgress({ ...account, tier: null }, typed, options).missing).toEqual(['tier']);
  });

  it('needs an owner on the account', () => {
    expect(prospectingProgress({ ...account, ownerId: null }, typed, options).missing).toEqual(['owner']);
  });

  it('needs at least one business type, employee band and branch', () => {
    const p = prospectingProgress(account, { ...typed, businessTypes: [], employeeBands: [], branches: [] }, options);
    expect(p.missing).toEqual(['businessTypes', 'employeeBands', 'branches']);
  });

  it('needs a designation and a contact method for the primary contact', () => {
    const p = prospectingProgress(account, { ...typed, contact: { designation: '' } }, options);
    expect(p.missing).toEqual(['contact']);
  });

  it('needs a verification date and a source', () => {
    const p = prospectingProgress(account, { ...typed, verification: { verifiedOn: '', source: 'Website' } }, options);
    expect(p.missing).toEqual(['verification']);
  });

  it('counts a business type removed from the master as not answered', () => {
    const p = prospectingProgress(account, typed, { ...options, businessType: ['Retail'] });
    expect(p.missing).toEqual(['businessTypes']);
  });

  it('accepts branches typed as free text', () => {
    const p = prospectingProgress(account, { ...typed, branches: ['Al Quoz office', 'Riyadh'] }, options);
    expect(p.complete).toBe(true);
  });

  it('treats an empty account as having nothing answered', () => {
    const p = prospectingProgress({}, null, options);
    expect(p.answered).toBe(0);
    expect(p.complete).toBe(false);
  });
});

describe('normaliseProspecting', () => {
  it('keeps valid answers and trims them', () => {
    expect(normaliseProspecting({ name: '  Acme  ', businessTypes: ['Retail'] }, options)).toEqual({
      name: 'Acme',
      businessTypes: ['Retail'],
    });
  });

  it('drops unknown keys', () => {
    expect(normaliseProspecting({ name: 'Acme', hack: 'x' }, options)).toEqual({ name: 'Acme' });
  });

  it('rejects a business type that is not an active option', () => {
    expect(() => normaliseProspecting({ businessTypes: ['Bakery'] }, options)).toThrow(/Business type/);
  });

  it('rejects a tier outside T1 to T5', () => {
    expect(() => normaliseProspecting({ tier: 'T9' }, options)).toThrow(/Tier/);
  });

  it('rejects a bad verification date', () => {
    expect(() => normaliseProspecting({ verification: { verifiedOn: '20/10/2026', source: 'x' } }, options)).toThrow(/YYYY-MM-DD/);
  });

  it('rejects an invalid contact email', () => {
    expect(() => normaliseProspecting({ contact: { name: 'A', designation: 'B', email: 'not-an-email' } }, options)).toThrow(/email/);
  });

  it('removes duplicate branch names', () => {
    expect(normaliseProspecting({ branches: ['Riyadh', 'Riyadh'] }, options).branches).toEqual(['Riyadh']);
  });
});
