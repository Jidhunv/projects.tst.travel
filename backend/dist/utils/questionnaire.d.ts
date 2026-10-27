export type QType = 'text' | 'number' | 'currency' | 'date' | 'select' | 'yesno' | 'contact' | 'product' | 'productMulti' | 'attendees' | 'attendance';
export interface Question {
    key: string;
    stage: string;
    text: string;
    type: QType;
    mandatory: boolean;
    options?: string[];
    help?: string;
}
export declare const QUESTIONS: Question[];
export declare const FIRST_FOUR: readonly string[];
export declare const WON = "Closed-Won";
export declare const LOST = "Closed-Lost";
export declare const questionsFor: (stage: string) => Question[];
export declare const questionByKey: (key: string) => Question | undefined;
export declare const HANDOVER = "Handover";
export declare function prerequisiteStages(target: string): string[];
export declare function visibleStages(current: string): string[];
export declare function statusForStage(stage: string): 'Open' | 'Won' | 'Lost';
export interface DemoAttendee {
    name: string;
    role?: string;
    email?: string;
    phone?: string;
}
export interface DemoAttendance {
    name: string;
    attended: boolean;
    comments?: string;
}
export declare function normaliseAttendees(input: unknown): DemoAttendee[] | null;
export declare function normaliseAttendance(input: unknown): DemoAttendance[] | null;
export declare function validateValue(q: Question, value: string | null): string | null;
//# sourceMappingURL=questionnaire.d.ts.map