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
