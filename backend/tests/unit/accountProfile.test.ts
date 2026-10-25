import { normaliseProfile } from '../../src/utils/accountProfile';

describe('normaliseProfile', () => {
  it('keeps and trims the onboarding answers', () => {
    expect(
      normaliseProfile({
        companyTypeId: 'a1b2',
        isB2B: 'true',
        isRetail: false,
        primaryBusiness: '  Travel services ',
        employeeCount: '120',
        branchLocations: [' Riyadh ', '', 'Jeddah'],
      })
    ).toEqual({
      companyTypeId: 'a1b2',
      isB2B: true,
      isRetail: false,
      primaryBusiness: 'Travel services',
      employeeCount: 120,
      branchLocations: ['Riyadh', 'Jeddah'],
    });
  });

  it('clears a field when it is sent empty', () => {
    expect(normaliseProfile({ employeeCount: '', branchLocations: [], isB2B: null, companyTypeId: '' })).toEqual({
      employeeCount: null,
      branchLocations: null,
      isB2B: null,
      companyTypeId: null,
    });
  });

  it('leaves out fields that were not sent', () => {
    expect(normaliseProfile({ name: 'Acme' })).toEqual({});
  });

  it('rejects a fractional or negative employee count', () => {
    expect(() => normaliseProfile({ employeeCount: 3.5 })).toThrow(/whole number/);
    expect(() => normaliseProfile({ employeeCount: -1 })).toThrow(/whole number/);
  });

  it('rejects branch locations that are not a list', () => {
    expect(() => normaliseProfile({ branchLocations: 'Riyadh' })).toThrow(/must be a list/);
  });
});
