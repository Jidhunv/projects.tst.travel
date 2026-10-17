import { checkTransition, ticketStatusFor, isFinished, ISSUE_STAGES } from '../../src/utils/issueWorkflow';

const t = (from: string, to: string, extra: Partial<Parameters<typeof checkTransition>[0]> = {}) =>
  checkTransition({ from, to, hasAssignee: true, ...extra });

describe('issue stage transitions', () => {
  it('has the agreed stages in order, ending in Deployed', () => {
    expect([...ISSUE_STAGES]).toEqual(['Logged', 'Under development', 'Testing', 'User acceptance', 'Deployed']);
  });

  it('allows moving forward one stage at a time', () => {
    expect(t('Logged', 'Under development')).toBeNull();
    expect(t('Under development', 'Testing')).toBeNull();
    expect(t('Testing', 'User acceptance')).toBeNull();
    expect(t('User acceptance', 'Deployed', { customerContact: 'Ali Hassan' })).toBeNull();
  });

  it('does not let a stage be skipped', () => {
    expect(t('Logged', 'Testing')).toMatch(/Under development/);
    expect(t('Under development', 'User acceptance')).toMatch(/Testing/);
    expect(t('Testing', 'Deployed', { customerContact: 'Ali' })).toMatch(/User acceptance/);
  });

  it('needs a note to go backwards', () => {
    expect(t('Testing', 'Under development')).toMatch(/going back/);
    expect(t('Testing', 'Under development', { note: 'Failed regression' })).toBeNull();
    expect(t('Deployed', 'User acceptance', { note: 'Customer says it is back' })).toBeNull();
  });

  it('needs a developer assigned before development starts', () => {
    expect(t('Logged', 'Under development', { hasAssignee: false })).toMatch(/Assign a developer/);
    expect(t('Logged', 'Under development', { hasAssignee: true })).toBeNull();
  });

  it('needs the customer contact to deploy', () => {
    expect(t('User acceptance', 'Deployed')).toMatch(/customer/i);
    expect(t('User acceptance', 'Deployed', { customerContact: '  ' })).not.toBeNull();
    expect(t('User acceptance', 'Deployed', { customerContact: 'Ali Hassan' })).toBeNull();
  });

  it('holds and cancels need a reason; a cancelled issue is final', () => {
    expect(t('Under development', 'On hold')).toMatch(/why/);
    expect(t('Under development', 'On hold', { note: 'Waiting for client data' })).toBeNull();
    expect(t('Logged', 'Cancelled')).toMatch(/why/);
    expect(t('Logged', 'Cancelled', { note: 'Duplicate' })).toBeNull();
    expect(t('Cancelled', 'Logged', { note: 'x' })).toMatch(/cancelled/);
  });

  it('resumes from hold to a working stage with a note', () => {
    expect(t('On hold', 'Under development')).toMatch(/resuming/);
    expect(t('On hold', 'Under development', { note: 'Data received' })).toBeNull();
  });

  it('rejects unknown stages and no-op moves', () => {
    expect(t('Logged', 'Nonsense')).toMatch(/Unknown/);
    expect(t('Logged', 'Logged')).toMatch(/already/);
  });
});

describe('ticket status follows its issues', () => {
  it('leaves a ticket with no issues alone', () => expect(ticketStatusFor([])).toBeNull());
  it('closes only when every issue is Deployed or Cancelled', () => {
    expect(ticketStatusFor(['Deployed', 'Deployed'])).toBe('Closed');
    expect(ticketStatusFor(['Deployed', 'Cancelled'])).toBe('Closed');
    expect(ticketStatusFor(['Deployed', 'Testing'])).toBe('In Progress');
    expect(ticketStatusFor(['Deployed', 'On hold'])).toBe('In Progress');
  });
  it('is Open while everything open is still just Logged', () => {
    expect(ticketStatusFor(['Logged', 'Logged'])).toBe('Open');
    expect(ticketStatusFor(['Deployed', 'Logged'])).toBe('Open');
  });
  it('waits on the customer when only customer-acceptance issues remain', () => {
    expect(ticketStatusFor(['User acceptance', 'Deployed'])).toBe('Pending Customer');
    expect(ticketStatusFor(['User acceptance', 'Testing'])).toBe('In Progress');
  });
  it('reopens when a deployed issue goes back', () => {
    expect(ticketStatusFor(['Deployed', 'User acceptance'])).toBe('Pending Customer');
    expect(isFinished('Deployed')).toBe(true);
    expect(isFinished('User acceptance')).toBe(false);
  });
});
