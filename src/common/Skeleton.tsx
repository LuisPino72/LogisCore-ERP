interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export function TableSkeleton({ rows = 5, cols = 5 }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-(--border-color)/50">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <td key={colIndex} className="py-4 px-4">
              <div className="animate-pulse">
                {colIndex === 0 ? (
                  <div className="h-4 w-24 bg-slate-700 rounded" />
                ) : colIndex === cols - 1 ? (
                  <div className="h-4 w-16 bg-slate-700 rounded ml-auto" />
                ) : (
                  <div className="h-4 bg-slate-700 rounded" 
                       style={{ width: `${60 + Math.random() * 40}%` }} />
                )}
              </div>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

interface CardSkeletonProps {
  lines?: number;
}

export function CardSkeleton({ lines = 4 }: CardSkeletonProps) {
  return (
    <div className="animate-pulse space-y-3 p-6">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-700 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-slate-700 rounded w-3/4" />
            <div className="h-2 bg-slate-700 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface StatSkeletonProps {
  count?: number;
}

export function StatsSkeleton({ count = 3 }: StatSkeletonProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-(--bg-secondary) border border-(--border-color) rounded-xl p-4 animate-pulse">
          <div className="h-3 w-16 bg-slate-700 rounded mb-2" />
          <div className="h-6 w-20 bg-slate-700 rounded" />
        </div>
      ))}
    </div>
  );
}
