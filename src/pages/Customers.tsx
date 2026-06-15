import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, History, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Card, Badge, LoadingOverlay, ConfirmDialog } from '@/components/ui/index';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, getCustomerBills } from '@/api/customers';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import type { Customer, Bill } from '@/types';

const customerSchema = z.object({
  customer_name: z.string().min(1, 'Name is required'),
  phone: z.string().min(10, 'Enter valid phone number'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
});

type CustomerForm = z.infer<typeof customerSchema>;

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
  });

  useEffect(() => { loadCustomers(); }, [search]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await getCustomers(search);
      setCustomers(data);
    } catch { toast.error('Failed to load customers'); }
    finally { setLoading(false); }
  };

  const openAddModal = () => {
    setEditingCustomer(null);
    reset({ customer_name: '', phone: '', email: '', address: '' });
    setModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    reset({
      customer_name: c.customer_name,
      phone: c.phone,
      email: c.email || '',
      address: c.address || '',
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: CustomerForm) => {
    setSaving(true);
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, data);
        toast.success('Customer updated!');
      } else {
        await createCustomer(data as any);
        toast.success('Customer added!');
      }
      setModalOpen(false);
      loadCustomers();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await deleteCustomer(deleteId);
      toast.success('Customer deleted');
      setDeleteId(null);
      loadCustomers();
    } catch { toast.error('Delete failed'); }
    finally { setDeleteLoading(false); }
  };

  const openHistory = async (customer: Customer) => {
    setHistoryCustomer(customer);
    setBillsLoading(true);
    try {
      const data = await getCustomerBills(customer.id);
      setBills(data);
    } catch { toast.error('Failed to load history'); }
    finally { setBillsLoading(false); }
  };

  const paymentBadge = (method: string) => {
    const map: Record<string, any> = { cash: 'success', upi: 'info', card: 'purple' };
    return <Badge variant={map[method] || 'default'}>{method.toUpperCase()}</Badge>;
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search by name, phone or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button icon={<Plus size={16} />} onClick={openAddModal} className="w-full sm:w-auto">Add Customer</Button>
        </div>
      </Card>

      {/* Customers Grid / Table */}
      <Card>
        {loading ? <LoadingOverlay /> : customers.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Users size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No customers found</p>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="sm:hidden space-y-3">
              {customers.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {c.customer_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{c.customer_name}</p>
                    <p className="text-xs text-slate-500 font-mono">{c.phone}</p>
                    {c.email && <p className="text-xs text-slate-400 truncate">{c.email}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openHistory(c)} className="p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-purple-600 transition-colors" title="History">
                      <History size={15} />
                    </button>
                    <button onClick={() => openEditModal(c)} className="p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-blue-600 transition-colors" title="Edit">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => setDeleteId(c.id)} className="p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-red-600 transition-colors" title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    {['Name', 'Phone', 'Email', 'Address', 'Added', 'Actions'].map((h) => (
                      <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider first:pl-0 last:pr-0 last:text-right">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="py-3 px-2 pl-0">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {c.customer_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-900 dark:text-white">{c.customer_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-slate-600 dark:text-slate-300 font-mono">{c.phone}</td>
                      <td className="py-3 px-2 text-slate-600 dark:text-slate-300">{c.email || '—'}</td>
                      <td className="py-3 px-2 text-slate-500 max-w-[160px] truncate">{c.address || '—'}</td>
                      <td className="py-3 px-2 text-slate-400 text-xs">{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                      <td className="py-3 px-2 pr-0">
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openHistory(c)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-purple-600 transition-colors" title="Purchase History">
                            <History size={15} />
                          </button>
                          <button onClick={() => openEditModal(c)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 transition-colors" title="Edit">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-600 transition-colors" title="Delete">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleSubmit(onSubmit)}>
              {editingCustomer ? 'Update' : 'Add Customer'}
            </Button>
          </div>
        }
      >
        <form className="space-y-4">
          <Input label="Full Name" {...register('customer_name')} error={errors.customer_name?.message} placeholder="Ravi Kumar" />
          <Input label="Phone Number" {...register('phone')} error={errors.phone?.message} placeholder="9876543210" type="tel" />
          <Input label="Email (optional)" {...register('email')} error={errors.email?.message} placeholder="customer@email.com" type="email" />
          <Textarea label="Address (optional)" {...register('address')} placeholder="123 Main St, City - 600001" />
        </form>
      </Modal>

      {/* Purchase History Modal */}
      <Modal
        isOpen={!!historyCustomer}
        onClose={() => setHistoryCustomer(null)}
        title={`${historyCustomer?.customer_name}'s Purchase History`}
        size="xl"
      >
        {billsLoading ? <LoadingOverlay /> : bills.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <History size={40} className="mx-auto mb-2 opacity-30" />
            <p>No purchase history found</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
              <span>{bills.length} bill(s)</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                Total: {formatCurrency(bills.reduce((s, b) => s + Number(b.grand_total), 0))}
              </span>
            </div>
            {bills.map((bill) => (
              <div key={bill.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-mono text-sm font-semibold text-blue-600">{bill.invoice_number}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(bill.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(bill.grand_total)}</p>
                    {paymentBadge(bill.payment_method)}
                  </div>
                </div>
                {(bill as any).bill_items?.length > 0 && (
                  <div className="border-t border-slate-100 dark:border-slate-700 pt-3 space-y-1.5">
                    {(bill as any).bill_items.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-300">{item.product?.product_name} × {item.quantity}</span>
                        <span className="text-slate-500">{formatCurrency(item.item_total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? All associated bills will remain."
        loading={deleteLoading}
      />
    </div>
  );
};

export default Customers;
