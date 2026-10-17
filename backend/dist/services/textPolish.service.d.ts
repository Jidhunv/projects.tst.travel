import { PolishContext } from '../utils/textPolish';
export interface PolishResult {
    text: string;
    engine: 'ai' | 'basic';
    note?: string;
}
declare class TextPolishService {
    isAiEnabled(): boolean;
    polish(raw: string, ctx: PolishContext): Promise<PolishResult>;
}
declare const _default: TextPolishService;
export default _default;
//# sourceMappingURL=textPolish.service.d.ts.map