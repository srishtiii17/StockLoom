import React from 'react';
import { Inbox, Loader2 } from 'lucide-react';

export function Table({
  columns,
  data = [],
  isLoading = false,
  emptyMessage = 'No records found',
  emptySubtext,
  keyField = 'id',
  onRowClick,
  id,
}) {
  return (
    <div id={id} className="w-full overflow-hidden border border-slate-800 rounded-2xl glass-card">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-medium text-xs uppercase tracking-wider">
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  className={`py-3.5 px-4 font-semibold ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                    <span className="text-xs">Loading records...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="p-3 rounded-full bg-slate-800/60 text-slate-400 border border-slate-700/50">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-medium text-slate-300">{emptyMessage}</span>
                    {emptySubtext && <span className="text-xs text-slate-500">{emptySubtext}</span>}
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={row[keyField] !== undefined ? row[keyField] : rowIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors duration-150 ${
                    onRowClick ? 'cursor-pointer hover:bg-slate-800/50' : 'hover:bg-slate-800/30'
                  }`}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key || colIdx}
                      className={`py-3.5 px-4 text-slate-300 ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      } ${col.className || ''}`}
                    >
                      {col.render ? col.render(row[col.key], row, rowIdx) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
