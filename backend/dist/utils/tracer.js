"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initTrace = initTrace;
exports.getTraceContext = getTraceContext;
exports.startSpan = startSpan;
exports.endSpan = endSpan;
exports.getTrace = getTrace;
exports.traceToGraphviz = traceToGraphviz;
exports.clearTrace = clearTrace;
const uuid_1 = require("uuid");
// Thread-local storage for current trace context
const traceContexts = new Map();
function initTrace(traceId) {
    const id = traceId || (0, uuid_1.v4)();
    const context = {
        traceId: id,
        currentSpan: null,
        spans: [],
    };
    traceContexts.set(id, context);
    return id;
}
function getTraceContext(traceId) {
    return traceContexts.get(traceId);
}
function startSpan(traceId, operation, input) {
    const context = traceContexts.get(traceId);
    if (!context)
        throw new Error(`Trace ${traceId} not initialized`);
    const span = {
        id: (0, uuid_1.v4)(),
        parentId: context.currentSpan?.id,
        operation,
        startTime: Date.now(),
        input,
        status: 'running',
    };
    context.spans.push(span);
    context.currentSpan = span;
    return span;
}
function endSpan(traceId, spanId, output, error) {
    const context = traceContexts.get(traceId);
    if (!context)
        throw new Error(`Trace ${traceId} not initialized`);
    const span = context.spans.find((s) => s.id === spanId);
    if (!span)
        throw new Error(`Span ${spanId} not found`);
    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.output = output;
    span.error = error;
    span.status = error ? 'error' : 'completed';
    // Restore parent span as current
    const parentSpan = context.spans.find((s) => s.id === span.parentId);
    context.currentSpan = parentSpan || null;
    return span;
}
function getTrace(traceId) {
    const context = traceContexts.get(traceId);
    if (!context)
        throw new Error(`Trace ${traceId} not initialized`);
    const spans = context.spans;
    const startTime = Math.min(...spans.map((s) => s.startTime));
    const endTime = Math.max(...spans.map((s) => s.endTime || Date.now()));
    return {
        traceId,
        startTime,
        endTime,
        spans: spans.sort((a, b) => a.startTime - b.startTime),
    };
}
// Convert trace to Graphviz DOT format for visualization
function traceToGraphviz(trace) {
    let dot = `digraph trace_${trace.traceId.replace(/-/g, '_')} {\n`;
    dot += `  rankdir=TB;\n`;
    dot += `  graph [fontname="Arial"];\n`;
    dot += `  node [fontname="Arial", shape=box];\n`;
    dot += `  edge [fontname="Arial"];\n\n`;
    const spanMap = new Map();
    trace.spans.forEach((span) => spanMap.set(span.id, span));
    trace.spans.forEach((span) => {
        const duration = span.duration || 0;
        const color = span.status === 'error' ? '#ff6b6b' : span.status === 'completed' ? '#51cf66' : '#4dabf7';
        const label = `${span.operation}\\n${duration}ms`;
        dot += `  "${span.id}" [label="${label}", fillcolor="${color}", style=filled];\n`;
        if (span.parentId) {
            dot += `  "${span.parentId}" -> "${span.id}";\n`;
        }
    });
    dot += `}\n`;
    return dot;
}
// Clean up trace after request
function clearTrace(traceId) {
    traceContexts.delete(traceId);
}
//# sourceMappingURL=tracer.js.map