import { supabase } from '@/lib/supabase';
import type { Product } from '@/types';

export const getProducts = async (search = '', brand = '', category = '') => {
  let query = supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (search) query = query.ilike('product_name', `%${search}%`);
  if (brand) query = query.eq('brand', brand);
  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) throw error;
  return data as Product[];
};

export const getProductById = async (id: string): Promise<Product> => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
};

export const createProduct = async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateProduct = async (id: string, updates: Partial<Product>) => {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteProduct = async (id: string) => {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
};

export const getBrands = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('brand')
    .order('brand');
  if (error) throw error;
  return [...new Set(data.map((r: any) => r.brand))];
};

export const getCategories = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('category')
    .order('category');
  if (error) throw error;
  return [...new Set(data.map((r: any) => r.category))];
};

export const searchProductsForBilling = async (search: string): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .ilike('product_name', `%${search}%`)
    .gt('stock_quantity', 0)
    .limit(10);
  if (error) throw error;
  return data;
};
