"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraceService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const tracer_1 = require("../utils/tracer");
const logger_1 = __importDefault(require("../utils/logger"));
const TRACES_DIR = path_1.default.join(__dirname, '../../traces');
// Ensure traces directory exists
if (!fs_1.default.existsSync(TRACES_DIR)) {
    fs_1.default.mkdirSync(TRACES_DIR, { recursive: true });
}
class TraceService {
    // Persist trace to disk after request completes
    saveTrace(traceId) {
        try {
            const trace = (0, tracer_1.getTrace)(traceId);
            const filename = `${traceId}.json`;
            const filepath = path_1.default.join(TRACES_DIR, filename);
            fs_1.default.writeFileSync(filepath, JSON.stringify(trace, null, 2));
            // Also generate DOT for visualization
            const dot = (0, tracer_1.traceToGraphviz)(trace);
            const dotPath = path_1.default.join(TRACES_DIR, `${traceId}.dot`);
            fs_1.default.writeFileSync(dotPath, dot);
            logger_1.default.debug(`Trace saved: ${filepath}`);
            return { traceId, filepath, dotPath };
        }
        catch (err) {
            logger_1.default.error(`Failed to save trace: ${err.message}`);
            return null;
        }
    }
    // Get a saved trace
    getTrace(traceId) {
        const filepath = path_1.default.join(TRACES_DIR, `${traceId}.json`);
        if (!fs_1.default.existsSync(filepath))
            return null;
        const data = fs_1.default.readFileSync(filepath, 'utf-8');
        return JSON.parse(data);
    }
    // List all traces
    listTraces(limit = 20) {
        const files = fs_1.default.readdirSync(TRACES_DIR);
        return files
            .filter((f) => f.endsWith('.json'))
            .sort()
            .reverse()
            .slice(0, limit)
            .map((f) => f.replace('.json', ''));
    }
    // Get DOT representation for visualization
    getTraceDot(traceId) {
        const dotPath = path_1.default.join(TRACES_DIR, `${traceId}.dot`);
        if (!fs_1.default.existsSync(dotPath))
            return null;
        return fs_1.default.readFileSync(dotPath, 'utf-8');
    }
    // Generate HTML visualization of a trace
    generateHTML(traceId) {
        const trace = this.getTrace(traceId);
        if (!trace)
            return '<h1>Trace not found</h1>';
        const duration = (trace.endTime - trace.startTime) / 1000;
        const spansByParent = new Map();
        trace.spans.forEach((span) => {
            const parentId = span.parentId;
            if (!spansByParent.has(parentId)) {
                spansByParent.set(parentId, []);
            }
            spansByParent.get(parentId).push(span);
        });
        const renderSpan = (span, depth = 0) => {
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
exports.TraceService = TraceService;
exports.default = new TraceService();
//# sourceMappingURL=trace.service.js.map