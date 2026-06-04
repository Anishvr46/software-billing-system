import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types';

export const getEmployees = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const updateEmployeeRole = async (userId: string, role: 'admin' | 'employee') => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateEmployeeName = async (userId: string, name: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ name })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const inviteEmployee = async (email: string, name: string, role: 'admin' | 'employee') => {
  // Creates user via Supabase Auth - requires admin privileges
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { name, role },
  });
  if (error) throw error;
  return data;
};
