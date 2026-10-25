import { STAKEHOLDER_ROLES } from './constants';
import { AppError } from '../middleware/errorHandler';

export interface CommitteeMemberInput {
  role: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  designationId?: string | null;
}

export interface CommitteeMember {
  role: string;
  name: string;
  email: string | null;
  phone: string | null;
  designationId?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validates the committee payload. A member is only recorded when a name is
// given, and a named member must also have an email and a phone number, so the
// committee can always be reached. Members without a name are skipped (an empty
// row just means that role has not been identified yet).
export function normaliseCommittee(members: CommitteeMemberInput[]): CommitteeMember[] {
  const out: CommitteeMember[] = [];
  for (const m of members) {
    if (!(STAKEHOLDER_ROLES as readonly string[]).includes(m.role)) {
      throw new AppError(400, `Invalid stakeholder role: ${m.role}`);
    }
    const name = (m.name ?? '').trim();
    if (!name) continue;
    const email = (m.email ?? '').trim();
    const phone = (m.phone ?? '').trim();
    if (!email || !phone) {
      throw new AppError(400, `Buying committee member "${name}" (${m.role}) needs an email and a phone number`);
    }
    if (!EMAIL_RE.test(email)) {
      throw new AppError(400, `Buying committee member "${name}" has an invalid email`);
    }
    out.push({
      role: m.role,
      name,
      email,
      phone,
      designationId: m.designationId || undefined,
    });
  }
  return out;
}

// An account has a buying committee once at least one role holds a named member.
export function hasCommitteeMember(rows: Array<{ name?: string | null }>): boolean {
  return rows.some((r) => !!r.name && r.name.trim() !== '');
}
