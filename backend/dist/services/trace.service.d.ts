import { TraceTree } from '../utils/tracer';
export declare class TraceService {
    saveTrace(traceId: string): {
        traceId: string;
        filepath: string;
        dotPath: string;
    } | null;
    getTrace(traceId: string): TraceTree | null;
    listTraces(limit?: number): string[];
    getTraceDot(traceId: string): string | null;
    generateHTML(traceId: string): string;
}
declare const _default: TraceService;
export default _default;
//# sourceMappingURL=trace.service.d.ts.map