import React, { useState, useCallback, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, User, CreditCard, Banknote, Smartphone, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card, Badge, Spinner } from '@/components/ui/index';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { searchProductsForBilling } from '@/api/products';
import { getCustomers, createCustomer, updateCustomer } from '@/api/customers';
import { createBill } from '@/api/billing';
import { formatCurrency } from '@/utils/formatters';
import type { Product, Customer } from '@/types';

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'upi', label: 'UPI', icon: Smartphone },
  { id: 'card', label: 'Card', icon: CreditCard },
] as const;

const Billing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { items, addItem, removeItem, updateQuantity, clearCart, getSubtotal, getGSTAmount, getGrandTotal } = useCartStore();

  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [productSearching, setProductSearching] = useState(false);

  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [addingCustomer, setAddingCustomer] = useState(false);

  const [discount, setDiscount] = useState(0);

  // Keep customerEmail in sync with the selected customer
  useEffect(() => {
    if (selectedCustomer) {
      setCustomerEmail(selectedCustomer.email || '');
    } else {
      setCustomerEmail('');
    }
  }, [selectedCustomer]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [placing, setPlacing] = useState(false);

  const debounce = (fn: Function, delay: number) => {
    let timer: any;
    return (...args: any) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const searchProducts = useCallback(
    debounce(async (q: string) => {
      if (!q.trim()) { setProductResults([]); return; }
      setProductSearching(true);
      try {
        const results = await searchProductsForBilling(q);
        setProductResults(results);
      } catch { }
      finally { setProductSearching(false); }
    }, 300),
    []
  );

  const searchCustomers = useCallback(
    debounce(async (q: string) => {
      if (!q.trim()) { setCustomerResults([]); return; }
      try {
        const results = await getCustomers(q);
        setCustomerResults(results.slice(0, 6));
      } catch { }
    }, 300),
    []
  );

  useEffect(() => { searchProducts(productSearch); }, [productSearch]);
  useEffect(() => { searchCustomers(customerSearch); }, [customerSearch]);

  const addCustomer = async () => {
    if (!newCustomerName || !newCustomerPhone) return toast.error('Name and phone are required');
    setAddingCustomer(true);
    try {
      const customer = await createCustomer({ 
        customer_name: newCustomerName, 
        phone: newCustomerPhone, 
        email: newCustomerEmail || null, 
        address: null 
      });
      setSelectedCustomer(customer);
      setCustomerModalOpen(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerEmail('');
      toast.success('Customer created!');
    } catch (err: any) {
      toast.error(err.message);
    } finally { setAddingCustomer(false); }
  };

  const handleCreateBill = async () => {
    if (items.length === 0) return toast.error('Add at least one product');
    if (!selectedCustomer) return toast.error('Select a customer');

    // Validate stock
    for (const item of items) {
      if (item.quantity > item.product.stock_quantity) {
        return toast.error(`Insufficient stock for ${item.product.product_name}`);
      }
    }

    setPlacing(true);
    try {
      const subtotal = getSubtotal();
      const gst_amount = getGSTAmount();
      const grand_total = getGrandTotal(discount);

      // 1. Update customer email in database if entered/changed
      let updatedCustomer = selectedCustomer;
      if (customerEmail && customerEmail !== selectedCustomer.email) {
        try {
          const res = await updateCustomer(selectedCustomer.id, { email: customerEmail });
          updatedCustomer = res;
        } catch (updateErr) {
          console.error('Failed to update customer email in DB:', updateErr);
        }
      }

      const bill = await createBill({
        customer_id: selectedCustomer.id,
        items,
        subtotal,
        gst_amount,
        discount_amount: discount,
        grand_total,
        payment_method: paymentMethod,
        created_by: user!.id,
      });

      toast.success('Bill created successfully!');

      clearCart();
      setSelectedCustomer(null);
      setCustomerEmail('');
      setDiscount(0);
      navigate(`/invoice/${bill.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create bill');
    } finally { setPlacing(false); }
  };

  const subtotal = getSubtotal();
  const gstAmount = getGSTAmount();
  const grandTotal = getGrandTotal(discount);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* Left: Product Search */}
      <div className="lg:col-span-3 space-y-4">
        <Card title="Search Products">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search by product name..."
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {productSearching && <Spinner size="sm" className="absolute right-3 top-1/2 -translate-y-1/2" />}
          </div>

          {productResults.length > 0 && (
            <div className="mt-3 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              {productResults.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors"
                  onClick={() => {
                    addItem(p);
                    setProductSearch('');
                    setProductResults([]);
                    toast.success(`${p.product_name} added to cart`);
                  }}
                >
                  <div>
                    <p className="font-medium text-sm text-slate-900 dark:text-white">{p.product_name}</p>
                    <p className="text-xs text-slate-400">{p.brand} · Stock: {p.stock_quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-blue-600">{formatCurrency(p.selling_price)}</p>
                    <p className="text-xs text-slate-400">{p.gst_percentage}% GST</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Cart */}
        <Card title={`Cart (${items.length} items)`}>
          {items.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <ShoppingCart size={40} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Cart is empty. Search and add products above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.product.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{item.product.product_name}</p>
                      <p className="text-xs text-slate-400">{formatCurrency(item.unit_price)} × {item.quantity} + {item.gst_percentage}% GST</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1 flex-shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:border-blue-500 hover:text-blue-600 transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => {
                          if (item.quantity >= item.product.stock_quantity) {
                            toast.error('Not enough stock');
                            return;
                          }
                          updateQuantity(item.product.id, item.quantity + 1);
                        }}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:border-blue-500 hover:text-blue-600 transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <p className="font-semibold text-sm text-slate-900 dark:text-white">{formatCurrency(item.item_total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Right: Bill Summary */}
      <div className="lg:col-span-2 space-y-4">
        {/* Customer */}
        <Card title="Customer">
          {selectedCustomer ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    {selectedCustomer.customer_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-slate-900 dark:text-white">{selectedCustomer.customer_name}</p>
                    <p className="text-xs text-slate-500">{selectedCustomer.phone}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-red-500 text-xs transition-colors">Remove</button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Customer Email (for digital invoice)</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Enter customer's email..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search customer..."
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {customerResults.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mb-3">
                  {customerResults.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setCustomerResults([]); }}
                      className="flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors"
                    >
                      <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {c.customer_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{c.customer_name}</p>
                        <p className="text-xs text-slate-400">{c.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="outline" size="sm" fullWidth icon={<Plus size={14} />} onClick={() => setCustomerModalOpen(true)}>
                Quick Add Customer
              </Button>
            </>
          )}
        </Card>

        {/* Payment Method */}
        <Card title="Payment Method">
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setPaymentMethod(id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                  paymentMethod === id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-500'
                }`}
              >
                <Icon size={20} />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Bill Summary */}
        <Card title="Bill Summary">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">GST (includes CGST+SGST)</span>
              <span className="font-medium">{formatCurrency(gstAmount)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 w-20 flex-shrink-0">Discount ₹</span>
              <input
                type="number"
                min={0}
                value={discount || ''}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="flex-1 px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="h-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex justify-between">
              <span className="font-semibold text-slate-900 dark:text-white">Grand Total</span>
              <span className="text-xl font-bold text-blue-600">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <Button
            fullWidth
            size="lg"
            className="mt-4"
            loading={placing}
            onClick={handleCreateBill}
            icon={<CheckCircle size={18} />}
          >
            Create Bill & Invoice
          </Button>

          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              className="mt-2"
              onClick={() => { clearCart(); setSelectedCustomer(null); setDiscount(0); }}
            >
              Clear Cart
            </Button>
          )}
        </Card>
      </div>

      {/* Quick Add Customer Modal */}
      <Modal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        title="Quick Add Customer"
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setCustomerModalOpen(false)}>Cancel</Button>
            <Button loading={addingCustomer} onClick={addCustomer}>Add & Select</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Full Name" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="Customer name" />
          <Input label="Phone" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} placeholder="9876543210" type="tel" />
          <Input label="Email (optional)" value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} placeholder="customer@email.com" type="email" />
        </div>
      </Modal>
    </div>
  );
};

export default Billing;
