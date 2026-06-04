import React, { useEffect, useState } from 'react';
import { AlertTriangle, Package, RefreshCw, History, TrendingUp, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Badge, LoadingOverlay } from '@/components/ui/index';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { getInventory, getLowStockProducts, updateStock, getStockHistory } from '@/api/inventory';
import { formatCurrency } from '@/utils/formatters';
import { useAuthStore } from '@/store/authStore';
import { LOW_STOCK_THRESHOLD } from '@/config/shop';
import type { Product, StockHistory } from '@/types';

const Inventory: React.FC = () => {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [history, setHistory] = useState<StockHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [tab, setTab] = useState<'all' | 'low' | 'history'>('all');

  const [updateModal, setUpdateModal] = useState<Product | null>(null);
  const [newQty, setNewQty] = useState('');
  const [note, setNote] = useState('');
  const [changeType, setChangeType] = useState<'restock' | 'adjustment'>('restock');
  const [updating, setUpdating] = useState(false);

  useEffect(() => { loadInventory(); }, []);
  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab]);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const [all, low] = await Promise.all([getInventory(), getLowStockProducts(LOW_STOCK_THRESHOLD)]);
      setProducts(all);
      setLowStock(low);
    } catch { toast.error('Failed to load inventory'); }
    finally { setLoading(false); }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await getStockHistory();
      setHistory(data);
    } catch { toast.error('Failed to load history'); }
    finally { setHistoryLoading(false); }
  };

  const handleUpdateStock = async () => {
    if (!updateModal || !newQty) return;
    setUpdating(true);
    try {
      await updateStock(updateModal.id, Number(newQty), changeType, note || `Stock ${changeType}`, user!.id);
      toast.success('Stock updated!');
      setUpdateModal(null);
      setNewQty('');
      setNote('');
      loadInventory();
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally { setUpdating(false); }
  };

  const stockBadge = (qty: number) => {
    if (qty === 0) return <Badge variant="danger" dot>Out of Stock</Badge>;
    if (qty < LOW_STOCK_THRESHOLD) return <Badge variant="warning" dot>{qty} left</Badge>;
    return <Badge variant="success" dot>{qty} in stock</Badge>;
  };

  const displayProducts = tab === 'low' ? lowStock : products;

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600"><Package size={20} /></div>
            <div>
              <p className="text-xs text-slate-500">Total Products</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{products.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-600"><AlertTriangle size={20} /></div>
            <div>
              <p className="text-xs text-slate-500">Low Stock</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{lowStock.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600"><Package size={20} /></div>
            <div>
              <p className="text-xs text-slate-500">Out of Stock</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{products.filter(p => p.stock_quantity === 0).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        {[
          { id: 'all', label: 'All Stock' },
          { id: 'low', label: `Low Stock (${lowStock.length})` },
          { id: 'history', label: 'Stock History' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab !== 'history' ? (
        <Card>
          {loading ? <LoadingOverlay /> : displayProducts.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Package size={48} className="mx-auto mb-3 opacity-30" />
              <p>No products {tab === 'low' ? 'with low stock' : 'found'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    {['Product', 'Brand', 'Category', 'Selling Price', 'Stock Status', 'Action'].map(h => (
                      <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider first:pl-0 last:pr-0 last:text-right">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayProducts.map((p) => (
                    <tr key={p.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${p.stock_quantity < LOW_STOCK_THRESHOLD ? 'bg-amber-50/50 dark:bg-amber-900/5' : ''}`}>
                      <td className="py-3 px-2 pl-0">
                        <p className="font-medium text-slate-900 dark:text-white">{p.product_name}</p>
                        {p.imei_number && <p className="text-xs text-slate-400 font-mono">IMEI: {p.imei_number}</p>}
                      </td>
                      <td className="py-3 px-2 text-slate-600 dark:text-slate-300">{p.brand}</td>
                      <td className="py-3 px-2"><Badge>{p.category}</Badge></td>
                      <td className="py-3 px-2 font-medium text-slate-900 dark:text-white">{formatCurrency(p.selling_price)}</td>
                      <td className="py-3 px-2">{stockBadge(p.stock_quantity)}</td>
                      <td className="py-3 px-2 pr-0 text-right">
                        <Button
                          variant="outline"
                          size="xs"
                          icon={<RefreshCw size={13} />}
                          onClick={() => { setUpdateModal(p); setNewQty(String(p.stock_quantity)); }}
                        >
                          Update
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card title="Stock Change History">
          {historyLoading ? <LoadingOverlay /> : history.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <History size={48} className="mx-auto mb-3 opacity-30" />
              <p>No stock history yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    {['Product', 'Type', 'Change', 'Before', 'After', 'Note', 'Date'].map(h => (
                      <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider first:pl-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-2 pl-0 font-medium text-slate-900 dark:text-white">
                        {(h as any).product?.product_name || '—'}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={h.change_type === 'sale' ? 'info' : h.change_type === 'restock' ? 'success' : 'default'}>
                          {h.change_type}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`flex items-center gap-1 font-semibold ${h.quantity_change < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                          {h.quantity_change < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                          {h.quantity_change > 0 ? '+' : ''}{h.quantity_change}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-slate-500">{h.quantity_before}</td>
                      <td className="py-3 px-2 font-medium text-slate-900 dark:text-white">{h.quantity_after}</td>
                      <td className="py-3 px-2 text-slate-500 text-xs max-w-[160px] truncate">{h.note || '—'}</td>
                      <td className="py-3 px-2 text-slate-400 text-xs">
                        {new Date(h.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Update Stock Modal */}
      <Modal
        isOpen={!!updateModal}
        onClose={() => setUpdateModal(null)}
        title={`Update Stock: ${updateModal?.product_name}`}
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setUpdateModal(null)}>Cancel</Button>
            <Button loading={updating} onClick={handleUpdateStock}>Update Stock</Button>
          </div>
        }
      >
        {updateModal && (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-sm">
              <span className="text-slate-500">Current stock: </span>
              <span className="font-bold text-slate-900 dark:text-white">{updateModal.stock_quantity} units</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setChangeType('restock')}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${changeType === 'restock' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700' : 'border-slate-200 dark:border-slate-700'}`}
              >
                Restock
              </button>
              <button
                onClick={() => setChangeType('adjustment')}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${changeType === 'adjustment' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700' : 'border-slate-200 dark:border-slate-700'}`}
              >
                Adjustment
              </button>
            </div>
            <Input
              label="New Quantity"
              type="number"
              min={0}
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
            />
            <Input
              label="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for update..."
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Inventory;
