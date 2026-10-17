import { checkTransition, ticketStatusFor, isFinished, ISSUE_STAGES } from '../../src/utils/issueWorkflow';

const t = (from: string, to: string, extra: Partial<Parameters<typeof checkTransition>[0]> = {}) =>
  checkTransition({ from, to, hasAssignee: true, ...extra });

describe('issue stage transitions', () => {
  it('has the agreed stages in order, ending in Closed', () => {
    expect(ISSUE_STAGES[0]).toBe('Logged');
    expect(ISSUE_STAGES[ISSUE_STAGES.length - 1]).toBe('Closed');
    expect(ISSUE_STAGES).toContain('Customer acceptance');
    expect(ISSUE_STAGES.indexOf('Approved for deployment')).toBeLessThan(ISSUE_STAGES.indexOf('Deployed to production'));
  });

  it('allows moving forward one stage at a time', () => {
    expect(t('Logged', 'Actioning')).toBeNull();
    expect(t('Under development', 'Under testing')).toBeNull();
    expect(t('Deployed to production', 'Customer feedback')).toBeNull();
    expect(t('Customer feedback', 'Closed')).toBeNull();
  });

  it('does not let a stage be skipped', () => {
    expect(t('Logged', 'Under development')).toMatch(/Actioning/);
    expect(t('Under testing', 'Deployed to production')).toMatch(/Customer acceptance/);
    expect(t('Under testing', 'Closed')).not.toBeNull();
  });

  it('needs a note to go backwards', () => {
    expect(t('Under testing', 'Under development')).toMatch(/going back/);
    expect(t('Under testing', 'Under development', { note: 'Failed regression' })).toBeNull();
    expect(t('Closed', 'Customer feedback', { note: 'Customer reported it again' })).toBeNull();
  });

  it('needs an assignee before an issue is picked up', () => {
    expect(t('Actioning', 'Picked up', { hasAssignee: false })).toMatch(/Assign a developer/);
    expect(t('Actioning', 'Picked up', { hasAssignee: true })).toBeNull();
  });

  it('needs the customer contact to approve deployment', () => {
    expect(t('Customer acceptance', 'Approved for deployment')).toMatch(/customer/i);
    expect(t('Customer acceptance', 'Approved for deployment', { customerContact: '  ' })).not.toBeNull();
    expect(t('Customer acceptance', 'Approved for deployment', { customerContact: 'Ali Hassan' })).toBeNull();
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
  it('closes only when every issue is Closed or Cancelled', () => {
    expect(ticketStatusFor(['Closed', 'Closed'])).toBe('Closed');
    expect(ticketStatusFor(['Closed', 'Cancelled'])).toBe('Closed');
    expect(ticketStatusFor(['Closed', 'Under testing'])).toBe('In Progress');
    expect(ticketStatusFor(['Closed', 'On hold'])).toBe('In Progress');
  });
  it('is Open while everything open is still just Logged', () => {
    expect(ticketStatusFor(['Logged', 'Logged'])).toBe('Open');
    expect(ticketStatusFor(['Closed', 'Logged'])).toBe('Open');
  });
  it('waits on the customer when only customer-stage issues remain', () => {
    expect(ticketStatusFor(['Customer acceptance', 'Closed'])).toBe('Pending Customer');
    expect(ticketStatusFor(['Customer feedback', 'Customer acceptance'])).toBe('Pending Customer');
    expect(ticketStatusFor(['Customer feedback', 'Under development'])).toBe('In Progress');
  });
  it('reopens when a closed issue goes back', () => {
    expect(ticketStatusFor(['Closed', 'Customer feedback'])).toBe('Pending Customer');
    expect(isFinished('Closed')).toBe(true);
    expect(isFinished('Customer feedback')).toBe(false);
  });
});
