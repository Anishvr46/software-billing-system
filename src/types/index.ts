// Core Types for Mobile Shop Billing System

export type UserRole = 'admin' | 'employee';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Product {
  id: string;
  product_name: string;
  brand: string;
  category: string;
  imei_number: string | null;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number;
  gst_percentage: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  customer_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  created_at: string;
}

export interface Bill {
  id: string;
  invoice_number: string;
  customer_id: string;
  subtotal: number;
  gst_amount: number;
  discount_amount: number;
  grand_total: number;
  payment_method: 'cash' | 'upi' | 'card';
  created_by: string;
  created_at: string;
  customer?: Customer;
  bill_items?: BillItem[];
  profiles?: UserProfile;
}

export interface BillItem {
  id: string;
  bill_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  gst_percentage: number;
  item_total: number;
  product?: Product;
}

export interface StockHistory {
  id: string;
  product_id: string;
  change_type: 'sale' | 'restock' | 'adjustment';
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  note: string | null;
  created_at: string;
  product?: Product;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  gst_percentage: number;
  item_total: number;
}

export interface DashboardStats {
  todaySales: number;
  monthlySales: number;
  totalRevenue: number;
  totalProducts: number;
  lowStockCount: number;
}

export interface SalesDataPoint {
  date: string;
  total: number;
  count: number;
}

export interface ProductSalesData {
  product_name: string;
  total_quantity: number;
  total_revenue: number;
}
