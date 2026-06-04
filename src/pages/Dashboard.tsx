import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, Package, Users, AlertTriangle, ShoppingCart,
  ArrowRight, IndianRupee, Calendar, BarChart3
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, AreaChart, Area
} from 'recharts';
import { StatCard, Card, Badge, LoadingOverlay } from '@/components/ui/index';
import { getRecentBills, getTodayRevenue, getMonthlyRevenue, getSalesChartData } from '@/api/billing';
import { getLowStockProducts } from '@/api/inventory';
import { getProducts } from '@/api/products';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import type { Bill, Product } from '@/types';
import { LOW_STOCK_THRESHOLD } from '@/config/shop';

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [todaySales, setTodaySales] = useState(0);
  const [monthlySales, setMonthlySales] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [today, monthly, products, bills, lowStock, chart] = await Promise.all([
        getTodayRevenue(),
        getMonthlyRevenue(),
        getProducts(),
        getRecentBills(8),
        getLowStockProducts(LOW_STOCK_THRESHOLD),
        getSalesChartData(14),
      ]);
      setTodaySales(today);
      setMonthlySales(monthly);
      setTotalProducts(products.length);
      setRecentBills(bills);
      setLowStockItems(lowStock);
      setChartData(chart);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const paymentMethodBadge = (method: string) => {
    const map: Record<string, any> = {
      cash: { variant: 'success', label: 'Cash' },
      upi: { variant: 'info', label: 'UPI' },
      card: { variant: 'purple', label: 'Card' },
    };
    const m = map[method] || { variant: 'default', label: method };
    return <Badge variant={m.variant}>{m.label}</Badge>;
  };

  if (loading) return <LoadingOverlay />;

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(todaySales)}
          icon={<IndianRupee size={22} />}
          color="blue"
          change="updated now"
          changeType="neutral"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(monthlySales)}
          icon={<TrendingUp size={22} />}
          color="green"
          change="this month"
          changeType="neutral"
        />
        <StatCard
          title="Total Products"
          value={totalProducts}
          icon={<Package size={22} />}
          color="purple"
        />
        <StatCard
          title="Low Stock Alerts"
          value={lowStockItems.length}
          icon={<AlertTriangle size={22} />}
          color={lowStockItems.length > 0 ? 'red' : 'green'}
          change={lowStockItems.length > 0 ? 'Needs attention' : 'All good'}
          changeType={lowStockItems.length > 0 ? 'down' : 'up'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <Card title="Sales Trend (Last 14 Days)" className="lg:col-span-2">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: any) => [formatCurrency(v), 'Revenue']}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    color: '#f1f5f9',
                  }}
                />
                <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2.5} fill="url(#salesGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
              No sales data yet. Create your first bill!
            </div>
          )}
        </Card>

        {/* Low Stock */}
        <Card
          title="Low Stock"
          action={
            <Link to="/inventory" className="text-blue-600 text-xs font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          }
        >
          {lowStockItems.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Package size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">All products are well stocked</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockItems.slice(0, 5).map((product) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{product.product_name}</p>
                    <p className="text-xs text-slate-400">{product.brand}</p>
                  </div>
                  <Badge
                    variant={product.stock_quantity === 0 ? 'danger' : 'warning'}
                    dot
                  >
                    {product.stock_quantity === 0 ? 'Out of stock' : `${product.stock_quantity} left`}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Bills */}
      <Card
        title="Recent Bills"
        action={
          <Link to="/billing" className="text-blue-600 text-xs font-medium hover:underline flex items-center gap-1">
            New Bill <ArrowRight size={12} />
          </Link>
        }
      >
        {recentBills.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <ShoppingCart size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No bills yet. Create your first invoice!</p>
            <Link to="/billing" className="mt-3 inline-block text-blue-600 text-sm font-medium hover:underline">
              Create Bill →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Invoice</th>
                  <th className="text-left py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Customer</th>
                  <th className="text-left py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Date</th>
                  <th className="text-left py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Payment</th>
                  <th className="text-right py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3">
                      <Link
                        to={`/invoice/${bill.id}`}
                        className="font-mono text-blue-600 hover:underline text-xs font-medium"
                      >
                        {bill.invoice_number}
                      </Link>
                    </td>
                    <td className="py-3 text-slate-700 dark:text-slate-300 hidden sm:table-cell">
                      {(bill as any).customer?.customer_name || 'Walk-in'}
                    </td>
                    <td className="py-3 text-slate-500 text-xs hidden md:table-cell">
                      {formatDateTime(bill.created_at)}
                    </td>
                    <td className="py-3">{paymentMethodBadge(bill.payment_method)}</td>
                    <td className="py-3 text-right font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(bill.grand_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
