import { create } from 'zustand';
import type { CartItem, Product } from '@/types';

interface CartState {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getGSTAmount: () => number;
  getGrandTotal: (discount?: number) => number;
}

const calcItemTotal = (unitPrice: number, qty: number, gst: number) => {
  const base = unitPrice * qty;
  const gstAmt = (base * gst) / 100;
  return base + gstAmt;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (product) => {
    const existing = get().items.find((i) => i.product.id === product.id);
    if (existing) {
      set({
        items: get().items.map((i) =>
          i.product.id === product.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                item_total: calcItemTotal(i.unit_price, i.quantity + 1, i.gst_percentage),
              }
            : i
        ),
      });
    } else {
      const item: CartItem = {
        product,
        quantity: 1,
        unit_price: product.selling_price,
        gst_percentage: product.gst_percentage,
        item_total: calcItemTotal(product.selling_price, 1, product.gst_percentage),
      };
      set({ items: [...get().items, item] });
    }
  },

  removeItem: (productId) =>
    set({ items: get().items.filter((i) => i.product.id !== productId) }),

  updateQuantity: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId);
      return;
    }
    set({
      items: get().items.map((i) =>
        i.product.id === productId
          ? {
              ...i,
              quantity: qty,
              item_total: calcItemTotal(i.unit_price, qty, i.gst_percentage),
            }
          : i
      ),
    });
  },

  clearCart: () => set({ items: [] }),

  getSubtotal: () => {
    return get().items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  },

  getGSTAmount: () => {
    return get().items.reduce(
      (sum, i) => sum + (i.unit_price * i.quantity * i.gst_percentage) / 100,
      0
    );
  },

  getGrandTotal: (discount = 0) => {
    return get().getSubtotal() + get().getGSTAmount() - discount;
  },
}));
