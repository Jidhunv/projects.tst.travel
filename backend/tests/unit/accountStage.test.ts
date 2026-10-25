import { accountStage } from '../../src/utils/accountStage';

describe('accountStage', () => {
  it('is an Account until the lead questionnaire is complete', () => {
    expect(accountStage('Account', false, [])).toBe('Account');
  });

  it('is a Lead once the lead questionnaire is complete, not a Prospect', () => {
    expect(accountStage('Account', true, [])).toBe('Lead');
    expect(accountStage('Account', true, ['Open'])).toBe('Lead');
  });

  it('is Qualified only when a lead has been qualified', () => {
    expect(accountStage('Account', true, ['Qualified'])).toBe('Qualified');
  });

  it('is a Prospect only when a lead has been converted to a prospect', () => {
    expect(accountStage('Account', true, ['Prospect'])).toBe('Prospect');
  });

  it('is an Opportunity once a lead has been converted to a deal', () => {
    expect(accountStage('Account', true, ['Converted'])).toBe('Opportunity');
  });

  it('shows On hold for accounts put on hold, unless a lead is further along', () => {
    expect(accountStage('On hold', false, [])).toBe('On hold');
    expect(accountStage('On hold', false, ['Qualified'])).toBe('Qualified');
  });
});
