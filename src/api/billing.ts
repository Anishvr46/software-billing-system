import { supabase } from '@/lib/supabase';
import type { Bill, CartItem, Customer } from '@/types';
import { generateInvoiceNumber } from '@/utils/formatters';

export interface CreateBillPayload {
  customer_id: string;
  items: CartItem[];
  subtotal: number;
  gst_amount: number;
  discount_amount: number;
  grand_total: number;
  payment_method: 'cash' | 'upi' | 'card';
  created_by: string;
}

export const createBill = async (payload: CreateBillPayload): Promise<Bill> => {
  const invoice_number = generateInvoiceNumber();

  // Insert the bill
  const { data: bill, error: billError } = await supabase
    .from('bills')
    .insert({
      invoice_number,
      customer_id: payload.customer_id,
      subtotal: payload.subtotal,
      gst_amount: payload.gst_amount,
      discount_amount: payload.discount_amount,
      grand_total: payload.grand_total,
      payment_method: payload.payment_method,
      created_by: payload.created_by,
    })
    .select()
    .single();

  if (billError) throw billError;

  // Insert bill items
  const billItems = payload.items.map((item) => ({
    bill_id: bill.id,
    product_id: item.product.id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    gst_percentage: item.gst_percentage,
    item_total: item.item_total,
  }));

  const { error: itemsError } = await supabase.from('bill_items').insert(billItems);
  if (itemsError) throw itemsError;

  // Reduce stock for each product
  for (const item of payload.items) {
    const { data: product } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', item.product.id)
      .single();

    if (product) {
      const newQty = product.stock_quantity - item.quantity;
      await supabase
        .from('products')
        .update({ stock_quantity: newQty })
        .eq('id', item.product.id);

      // Log stock history
      await supabase.from('stock_history').insert({
        product_id: item.product.id,
        change_type: 'sale',
        quantity_change: -item.quantity,
        quantity_before: product.stock_quantity,
        quantity_after: newQty,
        note: `Sold via invoice ${invoice_number}`,
        created_by: payload.created_by,
      });
    }
  }

  return bill;
};

export const getBills = async (limit = 50): Promise<Bill[]> => {
  const { data, error } = await supabase
    .from('bills')
    .select(`*, customer:customers(*), bill_items(*, product:products(*))`)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
};

export const getBillById = async (id: string): Promise<Bill> => {
  const { data, error } = await supabase
    .from('bills')
    .select(`*, customer:customers(*), bill_items(*, product:products(*))`)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
};

export const getRecentBills = async (limit = 10): Promise<Bill[]> => {
  const { data, error } = await supabase
    .from('bills')
    .select(`*, customer:customers(customer_name, phone)`)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
};

export const getTodayRevenue = async (): Promise<number> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('bills')
    .select('grand_total')
    .gte('created_at', today.toISOString());
  if (error) return 0;
  return data.reduce((sum: number, b: any) => sum + Number(b.grand_total), 0);
};

export const getMonthlyRevenue = async (): Promise<number> => {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('bills')
    .select('grand_total')
    .gte('created_at', start.toISOString());
  if (error) return 0;
  return data.reduce((sum: number, b: any) => sum + Number(b.grand_total), 0);
};

export const getSalesChartData = async (days = 30) => {
  const start = new Date();
  start.setDate(start.getDate() - days);

  const { data, error } = await supabase
    .from('bills')
    .select('created_at, grand_total')
    .gte('created_at', start.toISOString())
    .order('created_at', { ascending: true });

  if (error) return [];

  const grouped: Record<string, { date: string; total: number; count: number }> = {};
  for (const bill of data) {
    const date = new Date(bill.created_at).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
    if (!grouped[date]) grouped[date] = { date, total: 0, count: 0 };
    grouped[date].total += Number(bill.grand_total);
    grouped[date].count += 1;
  }
  return Object.values(grouped);
};
