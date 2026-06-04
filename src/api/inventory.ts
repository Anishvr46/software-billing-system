import { supabase } from '@/lib/supabase';
import type { StockHistory, Product } from '@/types';

export const getInventory = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('stock_quantity', { ascending: true });
  if (error) throw error;
  return data;
};

export const getLowStockProducts = async (threshold = 5): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .lt('stock_quantity', threshold)
    .order('stock_quantity', { ascending: true });
  if (error) throw error;
  return data;
};

export const updateStock = async (
  productId: string,
  newQuantity: number,
  changeType: 'restock' | 'adjustment',
  note: string,
  userId: string
) => {
  const { data: product } = await supabase
    .from('products')
    .select('stock_quantity')
    .eq('id', productId)
    .single();

  if (!product) throw new Error('Product not found');

  const { error: updateError } = await supabase
    .from('products')
    .update({ stock_quantity: newQuantity })
    .eq('id', productId);

  if (updateError) throw updateError;

  const change = newQuantity - product.stock_quantity;

  await supabase.from('stock_history').insert({
    product_id: productId,
    change_type: changeType,
    quantity_change: change,
    quantity_before: product.stock_quantity,
    quantity_after: newQuantity,
    note,
    created_by: userId,
  });
};

export const getStockHistory = async (productId?: string): Promise<StockHistory[]> => {
  let query = supabase
    .from('stock_history')
    .select(`*, product:products(product_name, brand)`)
    .order('created_at', { ascending: false })
    .limit(100);

  if (productId) query = query.eq('product_id', productId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
};
