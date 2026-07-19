import {
  canPerformAction,
  getOwnerScope,
  canAccessRecord,
  canReassign,
  assertOwnsViaAccount,
  AuthUser,
} from '../../src/middleware/auth';

const user = (role: string, permissions: string[] = [], id = 'user-1'): AuthUser => ({
  id,
  email: `${id}@test.local`,
  role,
  permissions,
});

describe('permission resolution', () => {
  describe('canPerformAction', () => {
    it('allows Admin everything, even with no permissions loaded', () => {
      // The Admin bypass is a deliberate anti-lockout net. It is also why
      // testing RBAC as Admin proves nothing.
      const admin = user('Admin', []);
      expect(canPerformAction(admin, 'invoices', 'read')).toBe(true);
      expect(canPerformAction(admin, 'anything', 'delete')).toBe(true);
    });

    it('allows a granted permission at either scope', () => {
      expect(canPerformAction(user('Sales Rep', ['leads:read:all']), 'leads', 'read')).toBe(true);
      expect(canPerformAction(user('Sales Rep', ['leads:read:self']), 'leads', 'read')).toBe(true);
    });

    it('denies when the module, action or scope does not match', () => {
      const rep = user('Sales Rep', ['leads:read:self']);
      expect(canPerformAction(rep, 'leads', 'delete')).toBe(false);
      expect(canPerformAction(rep, 'contracts', 'read')).toBe(false);
    });

    it('denies an unauthenticated caller', () => {
      expect(canPerformAction(undefined, 'leads', 'read')).toBe(false);
    });

    it('does not treat a similarly-named module as a match', () => {
      // Guards against a substring/prefix check creeping in.
      const rep = user('Sales Rep', ['product_categories:read:all']);
      expect(canPerformAction(rep, 'products', 'read')).toBe(false);
    });
  });

  describe('getOwnerScope', () => {
    it('returns undefined ("all records") for all scope and for Admin', () => {
      expect(getOwnerScope(user('Sales Rep', ['leads:read:all']), 'leads')).toBeUndefined();
      expect(getOwnerScope(user('Admin'), 'leads')).toBeUndefined();
    });

    it('returns the user id for self scope', () => {
      expect(getOwnerScope(user('Sales Rep', ['leads:read:self']), 'leads')).toBe('user-1');
    });

    it('falls back to the most restrictive scope when read is not granted', () => {
      // No read permission must not mean "see everything".
      expect(getOwnerScope(user('Sales Rep', []), 'leads')).toBe('user-1');
    });
  });

  describe('canAccessRecord', () => {
    const rep = user('Sales Rep', ['leads:update:self']);

    it('allows the owner at self scope', () => {
      expect(canAccessRecord(rep, 'leads', 'user-1', 'update')).toBe(true);
    });

    it('denies a record owned by someone else', () => {
      expect(canAccessRecord(rep, 'leads', 'user-2', 'update')).toBe(false);
    });

    it('allows an additional assignee at self scope', () => {
      expect(canAccessRecord(rep, 'leads', 'user-2', 'update', ['user-1'])).toBe(true);
    });

    it('allows any record at all scope', () => {
      const mgr = user('Manager', ['leads:update:all']);
      expect(canAccessRecord(mgr, 'leads', 'someone-else', 'update')).toBe(true);
    });

    it('denies when the action itself is not permitted, whoever owns it', () => {
      expect(canAccessRecord(rep, 'leads', 'user-1', 'delete')).toBe(false);
    });
  });

  describe('canReassign', () => {
    it('requires update at all scope', () => {
      expect(canReassign(user('Manager', ['leads:update:all']), 'leads')).toBe(true);
      expect(canReassign(user('Sales Rep', ['leads:update:self']), 'leads')).toBe(false);
    });

    it('denies a self-scoped updater who can read everything', () => {
      // Regression: this combination used to be allowed, because the check
      // resolved the READ scope rather than the update scope. A rep who could
      // see every record but only edit their own could hand records to others.
      const rep = user('Sales Rep', ['leads:update:self', 'leads:read:all']);
      expect(canReassign(rep, 'leads')).toBe(false);
    });

    it('allows Admin', () => {
      expect(canReassign(user('Admin'), 'leads')).toBe(true);
    });

    it('denies with no update permission at all', () => {
      expect(canReassign(user('Sales Rep', ['leads:read:all']), 'leads')).toBe(false);
    });
  });
});

describe('assertOwnsViaAccount', () => {
  // Invoices, contracts, projects and tickets have no owner column: ownership
  // comes from the account plus a personal link.
  it('is a no-op at all scope', () => {
    const mgr = user('Manager', ['contracts:read:all']);
    expect(() => assertOwnsViaAccount(mgr, 'contracts', 'view', 'someone-else')).not.toThrow();
  });

  it('allows the owner of the parent account', () => {
    const rep = user('Sales Rep', ['contracts:read:self']);
    expect(() => assertOwnsViaAccount(rep, 'contracts', 'view', 'user-1')).not.toThrow();
  });

  it('allows a personal link even when the account belongs to someone else', () => {
    // e.g. a project manager on another rep's account.
    const rep = user('Sales Rep', ['projects:read:self']);
    expect(() =>
      assertOwnsViaAccount(rep, 'projects', 'view', 'someone-else', ['user-1'])
    ).not.toThrow();
  });

  it('accepts an array of ids, for multi-assign', () => {
    const rep = user('Sales Rep', ['tickets:read:self']);
    expect(() =>
      assertOwnsViaAccount(rep, 'tickets', 'view', 'someone-else', [undefined, ['a', 'user-1']])
    ).not.toThrow();
  });

  it('throws 403 when nothing links the user to the record', () => {
    const rep = user('Sales Rep', ['contracts:read:self']);
    expect(() => assertOwnsViaAccount(rep, 'contracts', 'view', 'someone-else', [undefined])).toThrow(
      /only view contracts/i
    );
    try {
      assertOwnsViaAccount(rep, 'contracts', 'view', 'someone-else');
    } catch (e: any) {
      expect(e.statusCode).toBe(403);
    }
  });

  it('does not treat an undefined account owner as a match for an undefined link', () => {
    // Regression guard: [undefined].includes(undefined) is true, so a record
    // with no owner must not become accessible to everyone.
    const rep = user('Sales Rep', ['contracts:read:self']);
    expect(() => assertOwnsViaAccount(rep, 'contracts', 'view', undefined, [undefined])).toThrow();
  });
});
