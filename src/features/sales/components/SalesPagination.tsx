import { ChevronLeft, ChevronRight } from "lucide-react";

interface SalesPaginationProps {
  currentPage: number;
  totalPages: number;
  filteredCount: number;
  onPageChange: (page: number) => void;
}

export default function SalesPagination({
  currentPage,
  totalPages,
  filteredCount,
  onPageChange,
}: SalesPaginationProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-(--border-color)">
      <p className="text-sm text-(--text-muted)">
        Mostrando {((currentPage - 1) * 25) + 1}-{Math.min(currentPage * 25, filteredCount)} de{" "}
        {filteredCount}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          title="Página anterior"
          className="p-2 hover:bg-(--bg-tertiary) rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-(--text-secondary)" />
        </button>
        <span className="text-sm text-(--text-secondary)">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          title="Página siguiente"
          className="p-2 hover:bg-(--bg-tertiary) rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-(--text-secondary)" />
        </button>
      </div>
    </div>
  );
}
