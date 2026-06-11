import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getProfile } from '@/api/auth';
import { Layout } from '@/components/layout/Layout';
import { Spinner } from '@/components/ui/index';

// Pages
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Products from '@/pages/Products';
import Customers from '@/pages/Customers';
import Billing from '@/pages/Billing';
import Invoice from '@/pages/Invoice';
import Inventory from '@/pages/Inventory';
import Reports from '@/pages/Reports';
import Employees from '@/pages/Employees';

// Protected route wrapper
const Protected: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  const { user, setUser, setLoading, loading } = useAuthStore();
  const { darkMode } = useUIStore();

  // Apply dark mode class on mount
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // Listen to Supabase auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await getProfile(session.user.id);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await getProfile(session.user.id);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Loading Anish Mobile Planet...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '12px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            style: { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' },
          },
          error: {
            style: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' },
          },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

        {/* Protected */}
        <Route path="/" element={<Protected><Layout><Dashboard /></Layout></Protected>} />
        <Route path="/products" element={<Protected><Layout><Products /></Layout></Protected>} />
        <Route path="/customers" element={<Protected><Layout><Customers /></Layout></Protected>} />
        <Route path="/billing" element={<Protected><Layout><Billing /></Layout></Protected>} />
        <Route path="/invoice/:id" element={<Protected><Layout><Invoice /></Layout></Protected>} />
        <Route path="/inventory" element={<Protected><Layout><Inventory /></Layout></Protected>} />
        <Route path="/reports" element={<Protected adminOnly><Layout><Reports /></Layout></Protected>} />
        <Route path="/employees" element={<Protected adminOnly><Layout><Employees /></Layout></Protected>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
