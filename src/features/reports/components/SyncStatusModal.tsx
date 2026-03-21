import { useEffect } from 'react';
import type { SyncStatusData } from './SyncStatusBadge';

interface SyncStatusModalProps {
  status: SyncStatusData;
  onClose: () => void;
  onRetry: () => Promise<void>;
  loading: boolean;
  onRefresh: () => Promise<void>;
}

export function SyncStatusModal({ status, onClose, onRetry, loading, onRefresh }: SyncStatusModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const getTimeSince = (date: Date | null) => {
    if (!date) return 'Nunca';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `Hace ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Hace ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `Hace ${hours}h`;
  };

  const getCircuitStatusColor = (circuit: string) => {
    switch (circuit) {
      case 'closed': return 'text-green-500 bg-green-500/20';
      case 'open': return 'text-red-500 bg-red-500/20';
      case 'half-open': return 'text-amber-500 bg-amber-500/20';
      default: return 'text-gray-500 bg-gray-500/20';
    }
  };

  const getCircuitStatusText = (circuit: string) => {
    switch (circuit) {
      case 'closed': return 'Normal';
      case 'open': return 'Bloqueado';
      case 'half-open': return 'Reconectando';
      default: return 'Desconocido';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-gray-900 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Estado de Sincronización
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-400">{status.pending}</div>
              <div className="text-xs text-blue-300">Pendientes</div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-amber-400">{status.failed}</div>
              <div className="text-xs text-amber-300">Fallidos</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-400">{status.conflicts}</div>
              <div className="text-xs text-red-300">Conflictos</div>
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
            <span className="text-gray-400 text-sm">Circuit Breaker</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCircuitStatusColor(status.circuitBreaker)}`}>
              {getCircuitStatusText(status.circuitBreaker)}
            </span>
          </div>

          <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
            <span className="text-gray-400 text-sm">Última actividad</span>
            <span className="text-white text-sm">{getTimeSince(status.lastSync)}</span>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onRefresh}
            className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            Actualizar
          </button>
          <button
            onClick={onRetry}
            disabled={loading || status.failed === 0}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              loading || status.failed === 0
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-amber-500 text-white hover:bg-amber-600'
            }`}
          >
            {loading ? 'Reintentando...' : `Reintentar (${status.failed})`}
          </button>
        </div>

        {status.conflicts > 0 && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-300 text-sm">
              Hay {status.conflicts} conflicto(s) que requieren resolución manual.
              Contacte al administrador.
            </p>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-800">
          <p className="text-gray-500 text-xs text-center">
            Los datos se sincronizan automáticamente cada 30 segundos.
          </p>
        </div>
      </div>
    </div>
  );
}
