import { normaliseCommittee, hasCommitteeMember } from '../../src/utils/buyingCommittee';

describe('normaliseCommittee', () => {
  it('keeps a named member with an email and a phone', () => {
    const out = normaliseCommittee([
      { role: 'Champion', name: ' Asha Rao ', email: 'asha@acme.test', phone: '+966 50 000 0000' },
    ]);
    expect(out).toEqual([
      { role: 'Champion', name: 'Asha Rao', email: 'asha@acme.test', phone: '+966 50 000 0000', designationId: undefined },
    ]);
  });

  it('rejects a named member with no email', () => {
    expect(() =>
      normaliseCommittee([{ role: 'Champion', name: 'Asha Rao', email: '', phone: '+966500000000' }])
    ).toThrow(/needs an email and a phone number/);
  });

  it('rejects a named member with no phone number', () => {
    expect(() =>
      normaliseCommittee([{ role: 'Champion', name: 'Asha Rao', email: 'asha@acme.test', phone: '  ' }])
    ).toThrow(/needs an email and a phone number/);
  });

  it('rejects a malformed email', () => {
    expect(() =>
      normaliseCommittee([{ role: 'Champion', name: 'Asha Rao', email: 'asha at acme', phone: '+966500000000' }])
    ).toThrow(/invalid email/);
  });

  it('skips rows with no name, so an unidentified role is not an error', () => {
    expect(normaliseCommittee([{ role: 'Coach', name: '', email: '', phone: '' }])).toEqual([]);
  });

  it('rejects a role outside the fixed buying-committee set', () => {
    expect(() => normaliseCommittee([{ role: 'Intern', name: 'X', email: 'x@a.test', phone: '1' }])).toThrow(
      /Invalid stakeholder role/
    );
  });
});

describe('hasCommitteeMember', () => {
  it('is false when no role has a named member', () => {
    expect(hasCommitteeMember([{ name: null }, { name: '   ' }])).toBe(false);
    expect(hasCommitteeMember([])).toBe(false);
  });

  it('is true once any role has a named member', () => {
    expect(hasCommitteeMember([{ name: null }, { name: 'Asha Rao' }])).toBe(true);
  });
});
