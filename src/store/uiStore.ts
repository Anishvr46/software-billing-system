import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  darkMode: boolean;
  sidebarOpen: boolean;
  toggleDarkMode: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      darkMode: false,
      // sidebarOpen is NOT persisted — always calculated fresh from screen size
      sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
      toggleDarkMode: () => {
        const next = !get().darkMode;
        set({ darkMode: next });
        if (next) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
    }),
    {
      name: 'ui-store',
      // IMPORTANT: Only persist darkMode. Never persist sidebarOpen so it
      // always resets based on screen size on every page load.
      partialize: (state) => ({ darkMode: state.darkMode }),
    }
  )
);
