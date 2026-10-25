import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class QuestionnaireController {
    get(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    save(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    history(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
declare const _default: QuestionnaireController;
export default _default;
//# sourceMappingURL=questionnaire.controller.d.ts.map