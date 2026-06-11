import React, { useEffect, useState } from 'react';
import { Download, BarChart2, Calendar, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Card, LoadingOverlay, Badge } from '@/components/ui/index';
import { Button } from '@/components/ui/Button';
import {
  getDailySalesReport, getMonthlySummary,
  getProductWiseSales, getCustomerWiseSales
} from '@/api/reports';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';

type ReportType = 'daily' | 'monthly' | 'product' | 'customer';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

const Reports: React.FC = () => {
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [downloading, setDownloading] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => { loadReport(); }, [reportType, startDate, endDate, year]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const filters = {
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate + 'T23:59:59').toISOString(),
      };

      let result: any[] = [];
      switch (reportType) {
        case 'daily': result = await getDailySalesReport(filters); break;
        case 'monthly': result = await getMonthlySummary(year); break;
        case 'product': result = await getProductWiseSales(filters); break;
        case 'customer': result = await getCustomerWiseSales(filters); break;
      }
      setData(result);
    } catch (err) { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    if (data.length === 0) return toast.error('No data to export');
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row =>
      Object.values(row).map(v => (typeof v === 'object' ? JSON.stringify(v) : v)).join(',')
    ).join('\n');
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_report_${today}.csv`;
    a.click();
    toast.success('CSV exported!');
  };

  const exportPDF = async () => {
    const el = document.getElementById('report-content');
    if (!el) return;
    setDownloading(true);
    try {
      console.log('Starting Report PDF export with html2canvas...');
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', logging: true });
      console.log('html2canvas render complete. Generating PDF...');
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${reportType}_report_${today}.pdf`);
      toast.success('PDF exported!');
    } catch (err: any) { 
      console.error('Report PDF Export Error:', err);
      toast.error(`PDF export failed: ${err?.message || 'Unknown error'}`); 
    }
    finally { setDownloading(false); }
  };

  const totalRevenue = reportType === 'daily'
    ? data.reduce((s, b) => s + Number(b.grand_total), 0)
    : reportType === 'monthly'
    ? data.reduce((s, b) => s + Number(b.total), 0)
    : reportType === 'product'
    ? data.reduce((s, b) => s + Number(b.total_revenue), 0)
    : data.reduce((s, b) => s + Number(b.total_spent), 0);

  return (
    <div className="space-y-5">
      {/* Controls */}
      <Card>
        <div className="flex flex-wrap gap-4 items-end justify-between">
          <div className="flex flex-wrap gap-3">
            {/* Report type tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
              {[
                { id: 'daily', label: 'Daily' },
                { id: 'monthly', label: 'Monthly' },
                { id: 'product', label: 'Product-wise' },
                { id: 'customer', label: 'Customer-wise' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setReportType(t.id as ReportType)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    reportType === t.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Date filters */}
            {reportType === 'monthly' ? (
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-slate-400" />
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-slate-400" />
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="text-slate-400 text-sm">to</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon={<Download size={14} />} onClick={exportCSV}>CSV</Button>
            <Button size="sm" icon={<FileText size={14} />} loading={downloading} onClick={exportPDF}>PDF</Button>
          </div>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500">Total Revenue</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500">Records</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{data.length}</p>
        </div>
        {reportType === 'daily' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500">Avg. Bill Value</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {data.length > 0 ? formatCurrency(totalRevenue / data.length) : '₹0'}
            </p>
          </div>
        )}
      </div>

      <div id="report-content">
        {loading ? <LoadingOverlay /> : data.length === 0 ? (
          <Card>
            <div className="text-center py-16 text-slate-400">
              <BarChart2 size={48} className="mx-auto mb-3 opacity-30" />
              <p>No data for selected period</p>
            </div>
          </Card>
        ) : (
          <>
            {/* Chart */}
            {(reportType === 'monthly' || reportType === 'product') && (
              <Card title={reportType === 'monthly' ? 'Monthly Sales' : 'Top Products by Revenue'}>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={reportType === 'monthly' ? data : data.slice(0, 10)} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
                    <XAxis dataKey={reportType === 'monthly' ? 'month' : 'product_name'} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => [formatCurrency(v), 'Revenue']}
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#f1f5f9' }} />
                    <Bar dataKey={reportType === 'monthly' ? 'total' : 'total_revenue'} fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Data Table */}
            <Card title="Detailed Report" className="mt-5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  {reportType === 'daily' && (
                    <>
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          {['Invoice', 'Customer', 'Date', 'Payment', 'Subtotal', 'GST', 'Discount', 'Total'].map(h => (
                            <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {data.map((b: any) => (
                          <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-3 px-2 font-mono text-xs text-blue-600 font-semibold">{b.invoice_number}</td>
                            <td className="py-3 px-2 text-slate-700 dark:text-slate-300">{b.customer?.customer_name || 'Walk-in'}</td>
                            <td className="py-3 px-2 text-slate-500 text-xs">{formatDateTime(b.created_at)}</td>
                            <td className="py-3 px-2"><Badge variant={b.payment_method === 'cash' ? 'success' : b.payment_method === 'upi' ? 'info' : 'purple'}>{b.payment_method}</Badge></td>
                            <td className="py-3 px-2 text-slate-700">{formatCurrency(b.subtotal)}</td>
                            <td className="py-3 px-2 text-slate-500">{formatCurrency(b.gst_amount)}</td>
                            <td className="py-3 px-2 text-emerald-600">{formatCurrency(b.discount_amount)}</td>
                            <td className="py-3 px-2 font-bold text-slate-900 dark:text-white">{formatCurrency(b.grand_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}
                  {reportType === 'monthly' && (
                    <>
                      <thead><tr className="border-b border-slate-200 dark:border-slate-700">
                        {['Month', 'Bills', 'Revenue'].map(h => <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>)}
                      </tr></thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {data.map((m: any) => (
                          <tr key={m.month} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-3 px-2 font-medium text-slate-900 dark:text-white">{m.month}</td>
                            <td className="py-3 px-2 text-slate-600">{m.count}</td>
                            <td className="py-3 px-2 font-semibold text-blue-600">{formatCurrency(m.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}
                  {reportType === 'product' && (
                    <>
                      <thead><tr className="border-b border-slate-200 dark:border-slate-700">
                        {['Product', 'Brand', 'Category', 'Qty Sold', 'Revenue'].map(h => <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>)}
                      </tr></thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {data.map((p: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-3 px-2 font-medium text-slate-900 dark:text-white">{p.product_name}</td>
                            <td className="py-3 px-2 text-slate-600">{p.brand}</td>
                            <td className="py-3 px-2"><Badge>{p.category}</Badge></td>
                            <td className="py-3 px-2 font-medium text-slate-700 dark:text-slate-300">{p.total_quantity}</td>
                            <td className="py-3 px-2 font-semibold text-blue-600">{formatCurrency(p.total_revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}
                  {reportType === 'customer' && (
                    <>
                      <thead><tr className="border-b border-slate-200 dark:border-slate-700">
                        {['Customer', 'Phone', 'Bills', 'Total Spent'].map(h => <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>)}
                      </tr></thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {data.map((c: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-3 px-2 font-medium text-slate-900 dark:text-white">{c.customer_name}</td>
                            <td className="py-3 px-2 text-slate-600 font-mono">{c.phone}</td>
                            <td className="py-3 px-2 text-slate-600">{c.bill_count}</td>
                            <td className="py-3 px-2 font-semibold text-blue-600">{formatCurrency(c.total_spent)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
