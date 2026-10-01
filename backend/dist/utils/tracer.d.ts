export interface TraceSpan {
    id: string;
    parentId?: string;
    operation: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    input?: any;
    output?: any;
    error?: string;
    status: 'running' | 'completed' | 'error';
}
export interface TraceTree {
    traceId: string;
    startTime: number;
    endTime?: number;
    spans: TraceSpan[];
}
export declare function initTrace(traceId?: string): string;
export declare function getTraceContext(traceId: string): {
    traceId: string;
    currentSpan: TraceSpan | null;
    spans: TraceSpan[];
} | undefined;
export declare function startSpan(traceId: string, operation: string, input?: any): TraceSpan;
export declare function endSpan(traceId: string, spanId: string, output?: any, error?: string): TraceSpan;
export declare function getTrace(traceId: string): TraceTree;
export declare function traceToGraphviz(trace: TraceTree): string;
export declare function clearTrace(traceId: string): void;
//# sourceMappingURL=tracer.d.ts.map