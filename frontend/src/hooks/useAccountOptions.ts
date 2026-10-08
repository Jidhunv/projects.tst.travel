import React from 'react';
import { api } from '@services/api';

// Options for an account drop-down, searched on the server. The old pattern loaded the first
// 20-200 accounts once, so any account outside that slice - including ones that already had
// opportunities - could not be picked. This keeps the list small and fetches matches as the user types.
export function useAccountOptions(selectedId?: string) {
  const [list, setList] = React.useState<any[]>([]);
  const [pinned, setPinned] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);
  const query = React.useRef('');
  const seq = React.useRef(0);
  const timer = React.useRef<ReturnType<typeof setTimeout>>();

  const load = React.useCallback(async (q: string) => {
    const mine = ++seq.current;
    query.current = q;
    setLoading(true);
    try {
      const r = await api.getAccounts(1, 25, q ? { search: q } : {});
      if (mine !== seq.current) return;
      setList([...(r.data.data || [])].sort((a: any, b: any) => a.name.localeCompare(b.name)));
      setError(false);
    } catch (e) {
      if (mine !== seq.current) return;
      console.error('Error loading accounts:', e);
      setError(true);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(''); }, [load]);
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // Keep the chosen account selectable even when the current search results do not include it.
  React.useEffect(() => {
    if (!selectedId) { setPinned(null); return; }
    const inList = list.find((a) => a.id === selectedId);
    if (inList) { setPinned(inList); return; }
    if (pinned?.id === selectedId) return;
    api.getAccount(selectedId).then((r) => setPinned(r.data.data || null)).catch(() => undefined);
  }, [selectedId, list]); // eslint-disable-line react-hooks/exhaustive-deps

  const accounts = React.useMemo(
    () => (pinned && !list.some((a) => a.id === pinned.id) ? [pinned, ...list] : list),
    [list, pinned]
  );

  const search = React.useCallback((q: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => load(q.trim()), 250);
  }, [load]);

  // Stable identity: callers list `reload` in effect dependencies, and a fresh function each render
  // would re-run that effect forever.
  const reload = React.useCallback(() => load(query.current), [load]);

  return { accounts, loading, error, reload, search };
}
