import fs from 'fs';
import path from 'path';
import { getTrace, traceToGraphviz, TraceTree } from '../utils/tracer';
import logger from '../utils/logger';

const TRACES_DIR = path.join(__dirname, '../../traces');

// Ensure traces directory exists
if (!fs.existsSync(TRACES_DIR)) {
  fs.mkdirSync(TRACES_DIR, { recursive: true });
}

export class TraceService {
  // Persist trace to disk after request completes
  saveTrace(traceId: string) {
    try {
      const trace = getTrace(traceId);
      const filename = `${traceId}.json`;
      const filepath = path.join(TRACES_DIR, filename);
      fs.writeFileSync(filepath, JSON.stringify(trace, null, 2));

      // Also generate DOT for visualization
      const dot = traceToGraphviz(trace);
      const dotPath = path.join(TRACES_DIR, `${traceId}.dot`);
      fs.writeFileSync(dotPath, dot);

      logger.debug(`Trace saved: ${filepath}`);
      return { traceId, filepath, dotPath };
    } catch (err: any) {
      logger.error(`Failed to save trace: ${err.message}`);
      return null;
    }
  }

  // Get a saved trace
  getTrace(traceId: string): TraceTree | null {
    const filepath = path.join(TRACES_DIR, `${traceId}.json`);
    if (!fs.existsSync(filepath)) return null;
    const data = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(data);
  }

  // List all traces
  listTraces(limit: number = 20): string[] {
    const files = fs.readdirSync(TRACES_DIR);
    return files
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, limit)
      .map((f) => f.replace('.json', ''));
  }

  // Get DOT representation for visualization
  getTraceDot(traceId: string): string | null {
    const dotPath = path.join(TRACES_DIR, `${traceId}.dot`);
    if (!fs.existsSync(dotPath)) return null;
    return fs.readFileSync(dotPath, 'utf-8');
  }

  // Generate HTML visualization of a trace
  generateHTML(traceId: string): string {
    const trace = this.getTrace(traceId);
    if (!trace) return '<h1>Trace not found</h1>';

    const duration = (trace.endTime! - trace.startTime) / 1000;
    const spansByParent = new Map<string | undefined, typeof trace.spans>();

    trace.spans.forEach((span) => {
      const parentId = span.parentId;
      if (!spansByParent.has(parentId)) {
        spansByParent.set(parentId, []);
      }
      spansByParent.get(parentId)!.push(span);
    });

    const renderSpan = (span: any, depth: number = 0): string => {
      const indent = '&nbsp;'.repeat(depth * 4);
      const color = span.status === 'error' ? '#ffcccc' : span.status === 'completed' ? '#ccffcc' : '#ccccff';
      let html = `<div style="background:${color}; padding:8px; margin:4px; border-radius:4px; border-left:3px solid #999;">`;
      html += `${indent}<strong>${span.operation}</strong> `;
      html += `<span style="color:#666;">${span.duration || 0}ms</span>`;

      if (span.input) {
        html += `<br/>${indent}<small style="color:#888;">Input: ${JSON.stringify(span.input).substring(0, 100)}</small>`;
      }
      if (span.error) {
        html += `<br/>${indent}<small style="color:#c00;"><strong>Error: ${span.error}</strong></small>`;
      }

      const children = spansByParent.get(span.id) || [];
      children.forEach((child) => {
        html += renderSpan(child, depth + 1);
      });

      html += '</div>';
      return html;
    };

    const rootSpans = spansByParent.get(undefined) || [];
    let spansHtml = rootSpans.map((s) => renderSpan(s)).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <title>Trace ${traceId}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .header { background: #333; color: white; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    .header h1 { margin: 0; }
    .trace-id { font-family: monospace; word-break: break-all; }
    .stats { display: flex; gap: 20px; margin: 20px 0; }
    .stat { background: white; padding: 15px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .stat strong { display: block; color: #666; }
    .stat-value { font-size: 24px; color: #333; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Query Trace</h1>
    <div class="trace-id">Trace ID: ${traceId}</div>
  </div>

  <div class="stats">
    <div class="stat">
      <strong>Total Duration</strong>
      <div class="stat-value">${duration.toFixed(3)}s</div>
    </div>
    <div class="stat">
      <strong>Operations</strong>
      <div class="stat-value">${trace.spans.length}</div>
    </div>
    <div class="stat">
      <strong>Errors</strong>
      <div class="stat-value">${trace.spans.filter((s) => s.status === 'error').length}</div>
    </div>
  </div>

  <h2>Operation Tree</h2>
  <div>${spansHtml}</div>
</body>
</html>
    `;
  }
}

export default new TraceService();
