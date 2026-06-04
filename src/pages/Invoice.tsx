import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, Download, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getBillById } from '@/api/billing';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { SHOP_CONFIG } from '@/config/shop';
import { LoadingOverlay } from '@/components/ui/index';
import { Button } from '@/components/ui/Button';
import type { Bill } from '@/types';

const Invoice: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (id) loadBill(id);
  }, [id]);

  const loadBill = async (billId: string) => {
    try {
      const data = await getBillById(billId);
      setBill(data);
    } catch { toast.error('Failed to load invoice'); }
    finally { setLoading(false); }
  };

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${bill?.invoice_number || 'invoice'}.pdf`);
      toast.success('PDF downloaded!');
    } catch { toast.error('Download failed'); }
    finally { setDownloading(false); }
  };

  if (loading) return <LoadingOverlay />;
  if (!bill) return (
    <div className="text-center py-20 text-slate-400">
      <p>Invoice not found</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate('/billing')}>Go to Billing</Button>
    </div>
  );

  const customer = (bill as any).customer;
  const billItems = (bill as any).bill_items || [];
  const cgst = bill.gst_amount / 2;
  const sgst = bill.gst_amount / 2;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Action buttons - hidden in print */}
      <div className="no-print flex items-center gap-3 mb-6 flex-wrap">
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>Back</Button>
        <div className="ml-auto flex gap-3">
          <Button variant="outline" icon={<Printer size={16} />} onClick={handlePrint}>Print</Button>
          <Button icon={<Download size={16} />} loading={downloading} onClick={handleDownloadPDF}>Download PDF</Button>
        </div>
      </div>

      {/* Invoice Card */}
      <div ref={printRef} className="bg-white rounded-2xl shadow-lg overflow-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)' }} className="px-8 py-8 text-white">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <CheckCircle size={24} />
                </div>
                <span className="text-2xl font-bold">{SHOP_CONFIG.name}</span>
              </div>
              <p className="text-blue-100 text-sm">{SHOP_CONFIG.address}</p>
              <p className="text-blue-100 text-sm">{SHOP_CONFIG.phone} · {SHOP_CONFIG.email}</p>
              <p className="text-blue-200 text-xs mt-1">GSTIN: {SHOP_CONFIG.gstin}</p>
            </div>
            <div className="text-right">
              <div className="bg-white/10 backdrop-blur rounded-xl px-5 py-3">
                <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">Invoice</p>
                <p className="text-white font-mono font-bold text-lg">{bill.invoice_number}</p>
                <p className="text-blue-200 text-xs mt-1">{formatDate(bill.created_at)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To + Payment Info */}
        <div className="px-8 py-6 grid grid-cols-2 gap-8 border-b border-slate-100">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Bill To</p>
            <p className="font-semibold text-slate-900 text-lg">{customer?.customer_name || 'Walk-in Customer'}</p>
            <p className="text-slate-500 text-sm">{customer?.phone || '—'}</p>
            {customer?.email && <p className="text-slate-500 text-sm">{customer.email}</p>}
            {customer?.address && <p className="text-slate-400 text-sm">{customer.address}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Payment Details</p>
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-semibold">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              Paid · {bill.payment_method.toUpperCase()}
            </div>
            <p className="text-slate-400 text-sm mt-2">
              State: {SHOP_CONFIG.state} ({SHOP_CONFIG.stateCode})
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="px-8 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }} className="rounded-xl">
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider rounded-l-lg">#</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit Price</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">GST</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider rounded-r-lg">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {billItems.map((item: any, idx: number) => (
                <tr key={item.id}>
                  <td className="py-4 px-3 text-slate-400 text-xs">{idx + 1}</td>
                  <td className="py-4 px-3">
                    <p className="font-medium text-slate-900">{item.product?.product_name || 'Unknown'}</p>
                    <p className="text-xs text-slate-400">{item.product?.brand}</p>
                  </td>
                  <td className="py-4 px-3 text-center text-slate-700">{item.quantity}</td>
                  <td className="py-4 px-3 text-right text-slate-700">{formatCurrency(item.unit_price)}</td>
                  <td className="py-4 px-3 text-right text-slate-500">{item.gst_percentage}%</td>
                  <td className="py-4 px-3 text-right font-semibold text-slate-900">{formatCurrency(item.item_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* GST Summary & Total */}
        <div className="px-8 pb-8">
          <div className="ml-auto max-w-xs">
            <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-700">{formatCurrency(bill.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">CGST</span>
                <span className="font-medium text-slate-700">{formatCurrency(cgst)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">SGST</span>
                <span className="font-medium text-slate-700">{formatCurrency(sgst)}</span>
              </div>
              {bill.discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600">Discount</span>
                  <span className="font-medium text-emerald-600">-{formatCurrency(bill.discount_amount)}</span>
                </div>
              )}
              <div className="h-px bg-slate-200" />
              <div className="flex justify-between">
                <span className="font-bold text-slate-900">Grand Total</span>
                <span className="text-xl font-bold text-blue-600">{formatCurrency(bill.grand_total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-slate-500 text-xs">Thank you for your purchase! · {SHOP_CONFIG.name} · {SHOP_CONFIG.website}</p>
          <p className="text-slate-400 text-xs mt-1">This is a computer-generated invoice and does not require a signature.</p>
        </div>
      </div>
    </div>
  );
};

export default Invoice;
