"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraceController = void 0;
const trace_service_1 = __importDefault(require("../services/trace.service"));
class TraceController {
    async getTraceList(_req, res) {
        try {
            const traces = trace_service_1.default.listTraces(50);
            return res.json({
                success: true,
                data: traces,
                count: traces.length,
            });
        }
        catch (error) {
            return res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }
    async getTrace(req, res) {
        try {
            const { traceId } = req.params;
            const trace = trace_service_1.default.getTrace(traceId);
            if (!trace) {
                return res.status(404).json({ success: false, error: 'Trace not found' });
            }
            return res.json({ success: true, data: trace });
        }
        catch (error) {
            return res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }
    async getTraceVisualization(req, res) {
        try {
            const { traceId } = req.params;
            const html = trace_service_1.default.generateHTML(traceId);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(html);
        }
        catch (error) {
            return res.status(500).send(`<h1>Error: ${error.message}</h1>`);
        }
    }
    async getTraceDot(req, res) {
        try {
            const { traceId } = req.params;
            const dot = trace_service_1.default.getTraceDot(traceId);
            if (!dot) {
                return res.status(404).json({ success: false, error: 'Trace DOT not found' });
            }
            res.setHeader('Content-Type', 'text/plain');
            return res.send(dot);
        }
        catch (error) {
            return res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }
}
exports.TraceController = TraceController;
exports.default = new TraceController();
//# sourceMappingURL=trace.controller.js.map