import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users, BarChart2,
  Warehouse, UserCog, ShoppingCart, ChevronLeft, Smartphone
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', adminOnly: false },
  { path: '/products', icon: Package, label: 'Products', adminOnly: false },
  { path: '/customers', icon: Users, label: 'Customers', adminOnly: false },
  { path: '/billing', icon: ShoppingCart, label: 'Billing', adminOnly: false },
  { path: '/inventory', icon: Warehouse, label: 'Inventory', adminOnly: false },
  { path: '/reports', icon: BarChart2, label: 'Reports', adminOnly: true },
  { path: '/employees', icon: UserCog, label: 'Employees', adminOnly: true },
];

export const Sidebar: React.FC = () => {
  const { user, isAdmin } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin());

  return (
    <>
      {/* ── Mobile dim overlay ── shown when sidebar is open on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/*
        ── SIDEBAR ──
        MOBILE  (< lg):
          • always `fixed` and out of document flow → content takes full width
          • when closed: pushed off-screen with -translate-x-full
          • when open : slides in with translate-x-0 as a 264px overlay

        DESKTOP (≥ lg):
          • becomes `relative` and IN document flow (reserves width in flex layout)
          • when open : w-64 (full labels)
          • when closed: w-16 (icon rail only)
      */}
      <aside
        className={`
          fixed left-0 top-0 h-full z-30 flex flex-col
          bg-slate-900 dark:bg-slate-950 text-white
          transition-all duration-300 ease-in-out
          ${sidebarOpen
            ? 'w-64 translate-x-0'
            : 'w-64 -translate-x-full lg:w-16 lg:translate-x-0'
          }
          lg:relative lg:z-auto
        `}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 p-4 h-16 border-b border-slate-800 ${!sidebarOpen ? 'lg:justify-center' : ''}`}>
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Smartphone size={20} className="text-white" />
          </div>
          {/* Label: always shown when sidebar is open; hidden in desktop icon-rail mode */}
          <div className={`overflow-hidden transition-all duration-300 ${!sidebarOpen ? 'hidden' : 'block'}`}>
            <p className="font-bold text-sm text-white leading-tight whitespace-nowrap">Anish Mobile Planet</p>
            <p className="text-xs text-slate-400 leading-tight">Billing System</p>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto space-y-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => {
                // Auto-close sidebar when a nav link is tapped on mobile
                if (window.innerWidth < 1024 && sidebarOpen) toggleSidebar();
              }}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl
                transition-all duration-150 group relative
                ${isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }
                ${!sidebarOpen ? 'lg:justify-center' : ''}
              `}
            >
              <item.icon size={20} className="flex-shrink-0" />
              {/* Label: shown when open; hidden in collapsed desktop mode */}
              <span className={`text-sm font-medium ${!sidebarOpen ? 'hidden' : 'block'}`}>
                {item.label}
              </span>
              {/* Tooltip: only for collapsed desktop icon-rail */}
              {!sidebarOpen && (
                <div className="hidden lg:block absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                  {item.label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info – hidden in collapsed desktop icon-rail */}
        <div className={`p-4 border-t border-slate-800 ${!sidebarOpen ? 'hidden' : 'block'}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Desktop-only collapse/expand toggle button */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex items-center justify-center h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 absolute -right-4 top-20 border border-slate-700 transition-colors"
        >
          <ChevronLeft
            size={14}
            className={`text-slate-400 transition-transform duration-300 ${!sidebarOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </aside>
    </>
  );
};
