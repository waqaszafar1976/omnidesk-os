import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, DollarSign, User, FileText } from 'lucide-react';

interface Column {
  id: string;
  name: string;
  internal_key: string;
  data_type: 'text' | 'number' | 'date' | 'select' | 'formula' | 'boolean';
  options?: { choices: string[] };
}

interface Row {
  id: string;
  cells: Record<string, any>;
  display_order: number;
}

interface KanbanViewProps {
  tableId: string;
  columns: Column[];
  rows: Row[];
  onUpdateRowCell: (rowId: string, colKey: string, value: any, type: string) => Promise<void>;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  columns,
  rows,
  onUpdateRowCell
}) => {
  const { t } = useTranslation();

  // Find the first 'select' column to group cards by (e.g. Status)
  const groupColumn = columns.find(col => col.data_type === 'select');

  if (!groupColumn) {
    return (
      <div className="p-8 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl">
        <p className="text-sm font-semibold text-slate-400">
          No Status or Options Column found. Create a "Dropdown Select" column to view as Kanban.
        </p>
      </div>
    );
  }

  const statusChoices = groupColumn.options?.choices || ['Todo', 'In Progress', 'Done'];
  const statusKey = groupColumn.internal_key;

  // Group rows by status choice
  const groupedCards: Record<string, Row[]> = {};
  statusChoices.forEach(choice => {
    groupedCards[choice] = [];
  });
  const uncategorized: Row[] = [];

  rows.forEach(row => {
    const val = row.cells[statusKey];
    if (statusChoices.includes(val)) {
      groupedCards[val].push(row);
    } else {
      uncategorized.push(row);
    }
  });

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, rowId: string) => {
    e.dataTransfer.setData('text/plain', rowId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const rowId = e.dataTransfer.getData('text/plain');
    if (!rowId) return;

    // Trigger update locally and on server
    await onUpdateRowCell(rowId, statusKey, targetStatus, 'select');
  };

  // Resolve styling classes based on column name for premium headers
  const getHeaderStyle = (choice: string) => {
    switch (choice.toLowerCase()) {
      case 'paid':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'overdue':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      {statusChoices.map(choice => {
        const cards = groupedCards[choice] || [];
        const isHeaderStyle = getHeaderStyle(choice);

        return (
          <div
            key={choice}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, choice)}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col min-h-[400px] hover:border-slate-700/50 transition-all"
          >
            {/* Column Header */}
            <div className="flex justify-between items-center mb-4">
              <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${isHeaderStyle} uppercase tracking-wider`}>
                {choice}
              </span>
              <span className="text-xs font-bold text-slate-500 bg-slate-950 px-2 py-0.5 rounded-full">
                {cards.length}
              </span>
            </div>

            {/* Cards Container */}
            <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[380px] pr-1">
              {cards.length === 0 ? (
                <div className="h-full flex items-center justify-center border border-dashed border-slate-800/80 rounded-xl py-12 text-xs text-slate-600 font-medium select-none">
                  Drag cards here
                </div>
              ) : (
                cards.map(row => {
                  // Resolve display fields
                  const customerName = row.cells.col_customer_name || 'Unnamed Client';
                  const invoiceId = row.cells.col_invoice_id || 'N/A';
                  const amountDue = parseFloat(row.cells.col_amount_due) || 0;
                  const receivedAmount = parseFloat(row.cells.col_received_amount) || 0;
                  const date = row.cells.col_date || '';

                  return (
                    <div
                      key={row.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, row.id)}
                      className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 p-4 rounded-xl shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all transform hover:-translate-y-0.5 select-none relative overflow-hidden group"
                    >
                      {/* Left accent color */}
                      <div className={`absolute top-0 left-0 bottom-0 w-1 ${
                        choice === 'Paid' ? 'bg-emerald-500' :
                        choice === 'Pending' ? 'bg-amber-500' : 'bg-rose-500'
                      }`}></div>

                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                          <FileText className="h-3 w-3 text-slate-600" />
                          INV-{invoiceId}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white mb-3 truncate flex items-center gap-1.5">
                        <User className="h-3 w-3 text-slate-500 shrink-0" />
                        {customerName}
                      </h4>

                      <div className="space-y-1.5 border-t border-slate-900 pt-2.5">
                        <div className="flex justify-between text-[11px] font-medium text-slate-400">
                          <span>Total due:</span>
                          <span className="font-mono text-slate-200">${amountDue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-medium text-slate-400">
                          <span>Received:</span>
                          <span className="font-mono text-emerald-400">${receivedAmount.toLocaleString()}</span>
                        </div>
                        {date && (
                          <div className="flex justify-between text-[10px] font-semibold text-slate-500 pt-1 border-t border-slate-900/50">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {date}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
