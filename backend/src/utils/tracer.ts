import { v4 as uuid } from 'uuid';

export interface TraceSpan {
  id: string;
  parentId?: string;
  operation: string; // e.g., "api.get", "service.getLeads", "db.query"
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

// Thread-local storage for current trace context
const traceContexts = new Map<string, { traceId: string; currentSpan: TraceSpan | null; spans: TraceSpan[] }>();

export function initTrace(traceId?: string) {
  const id = traceId || uuid();
  const context = {
    traceId: id,
    currentSpan: null,
    spans: [] as TraceSpan[],
  };
  traceContexts.set(id, context);
  return id;
}

export function getTraceContext(traceId: string) {
  return traceContexts.get(traceId);
}

export function startSpan(traceId: string, operation: string, input?: any): TraceSpan {
  const context = traceContexts.get(traceId);
  if (!context) throw new Error(`Trace ${traceId} not initialized`);

  const span: TraceSpan = {
    id: uuid(),
    parentId: context.currentSpan?.id,
    operation,
    startTime: Date.now(),
    input,
    status: 'running',
  };

  context.spans.push(span);
  const prev = context.currentSpan;
  context.currentSpan = span;
  return span;
}

export function endSpan(
  traceId: string,
  spanId: string,
  output?: any,
  error?: string
): TraceSpan {
  const context = traceContexts.get(traceId);
  if (!context) throw new Error(`Trace ${traceId} not initialized`);

  const span = context.spans.find((s) => s.id === spanId);
  if (!span) throw new Error(`Span ${spanId} not found`);

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

export function getTrace(traceId: string): TraceTree {
  const context = traceContexts.get(traceId);
  if (!context) throw new Error(`Trace ${traceId} not initialized`);

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
export function traceToGraphviz(trace: TraceTree): string {
  let dot = `digraph trace_${trace.traceId.replace(/-/g, '_')} {\n`;
  dot += `  rankdir=TB;\n`;
  dot += `  graph [fontname="Arial"];\n`;
  dot += `  node [fontname="Arial", shape=box];\n`;
  dot += `  edge [fontname="Arial"];\n\n`;

  const spanMap = new Map<string, TraceSpan>();
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
export function clearTrace(traceId: string) {
  traceContexts.delete(traceId);
}
