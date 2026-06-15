import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, Eye, Package } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Card, Badge, LoadingOverlay, ConfirmDialog } from '@/components/ui/index';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { getProducts, createProduct, updateProduct, deleteProduct, getBrands, getCategories } from '@/api/products';
import { formatCurrency } from '@/utils/formatters';
import { LOW_STOCK_THRESHOLD } from '@/config/shop';
import type { Product } from '@/types';

const productSchema = z.object({
  product_name: z.string().min(1, 'Product name is required'),
  brand: z.string().min(1, 'Brand is required'),
  category: z.string().min(1, 'Category is required'),
  imei_number: z.string().optional(),
  purchase_price: z.coerce.number().min(0, 'Must be ≥ 0'),
  selling_price: z.coerce.number().min(0, 'Must be ≥ 0'),
  stock_quantity: z.coerce.number().int().min(0, 'Must be ≥ 0'),
  gst_percentage: z.coerce.number().min(0).max(100),
  description: z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;

const CATEGORIES = ['Smartphone', 'Accessories', 'Tablet', 'Laptop', 'Smart Watch', 'Earbuds', 'Charger', 'Cable', 'Cover', 'Other'];

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brands, setBrands] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>({
    resolver: zodResolver(productSchema),
    defaultValues: { gst_percentage: 18, stock_quantity: 0 },
  });
  const formErrors = errors as any;

  useEffect(() => { loadAll(); }, [search, brandFilter, categoryFilter]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [prods, brandList] = await Promise.all([
        getProducts(search, brandFilter, categoryFilter),
        getBrands(),
      ]);
      setProducts(prods);
      setBrands(brandList);
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    reset({ gst_percentage: 18, stock_quantity: 0, purchase_price: 0, selling_price: 0 });
    setModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    reset({
      product_name: p.product_name,
      brand: p.brand,
      category: p.category,
      imei_number: p.imei_number || '',
      purchase_price: p.purchase_price,
      selling_price: p.selling_price,
      stock_quantity: p.stock_quantity,
      gst_percentage: p.gst_percentage,
      description: p.description || '',
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, data);
        toast.success('Product updated!');
      } else {
        await createProduct(data as any);
        toast.success('Product added!');
      }
      setModalOpen(false);
      loadAll();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await deleteProduct(deleteId);
      toast.success('Product deleted');
      setDeleteId(null);
      loadAll();
    } catch { toast.error('Delete failed'); }
    finally { setDeleteLoading(false); }
  };

  const stockBadge = (qty: number) => {
    if (qty === 0) return <Badge variant="danger" dot>Out of Stock</Badge>;
    if (qty < LOW_STOCK_THRESHOLD) return <Badge variant="warning" dot>{qty} low</Badge>;
    return <Badge variant="success" dot>{qty} in stock</Badge>;
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Brands</option>
              {brands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Button icon={<Plus size={16} />} onClick={openAddModal} className="w-full sm:w-auto">
            Add Product
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? <LoadingOverlay /> : products.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Package size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No products found</p>
            <p className="text-sm mt-1">Add your first product to get started</p>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="sm:hidden space-y-3">
              {products.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{p.product_name}</p>
                    <p className="text-xs text-slate-500">{p.brand} · {p.category}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400">₹{p.selling_price}</span>
                      {stockBadge(p.stock_quantity)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setViewProduct(p)} className="p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-blue-600 transition-colors" title="View">
                      <Eye size={15} />
                    </button>
                    <button onClick={() => openEditModal(p)} className="p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-blue-600 transition-colors" title="Edit">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => setDeleteId(p.id)} className="p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-red-600 transition-colors" title="Delete">
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
                    {['Product', 'Brand', 'Category', 'Purchase', 'Selling', 'GST', 'Stock', 'Actions'].map((h) => (
                      <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider first:pl-0 last:pr-0 last:text-right">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="py-3 px-2 pl-0">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{p.product_name}</p>
                          {p.imei_number && (
                            <p className="text-xs text-slate-400 font-mono">IMEI: {p.imei_number}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-slate-600 dark:text-slate-300">{p.brand}</td>
                      <td className="py-3 px-2"><Badge>{p.category}</Badge></td>
                      <td className="py-3 px-2 text-slate-600 dark:text-slate-300">{formatCurrency(p.purchase_price)}</td>
                      <td className="py-3 px-2 font-semibold text-slate-900 dark:text-white">{formatCurrency(p.selling_price)}</td>
                      <td className="py-3 px-2 text-slate-600 dark:text-slate-300">{p.gst_percentage}%</td>
                      <td className="py-3 px-2">{stockBadge(p.stock_quantity)}</td>
                      <td className="py-3 px-2 pr-0">
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setViewProduct(p)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 transition-colors"
                            title="View"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteId(p.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
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
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        size="xl"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleSubmit(onSubmit)}>
              {editingProduct ? 'Update Product' : 'Add Product'}
            </Button>
          </div>
        }
      >
        <form className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input label="Product Name" {...register('product_name')} error={formErrors.product_name?.message} placeholder="e.g. iPhone 15 Pro" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Brand</label>
              <input list="brands-list" {...register('brand')} placeholder="e.g. Apple" className="w-full rounded-lg border px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <datalist id="brands-list">
                {brands.map(b => <option key={b} value={b} />)}
              </datalist>
              {formErrors.brand && <p className="mt-1 text-xs text-red-500">{formErrors.brand.message}</p>}
            </div>
            <Select label="Category" options={CATEGORIES.map(c => ({ value: c, label: c }))} placeholder="Select category" {...register('category')} error={formErrors.category?.message} />
            <Input label="IMEI Number (optional)" {...register('imei_number')} placeholder="15-digit IMEI" />
            <Input label="Purchase Price (₹)" type="number" step="0.01" {...register('purchase_price')} error={formErrors.purchase_price?.message} />
            <Input label="Selling Price (₹)" type="number" step="0.01" {...register('selling_price')} error={formErrors.selling_price?.message} />
            <Input label="Stock Quantity" type="number" {...register('stock_quantity')} error={formErrors.stock_quantity?.message} />
            <Input label="GST %" type="number" step="0.01" {...register('gst_percentage')} error={formErrors.gst_percentage?.message} />
            <div className="sm:col-span-2">
              <Textarea label="Description (optional)" {...register('description')} placeholder="Product description..." />
            </div>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={!!viewProduct} onClose={() => setViewProduct(null)} title="Product Details" size="md">
        {viewProduct && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Product Name', viewProduct.product_name],
                ['Brand', viewProduct.brand],
                ['Category', viewProduct.category],
                ['IMEI', viewProduct.imei_number || '—'],
                ['Purchase Price', formatCurrency(viewProduct.purchase_price)],
                ['Selling Price', formatCurrency(viewProduct.selling_price)],
                ['Stock', String(viewProduct.stock_quantity)],
                ['GST', `${viewProduct.gst_percentage}%`],
              ].map(([label, value]) => (
                <div key={label} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
                </div>
              ))}
            </div>
            {viewProduct.description && (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">Description</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{viewProduct.description}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        loading={deleteLoading}
      />
    </div>
  );
};

export default Products;
