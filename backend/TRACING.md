# Query Tracing & Debugging

This CRM includes a built-in tracing system to visualize data flow and troubleshoot query execution.

## How It Works

Every request is automatically traced:
1. **API request** enters the system
2. **Service layer** logs each operation (database queries, business logic)
3. **Response** is returned with a `X-Trace-ID` header
4. **Trace is saved** to disk as JSON + Graphviz DOT format

## Using the Tracing System

### 1. Make a Request
```bash
curl http://localhost:3001/api/leads
```

The response headers include `X-Trace-ID`. Look for it:
```
X-Trace-ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

Or check the server logs:
```
[TRACE a1b2c3d4-e5f6-7890-abcd-ef1234567890] GET /api/leads → 200
```

### 2. View Trace as HTML

Open the trace visualization in your browser:
```
http://localhost:3001/api/traces/{traceId}/view
```

This shows:
- **Total duration** of the request
- **Number of operations** (API → service → database)
- **Operation tree** with timings and status (running/completed/error)
- **Errors** highlighted in red if any operation failed

### 3. Get Trace as JSON

Retrieve the raw trace data:
```bash
curl http://localhost:3001/api/traces/{traceId}
```

Response:
```json
{
  "traceId": "a1b2c3d4-...",
  "startTime": 1718000000000,
  "endTime": 1718000000150,
  "spans": [
    {
      "id": "span-1",
      "operation": "api.GET /api/leads",
      "duration": 150,
      "status": "completed",
      "input": { "method": "GET", "path": "/api/leads" },
      "output": { "statusCode": 200 }
    },
    {
      "id": "span-2",
      "parentId": "span-1",
      "operation": "service.lead.getLeads",
      "duration": 120,
      "status": "completed",
      "input": { "page": 1, "limit": 20 },
      "output": { "count": 20, "total": 156 }
    }
  ]
}
```

### 4. Generate Graph (Graphviz DOT)

Get the trace as a directed acyclic graph:
```bash
curl http://localhost:3001/api/traces/{traceId}/dot
```

Output can be visualized with Graphviz:
```bash
curl http://localhost:3001/api/traces/{traceId}/dot | dot -Tsvg > trace.svg
```

Or online at [Dreampuf GraphViz](https://dreampuf.github.io/GraphvizOnline/).

### 5. List Recent Traces

See the last 50 traces:
```bash
curl http://localhost:3001/api/traces
```

Response:
```json
{
  "success": true,
  "data": [
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "b2c3d4e5-f6g7-8901-bcde-fg2345678901",
    ...
  ],
  "count": 50
}
```

## Understanding the Trace

### Span Structure

Each operation is a "span" with:
- **id**: Unique identifier for this operation
- **parentId**: ID of the parent span (null for root API request)
- **operation**: Human-readable name (e.g., `service.lead.getLeads`)
- **status**: `running`, `completed`, or `error`
- **duration**: How long this operation took (milliseconds)
- **input**: What went in (query parameters, database filters, etc.)
- **output**: What came out (query results, row counts, etc.)
- **error**: Error message if status is `error`

### Example: "Lead gets slow"

If `/api/leads` is slow, the trace shows:

```
api.GET /api/leads (250ms)
  └─ service.lead.getLeads (200ms)  ← slowest operation!
       └─ (database query happens here)
  └─ (other operations, fast)
```

You can now pinpoint that `getLeads` is the bottleneck.

## Troubleshooting with Traces

### Scenario 1: "Convert to opportunity throws an error"

1. Try the convert action in the app
2. Note the returned `X-Trace-ID`
3. Open `/api/traces/{traceId}/view` in your browser
4. Find the red (error) span, read the error message
5. Look at the operation tree to see **where** it failed

Example:
```
api.POST /api/leads/{id}/convert-to-opportunity (500ms)
  └─ service.lead.convertLeadToOpportunity (400ms)  ← ERROR
       └─ (tried to create account, failed)
```

### Scenario 2: "Why is the MIS report taking 5 seconds?"

1. Load the Reports page
2. Check the X-Trace-ID for the MIS API call in browser dev tools
3. Open `/api/traces/{traceId}/view`
4. See the breakdown:
   - Pipeline calculation: 100ms
   - Sales summary queries: 200ms
   - Per-salesperson queries: 3500ms  ← the slowdown!

You now know to optimize the per-rep queries.

### Scenario 3: "A query returns wrong data"

The trace's `output` field shows exactly what the database returned. Compare it to what you expected.

## Adding Tracing to Your Code

To trace a new service method:

```typescript
import { startSpan, endSpan } from '../utils/tracer';

async myMethod(filters, traceId?: string) {
  let span;
  if (traceId) {
    span = startSpan(traceId, 'service.myFeature.myMethod', { filters });
  }

  try {
    const result = await this.db.query(filters);
    if (traceId && span) {
      endSpan(traceId, span.id, { rowCount: result.length });
    }
    return result;
  } catch (err: any) {
    if (traceId && span) {
      endSpan(traceId, span.id, undefined, err.message);
    }
    throw err;
  }
}
```

Then in the controller, pass `req.traceId`:

```typescript
const result = await myService.myMethod(filters, req.traceId);
```

## Trace Storage

Traces are saved to `backend/traces/` as:
- `{traceId}.json` — Full trace data
- `{traceId}.dot` — Graphviz format (for visualization)

## Performance Notes

- Tracing adds minimal overhead (~1-2ms per request)
- Traces are saved **after** the response is sent (non-blocking)
- Old traces can be manually cleaned up from `backend/traces/` directory

---

**Happy debugging!**
