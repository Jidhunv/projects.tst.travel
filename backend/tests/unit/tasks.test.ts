import { canAccessRecord, AuthUser } from '../../src/middleware/auth';
import { pickTaskFields, taskFieldError } from '../../src/utils/tasks';

const OWNER = 'owner-1';
const ASSIGNEE = 'assignee-1';
const OTHER = 'other-1';
const CATEGORY = 'category-1';

const user = (id: string, permissions: string[], role = 'Task Role'): AuthUser => ({ id, email: `${id}@test.local`, role, permissions });

// Who can see a task assigned by OWNER to ASSIGNEE, at each read scope.
const canSee = (u: AuthUser) => canAccessRecord(u, 'tasks', OWNER, 'read', [ASSIGNEE]);

describe('task visibility', () => {
  it('lets the assigner and the assignee see the task, and nobody else at self scope', () => {
    const self = ['tasks:read:self'];
    expect(canSee(user(OWNER, self))).toBe(true);
    expect(canSee(user(ASSIGNEE, self))).toBe(true);
    expect(canSee(user(OTHER, self))).toBe(false);
  });

  it('shows every task to a role with read:all', () => {
    expect(canSee(user(OTHER, ['tasks:read:all']))).toBe(true);
  });

  it('gives no access without a read permission', () => {
    expect(canSee(user(OWNER, []))).toBe(false);
  });

  it('keeps the Admin safety net', () => {
    expect(canSee(user(OTHER, [], 'Admin'))).toBe(true);
  });
});

describe('task fields', () => {
  it('keeps only the fields that were sent, trimmed, and treats an empty due date as none', () => {
    expect(pickTaskFields({ title: '  Call client  ', followupDate: '', unknown: 'x' })).toEqual({ title: 'Call client', followupDate: null });
  });

  it('takes the category as a field and refuses to clear it', () => {
    expect(pickTaskFields({ categoryId: CATEGORY })).toEqual({ categoryId: CATEGORY });
    expect(taskFieldError({ categoryId: '' }, false)).toBe('Choose a category for the task');
  });

  it('requires a title and an assignee when creating', () => {
    expect(taskFieldError({ assigneeId: ASSIGNEE }, true)).toBe('A task needs a title');
    expect(taskFieldError({ title: 'Call' }, true)).toBe('Choose who the task is assigned to');
    expect(taskFieldError({ title: 'Call', assigneeId: ASSIGNEE }, true)).toBe('Choose a category for the task');
    expect(taskFieldError({ title: 'Call', assigneeId: ASSIGNEE, categoryId: CATEGORY }, true)).toBeNull();
  });

  it('rejects an unknown status, priority or date format', () => {
    expect(taskFieldError({ status: 'Done' }, false)).toMatch(/Status must be one of/);
    expect(taskFieldError({ priority: 'Urgent' }, false)).toMatch(/Priority must be one of/);
    expect(taskFieldError({ followupDate: '27/10/2026' }, false)).toBe('Enter a valid follow-up date');
  });

  it('keeps actions taken and rejects an overlong one', () => {
    expect(pickTaskFields({ actionsTaken: ' Called the client ' })).toEqual({ actionsTaken: 'Called the client' });
    expect(taskFieldError({ actionsTaken: 'x'.repeat(4001) }, false)).toMatch(/Actions taken must be/);
  });
});
