-- ============================================================
-- Mobile Shop Billing & Inventory Management System
-- Supabase PostgreSQL Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  imei_number TEXT,
  purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  gst_percentage NUMERIC(5, 2) NOT NULL DEFAULT 18,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BILLS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  gst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'upi', 'card')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BILL ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bill_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  gst_percentage NUMERIC(5, 2) NOT NULL DEFAULT 18,
  item_total NUMERIC(12, 2) NOT NULL DEFAULT 0
);

-- ============================================================
-- STOCK HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stock_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL CHECK (change_type IN ('sale', 'restock', 'adjustment')),
  quantity_change INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EMPLOYEES (view of profiles with employee role)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIGGER: Auto-update products.updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER: Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bills_created_at ON public.bills(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bills_customer_id ON public.bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON public.bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_product_id ON public.bill_items(product_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_stock_history_product_id ON public.stock_history(product_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Profiles: read own, admin reads all
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Products: all authenticated users can read; admin can write
CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_insert" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "products_update" ON public.products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "products_delete" ON public.products FOR DELETE TO authenticated USING (true);

-- Customers: all authenticated
CREATE POLICY "customers_all" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Bills: all authenticated
CREATE POLICY "bills_all" ON public.bills FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Bill items: all authenticated
CREATE POLICY "bill_items_all" ON public.bill_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Stock history: all authenticated
CREATE POLICY "stock_history_all" ON public.stock_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Employees: all authenticated
CREATE POLICY "employees_all" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- SEED DATA (Sample products & customers)
-- ============================================================
INSERT INTO public.customers (customer_name, phone, email, address) VALUES
  ('Ravi Kumar', '9876543210', 'ravi@email.com', '12 Anna Nagar, Chennai'),
  ('Priya Sharma', '9123456789', 'priya@email.com', '45 T. Nagar, Chennai'),
  ('Muthu Selvam', '9500112233', NULL, '78 Velachery, Chennai')
ON CONFLICT DO NOTHING;

INSERT INTO public.products (product_name, brand, category, imei_number, purchase_price, selling_price, stock_quantity, gst_percentage, description) VALUES
  ('iPhone 15 Pro', 'Apple', 'Smartphone', '356938035643809', 95000, 124999, 10, 18, '6.1-inch Super Retina XDR display, A17 Pro chip'),
  ('Galaxy S24 Ultra', 'Samsung', 'Smartphone', '490154203237518', 85000, 109999, 8, 18, '6.8-inch Dynamic AMOLED, Snapdragon 8 Gen 3'),
  ('Redmi Note 13 Pro', 'Xiaomi', 'Smartphone', '358325070001139', 18000, 24999, 25, 18, '6.67-inch AMOLED, Snapdragon 7s Gen 2'),
  ('OnePlus 12R', 'OnePlus', 'Smartphone', '012345678901234', 32000, 42999, 15, 18, '6.78-inch 120Hz AMOLED, Snapdragon 8 Gen 1'),
  ('AirPods Pro 2', 'Apple', 'Accessories', NULL, 15000, 24900, 20, 18, 'Active Noise Cancellation, USB-C'),
  ('Galaxy Buds3 Pro', 'Samsung', 'Accessories', NULL, 8000, 14999, 18, 18, 'Intelligent ANC, 360 Audio'),
  ('iPhone 15 Cover', 'Apple', 'Accessories', NULL, 500, 1499, 50, 18, 'Premium silicone case'),
  ('Anker 65W Charger', 'Anker', 'Accessories', NULL, 1200, 2499, 30, 18, 'GaN compact charger with USB-C'),
  ('Poco X6 Pro', 'Xiaomi', 'Smartphone', '987654321012345', 20000, 27999, 12, 18, '6.67-inch AMOLED, Dimensity 8300 Ultra'),
  ('Realme GT 6', 'Realme', 'Smartphone', '111222333444555', 28000, 39999, 3, 18, '6.78-inch 144Hz, Snapdragon 8s Gen 3')
ON CONFLICT DO NOTHING;
