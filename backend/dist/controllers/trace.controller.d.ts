import { Response } from 'express';
import { TracedRequest } from '../middleware/tracing';
export declare class TraceController {
    getTraceList(_req: TracedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    getTrace(req: TracedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    getTraceVisualization(req: TracedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    getTraceDot(req: TracedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
declare const _default: TraceController;
export default _default;
//# sourceMappingURL=trace.controller.d.ts.map