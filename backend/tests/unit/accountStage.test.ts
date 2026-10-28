import { accountStage } from '../../src/utils/accountStage';

describe('accountStage', () => {
  it('is an Account until the lead questionnaire is complete', () => {
    expect(accountStage('Account', false, [])).toBe('Account');
  });

  it('is a Lead once the lead questionnaire is complete', () => {
    expect(accountStage('Account', true, [])).toBe('Lead');
  });

  it('stays a Lead however far its prospects have progressed', () => {
    expect(accountStage('Account', true, ['Open'])).toBe('Lead');
    expect(accountStage('Account', true, ['Qualified'])).toBe('Lead');
    expect(accountStage('Account', true, ['Prospect'])).toBe('Lead');
    expect(accountStage('Account', true, ['Converted'])).toBe('Lead');
  });

  it('stays a Lead once it has a prospect, even if its questionnaire is no longer complete', () => {
    expect(accountStage('Account', false, ['Open'])).toBe('Lead');
    expect(accountStage('Account', false, ['Prospect', 'Disqualified'])).toBe('Lead');
  });

  it('goes On hold when every prospect has been disqualified', () => {
    expect(accountStage('Account', true, ['Disqualified'])).toBe('On hold');
    expect(accountStage('Account', true, ['Disqualified', 'Disqualified'])).toBe('On hold');
  });

  it('shows On hold for accounts put on hold by hand, unless a prospect exists', () => {
    expect(accountStage('On hold', false, [])).toBe('On hold');
    expect(accountStage('On hold', false, ['Open'])).toBe('Lead');
  });
});
