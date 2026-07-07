import { useState, useEffect } from 'react';
import { api } from '@services/api';

export function usePendingFollowups() {
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingFollowups, setPendingFollowups] = useState<any[]>([]);

  useEffect(() => {
    const loadPending = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const response = await api.getSalesVisits({
          toDate: today,
          showPendingOnly: true,
        });

        if (response.data.success) {
          const pending = (response.data.data || []).filter(
            (v: any) => v.followupDate && !v.followupCompleted
          );
          setPendingFollowups(pending);
          setPendingCount(pending.length);
        }
      } catch (error) {
        console.error('Error loading pending followups:', error);
      }
    };

    loadPending();
    const interval = setInterval(loadPending, 60000); // Poll every 60 seconds

    return () => clearInterval(interval);
  }, []);

  return { pendingCount, pendingFollowups };
}
