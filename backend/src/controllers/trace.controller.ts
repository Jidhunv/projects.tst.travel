import { Response } from 'express';
import { TracedRequest } from '../middleware/tracing';
import traceService from '../services/trace.service';

export class TraceController {
  async getTraceList(_req: TracedRequest, res: Response) {
    try {
      const traces = traceService.listTraces(50);
      return res.json({
        success: true,
        data: traces,
        count: traces.length,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getTrace(req: TracedRequest, res: Response) {
    try {
      const { traceId } = req.params;
      const trace = traceService.getTrace(traceId);
      if (!trace) {
        return res.status(404).json({ success: false, error: 'Trace not found' });
      }
      return res.json({ success: true, data: trace });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getTraceVisualization(req: TracedRequest, res: Response) {
    try {
      const { traceId } = req.params;
      const html = traceService.generateHTML(traceId);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    } catch (error: any) {
      return res.status(500).send(`<h1>Error: ${error.message}</h1>`);
    }
  }

  async getTraceDot(req: TracedRequest, res: Response) {
    try {
      const { traceId } = req.params;
      const dot = traceService.getTraceDot(traceId);
      if (!dot) {
        return res.status(404).json({ success: false, error: 'Trace DOT not found' });
      }
      res.setHeader('Content-Type', 'text/plain');
      return res.send(dot);
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export default new TraceController();
