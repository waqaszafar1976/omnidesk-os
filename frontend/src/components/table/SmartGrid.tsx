import React, { useEffect, useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTranslation } from 'react-i18next';
import { Plus, Settings } from 'lucide-react';
import { KanbanView } from './KanbanView';
import { CalendarView } from './CalendarView';

interface Column {
  id: string;
  name: string;
  internal_key: string;
  data_type: 'text' | 'number' | 'date' | 'select' | 'formula' | 'boolean';
  options?: { choices: string[] };
  formula_expression?: string;
}

interface Row {
  id: string;
  cells: Record<string, any>;
  display_order: number;
}

interface SmartGridProps {
  tableId: string;
}

export const SmartGrid: React.FC<SmartGridProps> = ({ tableId }) => {
  const { t } = useTranslation();
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'grid' | 'kanban' | 'calendar'>('grid');
  
  // Modal configurations state
  const [showAddCol, setShowAddCol] = useState<boolean>(false);
  const [newColName, setNewColName] = useState<string>('');
  const [newColType, setNewColType] = useState<Column['data_type']>('text');
  const [newColChoices, setNewColChoices] = useState<string>('');

  const parentRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Schema Columns & Rows Data
  const loadTableData = async () => {
    try {
      setLoading(true);
      const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      
      const token = localStorage.getItem('omnidesk_token');
      const resSchema = await fetch(`${apiHost}/tables/${tableId}/schema`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const schemaData = await resSchema.json();
      
      const resRows = await fetch(`${apiHost}/tables/${tableId}/rows`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const rowsData = await resRows.json();

      if (schemaData.success) setColumns(schemaData.columns);
      if (rowsData.success) setRows(rowsData.rows);
    } catch (e) {
      console.error('Error loading smart table details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTableData();
  }, [tableId]);

  // 2. Viewport Virtualization setup
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // height of a row in pixels
    overscan: 5,
  });

  // 3. Add dynamic Row
  const handleAddRow = async () => {
    try {
      const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      
      // Setup initial row cells using schema internal keys
      const initialCells: Record<string, any> = {};
      columns.forEach(col => {
        if (col.data_type === 'number') initialCells[col.internal_key] = 0;
        else if (col.data_type === 'select' && col.options?.choices) initialCells[col.internal_key] = col.options.choices[0];
        else initialCells[col.internal_key] = '';
      });

      const token = localStorage.getItem('omnidesk_token');
      const res = await fetch(`${apiHost}/tables/${tableId}/rows`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cells: initialCells })
      });
      const data = await res.json();
      if (data.success) {
        setRows([...rows, data.row]);
      }
    } catch (e) {
      console.error('Error adding table row:', e);
    }
  };

  // 4. Update specific cell
  const handleCellBlur = async (rowId: string, colKey: string, val: any, type: string) => {
    try {
      const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      let parsedVal = val;
      if (type === 'number') parsedVal = parseFloat(val) || 0;

      const token = localStorage.getItem('omnidesk_token');
      const res = await fetch(`${apiHost}/tables/${tableId}/rows/${rowId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cells: { [colKey]: parsedVal } })
      });
      const data = await res.json();
      if (data.success) {
        setRows(rows.map(r => (r.id === rowId ? data.row : r)));
      }
    } catch (e) {
      console.error('Error updating table cell:', e);
    }
  };

  // 5. Add custom column config
  const handleAddColumnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName) return;

    try {
      const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      const body: any = {
        name: newColName,
        data_type: newColType
      };

      if (newColType === 'select' && newColChoices) {
        body.options = { choices: newColChoices.split(',').map(c => c.trim()) };
      }

      const token = localStorage.getItem('omnidesk_token');
      const res = await fetch(`${apiHost}/tables/${tableId}/columns`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setColumns([...columns, data.column]);
        setShowAddCol(false);
        setNewColName('');
        setNewColChoices('');
        // Reload data to ensure newly added columns load values
        loadTableData();
      }
    } catch (e) {
      console.error('Error adding column config:', e);
    }
  };

  // Calculate dynamic bottom operations (e.g. SUM of invoice amount / received amount)
  const calculateColumnSum = (colKey: string) => {
    return rows.reduce((acc, row) => {
      const val = parseFloat(row.cells[colKey]);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  };

  if (loading) {
    return <div className="p-6 text-slate-500 font-medium">Loading Smart Table Registry...</div>;
  }

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      {/* Table Toolbar controls */}
      <div className="bg-slate-50 border-b border-slate-200 p-3 flex justify-between items-center">
        <div className="flex space-x-2">
          <button
            onClick={handleAddRow}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Row</span>
          </button>
          <button
            onClick={() => setShowAddCol(true)}
            className="flex items-center space-x-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Column</span>
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex bg-slate-200 p-0.5 rounded-lg border border-slate-350">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                viewMode === 'grid' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                viewMode === 'kanban' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                viewMode === 'calendar' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Timeline
            </button>
          </div>
          <span className="text-xs text-slate-500 font-semibold">Rows: {rows.length}</span>
        </div>
      </div>

      {/* Spreadsheet Virtualized viewport grid or Kanban/Calendar Views */}
      {viewMode === 'grid' ? (
        <div 
          ref={parentRef} 
          className="w-full overflow-auto max-h-[450px]"
          style={{ minHeight: '200px' }}
        >
          <table className="w-full border-collapse text-left text-sm table-fixed">
          {/* Header */}
          <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10">
            <tr>
              {columns.map(col => (
                <th 
                  key={col.id} 
                  className="px-4 py-2 text-xs font-bold text-slate-600 border-r border-slate-200 w-[180px] bg-slate-100 cursor-default"
                >
                  <div className="flex justify-between items-center">
                    <span>{col.name}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">{col.data_type}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Virtualized Body */}
          <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map(virtualRow => {
              const row = rows[virtualRow.index];
              if (!row) return null;
              return (
                <tr
                  key={row.id}
                  className="hover:bg-slate-50 border-b border-slate-200"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`
                  }}
                >
                  {columns.map(col => {
                    const cellVal = row.cells[col.internal_key] ?? '';
                    
                    return (
                      <td 
                        key={col.id} 
                        className="p-1 border-r border-slate-200 overflow-hidden text-ellipsis whitespace-nowrap"
                      >
                        {col.data_type === 'select' && col.options?.choices ? (
                          <select
                            value={cellVal}
                            onChange={(e) => handleCellBlur(row.id, col.internal_key, e.target.value, col.data_type)}
                            className={`w-full px-2 py-1 text-xs font-semibold rounded border-none bg-transparent cursor-pointer focus:outline-none focus:bg-slate-100 ${
                              cellVal === 'Paid' ? 'text-emerald-700 bg-emerald-50' : 
                              cellVal === 'Pending' ? 'text-amber-700 bg-amber-50' : 'text-rose-700 bg-rose-50'
                            }`}
                          >
                            {col.options.choices.map(choice => (
                              <option key={choice} value={choice}>{choice}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={col.data_type === 'number' ? 'number' : col.data_type === 'date' ? 'date' : 'text'}
                            defaultValue={cellVal}
                            onBlur={(e) => handleCellBlur(row.id, col.internal_key, e.target.value, col.data_type)}
                            className="w-full px-2 py-1 text-xs border-none bg-transparent focus:outline-none focus:bg-slate-100 font-medium text-slate-800"
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>

          {/* Bottom Calculations Row */}
          <tfoot className="sticky bottom-0 bg-slate-50 border-t-2 border-slate-300 font-bold text-xs text-slate-700 z-10">
            <tr>
              {columns.map((col, idx) => {
                const isNumber = col.data_type === 'number';
                const totalVal = isNumber ? calculateColumnSum(col.internal_key) : '';
                return (
                  <td key={col.id} className="px-4 py-2 border-r border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-semibold">{idx === 0 ? 'SUM:' : ''}</span>
                      <span className="font-mono text-slate-800">{isNumber ? totalVal.toLocaleString() : ''}</span>
                    </div>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
      ) : viewMode === 'kanban' ? (
        <div className="p-6 bg-slate-950 border-t border-slate-850">
          <KanbanView
            tableId={tableId}
            columns={columns}
            rows={rows}
            onUpdateRowCell={handleCellBlur}
          />
        </div>
      ) : (
        <div className="p-6 bg-slate-950 border-t border-slate-850 min-h-[300px]">
          <CalendarView
            tableId={tableId}
            columns={columns}
            rows={rows}
          />
        </div>
      )}

      {/* Add Column Config Modal Dialog */}
      {showAddCol && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Create Schema Column</h3>
            <form onSubmit={handleAddColumnSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Column Header Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Received Amount"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Data Input Type</label>
                <select
                  value={newColType}
                  onChange={(e) => setNewColType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="text">Text (Unstructured)</option>
                  <option value="number">Number (Balances/Quantities)</option>
                  <option value="date">Date (Calendar)</option>
                  <option value="select">Dropdown Select Options</option>
                  <option value="boolean">Checkbox parameter</option>
                </select>
              </div>

              {newColType === 'select' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Dropdown Choices (comma-separated)</label>
                  <input
                    type="text"
                    required
                    placeholder="Paid, Pending, Overdue"
                    value={newColChoices}
                    onChange={(e) => setNewColChoices(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCol(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  Add Column
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
