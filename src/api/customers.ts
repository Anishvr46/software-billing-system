import { supabase } from '@/lib/supabase';
import type { Customer, Bill } from '@/types';

export const getCustomers = async (search = ''): Promise<Customer[]> => {
  let query = supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(
      `customer_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getCustomerById = async (id: string): Promise<Customer> => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
};

export const createCustomer = async (
  customer: Omit<Customer, 'id' | 'created_at'>
): Promise<Customer> => {
  const { data, error } = await supabase
    .from('customers')
    .insert(customer)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateCustomer = async (
  id: string,
  updates: Partial<Customer>
): Promise<Customer> => {
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteCustomer = async (id: string) => {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
};

export const getCustomerBills = async (customerId: string): Promise<Bill[]> => {
  const { data, error } = await supabase
    .from('bills')
    .select(`*, bill_items(*, product:products(*))`)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};
