import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUIStore } from '@/store/uiStore';

interface LayoutProps {
  children: React.ReactNode;
}

const MOBILE_BREAKPOINT = 1024; // matches Tailwind's lg: breakpoint

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { setSidebarOpen } = useUIStore();

  useEffect(() => {
    // On mount: enforce sidebar state based on current screen width.
    // This overrides any stale value that persisted from a different device/viewport.
    const init = () => {
      setSidebarOpen(window.innerWidth >= MOBILE_BREAKPOINT);
    };
    init();

    // On resize: auto-close sidebar if the window shrinks below lg.
    const handleResize = () => {
      if (window.innerWidth < MOBILE_BREAKPOINT) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      {/* On mobile: sidebar is a fixed overlay, content takes full width.
          On lg+: sidebar is in the flex flow, content shares space. */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
