// Prospecting questionnaire for an account (Prospects > Prospecting).
// Basic account fields fill the matching answers automatically; a value typed on the
// Prospecting tab overrides them. Every question is mandatory: an account becomes a
// prospect, and only then can it be converted into a lead.

export const PROSPECT_OPTION_CATEGORIES = ['businessType', 'employeeBand'] as const;
export type ProspectOptionCategory = (typeof PROSPECT_OPTION_CATEGORIES)[number];

export const PROSPECT_TIERS = ['T1', 'T2', 'T3', 'T4', 'T5'] as const;
export const PROSPECT_SOURCES = ['Referral', 'Website', 'Event', 'Database', 'Inbound enquiry', 'Other'] as const;

export const PROSPECT_QUESTIONS = [
  { key: 'name', label: 'Full legal or trading name of the company' },
  { key: 'website', label: 'Company website or other verifiable business profile' },
  { key: 'location', label: 'Country, region and city of the business' },
  { key: 'industry', label: 'Industry' },
  { key: 'tier', label: 'Tier' },
  { key: 'contact', label: 'Primary business contact (name, designation, and an email or phone)' },
  { key: 'owner', label: 'Owner' },
  { key: 'businessTypes', label: 'Business type (one or more)' },
  { key: 'employeeBands', label: 'Number of employees (one or more)' },
  { key: 'branches', label: 'Branches (one or more, typed as text)' },
  { key: 'source', label: 'Source of this account information' },
  { key: 'verification', label: 'Verification date and source' },
  { key: 'duplicates', label: 'Prospecting notes' },
] as const;

export type ProspectKey = (typeof PROSPECT_QUESTIONS)[number]['key'];

export interface ProspectLocation { country: string; region: string; city: string }
export interface ProspectContact { name: string; designation: string; email: string; phone: string }
export interface ProspectVerification { verifiedOn: string; source: string }

// What the user has typed or confirmed. Basic-info values are filled in by effectiveAnswers().
export interface ProspectAnswers {
  name?: string;
  website?: string;
  location?: ProspectLocation;
  industry?: string;
  tier?: string;
  contact?: Partial<ProspectContact>;
  businessTypes?: string[];
  employeeBands?: string[];
  branches?: string[];
  source?: string;
  verification?: Partial<ProspectVerification>;
  duplicates?: string;
}

// Every Account Info field. All of them must be filled in before an account can become a lead.
export const ACCOUNT_INFO_FIELDS = [
  'name', 'industry', 'website', 'phoneNumber', 'alternatePhoneNumber', 'type',
  'contactPerson', 'city', 'region', 'country', 'email', 'remark', 'tier',
] as const;

// The subset of an account's fields that the questionnaire reads.
export interface ProspectAccountFields {
  name?: string | null;
  alternatePhoneNumber?: string | null;
  type?: string | null;
  remark?: string | null;
  website?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  industry?: string | null;
  tier?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  ownerId?: string | null;
}

