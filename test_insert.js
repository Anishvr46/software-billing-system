import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gzgxyfukbvcrolepmgbs.supabase.co';
const supabaseAnonKey = 'sb_publishable_lAvrgNljJWSalZKDm4dV_Q_VT9Zxe8_';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const randomStr = Math.random().toString(36).substring(7);
  const email = `test.user.billing.system.${randomStr}@gmail.com`;
  const password = 'Password123!';
  
  console.log(`Registering test user: ${email}`);
  
  try {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password
    });
    
    if (signUpError) {
      console.error('Sign up error:', signUpError);
      return;
    }
    
    const userId = signUpData.user.id;
    console.log(`Signed up user ID: ${userId}`);
    
    if (signUpData.session) {
      await supabase.auth.setSession(signUpData.session);
    } else {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        console.error('Sign in error:', signInError);
        return;
      }
      await supabase.auth.setSession(signInData.session);
    }

    const { data: profile, error: pError } = await supabase.from('profiles').select('*').eq('id', userId).single();
    console.log('Profile fetched:', profile, 'Error:', pError);

    if (!profile) {
      console.log('Profile not found, inserting profile...');
      const { data: newProfile, error: insError } = await supabase.from('profiles').insert({
        id: userId,
        name: 'Test User',
        email,
        role: 'employee'
      }).select().single();
      console.log('Profile insert result:', newProfile, 'Error:', insError);
    }

    console.log('Inserting test customer...');
    const { data: customer, error: custError } = await supabase.from('customers').insert({
      customer_name: 'Test Customer',
      phone: '1234567890'
    }).select().single();

    if (custError) {
      console.error('Customer insert error:', custError);
      return;
    }
    console.log('Customer inserted:', customer.id);

    console.log('Inserting test bill...');
    const { data: bill, error: billError } = await supabase.from('bills').insert({
      invoice_number: `INV-TEST-${Math.floor(Math.random() * 1000000)}`,
      customer_id: customer.id,
      subtotal: 100,
      gst_amount: 18,
      discount_amount: 0,
      grand_total: 118,
      payment_method: 'cash',
      created_by: userId
    }).select().single();

    if (billError) {
      console.error('Bill insert error:', billError);
    } else {
      console.log('Bill inserted successfully:', bill);
      await supabase.from('bills').delete().eq('id', bill.id);
    }

    await supabase.from('customers').delete().eq('id', customer.id);
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
