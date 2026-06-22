import React, { useEffect, useState } from 'react';
import RGL, { WidthProvider } from 'react-grid-layout';
import { useTranslation } from 'react-i18next';
import { Settings, Maximize2, Trash } from 'lucide-react';

const ResponsiveGridLayout = WidthProvider(RGL);

interface GridItem {
  id: string;
  type: 'metric_card' | 'smart_grid' | 'rich_text';
  position: { x: number; y: number; w: number; h: number };
  properties: {
    title: string;
    source_table_id?: string;
    source_column_key?: string;
    operation?: 'SUM' | 'AVG' | 'COUNT';
    text_color?: string;
    value?: number | string;
  };
}

interface CanvasEngineProps {
  pageId: string;
  initialLayout: GridItem[];
}

export const CanvasEngine: React.FC<CanvasEngineProps> = ({ pageId, initialLayout }) => {
  const { t } = useTranslation();
  const [layout, setLayout] = useState<GridItem[]>(initialLayout || []);
  const [activeSocket, setActiveSocket] = useState<WebSocket | null>(null);

  // Settings Modal states
  const [editingBlock, setEditingBlock] = useState<GridItem | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editColKey, setEditColKey] = useState<string>('');
  const [editOp, setEditOp] = useState<GridItem['properties']['operation']>('SUM');
  const [editColor, setEditColor] = useState<string>('#10B981');

  // 1. Fetch values for metrics from backend
  const evaluateMetric = async (item: GridItem) => {
    if (!item.properties.source_table_id || !item.properties.source_column_key) {
      return 0;
    }
    try {
      const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      // Load target rows to aggregate values locally or via mock calculations
      const token = localStorage.getItem('omnidesk_token');
      const res = await fetch(`${apiHost}/tables/${item.properties.source_table_id}/rows`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success || !data.rows) return 0;

      const values = data.rows.map((r: any) => parseFloat(r.cells[item.properties.source_column_key!]) || 0);
      
      if (item.properties.operation === 'SUM') {
        return values.reduce((a: number, b: number) => a + b, 0);
      } else if (item.properties.operation === 'AVG') {
        return values.length ? (values.reduce((a: number, b: number) => a + b, 0) / values.length).toFixed(2) : 0;
      } else if (item.properties.operation === 'COUNT') {
        return values.length;
      }
      return 0;
    } catch (e) {
      console.error('Error evaluating metrics calculations:', e);
      return 0;
    }
  };

  const reloadAllMetricsValues = async (currentLayout: GridItem[]) => {
    const updated = await Promise.all(
      currentLayout.map(async (item) => {
        if (item.type === 'metric_card') {
          const val = await evaluateMetric(item);
          return { ...item, properties: { ...item.properties, value: val } };
        }
        return item;
      })
    );
    setLayout(updated);
  };

  useEffect(() => {
    reloadAllMetricsValues(initialLayout);
  }, [initialLayout]);

  // 2. Setup real-time updates via WebSockets
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_SERVER_URL || 'ws://localhost:5000/ws';
    const ws = new WebSocket(`${wsUrl}?pageId=${pageId}`);

    ws.onmessage = (event) => {
      // Reload calculations if a websocket sync update arrives from grid table modifications
      console.log('WS change broadcast event received, recalculating metrics...');
      reloadAllMetricsValues(layout);
    };

    setActiveSocket(ws);

    return () => {
      ws.close();
    };
  }, [pageId]);

  const handleLayoutChange = (newLayout: any) => {
    const updated = layout.map((item) => {
      const match = newLayout.find((l: any) => l.i === item.id);
      if (match) {
        return {
          ...item,
          position: { x: match.x, y: match.y, w: match.w, h: match.h }
        };
      }
      return item;
    });
    // Broadcast newly updated layout locations to websockets
    if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
      activeSocket.send(JSON.stringify({ type: 'layout', layout: updated }));
    }
  };

  // 3. Save block property configurations from modal drawer
  const saveBlockSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBlock) return;

    const updated = layout.map((item) => {
      if (item.id === editingBlock.id) {
        return {
          ...item,
          properties: {
            ...item.properties,
            title: editTitle,
            source_column_key: editColKey,
            operation: editOp,
            text_color: editColor
          }
        };
      }
      return item;
    });

    setEditingBlock(null);
    await reloadAllMetricsValues(updated);
  };

  return (
    <div className="w-full min-h-screen p-6 bg-slate-50">
      {/* Dashboard Top bar Controls */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-slate-800">{t('workspace_title')}</h1>
          <p className="text-xs text-slate-400 font-medium">Drag blocks to re-order layout positions</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={async () => {
              const newCard: GridItem = {
                id: `block_${Date.now()}`,
                type: 'metric_card',
                position: { x: 0, y: 0, w: 4, h: 2 },
                properties: {
                  title: 'New Metric Card',
                  source_table_id: initialLayout[0]?.properties.source_table_id || '',
                  source_column_key: 'col_received_amount',
                  operation: 'SUM',
                  text_color: '#10B981'
                }
              };
              const val = await evaluateMetric(newCard);
              newCard.properties.value = val;
              setLayout([...layout, newCard]);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            {t('add_metric')}
          </button>
        </div>
      </div>

      {/* Grid Canvas Wrapper */}
      <ResponsiveGridLayout
        className="layout"
        cols={12}
        rowHeight={80}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
      >
        {layout.map((item) => (
          <div
            key={item.id}
            data-grid={{
              x: item.position.x,
              y: item.position.y,
              w: item.position.w,
              h: item.position.h,
              minW: 2,
              minH: 2
            }}
            className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col group transition-shadow hover:shadow-md z-0"
          >
            {/* Block Header Drag handle */}
            <div className="drag-handle bg-slate-50 border-b border-slate-200 px-3 py-1.5 flex justify-between items-center cursor-move text-slate-400 select-none">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t('drag_to_move')}</span>
              <div className="flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setEditingBlock(item);
                    setEditTitle(item.properties.title);
                    setEditColKey(item.properties.source_column_key || '');
                    setEditOp(item.properties.operation || 'SUM');
                    setEditColor(item.properties.text_color || '#10B981');
                  }}
                  className="hover:text-blue-600 p-0.5 rounded transition-colors"
                >
                  <Settings className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setLayout(layout.filter((l) => l.id !== item.id))}
                  className="hover:text-rose-600 p-0.5 rounded transition-colors"
                >
                  <Trash className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Block content rendering */}
            <div className="flex-1 p-5 flex flex-col justify-center">
              {item.type === 'metric_card' ? (
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1">
                    {item.properties.title}
                  </span>
                  <span
                    className="text-2xl font-black font-mono block"
                    style={{ color: item.properties.text_color }}
                  >
                    {item.properties.value !== undefined ? item.properties.value.toLocaleString() : '0'}
                  </span>
                </div>
              ) : (
                <div className="text-center py-4 text-xs font-semibold text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                  Smart Table component block preview placeholder
                </div>
              )}
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>

      {/* Edit Config Modal Dialog */}
      {editingBlock && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-slate-800 mb-4">{t('formula_modal_title')}</h3>
            <form onSubmit={saveBlockSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Block Header Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('source_column')}</label>
                <select
                  value={editColKey}
                  onChange={(e) => setEditColKey(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="col_amount_due">Amount Due</option>
                  <option value="col_received_amount">Received Amount</option>
                  <option value="col_invoice_id">Invoice ID</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('operation')}</label>
                <select
                  value={editOp}
                  onChange={(e) => setEditOp(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SUM">SUM (Totals addition)</option>
                  <option value="AVG">AVG (Average calculation)</option>
                  <option value="COUNT">COUNT (Quantity items)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Label Text Color theme</label>
                <select
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="#10B981">Vibrant Green (Success recoveries)</option>
                  <option value="#EF4444">Bright Red (Due balances)</option>
                  <option value="#3B82F6">Royal Blue (Neutral listings)</option>
                  <option value="#F59E0B">Amber Gold (Pending items)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBlock(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-600 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  {t('save_config')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
