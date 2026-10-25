export declare const LEAD_QUALIFICATION_QUESTIONS: readonly [{
    readonly key: "lq1";
    readonly mandatory: true;
    readonly label: "Why is this a genuine business opportunity, and why pursue it now?";
}, {
    readonly key: "lq2";
    readonly mandatory: true;
    readonly label: "Which product or solution is relevant, and what confirmed customer problem does it solve?";
}, {
    readonly key: "lq3";
    readonly mandatory: true;
    readonly label: "What evidence confirms the customer's need or interest?";
}, {
    readonly key: "lq4";
    readonly mandatory: true;
    readonly label: "Who is the customer contact, what is their buying role, and who are the decision-maker and budget owner?";
}, {
    readonly key: "lq5";
    readonly mandatory: true;
    readonly label: "How urgent is the need, and what is the impact of not acting?";
}, {
    readonly key: "lq6";
    readonly mandatory: true;
    readonly label: "What is the current arrangement, and is a competitor or alternative involved?";
}, {
    readonly key: "lq7";
    readonly mandatory: true;
    readonly label: "What is the estimated deal value, and what assumptions support it?";
}, {
    readonly key: "lq8";
    readonly mandatory: true;
    readonly label: "What is the expected decision timeframe, and what risks could prevent conversion?";
}, {
    readonly key: "lq9";
    readonly mandatory: true;
    readonly label: "What is the agreed next action, who owns it, and when is it due?";
}, {
    readonly key: "lq10";
    readonly mandatory: false;
    readonly label: "Has the full buying committee been mapped?";
}, {
    readonly key: "lq11";
    readonly mandatory: false;
    readonly label: "What is the expected purchase decision date?";
}, {
    readonly key: "lq12";
    readonly mandatory: false;
    readonly label: "Are there additional opportunities or expansion possibilities?";
}];
export type LeadQualificationKey = (typeof LEAD_QUALIFICATION_QUESTIONS)[number]['key'];
export type LeadQualificationAnswers = Partial<Record<LeadQualificationKey, string>>;
export declare function normaliseLeadQualification(input: unknown): LeadQualificationAnswers;
export declare function leadQualificationProgress(stored: LeadQualificationAnswers | null | undefined): {
    answered: number;
    total: number;
    complete: boolean;
    missing: ("lq1" | "lq2" | "lq3" | "lq4" | "lq5" | "lq6" | "lq7" | "lq8" | "lq9")[];
};
//# sourceMappingURL=prospectQualification.d.ts.map