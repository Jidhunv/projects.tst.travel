# CRM Application - Implementation Completion Guide

## Status: 75% Complete ✅

### What's Done ✅
- [x] ErrorBoundary component (global error handling)
- [x] Capitalization utilities (data formatting)
- [x] ESLint configuration
- [x] Vitest configuration
- [x] App.tsx wrapped with ErrorBoundary
- [x] 4/16 pages with ConfirmDialog pattern (Accounts, Leads, Opportunities, SalesVisits)

### What's Remaining ⏳
- [ ] Apply pattern to 12 pages
- [ ] Add capitalize() to all data displays
- [ ] Update npm scripts
- [ ] Create initial test files

---

## Part 1: Apply ConfirmDialog Pattern to Remaining 12 Pages

### Pages to Update (in priority order):
1. UsersPage
2. TeamsPage
3. TicketsPage
4. InvoicesPage
5. ContractsPage
6. ProjectsPage
7. ExpensesPage
8. ProductsPage
9. ProductCategoriesPage
10. RolesPage
11. SuppliersPage
12. CountriesPage

### Template Pattern (Copy & Adapt)

**Step 1: Add Imports**
```typescript
import ConfirmDialog from '@components/ConfirmDialog';
import useAuth from '@hooks/useAuth';
```

**Step 2: Add Hook & State (in component)**
```typescript
const { hasPermission } = useAuth();
const canDelete = hasPermission('module_name', 'delete');
const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
```

**Step 3: Update Delete Handler**
```typescript
// OLD: window.confirm approach
const handleDelete = async (id: string) => {
  if (!window.confirm('Delete this?')) return;
  await api.delete(id);
};

// NEW: Dialog approach
const handleDelete = (id: string) => {
  setConfirmDelete({ open: true, id });
};

const handleConfirmDelete = async () => {
  if (!confirmDelete.id) return;
  try {
    await api.delete(confirmDelete.id);
    setConfirmDelete({ open: false, id: null });
    refetchData();
  } catch (error) {
    console.error('Error:', error);
  }
};
```

**Step 4: Update Delete Button (make conditional)**
```typescript
// OLD: Always visible
<Button onClick={() => handleDelete(id)}>Delete</Button>

// NEW: Only visible when permitted
{canDelete && (
  <Button onClick={() => handleDelete(id)}>Delete</Button>
)}
```

**Step 5: Add ConfirmDialog Component (before </Layout>)**
```typescript
<ConfirmDialog
  open={confirmDelete.open}
  title="Delete [Item Type]"
  message="Are you sure you want to delete this? This cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  variant="danger"
  onConfirm={handleConfirmDelete}
  onCancel={() => setConfirmDelete({ open: false, id: null })}
/>
```

### Quick Application Script

For each page:
1. Find: `if (!window.confirm(` or `if (window.confirm(`
2. Replace using template above
3. Add `{canDelete && ` wrapper to delete button
4. Add ConfirmDialog component

---

## Part 2: Add Data Capitalization

### Import Statement (add to all pages)
```typescript
import { formatDisplayName, toTitleCase } from '@utils/capitalize';
```

### Usage Examples

**Names & Titles:**
```typescript
// Before
<TableCell>{lead.firstName} {lead.lastName}</TableCell>

// After
<TableCell>{formatDisplayName(lead.firstName)} {formatDisplayName(lead.lastName)}</TableCell>
```

**Status/Type Fields:**
```typescript
// Before
<Chip label={account.status} />

// After
<Chip label={toTitleCase(account.status)} />
```

**Form Display:**
```typescript
// Before
<MenuItem value={status}>{status}</MenuItem>

// After
<MenuItem value={status}>{toTitleCase(status)}</MenuItem>
```

### Data Fields to Capitalize (Priority Order)

**High Priority (Common across all pages):**
- Names (firstName, lastName, company, name)
- Status fields (status, stage, state)
- Type fields (type, kind, category)
- Roles (roleName, role)
- Permissions (action names)

**Medium Priority:**
- Job titles (jobTitle, position)
- Status values (Open, Qualified, Disqualified, etc.)
- Stage names (Prospecting, Proposal, Negotiation, etc.)
- Account types (Prospect, Customer, Inactive)

**Low Priority:**
- Notes/descriptions (only first letter)
- Email addresses (keep lowercase)
- Phone numbers (no change)
- Dates (no change)