// Options that are active in the Prospect Options master.
export interface ProspectOptionSets {
  businessType: string[];
  employeeBand: string[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TEXT = 255;
const MAX_NOTE = 1000;

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const list = (v: unknown) => (Array.isArray(v) ? v.map(text).filter(Boolean) : []);

// Basic-info values the questionnaire starts from. A typed answer replaces these.
export function effectiveAnswers(account: ProspectAccountFields, stored: ProspectAnswers | null | undefined): ProspectAnswers {
  const s = stored ?? {};
  const pick = (typed: unknown, basic: unknown) => (text(typed) ? text(typed) : text(basic));
  const contact = s.contact ?? {};
  return {
    name: pick(s.name, account.name),
    website: pick(s.website, account.website),
    location: {
      country: pick(s.location?.country, account.country),
      region: pick(s.location?.region, account.region),
      city: pick(s.location?.city, account.city),
    },
    industry: pick(s.industry, account.industry),
    tier: pick(s.tier, account.tier),
    contact: {
      name: pick(contact.name, account.contactPerson),
      designation: text(contact.designation),
      email: pick(contact.email, account.email),
      phone: pick(contact.phone, account.phoneNumber),
    },
    businessTypes: list(s.businessTypes),
    employeeBands: list(s.employeeBands),
    branches: list(s.branches),
    source: text(s.source),
    verification: { verifiedOn: text(s.verification?.verifiedOn), source: text(s.verification?.source) },
    duplicates: text(s.duplicates),
  };
}

// Whether one question is answered validly. `options` are the active master options.
function isAnswered(key: ProspectKey, a: ProspectAnswers, account: ProspectAccountFields, options: ProspectOptionSets): boolean {
  switch (key) {
    case 'name':
      return !!text(a.name);
    case 'website':
      return !!text(a.website);
    case 'location':
      return !!text(a.location?.country) && !!text(a.location?.region) && !!text(a.location?.city);
    case 'industry':
      return !!text(a.industry);
    case 'tier':
      return (PROSPECT_TIERS as readonly string[]).includes(text(a.tier));
    case 'contact': {
      const c = a.contact ?? ({} as Partial<ProspectContact>);
      return !!text(c.name) && !!text(c.designation) && (!!text(c.email) || !!text(c.phone));
    }
    case 'owner':
      return !!account.ownerId;
    case 'businessTypes':
      return a.businessTypes!.length > 0 && a.businessTypes!.every((v) => options.businessType.includes(v));
    case 'employeeBands':
      return a.employeeBands!.length > 0 && a.employeeBands!.every((v) => options.employeeBand.includes(v));
    case 'branches':
      return a.branches!.length > 0;
    case 'source':
      return (PROSPECT_SOURCES as readonly string[]).includes(text(a.source));
    case 'verification':
      return DATE_RE.test(text(a.verification?.verifiedOn)) && !!text(a.verification?.source);
    case 'duplicates':
      return !!text(a.duplicates);
  }
}

// Validates and cleans what a client sends. Unknown keys are dropped; an invalid value
// throws, so nothing wrong is stored. Blank values are simply not stored.
export function normaliseProspecting(input: unknown, options: ProspectOptionSets): ProspectAnswers {
  if (input === null || input === undefined) return {};
  if (typeof input !== 'object' || Array.isArray(input)) throw new Error('Prospecting answers must be an object');
  const src = input as Record<string, any>;
  const out: ProspectAnswers = {};

  const pickText = (key: string, max = MAX_TEXT) => {
    if (!(key in src)) return;
    const t = text(src[key]);
    if (t.length > max) throw new Error(`${key} is too long (max ${max} characters)`);
    if (t) (out as any)[key] = t;
  };
  const pickOptions = (key: string, allowed: readonly string[], label: string) => {
    if (!(key in src)) return;
    const values = list(src[key]);
    const bad = values.filter((v) => !allowed.includes(v));
    if (bad.length) throw new Error(`${label}: not an active option (${bad.join(', ')})`);
    if (values.length) (out as any)[key] = [...new Set(values)];
  };

  pickText('name');
  pickText('website');
  pickText('industry');
  pickText('duplicates', MAX_NOTE);

  if ('location' in src && src.location) {
    const l = src.location;
    out.location = { country: text(l.country).slice(0, MAX_TEXT), region: text(l.region).slice(0, MAX_TEXT), city: text(l.city).slice(0, MAX_TEXT) };
  }
  if ('tier' in src && text(src.tier)) {
    if (!(PROSPECT_TIERS as readonly string[]).includes(text(src.tier))) throw new Error(`Tier must be one of: ${PROSPECT_TIERS.join(', ')}`);
    out.tier = text(src.tier);
  }
  if ('contact' in src && src.contact) {
    const c = src.contact;
    const email = text(c.email);
    if (email && !EMAIL_RE.test(email)) throw new Error('Primary contact email is not valid');
    out.contact = { name: text(c.name).slice(0, MAX_TEXT), designation: text(c.designation).slice(0, MAX_TEXT), email: email.slice(0, MAX_TEXT), phone: text(c.phone).slice(0, 50) };
  }
  pickOptions('businessTypes', options.businessType, 'Business type');
  pickOptions('employeeBands', options.employeeBand, 'Number of employees');
  // Branches are free text (one per line on the form), so any name is accepted.
  if ('branches' in src) {
    const names = list(src.branches);
    if (names.some((n) => n.length > MAX_TEXT)) throw new Error(`Each branch must be ${MAX_TEXT} characters or fewer`);
    if (names.length) out.branches = [...new Set(names)];
  }
  if ('source' in src && text(src.source)) {
    if (!(PROSPECT_SOURCES as readonly string[]).includes(text(src.source))) throw new Error(`Source must be one of: ${PROSPECT_SOURCES.join(', ')}`);
    out.source = text(src.source);
  }
  if ('verification' in src && src.verification) {
    const v = src.verification;
    const verifiedOn = text(v.verifiedOn);
    if (verifiedOn && !DATE_RE.test(verifiedOn)) throw new Error('Verification date must be YYYY-MM-DD');
    out.verification = { verifiedOn, source: text(v.source).slice(0, MAX_TEXT) };
  }
  return out;
}

// Progress against the mandatory questions. `complete` is true only when every question is valid.
export function prospectingProgress(account: ProspectAccountFields, stored: ProspectAnswers | null | undefined, options: ProspectOptionSets) {
  const answers = effectiveAnswers(account, stored);
  const unanswered = (PROSPECT_QUESTIONS as readonly { key: ProspectKey }[])
    .filter((q) => !isAnswered(q.key, answers, account, options))
    .map((q) => q.key as string);
  // Account Info fields left blank also hold the account back from becoming a lead.
  // The tier is shown on Account Info from the account, or else from the questionnaire, so either one counts.
  const blankInfo = ACCOUNT_INFO_FIELDS.filter((f) =>
    f === 'tier' ? !String(answers.tier ?? '').trim() : !String(account[f] ?? '').trim());
  const missing = [...new Set([...unanswered, ...blankInfo])];
  const total = PROSPECT_QUESTIONS.length;
  return {
    answers,
    answered: total - unanswered.length,
    total,
    complete: missing.length === 0,
    missing,
  };
}
