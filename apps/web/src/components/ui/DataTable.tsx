import React from 'react';
import { Skeleton } from './Skeleton.js';
import { EmptyState } from './EmptyState.js';
import { ChevronLeft, ChevronRight, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface Column<T> {
 key: string;
 header: string;
 sortable?: boolean;
 render?: (row: T) => React.ReactNode;
 className?: string;
}

export interface DataTableProps<T> {
 columns: Column<T>[];
 data: T[];
 total: number;
 page: number;
 pageSize: number;
 onPageChange: (page: number) => void;
 sortBy?: string;
 sortDir?: 'asc' | 'desc';
 onSortChange?: (columnKey: string) => void;
 searchValue?: string;
 onSearchChange?: (search: string) => void;
 searchPlaceholder?: string;
 filterSlot?: React.ReactNode;
 isLoading?: boolean;
 emptyTitle?: string;
 emptyDescription?: string;
 onRowClick?: (row: T) => void;
 cardRender?: (row: T) => React.ReactNode; // For mobile card collapse per Section 14.4
}

export function DataTable<T extends { id?: string | number }>({
 columns,
 data,
 total,
 page,
 pageSize,
 onPageChange,
 sortBy,
 sortDir,
 onSortChange,
 searchValue,
 onSearchChange,
 searchPlaceholder = 'Search records...',
 filterSlot,
 isLoading,
 emptyTitle = 'No records found',
 emptyDescription = 'Try adjusting your search criteria or filters.',
 onRowClick,
 cardRender,
}: DataTableProps<T>) {
 const totalPages = Math.max(1, Math.ceil(total / pageSize));

 return (
 <div className="w-full space-y-4">
 {/* Controls Bar: Search & Filters */}
 <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
 {onSearchChange && (
 <div className="relative flex-1 max-w-sm">
 <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
 <input
 type="text"
 value={searchValue || ''}
 onChange={(e) => onSearchChange(e.target.value)}
 placeholder={searchPlaceholder}
 className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
 />
 </div>
 )}
 {filterSlot && <div className="flex items-center gap-2 overflow-x-auto">{filterSlot}</div>}
 </div>

 {/* Desktop / Tablet Table View (hidden on mobile if cardRender provided) */}
 <div className={cardRender ? 'hidden md:block' : 'block'}>
 <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm text-slate-600 ">
 <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase font-semibold text-slate-500 ">
 <tr>
 {columns.map((col) => (
 <th
 key={col.key}
 scope="col"
 className={`px-4 py-3.5 ${col.className || ''}`}
 onClick={() => col.sortable && onSortChange && onSortChange(col.key)}
 >
 <div
 className={`inline-flex items-center gap-1.5 ${
 col.sortable ? 'cursor-pointer select-none hover:text-slate-900 ' : ''
 }`}
 >
 {col.header}
 {col.sortable && (
 <span className="text-slate-400">
 {sortBy === col.key ? (
 sortDir === 'asc' ? (
 <ArrowUp className="w-3.5 h-3.5 text-brand-600" />
 ) : (
 <ArrowDown className="w-3.5 h-3.5 text-brand-600" />
 )
 ) : (
 <ArrowUpDown className="w-3.5 h-3.5" />
 )}
 </span>
 )}
 </div>
 </th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {isLoading ? (
 Array.from({ length: 5 }).map((_, i) => (
 <tr key={i}>
 {columns.map((col) => (
 <td key={col.key} className="px-4 py-4">
 <Skeleton className="h-4 w-3/4" />
 </td>
 ))}
 </tr>
 ))
 ) : data.length === 0 ? (
 <tr>
 <td colSpan={columns.length} className="py-12 text-center">
 <EmptyState title={emptyTitle} description={emptyDescription} />
 </td>
 </tr>
 ) : (
 data.map((row, idx) => (
 <tr
 key={row.id ? String(row.id) : idx}
 onClick={() => onRowClick && onRowClick(row)}
 className={`transition-colors ${
 onRowClick ? 'cursor-pointer hover:bg-slate-50 ' : ''
 }`}
 >
 {columns.map((col) => (
 <td key={col.key} className={`px-4 py-3.5 ${col.className || ''}`}>
 {col.render ? col.render(row) : (row as any)[col.key] ?? '-'}
 </td>
 ))}
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>

 {/* Mobile Card Collapse (per Section 14.4) */}
 {cardRender && (
 <div className="block md:hidden space-y-3">
 {isLoading ? (
 Array.from({ length: 4 }).map((_, i) => (
 <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
 <Skeleton className="h-5 w-1/2" />
 <Skeleton className="h-4 w-3/4" />
 <Skeleton className="h-4 w-1/3" />
 </div>
 ))
 ) : data.length === 0 ? (
 <EmptyState title={emptyTitle} description={emptyDescription} />
 ) : (
 data.map((row, idx) => (
 <div
 key={row.id ? String(row.id) : idx}
 onClick={() => onRowClick && onRowClick(row)}
 className={`p-4 rounded-xl border border-slate-200 bg-white shadow-sm ${
 onRowClick ? 'cursor-pointer active:bg-slate-50 ' : ''
 }`}
 >
 {cardRender(row)}
 </div>
 ))
 )}
 </div>
 )}

 {/* Pagination Bar */}
 <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 text-xs text-slate-500 ">
 <div>
 Showing <span className="font-semibold text-slate-900 ">{data.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{' '}
 <span className="font-semibold text-slate-900 ">{Math.min(page * pageSize, total)}</span> of{' '}
 <span className="font-semibold text-slate-900 ">{total}</span> records
 </div>
 <div className="flex items-center gap-1.5">
 <button
 onClick={() => onPageChange(page - 1)}
 disabled={page <= 1 || isLoading}
 className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
 aria-label="Previous page"
 >
 <ChevronLeft className="w-4 h-4" />
 </button>
 <span className="px-2 py-1 font-medium">
 Page {page} of {totalPages}
 </span>
 <button
 onClick={() => onPageChange(page + 1)}
 disabled={page >= totalPages || isLoading}
 className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
 aria-label="Next page"
 >
 <ChevronRight className="w-4 h-4" />
 </button>
 </div>
 </div>
 </div>
 );
}