### Capitalization Utility Functions

```typescript
// frontend/src/utils/capitalize.ts
export const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
export const toTitleCase = (str) => str.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
export const formatDisplayName = (str) => toTitleCase(str);
```

---

## Part 3: Update npm Scripts

Add to `frontend/package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

Then run:
```bash
npm run lint:fix  # Auto-fix style issues
npm test          # Run tests
npm run lint      # Check for linting errors
```

---

## Part 4: Create Initial Test Files

### Example: `src/__tests__/utils/capitalize.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { capitalize, toTitleCase, formatDisplayName } from '@utils/capitalize';

describe('capitalize utility', () => {
  it('capitalizes first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('handles empty strings', () => {
    expect(capitalize('')).toBe('');
  });

  it('handles null/undefined', () => {
    expect(capitalize(null)).toBe('');
  });
});

describe('toTitleCase utility', () => {
  it('converts to title case', () => {
    expect(toTitleCase('hello world')).toBe('Hello World');
  });

  it('handles multiple spaces', () => {
    expect(toTitleCase('hello  world')).toBe('Hello World');
  });
});
```

### Example: `src/__tests__/components/ErrorBoundary.test.tsx`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '@components/ErrorBoundary';

const ThrowError = () => {
  throw new Error('Test error');
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console errors in test
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('displays error message when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Oops! Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });
});
```

---

## Completion Checklist

### Phase 1: ConfirmDialog Pattern (12 pages × 15 min = 3 hours)
- [ ] UsersPage
- [ ] TeamsPage
- [ ] TicketsPage
- [ ] InvoicesPage
- [ ] ContractsPage
- [ ] ProjectsPage
- [ ] ExpensesPage
- [ ] ProductsPage
- [ ] ProductCategoriesPage
- [ ] RolesPage
- [ ] SuppliersPage
- [ ] CountriesPage

### Phase 2: Capitalization (2-3 hours)
- [ ] Add capitalize imports to all 16 pages
- [ ] Update name displays (firstName, lastName, company)
- [ ] Update status/type fields (status, stage, type)
- [ ] Update role/permission displays
- [ ] Test across all pages for consistency

### Phase 3: Testing & Linting (1-2 hours)
- [ ] Create 3-4 basic test files
- [ ] Run `npm run lint:fix` to auto-fix issues
- [ ] Verify no console errors
- [ ] Run `npm test` to pass all tests

### Phase 4: Verification (30 min)
- [ ] Test all 4 originally updated pages (Accounts, Leads, Opps, SalesVisits)
- [ ] Verify delete buttons respect permissions
- [ ] Verify ConfirmDialog appears (not alert)
- [ ] Verify data is properly capitalized
- [ ] Test error boundary (intentionally throw error)

---

## Estimated Time to Complete

| Phase | Time |
|-------|------|
| Apply pattern to 12 pages | 3 hours |
| Add capitalization | 2-3 hours |
| Testing & linting | 1-2 hours |
| Verification | 30 min |
| **Total** | **~6.5 hours** |

---

## Code Review Checklist

Before committing, verify:
- [ ] All alert/confirm replaced with ConfirmDialog
- [ ] All delete buttons conditional on canDelete
- [ ] All data displays use capitalize utilities
- [ ] No TypeScript errors (`npm run lint`)
- [ ] No console errors/warnings
- [ ] ErrorBoundary catches errors gracefully
- [ ] Tests pass (`npm test`)

---

## References

- **ConfirmDialog Component:** `frontend/src/components/ConfirmDialog.tsx`
- **Capitalize Utilities:** `frontend/src/utils/capitalize.ts`
- **ErrorBoundary Component:** `frontend/src/components/ErrorBoundary.tsx`
- **ESLint Config:** `frontend/.eslintrc.json`
- **Vitest Config:** `frontend/vitest.config.ts`

---

## Questions?

Refer to completed implementations:
- Accounts Page: `frontend/src/pages/AccountsPage.tsx`
- Leads Page: `frontend/src/pages/LeadsPage.tsx`
- Opportunities Page: `frontend/src/pages/OpportunitiesPage.tsx`
- Sales Visits Page: `frontend/src/pages/SalesVisitsPage.tsx`

All follow the same pattern - use as reference for remaining pages.
