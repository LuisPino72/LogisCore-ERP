import { useState, useEffect, useCallback } from 'react';
import { SyncEngine } from '@/lib/sync/SyncEngine';
import { SyncStatusModal } from './SyncStatusModal';

export interface SyncStatusData {
  pending: number;
  failed: number;
  conflicts: number;
  circuitBreaker: 'closed' | 'open' | 'half-open';
  lastSync: Date | null;
}

export function SyncStatusBadge() {
  const [status, setStatus] = useState<SyncStatusData>({
    pending: 0,
    failed: 0,
    conflicts: 0,
    circuitBreaker: 'closed',
    lastSync: null,
  });
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadStatus = useCallback(async () => {
    const stats = await SyncEngine.getSyncStats();
    setStatus({
      pending: stats.pending,
      failed: stats.failed,
      conflicts: stats.conflicts,
      circuitBreaker: stats.circuitStatus.status,
      lastSync: stats.circuitStatus.lastFailureTime > 0 
        ? new Date(stats.circuitStatus.lastFailureTime) 
        : null,
    });
  }, []);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const handleRetryFailed = async () => {
    setLoading(true);
    await SyncEngine.retryFailedItems();
    await loadStatus();
    setLoading(false);
  };

  const getStatusColor = () => {
    if (status.conflicts > 0) return 'text-red-500';
    if (status.failed > 0) return 'text-amber-500';
    if (status.pending > 0) return 'text-blue-500';
    return 'text-green-500';
  };

  const getStatusBg = () => {
    if (status.conflicts > 0) return 'bg-red-500/20';
    if (status.failed > 0) return 'bg-amber-500/20';
    if (status.pending > 0) return 'bg-blue-500/20';
    return 'bg-green-500/20';
  };

  const getStatusDot = () => {
    if (status.conflicts > 0) return 'bg-red-500';
    if (status.failed > 0) return 'bg-amber-500';
    if (status.pending > 0) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${getStatusBg()} ${getStatusColor()} transition-colors hover:opacity-80`}
        title={`Sync: ${status.pending} pending, ${status.failed} failed, ${status.conflicts} conflicts`}
      >
        <span className={`w-2 h-2 rounded-full ${getStatusDot()} ${status.pending > 0 ? 'animate-pulse' : ''}`} />
        <span className="text-sm font-medium">
          {status.pending + status.failed + status.conflicts > 0 ? (
            <>{(status.pending + status.failed + status.conflicts)}</>
          ) : (
            <span className="text-green-600">OK</span>
          )}
        </span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>

      {showModal && (
        <SyncStatusModal
          status={status}
          onClose={() => setShowModal(false)}
          onRetry={handleRetryFailed}
          loading={loading}
          onRefresh={loadStatus}
        />
      )}
    </>
  );
}
