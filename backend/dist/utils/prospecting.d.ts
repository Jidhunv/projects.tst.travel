export declare const PROSPECT_OPTION_CATEGORIES: readonly ["businessType", "employeeBand"];
export type ProspectOptionCategory = (typeof PROSPECT_OPTION_CATEGORIES)[number];
export declare const PROSPECT_TIERS: readonly ["T1", "T2", "T3", "T4", "T5"];
export declare const PROSPECT_SOURCES: readonly ["Referral", "Website", "Event", "Database", "Inbound enquiry", "Other"];
export declare const PROSPECT_QUESTIONS: readonly [{
    readonly key: "name";
    readonly label: "Full legal or trading name of the company";
}, {
    readonly key: "website";
    readonly label: "Company website or other verifiable business profile";
}, {
    readonly key: "location";
    readonly label: "Country, region and city of the business";
}, {
    readonly key: "industry";
    readonly label: "Industry";
}, {
    readonly key: "tier";
    readonly label: "Tier";
}, {
    readonly key: "contact";
    readonly label: "Primary business contact (name, designation, and an email or phone)";
}, {
    readonly key: "owner";
    readonly label: "Owner";
}, {
    readonly key: "businessTypes";
    readonly label: "Business type (one or more)";
}, {
    readonly key: "employeeBands";
    readonly label: "Number of employees (one or more)";
}, {
    readonly key: "branches";
    readonly label: "Branches (one or more, typed as text)";
}, {
    readonly key: "source";
    readonly label: "Source of this account information";
}, {
    readonly key: "verification";
    readonly label: "Verification date and source";
}, {
    readonly key: "duplicates";
    readonly label: "Prospecting notes";
}];
export type ProspectKey = (typeof PROSPECT_QUESTIONS)[number]['key'];
export interface ProspectLocation {
    country: string;
    region: string;
    city: string;
}
export interface ProspectContact {
    name: string;
    designation: string;
    email: string;
    phone: string;
}
export interface ProspectVerification {
    verifiedOn: string;
    source: string;
}
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
export declare const ACCOUNT_INFO_FIELDS: readonly ["name", "industry", "website", "phoneNumber", "alternatePhoneNumber", "type", "contactPerson", "city", "region", "country", "email", "remark", "tier"];
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
export interface ProspectOptionSets {
    businessType: string[];
    employeeBand: string[];
}
export declare function effectiveAnswers(account: ProspectAccountFields, stored: ProspectAnswers | null | undefined): ProspectAnswers;
export declare function normaliseProspecting(input: unknown, options: ProspectOptionSets): ProspectAnswers;
export declare function prospectingProgress(account: ProspectAccountFields, stored: ProspectAnswers | null | undefined, options: ProspectOptionSets): {
    answers: ProspectAnswers;
    answered: number;
    total: 13;
    complete: boolean;
    missing: string[];
};
//# sourceMappingURL=prospecting.d.ts.map