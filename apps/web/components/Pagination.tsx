import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  showInfo?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  showInfo = true,
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // 표시할 페이지 번호 계산 (최대 5개)
  const getPageNumbers = () => {
    const pages: number[] = [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);

    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
      {/* 정보 표시 */}
      {showInfo && (
        <div className="text-sm text-gray-600">
          총 <span className="font-bold">{totalItems.toLocaleString()}</span>개
          중 <span className="font-bold">{startItem.toLocaleString()}</span>-
          <span className="font-bold">{endItem.toLocaleString()}</span> 표시
        </div>
      )}

      {/* 페이지네이션 컨트롤 */}
      <div className="flex items-center gap-1">
        {/* 첫 페이지 */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="첫 페이지"
        >
          <ChevronsLeft size={18} />
        </button>

        {/* 이전 페이지 */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="이전 페이지"
        >
          <ChevronLeft size={18} />
        </button>

        {/* 페이지 번호 */}
        <div className="flex items-center gap-1 mx-2">
          {getPageNumbers().map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`min-w-[36px] h-9 rounded font-bold text-sm transition-colors ${
                currentPage === page
                  ? "bg-black text-white"
                  : "hover:bg-gray-100"
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        {/* 다음 페이지 */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="다음 페이지"
        >
          <ChevronRight size={18} />
        </button>

        {/* 마지막 페이지 */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="마지막 페이지"
        >
          <ChevronsRight size={18} />
        </button>
      </div>
    </div>
  );
}

// 스켈레톤 UI 컴포넌트
export function TableSkeleton({
  rows = 10,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="animate-pulse">
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {Array(cols)
                .fill(0)
                .map((_, i) => (
                  <th key={i} className="px-6 py-3">
                    <div className="h-4 bg-gray-200 rounded w-20" />
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {Array(rows)
              .fill(0)
              .map((_, rowIndex) => (
                <tr key={rowIndex} className="border-t">
                  {Array(cols)
                    .fill(0)
                    .map((_, colIndex) => (
                      <td key={colIndex} className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-full" />
                      </td>
                    ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
