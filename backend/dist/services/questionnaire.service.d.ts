import { Question } from '../utils/questionnaire';
export interface GateContext {
    actorId: string;
    isAdmin: boolean;
    overrideReason?: string;
}
export interface Answer {
    value: string | null;
    status: 'answered' | 'unknown';
    updatedBy: string | null;
    updatedAt: Date | null;
}
declare class QuestionnaireService {
    bank(): Promise<Question[]>;
    private loadOpp;
    private answersFor;
    private satisfied;
    getQuestionnaire(oppId: string): Promise<{
        opportunityId: string;
        stage: string;
        accountId: string;
        stages: {
            stage: string;
            current: boolean;
            complete: boolean;
            mandatoryTotal: number;
            mandatoryAnswered: number;
            questions: {
                key: string;
                text: string;
                type: import("../utils/questionnaire").QType;
                mandatory: boolean;
                options: string[] | null;
                help: string | null;
                answer: Answer | null;
            }[];
        }[];
    }>;
    saveAnswer(oppId: string, key: string, input: {
        value?: string | null;
        status?: string;
    }, actorId: string): Promise<{
        opportunityId: string;
        stage: string;
        accountId: string;
        stages: {
            stage: string;
            current: boolean;
            complete: boolean;
            mandatoryTotal: number;
            mandatoryAnswered: number;
            questions: {
                key: string;
                text: string;
                type: import("../utils/questionnaire").QType;
                mandatory: boolean;
                options: string[] | null;
                help: string | null;
                answer: Answer | null;
            }[];
        }[];
    }>;
    history(oppId: string, key: string): Promise<any>;
    missingFor(oppId: string, target: string): Promise<Question[]>;
    assertGate(oppId: string, target: string, ctx: GateContext): Promise<void>;
}
declare const _default: QuestionnaireService;
export default _default;
//# sourceMappingURL=questionnaire.service.d.ts.map