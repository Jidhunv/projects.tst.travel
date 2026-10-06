import React from 'react';

type PageResult<T> = { data?: T[]; meta?: { total: number } };
type Fetcher<T> = (page: number, limit: number) => Promise<{ data: PageResult<T> }>;

// Server-side pagination for a report table. `key` identifies the active
// filters: when it changes the table returns to page 1 and refetches. A
// sequence counter drops responses that arrive after a newer request.
export function usePagedReport<T>(fetchPage: Fetcher<T>, key: string, initialLimit = 25) {
  const [state, setState] = React.useState({ key, page: 0 });
  const [limit, setLimitState] = React.useState(initialLimit);
  const [rows, setRows] = React.useState<T[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const seq = React.useRef(0);
  const fetchRef = React.useRef(fetchPage);
  fetchRef.current = fetchPage;

  // A filter change implies page 1 immediately, without a flash of a stale page.
  const page = state.key === key ? state.page : 0;

  React.useEffect(() => {
    const mine = ++seq.current;
    setLoading(true);
    setError('');
    fetchRef.current(page + 1, limit)
      .then((res) => {
        if (mine !== seq.current) return;
        setRows(res.data.data || []);
        setTotal(res.data.meta?.total ?? (res.data.data || []).length);
      })
      .catch((e) => {
        if (mine !== seq.current) return;
        setRows([]);
        setTotal(0);
        setError(e?.response?.data?.error || e?.message || 'Failed to load');
      })
      .finally(() => {
        if (mine === seq.current) setLoading(false);
      });
  }, [key, page, limit]);

  // Every row matching the current filters, for CSV export.
  const fetchAllRows = React.useCallback(async (): Promise<T[]> => {
    const pageSize = 500;
    const out: T[] = [];
    for (let p = 1; p <= 200; p++) {
      const res = await fetchRef.current(p, pageSize);
      const batch = res.data.data || [];
      out.push(...batch);
      if (out.length >= (res.data.meta?.total ?? 0) || batch.length < pageSize) break;
    }
    return out;
  }, []);

  return {
    rows, total, loading, error, page, limit,
    setPage: (p: number) => setState({ key, page: p }),
    setLimit: (l: number) => { setLimitState(l); setState({ key, page: 0 }); },
    fetchAllRows,
  };
}
