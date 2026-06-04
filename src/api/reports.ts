import { supabase } from '@/lib/supabase';

export interface ReportFilters {
  startDate: string;
  endDate: string;
}

export const getDailySalesReport = async (filters: ReportFilters) => {
  const { data, error } = await supabase
    .from('bills')
    .select(`*, customer:customers(customer_name, phone), bill_items(*, product:products(product_name, brand))`)
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const getMonthlySummary = async (year: number) => {
  const start = new Date(year, 0, 1).toISOString();
  const end = new Date(year, 11, 31, 23, 59, 59).toISOString();

  const { data, error } = await supabase
    .from('bills')
    .select('created_at, grand_total')
    .gte('created_at', start)
    .lte('created_at', end);

  if (error) throw error;

  const months: Record<number, { month: string; total: number; count: number }> = {};
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  for (let i = 0; i < 12; i++) {
    months[i] = { month: monthNames[i], total: 0, count: 0 };
  }

  for (const bill of data) {
    const month = new Date(bill.created_at).getMonth();
    months[month].total += Number(bill.grand_total);
    months[month].count += 1;
  }

  return Object.values(months);
};

export const getProductWiseSales = async (filters: ReportFilters) => {
  const { data, error } = await supabase
    .from('bill_items')
    .select(`
      product_id,
      quantity,
      unit_price,
      item_total,
      product:products(product_name, brand, category),
      bill:bills!inner(created_at)
    `)
    .gte('bill.created_at', filters.startDate)
    .lte('bill.created_at', filters.endDate);

  if (error) throw error;

  const grouped: Record<string, any> = {};
  for (const item of data as any[]) {
    const pid = item.product_id;
    if (!grouped[pid]) {
      grouped[pid] = {
        product_name: item.product?.product_name || 'Unknown',
        brand: item.product?.brand || '',
        category: item.product?.category || '',
        total_quantity: 0,
        total_revenue: 0,
      };
    }
    grouped[pid].total_quantity += item.quantity;
    grouped[pid].total_revenue += Number(item.item_total);
  }

  return Object.values(grouped).sort((a, b) => b.total_revenue - a.total_revenue);
};

export const getCustomerWiseSales = async (filters: ReportFilters) => {
  const { data, error } = await supabase
    .from('bills')
    .select(`customer_id, grand_total, customer:customers(customer_name, phone)`)
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);

  if (error) throw error;

  const grouped: Record<string, any> = {};
  for (const bill of data as any[]) {
    const cid = bill.customer_id;
    if (!grouped[cid]) {
      grouped[cid] = {
        customer_name: bill.customer?.customer_name || 'Walk-in',
        phone: bill.customer?.phone || '-',
        bill_count: 0,
        total_spent: 0,
      };
    }
    grouped[cid].bill_count += 1;
    grouped[cid].total_spent += Number(bill.grand_total);
  }

  return Object.values(grouped).sort((a, b) => b.total_spent - a.total_spent);
};
