"use strict";
// Prospecting questionnaire for an account (Prospects > Prospecting).
// Basic account fields fill the matching answers automatically; a value typed on the
// Prospecting tab overrides them. Every question is mandatory: an account becomes a
// prospect, and only then can it be converted into a lead.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCOUNT_INFO_FIELDS = exports.PROSPECT_QUESTIONS = exports.PROSPECT_SOURCES = exports.PROSPECT_TIERS = exports.PROSPECT_OPTION_CATEGORIES = void 0;
exports.effectiveAnswers = effectiveAnswers;
exports.normaliseProspecting = normaliseProspecting;
exports.prospectingProgress = prospectingProgress;
exports.PROSPECT_OPTION_CATEGORIES = ['businessType', 'employeeBand'];
exports.PROSPECT_TIERS = ['T1', 'T2', 'T3', 'T4', 'T5'];
exports.PROSPECT_SOURCES = ['Referral', 'Website', 'Event', 'Database', 'Inbound enquiry', 'Other'];
exports.PROSPECT_QUESTIONS = [
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
];
// Every Account Info field. All of them must be filled in before an account can become a lead.
exports.ACCOUNT_INFO_FIELDS = [
    'name', 'industry', 'website', 'phoneNumber', 'alternatePhoneNumber', 'type',
    'contactPerson', 'city', 'region', 'country', 'email', 'remark', 'tier',
];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TEXT = 255;
const MAX_NOTE = 1000;
const text = (v) => (typeof v === 'string' ? v.trim() : '');
const list = (v) => (Array.isArray(v) ? v.map(text).filter(Boolean) : []);
// Basic-info values the questionnaire starts from. A typed answer replaces these.
function effectiveAnswers(account, stored) {
    const s = stored ?? {};
    const pick = (typed, basic) => (text(typed) ? text(typed) : text(basic));
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
function isAnswered(key, a, account, options) {
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
            return exports.PROSPECT_TIERS.includes(text(a.tier));
        case 'contact': {
            const c = a.contact ?? {};
            return !!text(c.name) && !!text(c.designation) && (!!text(c.email) || !!text(c.phone));
        }
        case 'owner':
            return !!account.ownerId;
        case 'businessTypes':
            return a.businessTypes.length > 0 && a.businessTypes.every((v) => options.businessType.includes(v));
        case 'employeeBands':
            return a.employeeBands.length > 0 && a.employeeBands.every((v) => options.employeeBand.includes(v));
        case 'branches':
            return a.branches.length > 0;
        case 'source':
            return exports.PROSPECT_SOURCES.includes(text(a.source));
        case 'verification':
            return DATE_RE.test(text(a.verification?.verifiedOn)) && !!text(a.verification?.source);
        case 'duplicates':
            return !!text(a.duplicates);
    }
}
// Validates and cleans what a client sends. Unknown keys are dropped; an invalid value
// throws, so nothing wrong is stored. Blank values are simply not stored.
function normaliseProspecting(input, options) {
    if (input === null || input === undefined)
        return {};
    if (typeof input !== 'object' || Array.isArray(input))
        throw new Error('Prospecting answers must be an object');
    const src = input;
    const out = {};
    const pickText = (key, max = MAX_TEXT) => {
        if (!(key in src))
            return;
        const t = text(src[key]);
        if (t.length > max)
            throw new Error(`${key} is too long (max ${max} characters)`);
        if (t)
            out[key] = t;
    };
    const pickOptions = (key, allowed, label) => {
        if (!(key in src))
            return;
        const values = list(src[key]);
        const bad = values.filter((v) => !allowed.includes(v));
        if (bad.length)
            throw new Error(`${label}: not an active option (${bad.join(', ')})`);
        if (values.length)
            out[key] = [...new Set(values)];
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
        if (!exports.PROSPECT_TIERS.includes(text(src.tier)))
            throw new Error(`Tier must be one of: ${exports.PROSPECT_TIERS.join(', ')}`);
        out.tier = text(src.tier);
    }
    if ('contact' in src && src.contact) {
        const c = src.contact;
        const email = text(c.email);
        if (email && !EMAIL_RE.test(email))
            throw new Error('Primary contact email is not valid');
        out.contact = { name: text(c.name).slice(0, MAX_TEXT), designation: text(c.designation).slice(0, MAX_TEXT), email: email.slice(0, MAX_TEXT), phone: text(c.phone).slice(0, 50) };
    }
    pickOptions('businessTypes', options.businessType, 'Business type');
    pickOptions('employeeBands', options.employeeBand, 'Number of employees');
    // Branches are free text (one per line on the form), so any name is accepted.
    if ('branches' in src) {
        const names = list(src.branches);
        if (names.some((n) => n.length > MAX_TEXT))
            throw new Error(`Each branch must be ${MAX_TEXT} characters or fewer`);
        if (names.length)
            out.branches = [...new Set(names)];
    }
    if ('source' in src && text(src.source)) {
        if (!exports.PROSPECT_SOURCES.includes(text(src.source)))
            throw new Error(`Source must be one of: ${exports.PROSPECT_SOURCES.join(', ')}`);
        out.source = text(src.source);
    }
    if ('verification' in src && src.verification) {
        const v = src.verification;
        const verifiedOn = text(v.verifiedOn);
        if (verifiedOn && !DATE_RE.test(verifiedOn))
            throw new Error('Verification date must be YYYY-MM-DD');
        out.verification = { verifiedOn, source: text(v.source).slice(0, MAX_TEXT) };
    }
    return out;
}
// Progress against the mandatory questions. `complete` is true only when every question is valid.
function prospectingProgress(account, stored, options) {
    const answers = effectiveAnswers(account, stored);
    const unanswered = exports.PROSPECT_QUESTIONS
        .filter((q) => !isAnswered(q.key, answers, account, options))
        .map((q) => q.key);
    // Account Info fields left blank also hold the account back from becoming a lead.
    // The tier is shown on Account Info from the account, or else from the questionnaire, so either one counts.
    const blankInfo = exports.ACCOUNT_INFO_FIELDS.filter((f) => f === 'tier' ? !String(answers.tier ?? '').trim() : !String(account[f] ?? '').trim());
    const missing = [...new Set([...unanswered, ...blankInfo])];
    const total = exports.PROSPECT_QUESTIONS.length;
    return {
        answers,
        answered: total - unanswered.length,
        total,
        complete: missing.length === 0,
        missing,
    };
}
//# sourceMappingURL=prospecting.js.map