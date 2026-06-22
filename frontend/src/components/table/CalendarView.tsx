import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, User, FileText, Clock } from 'lucide-react';

interface Column {
  id: string;
  name: string;
  internal_key: string;
  data_type: 'text' | 'number' | 'date' | 'select' | 'formula' | 'boolean';
}

interface Row {
  id: string;
  cells: Record<string, any>;
  display_order: number;
}

interface CalendarViewProps {
  tableId: string;
  columns: Column[];
  rows: Row[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  columns,
  rows
}) => {
  const { t } = useTranslation();

  // Find the first 'date' column to group cards by (e.g. Date)
  const dateColumn = columns.find(col => col.data_type === 'date');

  if (!dateColumn) {
    return (
      <div className="p-8 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl">
        <p className="text-sm font-semibold text-slate-400">
          No Calendar Date Column found. Create a "Date" column to view as Calendar Timeline.
        </p>
      </div>
    );
  }

  const dateKey = dateColumn.internal_key;

  // Group rows by date value
  const groupedByDate: Record<string, Row[]> = {};
  rows.forEach(row => {
    const dVal = row.cells[dateKey] || 'No Date Assigned';
    if (!groupedByDate[dVal]) {
      groupedByDate[dVal] = [];
    }
    groupedByDate[dVal].push(row);
  });

  // Sort dates: latest dates first, "No Date Assigned" at the end
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
    if (a === 'No Date Assigned') return 1;
    if (b === 'No Date Assigned') return -1;
    return new Date(b).getTime() - new Date(a).getTime();
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'pending':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'overdue':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const formatDateLabel = (dateStr: string) => {
    if (dateStr === 'No Date Assigned') return dateStr;
    try {
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateStr).toLocaleDateString('en-US', options);
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {sortedDates.length === 0 || (sortedDates.length === 1 && sortedDates[0] === 'No Date Assigned' && groupedByDate['No Date Assigned'].length === 0) ? (
        <div className="p-8 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl">
          <p className="text-sm font-semibold text-slate-400">No records to display. Add rows containing dates inside the smart grid.</p>
        </div>
      ) : (
        sortedDates.map(dateStr => {
          const items = groupedByDate[dateStr] || [];
          if (items.length === 0) return null;

          return (
            <div key={dateStr} className="relative pl-6 border-l-2 border-slate-800 space-y-3.5">
              {/* Timeline dot */}
              <div className="absolute top-1.5 left-[-6px] h-2.5 w-2.5 rounded-full bg-blue-500 ring-4 ring-slate-950"></div>

              {/* Date Header */}
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-4 w-4 text-blue-400" />
                <h3 className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                  {formatDateLabel(dateStr)}
                </h3>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-850">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Items Card List under Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map(row => {
                  const customerName = row.cells.col_customer_name || 'Unnamed Client';
                  const invoiceId = row.cells.col_invoice_id || 'N/A';
                  const status = row.cells.col_status || '';
                  const amountDue = parseFloat(row.cells.col_amount_due) || 0;
                  const receivedAmount = parseFloat(row.cells.col_received_amount) || 0;

                  return (
                    <div
                      key={row.id}
                      className="bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 p-4 rounded-xl flex flex-col justify-between transition-all"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                            <FileText className="h-3 w-3 text-slate-650" />
                            INV-{invoiceId}
                          </span>
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            {customerName}
                          </h4>
                        </div>
                        {status && (
                          <span className={`px-2 py-0.5 text-[9px] font-black rounded border ${getStatusColor(status)} uppercase tracking-wider`}>
                            {status}
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between text-xs pt-2.5 border-t border-slate-900/60 font-semibold">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Amount Due</span>
                          <span className="font-mono text-slate-300 text-xs">${amountDue.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Received</span>
                          <span className="font-mono text-emerald-400 text-xs">${receivedAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
